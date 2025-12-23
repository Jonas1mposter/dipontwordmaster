import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBadgeChecker } from "@/hooks/useBadgeChecker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
                {badge.earned ? badge.icon : <Lock className="h-6 w-6 text-muted-foreground" />}
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
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-40">
                <p className="text-xs font-semibold text-foreground">{badge.name}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{badge.description}</p>
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
