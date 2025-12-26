import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface EquippedNameCard {
  id: string;
  name: string;
  background_gradient: string;
  icon: string | null;
  rank_position: number | null;
}

const PlayerBattleCard = ({ profile, variant, className }: PlayerBattleCardProps) => {
  const [equippedBadges, setEquippedBadges] = useState<EquippedBadge[]>([]);
  const [equippedNameCard, setEquippedNameCard] = useState<EquippedNameCard | null>(null);

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

    // Fetch equipped name card
    const fetchNameCard = async () => {
      const { data } = await supabase
        .from("user_name_cards")
        .select(`
          rank_position,
          name_cards:name_card_id (
            id,
            name,
            background_gradient,
            icon
          )
        `)
        .eq("profile_id", profile.id)
        .eq("is_equipped", true)
        .single();

      if (data && data.name_cards) {
        const card = data.name_cards as any;
        setEquippedNameCard({
          id: card.id,
          name: card.name,
          background_gradient: card.background_gradient,
          icon: card.icon,
          rank_position: data.rank_position,
        });
      }
    };

    fetchBadges();
    fetchNameCard();
  }, [profile]);

  if (!profile) return null;

  const isLeft = variant === "left";
  const borderColor = isLeft ? "border-primary/50" : "border-neon-blue/50";
  const glowClass = isLeft ? "battle-glow-left" : "battle-glow-right";
  const animationClass = isLeft ? "animate-slide-in-left" : "animate-slide-in-right";
  const textColor = isLeft ? "text-primary" : "text-neon-blue";
  const avatarGradient = isLeft
    ? "from-primary to-neon-pink"
    : "from-neon-blue to-neon-cyan";

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'mythology': return 'bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white border-red-500 shadow-red-500/50 shadow-lg';
      case 'legendary': return 'bg-gradient-to-r from-amber-500 to-yellow-400 text-background border-amber-400';
      case 'epic': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-400';
      case 'rare': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-400';
      default: return 'bg-secondary text-foreground border-border';
    }
  };

  // Generate 3 badge slots (empty or filled)
  const badgeSlots = [0, 1, 2].map(slot => {
    const badge = equippedBadges.find(b => b.slot === slot + 1);
    return badge || null;
  });

  return (
    <Card 
      variant="gaming" 
      className={cn(
        "overflow-hidden w-full max-w-[280px]", 
        glowClass, 
        animationClass, 
        borderColor,
        className
      )}
    >
      {/* Avatar area */}
      <div className="relative bg-gradient-to-b from-secondary/50 to-background pt-6 pb-10 px-4">
        {/* Avatar container */}
        <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-secondary/30 border border-border/50 flex items-center justify-center">
          {profile.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt={profile.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={cn(
              "w-24 h-24 rounded-full bg-gradient-to-br flex items-center justify-center text-4xl font-gaming text-primary-foreground",
              avatarGradient
            )}>
              {profile.username.charAt(0).toUpperCase()}
            </div>
          )}
          
          {/* AI badge overlay */}
          {profile.isAI && (
            <Badge className="absolute top-2 right-2 bg-accent/90 animate-pulse text-xs">
              🤖 AI
            </Badge>
          )}
        </div>
        
        {/* Badges overlapping bottom of avatar area */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {badgeSlots.map((badge, index) => (
            <div
              key={index}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 shadow-lg transition-all",
                badge 
                  ? getRarityColor(badge.rarity)
                  : "bg-secondary/80 border-border/50 text-muted-foreground"
              )}
              title={badge?.name || "空勋章槽"}
            >
              {badge ? badge.icon : "○"}
            </div>
          ))}
        </div>
      </div>

      {/* Separator line */}
      <div className={cn("h-0.5 w-full", isLeft ? "bg-primary/50" : "bg-neon-blue/50")} />

      {/* Info section */}
      <CardContent className="p-4">
        {/* Username row */}
        <div className="flex items-center justify-between mb-3">
          <h3 className={cn("font-gaming text-lg truncate", textColor)}>
            {profile.username}
          </h3>
          <Badge variant="xp" className="shrink-0 ml-2">
            Lv.{profile.level}
          </Badge>
        </div>
        
        {/* Name card area */}
        <div 
          className={cn(
            "rounded-lg p-3 border min-h-[60px] flex items-center gap-2",
            equippedNameCard 
              ? "border-accent/30" 
              : "border-border/30 bg-secondary/20"
          )}
          style={equippedNameCard ? {
            background: equippedNameCard.background_gradient,
          } : undefined}
        >
          {equippedNameCard ? (
            <>
              {equippedNameCard.icon && (
                <span className="text-xl">{equippedNameCard.icon}</span>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-gaming text-sm text-foreground truncate">
                  {equippedNameCard.name}
                </p>
                {equippedNameCard.rank_position && (
                  <p className="text-xs text-muted-foreground">
                    #{equippedNameCard.rank_position}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 text-center">
              <p className="text-xs text-muted-foreground">
                名片区
              </p>
              <p className="text-[10px] text-muted-foreground/70">
                可以佩戴自己获得的名片
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerBattleCard;