import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Crown, Globe, Percent, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface FreeMatchEntry {
  rank: number;
  username: string;
  profileId: string;
  grade: number;
  wins: number;
  losses: number;
  winRate: number;
  tier: string;
}

interface FreeMatchLeaderboardProps {
  currentProfileId?: string;
}

const FreeMatchLeaderboard = ({ currentProfileId }: FreeMatchLeaderboardProps) => {
  const [leaderboard, setLeaderboard] = useState<FreeMatchEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      
      // Fetch profiles with free match stats
      const { data } = await supabase
        .from("profiles")
        .select("id, username, grade, free_match_wins, free_match_losses, rank_tier")
        .or("free_match_wins.gt.0,free_match_losses.gt.0")
        .order("free_match_wins", { ascending: false })
        .limit(50);

      if (data) {
        // Calculate win rate and sort by it
        const processed = data
          .map((p) => {
            const total = p.free_match_wins + p.free_match_losses;
            const winRate = total > 0 ? (p.free_match_wins / total) * 100 : 0;
            return {
              profileId: p.id,
              username: p.username,
              grade: p.grade,
              wins: p.free_match_wins,
              losses: p.free_match_losses,
              winRate,
              tier: p.rank_tier,
              rank: 0
            };
          })
          // Sort by win rate (descending), then by total wins
          .sort((a, b) => {
            const totalA = a.wins + a.losses;
            const totalB = b.wins + b.losses;
            // Minimum 5 matches to rank by win rate
            if (totalA >= 5 && totalB >= 5) {
              if (b.winRate !== a.winRate) return b.winRate - a.winRate;
              return b.wins - a.wins;
            }
            // Players with <5 matches rank lower
            if (totalA >= 5) return -1;
            if (totalB >= 5) return 1;
            return b.wins - a.wins;
          })
          .slice(0, 20)
          .map((entry, index) => ({ ...entry, rank: index + 1 }));

        setLeaderboard(processed);
      }
      
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-accent" />;
      case 2:
        return <Medal className="w-5 h-5 text-silver" />;
      case 3:
        return <Award className="w-5 h-5 text-bronze" />;
      default:
        return <span className="w-6 text-center font-gaming text-muted-foreground">{rank}</span>;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-accent/20 via-accent/10 to-transparent border-accent/30";
      case 2:
        return "bg-gradient-to-r from-silver/10 via-transparent to-transparent border-silver/20";
      case 3:
        return "bg-gradient-to-r from-bronze/10 via-transparent to-transparent border-bronze/20";
      default:
        return "bg-card hover:bg-secondary/50";
    }
  };

  const getWinRateColor = (rate: number) => {
    if (rate >= 70) return "text-green-400";
    if (rate >= 50) return "text-cyan-400";
    if (rate >= 30) return "text-yellow-400";
    return "text-red-400";
  };

  if (loading) {
    return (
      <Card variant="gaming">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">加载中...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="gaming" className="overflow-hidden">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-cyan-500/10 via-transparent to-purple-500/10">
        <CardTitle className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-neon-cyan" />
          <span>自由服排行榜</span>
          <Badge variant="outline" className="ml-auto">
            跨年级对战
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Header Info */}
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="w-4 h-4" />
            <span>需要完成至少5场对战才能进入胜率排名</span>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="divide-y divide-border/30 rounded-lg overflow-hidden border border-border/50">
          {leaderboard.map((entry) => (
            <div
              key={entry.profileId}
              className={cn(
                "flex items-center gap-4 p-4 transition-all duration-300 border-l-2",
                getRankStyle(entry.rank),
                entry.profileId === currentProfileId && "ring-1 ring-primary/30"
              )}
            >
              {/* Rank */}
              <div className="w-10 flex justify-center">
                {getRankIcon(entry.rank)}
              </div>

              {/* Avatar */}
              <div className="relative">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-gaming shadow-lg",
                  entry.rank === 1 && "bg-gradient-to-br from-accent to-amber-600 text-background shadow-accent/30",
                  entry.rank === 2 && "bg-gradient-to-br from-gray-300 to-gray-400 text-background",
                  entry.rank === 3 && "bg-gradient-to-br from-amber-600 to-amber-800 text-background",
                  entry.rank > 3 && "bg-gradient-to-br from-cyan-500 to-purple-500 text-white"
                )}>
                  {entry.username.charAt(0).toUpperCase()}
                </div>
                <Badge 
                  variant={entry.grade === 7 ? "outline" : "secondary"} 
                  className="absolute -bottom-1 -right-1 text-[8px] px-1 py-0"
                >
                  {entry.grade}
                </Badge>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-semibold truncate",
                    entry.profileId === currentProfileId && "text-primary"
                  )}>
                    {entry.username}
                  </span>
                  {entry.profileId === currentProfileId && (
                    <Badge variant="xp" className="text-[10px]">你</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{entry.wins}胜 {entry.losses}负</span>
                </div>
              </div>

              {/* Win Rate */}
              <div className="text-right">
                <div className={cn(
                  "font-gaming text-lg flex items-center gap-1",
                  getWinRateColor(entry.winRate)
                )}>
                  <Percent className="w-4 h-4" />
                  {entry.winRate.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">胜率</div>
              </div>
            </div>
          ))}
          
          {leaderboard.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              暂无数据，快来成为第一个参与自由服对战的玩家吧！
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FreeMatchLeaderboard;
