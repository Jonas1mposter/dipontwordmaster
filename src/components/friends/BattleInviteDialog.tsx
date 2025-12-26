import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Swords, Loader2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Friend } from "./FriendList";

interface BattleInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friend: Friend | null;
  currentProfileId: string;
  currentGrade: number;
  onBattleStart: (matchId: string) => void;
}

export const BattleInviteDialog = ({
  open,
  onOpenChange,
  friend,
  currentProfileId,
  currentGrade,
  onBattleStart,
}: BattleInviteDialogProps) => {
  const [sending, setSending] = useState(false);
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const { toast } = useToast();

  const sendChallenge = async () => {
    if (!friend) return;

    setSending(true);
    try {
      // Cancel any existing pending invites
      await supabase
        .from("friend_battle_invites")
        .update({ status: "expired" })
        .eq("sender_id", currentProfileId)
        .eq("status", "pending");

      // Create new invite
      const { data, error } = await supabase
        .from("friend_battle_invites")
        .insert({
          sender_id: currentProfileId,
          receiver_id: friend.id,
        })
        .select()
        .single();

      if (error) throw error;

      setInviteId(data.id);
      setWaitingForResponse(true);

      toast({
        title: "邀请已发送",
        description: `等待 ${friend.username} 接受挑战...`,
      });
    } catch (error) {
      console.error("Send challenge error:", error);
      toast({
        title: "发送失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!inviteId || !waitingForResponse) return;

    // Subscribe to invite status changes
    const channel = supabase
      .channel(`battle-invite-${inviteId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "friend_battle_invites",
          filter: `id=eq.${inviteId}`,
        },
        async (payload) => {
          const invite = payload.new as any;

          if (invite.status === "accepted" && invite.match_id) {
            toast({
              title: "对方接受了挑战！",
              description: "比赛即将开始...",
            });
            onBattleStart(invite.match_id);
            onOpenChange(false);
          } else if (invite.status === "rejected") {
            toast({
              title: "对方拒绝了挑战",
              description: "下次再试吧",
            });
            setWaitingForResponse(false);
            setInviteId(null);
          }
        }
      )
      .subscribe();

    // Timeout after 60 seconds
    const timeout = setTimeout(() => {
      supabase
        .from("friend_battle_invites")
        .update({ status: "expired" })
        .eq("id", inviteId);
      
      toast({
        title: "邀请已过期",
        description: "对方未在规定时间内响应",
      });
      setWaitingForResponse(false);
      setInviteId(null);
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(timeout);
    };
  }, [inviteId, waitingForResponse, toast, onBattleStart, onOpenChange]);

  const cancelChallenge = async () => {
    if (inviteId) {
      await supabase
        .from("friend_battle_invites")
        .update({ status: "expired" })
        .eq("id", inviteId);
    }
    setWaitingForResponse(false);
    setInviteId(null);
    onOpenChange(false);
  };

  if (!friend) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !waitingForResponse && onOpenChange(o)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5" />
            好友单挑
          </DialogTitle>
          <DialogDescription>
            向 {friend.username} 发起单挑挑战
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold">
            {friend.avatar_url ? (
              <img
                src={friend.avatar_url}
                alt={friend.username}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              friend.username.charAt(0).toUpperCase()
            )}
          </div>
          <div className="text-center">
            <div className="font-bold text-lg">{friend.username}</div>
            <div className="text-sm text-muted-foreground">
              {friend.grade}年级 · Lv.{friend.level}
            </div>
          </div>

          {waitingForResponse ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-sm text-muted-foreground">
                等待对方响应...
              </div>
              <Button variant="outline" onClick={cancelChallenge}>
                取消挑战
              </Button>
            </div>
          ) : (
            <Button onClick={sendChallenge} disabled={sending} className="w-full">
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Swords className="h-4 w-4 mr-2" />
              )}
              发起挑战
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Component to receive and respond to battle invites
interface BattleInviteReceiverProps {
  currentProfileId: string;
  currentGrade: number;
  onBattleStart: (matchId: string) => void;
}

interface PendingInvite {
  id: string;
  sender_id: string;
  sender: {
    username: string;
    avatar_url: string | null;
    grade: number;
    level: number;
  };
}

export const BattleInviteReceiver = ({
  currentProfileId,
  currentGrade,
  onBattleStart,
}: BattleInviteReceiverProps) => {
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing pending invites
    const checkPending = async () => {
      const { data } = await supabase
        .from("friend_battle_invites")
        .select(`
          id,
          sender_id,
          sender:profiles!friend_battle_invites_sender_id_fkey(username, avatar_url, grade, level)
        `)
        .eq("receiver_id", currentProfileId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setPendingInvite(data[0] as unknown as PendingInvite);
      }
    };

    checkPending();

    // Subscribe to new invites
    const channel = supabase
      .channel("battle-invites-receiver")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "friend_battle_invites",
          filter: `receiver_id=eq.${currentProfileId}`,
        },
        async (payload) => {
          const invite = payload.new as any;
          
          // Fetch sender info
          const { data: sender } = await supabase
            .from("profiles")
            .select("username, avatar_url, grade, level")
            .eq("id", invite.sender_id)
            .single();

          if (sender) {
            setPendingInvite({
              id: invite.id,
              sender_id: invite.sender_id,
              sender,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentProfileId]);

  const respondToInvite = async (accept: boolean) => {
    if (!pendingInvite) return;

    setProcessing(true);
    try {
      if (accept) {
        // Get random words for the match - fetch more and shuffle
        const { data: allWords } = await supabase
          .from("words")
          .select("*")
          .eq("grade", currentGrade);
        
        // Shuffle and pick 10 random words
        const shuffled = (allWords || []).sort(() => Math.random() - 0.5);
        const words = shuffled.slice(0, 10);

        // Create the match
        const { data: match, error: matchError } = await supabase
          .from("ranked_matches")
          .insert({
            player1_id: pendingInvite.sender_id,
            player2_id: currentProfileId,
            grade: currentGrade,
            status: "in_progress",
            words: words || [],
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (matchError) throw matchError;

        // Update invite with match_id
        await supabase
          .from("friend_battle_invites")
          .update({ status: "accepted", match_id: match.id })
          .eq("id", pendingInvite.id);

        toast({
          title: "接受挑战！",
          description: "比赛即将开始...",
        });

        onBattleStart(match.id);
      } else {
        await supabase
          .from("friend_battle_invites")
          .update({ status: "rejected" })
          .eq("id", pendingInvite.id);

        toast({
          title: "已拒绝",
          description: "已拒绝对方的挑战",
        });
      }

      setPendingInvite(null);
    } catch (error) {
      console.error("Respond to invite error:", error);
      toast({
        title: "操作失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!pendingInvite) return null;

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-primary" />
            收到挑战邀请！
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold animate-pulse">
            {pendingInvite.sender.avatar_url ? (
              <img
                src={pendingInvite.sender.avatar_url}
                alt={pendingInvite.sender.username}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              pendingInvite.sender.username.charAt(0).toUpperCase()
            )}
          </div>
          <div className="text-center">
            <div className="font-bold text-lg">{pendingInvite.sender.username}</div>
            <div className="text-sm text-muted-foreground">
              {pendingInvite.sender.grade}年级 · Lv.{pendingInvite.sender.level}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              向你发起了单挑挑战！
            </div>
          </div>

          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => respondToInvite(false)}
              disabled={processing}
              className="flex-1"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <X className="h-4 w-4 mr-1" />
                  拒绝
                </>
              )}
            </Button>
            <Button
              onClick={() => respondToInvite(true)}
              disabled={processing}
              className="flex-1"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  接受
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
