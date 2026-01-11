import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award, Crown, Coins, Swords, TrendingUp, Users, Globe, Shield, Star, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import FreeMatchLeaderboard from "./FreeMatchLeaderboard";
import ComboLeaderboard from "./ComboLeaderboard";
interface LeaderboardEntry {
  rank: number;
  username: string;
  profileId: string;
  value: number;
  tier: string;
  rankStars?: number;
}

// 段位配置
type RankTier = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "champion";

const tierConfig: Record<RankTier, { 
  name: string; 
  gradient: string; 
  textColor: string;
  icon: "shield" | "crown";
}> = {
  bronze: { name: "青铜", gradient: "from-amber-700 to-amber-900", textColor: "text-amber-500", icon: "shield" },
  silver: { name: "白银", gradient: "from-gray-300 to-gray-500", textColor: "text-gray-400", icon: "shield" },
  gold: { name: "黄金", gradient: "from-yellow-400 to-amber-500", textColor: "text-yellow-500", icon: "shield" },
  platinum: { name: "铂金", gradient: "from-cyan-300 to-cyan-500", textColor: "text-cyan-400", icon: "shield" },
  diamond: { name: "钻石", gradient: "from-blue-300 to-purple-400", textColor: "text-blue-400", icon: "shield" },
  champion: { name: "巅峰", gradient: "from-purple-500 to-pink-500", textColor: "text-purple-400", icon: "crown" },
};

interface LeaderboardTabsProps {
  grade: number;
  currentUser?: string;
  currentProfileId?: string;
  currentClass?: string | null;
}

