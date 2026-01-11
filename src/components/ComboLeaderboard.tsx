import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Medal, Award, Flame, BookOpen, Swords, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ComboEntry {
  rank: number;
  username: string;
  profileId: string;
  maxCombo: number;
  mode: string;
  levelName?: string;
  createdAt: string;
}

interface ComboLeaderboardProps {
  grade: number;
  currentProfileId?: string;
}

const ComboLeaderboard = ({ grade, currentProfileId }: ComboLeaderboardProps) => {
  const [leaderboard, setLeaderboard] = useState<ComboEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Get top combo records with profile info
        const { data: comboData, error } = await supabase
          .from("combo_records")
          .select(`
            id,
            combo_count,
            mode,
            level_name,
            created_at,
            profile_id,
            profiles!inner(id, username, grade)
          `)
          .eq("profiles.grade", grade)
          .order("combo_count", { ascending: false })
          .limit(20);

        if (error) {
          console.error("Error fetching combo leaderboard:", error);
          setLoading(false);
          return;
        }

        // Group by profile and get max combo per profile
        const profileMaxCombos = new Map<string, ComboEntry>();
        
        comboData?.forEach((record: any) => {
          const profileId = record.profile_id;
          const existing = profileMaxCombos.get(profileId);
          
          if (!existing || record.combo_count > existing.maxCombo) {
            profileMaxCombos.set(profileId, {
              rank: 0,
              username: record.profiles.username,
              profileId: profileId,
              maxCombo: record.combo_count,
              mode: record.mode,
              levelName: record.level_name,
              createdAt: record.created_at,
            });
          }
        });

        // Convert to array, sort, and assign ranks
        const sortedEntries = Array.from(profileMaxCombos.values())
          .sort((a, b) => b.maxCombo - a.maxCombo)
          .slice(0, 10)
          .map((entry, index) => ({
            ...entry,
            rank: index + 1,
          }));

        setLeaderboard(sortedEntries);
      } catch (error) {
        console.error("Error fetching combo leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [grade]);

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

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "learning":
        return <BookOpen className="w-3.5 h-3.5" />;
      case "ranked":
        return <Swords className="w-3.5 h-3.5" />;
      case "free_match":
        return <Globe className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  const getModeName = (mode: string) => {
    switch (mode) {
      case "learning":
        return "闯关模式";
      case "ranked":
        return "排位对战";
      case "free_match":
        return "自由对战";
      default:
        return mode;
    }
  };

  const getComboStyle = (combo: number) => {
    if (combo >= 20) return "text-amber-400 animate-pulse";
    if (combo >= 10) return "text-orange-400";
    if (combo >= 5) return "text-red-400";
    return "text-primary";
  };

  if (loading) {
    return (
      <Card variant="gaming">
        <CardContent className="p-8 text-center">
          <Flame className="w-8 h-8 animate-pulse text-orange-500 mx-auto mb-2" />
          <p className="text-muted-foreground">加载中...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="gaming" className="overflow-hidden">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-orange-500/10 via-red-500/5 to-amber-500/10">
        <CardTitle className="flex items-center gap-3">
          <div className="relative">
            <Flame className="w-6 h-6 text-orange-500" />
            <div className="absolute -inset-1 bg-orange-500/20 rounded-full blur-sm -z-10" />
          </div>
          <span className="bg-gradient-to-r from-orange-400 via-red-400 to-amber-400 bg-clip-text text-transparent">
            连击排行榜
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* 说明 */}
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-orange-500/5 to-amber-500/5 border border-orange-500/20">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            展示历史最高连击纪录，连续答对越多，排名越高！
          </p>
        </div>

        {/* 排行榜列表 */}
        <div className="divide-y divide-border/30 rounded-lg overflow-hidden border border-border/50">
          {leaderboard.map((entry) => (
            <div
              key={`${entry.profileId}-${entry.createdAt}`}
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
                  entry.rank === 1 && "bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-orange-500/30",
                  entry.rank === 2 && "bg-gradient-to-br from-gray-300 to-gray-400 text-background",
                  entry.rank === 3 && "bg-gradient-to-br from-amber-600 to-amber-800 text-background",
                  entry.rank > 3 && "bg-gradient-to-br from-primary/50 to-primary text-primary-foreground"
                )}>
                  {entry.username.charAt(0).toUpperCase()}
                </div>
                {entry.rank <= 3 && (
                  <Flame className={cn(
                    "absolute -bottom-1 -right-1 w-4 h-4",
                    entry.rank === 1 && "text-orange-500 animate-pulse",
                    entry.rank === 2 && "text-amber-500",
                    entry.rank === 3 && "text-red-400"
                  )} />
                )}
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
                
                {/* Mode badge */}
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    {getModeIcon(entry.mode)}
                    <span>{getModeName(entry.mode)}</span>
                  </Badge>
                  {entry.levelName && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                      {entry.levelName}
                    </span>
                  )}
                </div>
              </div>

              {/* Combo count */}
              <div className="text-right">
                <div className={cn(
                  "font-gaming text-lg flex items-center gap-1",
                  getComboStyle(entry.maxCombo)
                )}>
                  <Flame className="w-4 h-4" />
                  <span>{entry.maxCombo}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">连击</div>
              </div>
            </div>
          ))}
          
          {leaderboard.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Flame className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>暂无连击纪录</p>
              <p className="text-sm mt-1">快去闯关或对战，创造你的连击传奇！</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ComboLeaderboard;
