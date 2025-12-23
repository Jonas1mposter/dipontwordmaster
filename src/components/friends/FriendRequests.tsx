import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FriendRequestsProps {
  currentProfileId: string;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  created_at: string;
  sender: {
    id: string;
    username: string;
    avatar_url: string | null;
    grade: number;
    level: number;
    rank_tier: string;
  };
}

export const FriendRequests = ({ currentProfileId }: FriendRequestsProps) => {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("friend_requests")
      .select(`
        id,
        sender_id,
        created_at,
        sender:profiles!friend_requests_sender_id_fkey(id, username, avatar_url, grade, level, rank_tier)
      `)
      .eq("receiver_id", currentProfileId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch requests error:", error);
      return;
    }

    setRequests(data as unknown as FriendRequest[]);
  };

  useEffect(() => {
    fetchRequests();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("friend-requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friend_requests",
          filter: `receiver_id=eq.${currentProfileId}`,
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentProfileId]);

  const handleRequest = async (requestId: string, senderId: string, accept: boolean) => {
    setProcessingId(requestId);
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from("friend_requests")
        .update({ status: accept ? "accepted" : "rejected", updated_at: new Date().toISOString() })
        .eq("id", requestId);

      if (updateError) throw updateError;

      if (accept) {
        // Create friendship (ensure user1_id < user2_id)
        const [user1, user2] = [currentProfileId, senderId].sort();
        const { error: friendshipError } = await supabase
          .from("friendships")
          .insert({ user1_id: user1, user2_id: user2 });

        if (friendshipError) throw friendshipError;

        toast({
          title: "好友添加成功",
          description: "你们已经成为好友了！",
        });
      } else {
        toast({
          title: "已拒绝",
          description: "已拒绝该好友请求",
        });
      }

      // Remove from local state
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (error) {
      console.error("Handle request error:", error);
      toast({
        title: "操作失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getRankColor = (tier: string) => {
    const colors: Record<string, string> = {
      bronze: "text-amber-600",
      silver: "text-gray-400",
      gold: "text-yellow-400",
      platinum: "text-cyan-400",
      diamond: "text-blue-400",
      master: "text-purple-400",
      grandmaster: "text-red-400",
    };
    return colors[tier] || "text-muted-foreground";
  };

  if (requests.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          好友请求
          <span className="ml-auto text-sm bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
            {requests.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold">
                {request.sender.avatar_url ? (
                  <img
                    src={request.sender.avatar_url}
                    alt={request.sender.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  request.sender.username.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <div className="font-medium">{request.sender.username}</div>
                <div className="text-xs text-muted-foreground">
                  {request.sender.grade}年级 · Lv.{request.sender.level} ·{" "}
                  <span className={getRankColor(request.sender.rank_tier)}>
                    {request.sender.rank_tier.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRequest(request.id, request.sender_id, false)}
                disabled={processingId === request.id}
              >
                {processingId === request.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => handleRequest(request.id, request.sender_id, true)}
                disabled={processingId === request.id}
              >
                {processingId === request.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