const LeaderboardTabs = ({ grade, currentUser, currentProfileId, currentClass }: LeaderboardTabsProps) => {
  const [coinsLeaderboard, setCoinsLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [winsLeaderboard, setWinsLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [xpLeaderboard, setXpLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [classLeaderboard, setClassLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState("coins");
  const [showFreeMatchLeaderboard, setShowFreeMatchLeaderboard] = useState(false);

  useEffect(() => {
    const fetchLeaderboards = async () => {
      // 狄邦豆排行榜
      const { data: coinsData } = await supabase
        .from("profiles")
        .select("id, username, coins, rank_tier")
        .eq("grade", grade)
        .order("coins", { ascending: false })
        .limit(10);

      if (coinsData) {
        setCoinsLeaderboard(coinsData.map((p: any, index: number) => ({
          rank: index + 1,
          username: p.username,
          profileId: p.id,
          value: p.coins,
          tier: p.rank_tier,
          rankStars: p.rank_stars,
        })));
      }

      // 排位胜利场次排行榜
      const { data: winsData } = await supabase
        .from("profiles")
        .select("id, username, wins, rank_tier, rank_stars")
        .eq("grade", grade)
        .order("wins", { ascending: false })
        .limit(10);

      if (winsData) {
        setWinsLeaderboard(winsData.map((p: any, index: number) => ({
          rank: index + 1,
          username: p.username,
          profileId: p.id,
          value: p.wins,
          tier: p.rank_tier,
          rankStars: p.rank_stars,
        })));
      }

      // 经验值排行榜 - 使用累计经验值
      const { data: xpData } = await supabase
        .from("profiles")
        .select("id, username, total_xp, level, rank_tier, rank_stars")
        .eq("grade", grade)
        .order("total_xp", { ascending: false })
        .limit(10);

      if (xpData) {
        setXpLeaderboard(xpData.map((p: any, index: number) => ({
          rank: index + 1,
          username: p.username,
          profileId: p.id,
          value: p.total_xp || 0,
          tier: p.rank_tier,
          rankStars: p.rank_stars,
        })));
      }

      // 班级排行榜 - 使用累计经验值
      if (currentClass) {
        const { data: classData } = await supabase
          .from("profiles")
          .select("id, username, total_xp, level, rank_tier, rank_stars")
          .eq("grade", grade)
          .eq("class", currentClass)
          .order("total_xp", { ascending: false })
          .limit(20);

        if (classData) {
          setClassLeaderboard(classData.map((p: any, index: number) => ({
            rank: index + 1,
            username: p.username,
            profileId: p.id,
            value: p.total_xp || 0,
            tier: p.rank_tier,
            rankStars: p.rank_stars,
          })));
        }
      }
    };

    fetchLeaderboards();
  }, [grade, currentClass]);

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

  const getTierVariant = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "bronze": return "bronze";
      case "silver": return "silver";
      case "gold": return "gold";
      case "platinum": return "platinum";
      case "diamond": return "diamond";
      case "champion": return "champion";
      default: return "secondary";
    }
  };

  const getNameCardInfo = (tab: string) => {
    switch (tab) {
      case "coins":
        return { name: "狄邦财富大亨", gradient: "from-amber-500 via-yellow-400 to-amber-600", icon: Coins };
      case "wins":
        return { name: "狄邦排位大师", gradient: "from-purple-600 via-pink-500 to-purple-600", icon: Swords };
      case "xp":
        return { name: "狄邦至高巅峰", gradient: "from-cyan-500 via-blue-500 to-indigo-600", icon: TrendingUp };
      case "class":
        return { name: `${currentClass}班学霸`, gradient: "from-green-500 via-emerald-500 to-teal-600", icon: Users };
      default:
        return { name: "", gradient: "", icon: Trophy };
    }
  };

  const renderLeaderboard = (entries: LeaderboardEntry[], type: "coins" | "wins" | "xp" | "class") => {
    const nameCard = getNameCardInfo(type);
    const IconComponent = nameCard.icon;
    
    return (
      <div className="space-y-4">
        {/* 名片预览 */}
        <Card className={cn(
          "border-2 overflow-hidden",
          "bg-gradient-to-r",
          nameCard.gradient
        )}>
          <CardContent className="p-4 flex items-center gap-3 text-white">
            <IconComponent className="w-8 h-8" />
            <div>
              <div className="font-gaming text-lg">{nameCard.name}</div>
              <div className="text-sm opacity-80">排行榜前10名专属名片</div>
            </div>
          </CardContent>
        </Card>

        {/* 排行榜列表 */}
        <div className="divide-y divide-border/30 rounded-lg overflow-hidden border border-border/50">
          {entries.map((entry) => (
            <div
              key={entry.profileId}
              className={cn(
                "flex items-center gap-4 p-4 transition-all duration-300 border-l-2",
                getRankStyle(entry.rank),
                entry.username === currentUser && "ring-1 ring-primary/30"
              )}
            >
              {/* Rank */}
              <div className="w-10 flex justify-center">
                {getRankIcon(entry.rank)}
              </div>

              {/* Avatar with rank badge for top 10 */}
              <div className="relative">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-gaming shadow-lg",
                  entry.rank === 1 && "bg-gradient-to-br from-accent to-amber-600 text-background shadow-accent/30",
                  entry.rank === 2 && "bg-gradient-to-br from-gray-300 to-gray-400 text-background",
                  entry.rank === 3 && "bg-gradient-to-br from-amber-600 to-amber-800 text-background",
                  entry.rank > 3 && "bg-gradient-to-br from-primary/50 to-primary text-primary-foreground"
                )}>
                  {entry.username.charAt(0).toUpperCase()}
                </div>
                {entry.rank <= 10 && (
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold",
                    `bg-gradient-to-r ${nameCard.gradient} text-white`
                  )}>
                    {entry.rank}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-semibold truncate",
                    entry.username === currentUser && "text-primary"
                  )}>
                    {entry.username}
                  </span>
                  {entry.username === currentUser && (
                    <Badge variant="xp" className="text-[10px]">你</Badge>
                  )}
                </div>
                
                {/* 段位徽章 - 增强版 */}
                {(() => {
                  const tier = (entry.tier?.toLowerCase() || "bronze") as RankTier;
                  const config = tierConfig[tier] || tierConfig.bronze;
                  const IconComp = config.icon === "crown" ? Crown : Shield;
                  
                  return (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-gaming bg-gradient-to-r text-white",
                        config.gradient
                      )}>
                        <IconComp className="w-3 h-3" />
                        <span>{config.name}</span>
                      </div>
                      {entry.rankStars !== undefined && entry.rankStars > 0 && (
                        <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Star className="w-3 h-3 text-accent fill-accent" />
                          <span>{entry.rankStars}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Value */}
              <div className="text-right">
                <div className="font-gaming text-sm text-primary">
                  {type === "coins" && `${entry.value.toLocaleString()} 豆`}
                  {type === "wins" && `${entry.value} 胜`}
                  {type === "xp" && `${entry.value.toLocaleString()} XP`}
                </div>
              </div>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              暂无数据
            </div>
          )}
        </div>
      </div>
    );
  };

  if (showFreeMatchLeaderboard) {
    return (
      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={() => setShowFreeMatchLeaderboard(false)}
          className="gap-2"
        >
          <Trophy className="w-4 h-4" />
          返回年级排行榜
        </Button>
        <FreeMatchLeaderboard currentProfileId={currentProfileId} />
      </div>
    );
  }

  // Show combo leaderboard
  if (activeTab === "combo") {
    return (
      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={() => setActiveTab("coins")}
          className="gap-2"
        >
          <Trophy className="w-4 h-4" />
          返回荣耀排行榜
        </Button>
        <ComboLeaderboard grade={grade} currentProfileId={currentProfileId} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Special Leaderboard Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setShowFreeMatchLeaderboard(true)}
          className="flex-1 gap-2 border-cyan-500/30 hover:bg-cyan-500/10"
        >
          <Globe className="w-4 h-4 text-neon-cyan" />
          自由服排行榜
        </Button>
        <Button
          variant="outline"
          onClick={() => setActiveTab("combo")}
          className="flex-1 gap-2 border-orange-500/30 hover:bg-orange-500/10"
        >
          <Flame className="w-4 h-4 text-orange-500" />
          连击排行榜
        </Button>
      </div>
      
      <Card variant="gaming" className="overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
          <CardTitle className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-accent" />
            <span className="text-glow-gold">荣耀排行榜</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={cn("grid w-full mb-4", currentClass ? "grid-cols-4" : "grid-cols-3")}>
              <TabsTrigger value="coins" className="flex items-center gap-2">
                <Coins className="w-4 h-4" />
                <span className="hidden sm:inline">狄邦豆</span>
              </TabsTrigger>
              <TabsTrigger value="wins" className="flex items-center gap-2">
                <Swords className="w-4 h-4" />
                <span className="hidden sm:inline">排位胜利</span>
              </TabsTrigger>
              <TabsTrigger value="xp" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">经验值</span>
              </TabsTrigger>
              {currentClass && (
                <TabsTrigger value="class" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">{currentClass}班</span>
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="coins">
              {renderLeaderboard(coinsLeaderboard, "coins")}
            </TabsContent>
            <TabsContent value="wins">
              {renderLeaderboard(winsLeaderboard, "wins")}
            </TabsContent>
            <TabsContent value="xp">
              {renderLeaderboard(xpLeaderboard, "xp")}
            </TabsContent>
            {currentClass && (
              <TabsContent value="class">
                {renderLeaderboard(classLeaderboard, "class")}
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaderboardTabs;
