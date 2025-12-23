import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FriendSearchProps {
  currentProfileId: string;
}

interface SearchResult {
  id: string;
  username: string;
  avatar_url: string | null;
  grade: number;
  level: number;
  rank_tier: string;
}

export const FriendSearch = ({ currentProfileId }: FriendSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, grade, level, rank_tier")
        .ilike("username", `%${searchQuery}%`)
        .neq("id", currentProfileId)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "搜索失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (receiverId: string) => {
    setSendingTo(receiverId);
    try {
      // Check if already friends
      const { data: existingFriendship } = await supabase
        .from("friendships")
        .select("id")
        .or(`and(user1_id.eq.${currentProfileId},user2_id.eq.${receiverId}),and(user1_id.eq.${receiverId},user2_id.eq.${currentProfileId})`)
        .maybeSingle();

      if (existingFriendship) {
        toast({
          title: "已经是好友",
          description: "你们已经是好友了",
        });
        return;
      }

      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from("friend_requests")
        .select("id, status")
        .or(`and(sender_id.eq.${currentProfileId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentProfileId})`)
        .eq("status", "pending")
        .maybeSingle();

      if (existingRequest) {
        toast({
          title: "请求已存在",
          description: "已经有一个待处理的好友请求",
        });
        return;
      }

      const { error } = await supabase.from("friend_requests").insert({
        sender_id: currentProfileId,
        receiver_id: receiverId,
      });

      if (error) throw error;

      toast({
        title: "发送成功",
        description: "好友请求已发送",
      });
    } catch (error) {
      console.error("Send request error:", error);
      toast({
        title: "发送失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSendingTo(null);
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
          <Search className="h-5 w-5" />
          搜索玩家
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="输入用户名搜索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      user.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{user.username}</div>
                    <div className="text-xs text-muted-foreground">
                      {user.grade}年级 · Lv.{user.level} ·{" "}
                      <span className={getRankColor(user.rank_tier)}>
                        {user.rank_tier.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => sendFriendRequest(user.id)}
                  disabled={sendingTo === user.id}
                >
                  {sendingTo === user.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-1" />
                      添加
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {searchResults.length === 0 && searchQuery && !isSearching && (
          <div className="text-center text-muted-foreground py-4">
            未找到匹配的玩家
          </div>
        )}
      </CardContent>
    </Card>
  );
};
