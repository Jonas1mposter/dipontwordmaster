import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, TrendingUp, Percent, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerBattleCardProps {
  profile: {
    id: string;
    username: string;
    level: number;
    rank_tier: string;
    rank_stars: number;
    wins: number;
    losses: number;
    avatar_url?: string | null;
    isAI?: boolean;
  } | null;
  variant: "left" | "right";
  className?: string;
}

interface EquippedBadge {
  id: string;
  name: string;
  icon: string;
  rarity: string;
  slot: number;
}

const PlayerBattleCard = ({ profile, variant, className }: PlayerBattleCardProps) => {
  const [equippedBadges, setEquippedBadges] = useState<EquippedBadge[]>([]);
  const [recentWinRate, setRecentWinRate] = useState<number | null>(null);
  const [recentStreak, setRecentStreak] = useState<{ type: 'win' | 'lose'; count: number } | null>(null);

  useEffect(() => {
    if (!profile || profile.isAI) return;

    // Fetch equipped badges
    const fetchBadges = async () => {
      const { data } = await supabase
        .from("user_badges")
        .select(`
          equipped_slot,
          badges:badge_id (
            id,
            name,
            icon,
            rarity
          )
        `)
        .eq("profile_id", profile.id)
        .not("equipped_slot", "is", null)
        .order("equipped_slot", { ascending: true })
        .limit(3);

      if (data) {
        const badges = data.map((item: any) => ({
          id: item.badges.id,
          name: item.badges.name,
          icon: item.badges.icon,
          rarity: item.badges.rarity,
          slot: item.equipped_slot,
        }));
        setEquippedBadges(badges);
      }
    };

    // Fetch recent match history for win rate
    const fetchRecentMatches = async () => {
      const { data: matches } = await supabase
        .from("ranked_matches")
        .select("winner_id, player1_id, player2_id")
        .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(10);

      if (matches && matches.length > 0) {
        let wins = 0;
        let currentStreak = 0;
        let streakType: 'win' | 'lose' = 'win';

        matches.forEach((match, index) => {
          const won = match.winner_id === profile.id;
          if (won) wins++;

          if (index === 0) {
            streakType = won ? 'win' : 'lose';
            currentStreak = 1;
          } else if ((won && streakType === 'win') || (!won && streakType === 'lose')) {
            currentStreak++;
          }
        });

        setRecentWinRate(Math.round((wins / matches.length) * 100));
        if (currentStreak >= 2) {
          setRecentStreak({ type: streakType, count: currentStreak });
        }
      }
    };

    fetchBadges();
    fetchRecentMatches();
  }, [profile]);

  if (!profile) return null;

  const totalGames = (profile.wins || 0) + (profile.losses || 0);
  const winRate = totalGames > 0 ? Math.round((profile.wins / totalGames) * 100) : 0;

  const isLeft = variant === "left";
  const gradientColors = isLeft 
    ? "from-primary/40 via-neon-pink/20 to-primary/40"
    : "from-neon-blue/40 via-neon-cyan/20 to-neon-blue/40";
  const avatarGradient = isLeft
    ? "from-primary to-neon-pink"
    : "from-neon-blue to-neon-cyan";
  const borderColor = isLeft ? "border-primary/50" : "border-neon-blue/50";
  const glowClass = isLeft ? "battle-glow-left" : "battle-glow-right";
  const animationClass = isLeft ? "animate-slide-in-left" : "animate-slide-in-right";
  const textColor = isLeft ? "text-primary text-glow-purple" : "text-neon-blue text-glow-cyan";
  const secondaryBorder = isLeft ? "border-primary/20" : "border-neon-blue/20";

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'bg-gradient-to-r from-amber-500 to-yellow-400 text-background';
      case 'epic': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'rare': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
      default: return 'bg-secondary text-foreground';
    }
  };

  return (
    <Card variant="gaming" className={cn("overflow-hidden", glowClass, animationClass, className)}>
      <div className={cn("h-28 bg-gradient-to-br relative", gradientColors)}>
        {/* Energy ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            "w-24 h-24 rounded-full border-2 animate-energy-ring",
            borderColor,
            !isLeft && "animate-[energyRing_2s_linear_infinite_reverse]"
          )} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          {profile.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt={profile.username}
              className={cn(
                "w-20 h-20 rounded-full object-cover shadow-lg border-4 border-background",
                isLeft ? "shadow-primary/50" : "shadow-neon-blue/50"
              )}
            />
          ) : (
            <div className={cn(
              "w-20 h-20 rounded-full bg-gradient-to-br flex items-center justify-center text-3xl font-gaming text-primary-foreground shadow-lg border-4 border-background",
              avatarGradient,
              isLeft ? "shadow-primary/50" : "shadow-neon-blue/50"
            )}>
              {profile.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        {profile.isAI && (
          <Badge className="absolute top-2 right-2 bg-accent/90 animate-pulse">🤖 AI</Badge>
        )}
        
        {/* Streak indicator */}
        {recentStreak && recentStreak.count >= 3 && (
          <Badge 
            className={cn(
              "absolute top-2 left-2 text-xs",
              recentStreak.type === 'win' 
                ? "bg-success/90 text-success-foreground" 
                : "bg-destructive/90 text-destructive-foreground"
            )}
          >
            {recentStreak.type === 'win' ? '🔥' : '❄️'} {recentStreak.count}连{recentStreak.type === 'win' ? '胜' : '败'}
          </Badge>
        )}
      </div>

      <CardContent className="p-4 text-center">
        <h3 className={cn("font-gaming text-xl mb-1", textColor)}>{profile.username}</h3>
        <Badge variant="xp" className="mb-3">Lv.{profile.level}</Badge>
        
        {/* Equipped Badges */}
        {equippedBadges.length > 0 && (
          <div className="flex justify-center gap-1 mb-3">
            {equippedBadges.map((badge) => (
              <div
                key={badge.id}
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-sm",
                  getRarityColor(badge.rarity)
                )}
                title={badge.name}
              >
                {badge.icon}
              </div>
            ))}
          </div>
        )}
        
        {/* Rank Info */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className={cn("bg-secondary/50 rounded-lg p-2 border", secondaryBorder)}>
            <Trophy className="w-4 h-4 text-accent mx-auto mb-1" />
            <div className="font-gaming text-accent">
              {profile.rank_tier && (profile.rank_tier.charAt(0).toUpperCase() + profile.rank_tier.slice(1))}
            </div>
          </div>
          <div className={cn("bg-secondary/50 rounded-lg p-2 border", secondaryBorder)}>
            <Star className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <div className="font-gaming">{profile.rank_stars || 0}星</div>
          </div>
        </div>
        
        {/* Win/Loss Stats */}
        <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
          <div className="bg-success/10 rounded-lg p-2 border border-success/30">
            <div className="font-gaming text-success text-lg">{profile.wins || 0}</div>
            <div className="text-muted-foreground text-[10px]">胜场</div>
          </div>
          <div className="bg-destructive/10 rounded-lg p-2 border border-destructive/30">
            <div className="font-gaming text-destructive text-lg">{profile.losses || 0}</div>
            <div className="text-muted-foreground text-[10px]">败场</div>
          </div>
          <div className={cn(
            "rounded-lg p-2 border",
            winRate >= 50 ? "bg-success/10 border-success/30" : "bg-muted/10 border-border"
          )}>
            <div className={cn(
              "font-gaming text-lg flex items-center justify-center gap-0.5",
              winRate >= 50 ? "text-success" : "text-muted-foreground"
            )}>
              {winRate}
              <Percent className="w-3 h-3" />
            </div>
            <div className="text-muted-foreground text-[10px]">胜率</div>
          </div>
        </div>

        {/* Recent Form */}
        {recentWinRate !== null && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className={cn(
                "w-3 h-3",
                recentWinRate >= 50 ? "text-success" : "text-destructive"
              )} />
              <span>近10场胜率: </span>
              <span className={cn(
                "font-gaming",
                recentWinRate >= 50 ? "text-success" : "text-destructive"
              )}>
                {recentWinRate}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerBattleCard;
