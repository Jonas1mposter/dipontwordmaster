import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageCircle, Swords, Trash2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FriendListProps {
  currentProfileId: string;
  onOpenChat: (friend: Friend) => void;
  onChallenge: (friend: Friend) => void;
  onSpectate?: (matchId: string) => void;
}

export interface Friend {
  id: string;
  username: string;
  avatar_url: string | null;
  grade: number;
  level: number;
  rank_tier: string;
  friendshipId: string;
  activeMatchId?: string | null;
}

export const FriendList = ({ currentProfileId, onOpenChat, onChallenge, onSpectate }: FriendListProps) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFriends = async () => {
    setLoading(true);
    try {
      // Fetch friendships where current user is either user1 or user2
      const { data: friendships, error } = await supabase
        .from("friendships")
        .select(`
          id,
          user1_id,
          user2_id,
          user1:profiles!friendships_user1_id_fkey(id, username, avatar_url, grade, level, rank_tier),
          user2:profiles!friendships_user2_id_fkey(id, username, avatar_url, grade, level, rank_tier)
        `)
        .or(`user1_id.eq.${currentProfileId},user2_id.eq.${currentProfileId}`);

      if (error) throw error;

      // Extract friend data (the other user in each friendship)
      const friendList: Friend[] = (friendships || []).map((f: any) => {
        const friend = f.user1_id === currentProfileId ? f.user2 : f.user1;
        return {
          ...friend,
          friendshipId: f.id,
          activeMatchId: null,
        };
      });

      // Check for active matches for each friend (only matches started within last 10 minutes)
      const friendIds = friendList.map(f => f.id);
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      if (friendIds.length > 0) {
        const { data: activeMatches } = await supabase
          .from("ranked_matches")
          .select("id, player1_id, player2_id, started_at")
          .eq("status", "in_progress")
          .gte("started_at", tenMinutesAgo)
          .or(`player1_id.in.(${friendIds.join(',')}),player2_id.in.(${friendIds.join(',')})`);

        if (activeMatches) {
          friendList.forEach(friend => {
            const activeMatch = activeMatches.find(
              m => m.player1_id === friend.id || m.player2_id === friend.id
            );
            if (activeMatch) {
              friend.activeMatchId = activeMatch.id;
            }
          });
        }
      }

      setFriends(friendList);
    } catch (error) {
      console.error("Fetch friends error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
    
    // Refresh every 30 seconds to check for active matches
    const interval = setInterval(fetchFriends, 30000);
    return () => clearInterval(interval);
  }, [currentProfileId]);

  const removeFriend = async (friendshipId: string, friendName: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) throw error;

      setFriends((prev) => prev.filter((f) => f.friendshipId !== friendshipId));
      toast({
        title: "已删除好友",
        description: `已将 ${friendName} 从好友列表中移除`,
      });
    } catch (error) {
      console.error("Remove friend error:", error);
      toast({
        title: "删除失败",
        description: "请稍后重试",
        variant: "destructive",
      });
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

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          好友列表
          <span className="ml-auto text-sm text-muted-foreground">
            {friends.length} 位好友
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            加载中...
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            还没有好友，快去添加吧！
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold">
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
                    {friend.activeMatchId && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
                        <Swords className="w-2.5 h-2.5 text-destructive-foreground" />
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{friend.username}</span>
                      {friend.activeMatchId && (
                        <Badge variant="outline" className="text-xs text-destructive border-destructive/50 px-1.5 py-0">
                          对战中
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {friend.grade}年级 · Lv.{friend.level} ·{" "}
                      <span className={getRankColor(friend.rank_tier)}>
                        {friend.rank_tier.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {friend.activeMatchId && onSpectate && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onSpectate(friend.activeMatchId!)}
                      title="观战"
                      className="text-primary hover:text-primary"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onOpenChat(friend)}
                    title="聊天"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onChallenge(friend)}
                    title="单挑"
                    disabled={!!friend.activeMatchId}
                  >
                    <Swords className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeFriend(friend.friendshipId, friend.username)}
                    title="删除好友"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
