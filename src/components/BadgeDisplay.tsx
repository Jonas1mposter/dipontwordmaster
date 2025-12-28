import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBadgeChecker } from "@/hooks/useBadgeChecker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BadgeIcon } from "@/components/ui/badge-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Award, Lock, RefreshCw } from "lucide-react";

interface BadgeItem {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
  rarity: string;
  earned?: boolean;
  earnedAt?: string;
}

const rarityColors: Record<string, string> = {
  common: "from-gray-400 to-gray-600",
  rare: "from-blue-400 to-blue-600",
  epic: "from-purple-400 to-purple-600",
  legendary: "from-yellow-400 to-orange-500",
};

const rarityLabels: Record<string, string> = {
  common: "普通",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
};

const categoryLabels: Record<string, string> = {
  learning: "学习",
  battle: "对战",
  streak: "坚持",
  achievement: "成就",
};

// Badge unlock conditions
const unlockConditions: Record<string, string> = {
  // Learning badges
  "初出茅庐": "学习 1 个单词",
  "词汇新秀": "学习 100 个单词",
  "词海探险家": "学习 500 个单词",
  "单词大师": "学习 1000 个单词",
  "学海无涯": "学习 100 个单词",
  // Battle badges
  "首战告捷": "赢得第一场对战",
  "连胜新星": "连续获胜 3 场",
  "不败战神": "连续获胜 10 场",
  "完美主义者": "完美获胜 1 场（对手得 0 分）",
  // Streak badges
  "坚持不懈": "连续学习 7 天",
  "学霸之路": "连续学习 30 天",
  // Wealth badges
  "财富新贵": "累计获得 1000 金币",
  // Rank badges
  "王者荣耀": "达到钻石或冠军段位",
  // Special badges
  "Bonjour!": "欢迎加入！注册即可获得",
  "内测先驱": "参与内测获得",
  // Challenge badges
  "年级之星": "年级挑战赛前 3 名",
  "班级冠军": "班级挑战赛第 1 名",
  "班级亚军": "班级挑战赛第 2 名",
  "班级季军": "班级挑战赛第 3 名",
  "年级先锋": "年级挑战赛积分前 10%",
};

const BadgeDisplay = () => {
  const { profile } = useAuth();
  const { checkAndAwardBadges } = useBadgeChecker(profile);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBadges = useCallback(async () => {
    // Fetch all badges
    const { data: allBadges, error: badgesError } = await supabase
      .from("badges")
      .select("*")
      .order("rarity", { ascending: false });

    if (badgesError) {
      console.error("Error fetching badges:", badgesError);
      setLoading(false);
      return;
    }

    // Fetch user's earned badges if logged in
    let earnedBadgeIds: string[] = [];
    if (profile) {
      const { data: userBadges } = await supabase
        .from("user_badges")
        .select("badge_id, earned_at")
        .eq("profile_id", profile.id);

      if (userBadges) {
        earnedBadgeIds = userBadges.map(ub => ub.badge_id);
      }
    }

    // Mark earned badges
    const badgesWithStatus = allBadges?.map(badge => ({
      ...badge,
      earned: earnedBadgeIds.includes(badge.id),
    })) || [];

    setBadges(badgesWithStatus);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkAndAwardBadges();
    await fetchBadges();
    setRefreshing(false);
  };

  const earnedCount = badges.filter(b => b.earned).length;

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-muted-foreground">加载中...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5 text-primary" />
            成就勋章
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 px-2"
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", refreshing && "animate-spin")} />
              {refreshing ? "检查中" : "刷新"}
            </Button>
            <Badge variant="secondary" className="text-xs">
              {earnedCount}/{badges.length} 已获得
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={cn(
                "relative group flex flex-col items-center p-3 rounded-xl transition-all duration-300",
                badge.earned 
                  ? "bg-gradient-to-br opacity-100 hover:scale-105 cursor-pointer" 
                  : "bg-muted/30 opacity-50 grayscale",
                badge.earned && rarityColors[badge.rarity]
              )}
              title={`${badge.name}${badge.description ? `: ${badge.description}` : ''}`}
            >
              {/* Badge icon */}
              <div className={cn(
                "text-3xl mb-1 transition-transform",
                badge.earned && "group-hover:scale-110"
              )}>
                {badge.earned ? (
                  <BadgeIcon icon={badge.icon} className="h-7 w-7 text-white drop-shadow-lg" />
                ) : (
                  <Lock className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              
              {/* Badge name */}
              <span className={cn(
                "text-[10px] font-medium text-center leading-tight",
                badge.earned ? "text-white" : "text-muted-foreground"
              )}>
                {badge.name}
              </span>

              {/* Rarity indicator */}
              {badge.earned && (
                <span className="absolute -top-1 -right-1 text-[8px] bg-background/80 px-1 rounded-full border border-border/50">
                  {rarityLabels[badge.rarity]}
                </span>
              )}

              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-48">
                <p className="text-xs font-semibold text-foreground">{badge.name}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{badge.description}</p>
                {/* Unlock condition */}
                <div className="mt-2 pt-2 border-t border-border/50">
                  <p className="text-[10px] text-primary font-medium">
                    {badge.earned ? "✓ 已解锁" : `解锁条件：${unlockConditions[badge.name] || "完成特定任务"}`}
                  </p>
                </div>
                <div className="flex gap-1 mt-1">
                  <Badge variant="outline" className="text-[8px] px-1 py-0">
                    {categoryLabels[badge.category] || badge.category}
                  </Badge>
                  <Badge variant="outline" className="text-[8px] px-1 py-0">
                    {rarityLabels[badge.rarity]}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BadgeDisplay;
