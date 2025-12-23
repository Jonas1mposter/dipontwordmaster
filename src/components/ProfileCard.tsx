import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  User, Camera, Award, Crown, Coins, Swords, TrendingUp, 
  BookOpen, Flame, Star, Check, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  equipped_slot?: number | null;
}

interface NameCardData {
  id: string;
  name: string;
  description: string;
  background_gradient: string;
  icon: string;
  category: string;
  is_equipped: boolean;
  rank_position?: number | null;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  User,
  BookOpen,
  Flame,
  Coins,
  Crown,
  Award,
  Swords,
  TrendingUp,
  Star,
};

const ProfileCard = () => {
  const { profile } = useAuth();
  const [userBadges, setUserBadges] = useState<BadgeData[]>([]);
  const [userNameCards, setUserNameCards] = useState<NameCardData[]>([]);
  const [equippedBadges, setEquippedBadges] = useState<(BadgeData | null)[]>([null, null, null]);
  const [equippedNameCard, setEquippedNameCard] = useState<NameCardData | null>(null);
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [nameCardDialogOpen, setNameCardDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number>(0);

  useEffect(() => {
    if (profile?.id) {
      fetchUserBadges();
      fetchUserNameCards();
    }
  }, [profile?.id]);

  const fetchUserBadges = async () => {
    const { data, error } = await supabase
      .from("user_badges")
      .select(`
        badge_id,
        equipped_slot,
        badges (id, name, description, icon, category, rarity)
      `)
      .eq("profile_id", profile!.id);

    if (data) {
      const badges: BadgeData[] = data.map((ub: any) => ({
        ...ub.badges,
        equipped_slot: ub.equipped_slot,
      }));
      setUserBadges(badges);

      const equipped: (BadgeData | null)[] = [null, null, null];
      badges.forEach((b) => {
        if (b.equipped_slot !== null && b.equipped_slot >= 0 && b.equipped_slot < 3) {
          equipped[b.equipped_slot] = b;
        }
      });
      setEquippedBadges(equipped);
    }
  };

  const fetchUserNameCards = async () => {
    const { data, error } = await supabase
      .from("user_name_cards")
      .select(`
        name_card_id,
        is_equipped,
        rank_position,
        name_cards (id, name, description, background_gradient, icon, category)
      `)
      .eq("profile_id", profile!.id);

    if (data) {
      const cards: NameCardData[] = data.map((unc: any) => ({
        ...unc.name_cards,
        is_equipped: unc.is_equipped,
        rank_position: unc.rank_position,
      }));
      setUserNameCards(cards);
      const equipped = cards.find((c) => c.is_equipped);
      setEquippedNameCard(equipped || null);
    }
  };

  const handleEquipBadge = async (badge: BadgeData, slot: number) => {
    const currentBadge = equippedBadges[slot];
    if (currentBadge) {
      await supabase
        .from("user_badges")
        .update({ equipped_slot: null })
        .eq("profile_id", profile!.id)
        .eq("badge_id", currentBadge.id);
    }

    const existingSlot = equippedBadges.findIndex((b) => b?.id === badge.id);
    if (existingSlot !== -1 && existingSlot !== slot) {
      await supabase
        .from("user_badges")
        .update({ equipped_slot: null })
        .eq("profile_id", profile!.id)
        .eq("badge_id", badge.id);
    }

    await supabase
      .from("user_badges")
      .update({ equipped_slot: slot })
      .eq("profile_id", profile!.id)
      .eq("badge_id", badge.id);

    fetchUserBadges();
    setBadgeDialogOpen(false);
    toast.success("勋章已装备");
  };

  const handleUnequipBadge = async (slot: number) => {
    const badge = equippedBadges[slot];
    if (badge) {
      await supabase
        .from("user_badges")
        .update({ equipped_slot: null })
        .eq("profile_id", profile!.id)
        .eq("badge_id", badge.id);
      
      fetchUserBadges();
      toast.success("勋章已卸下");
    }
  };

  const handleEquipNameCard = async (card: NameCardData) => {
    await supabase
      .from("user_name_cards")
      .update({ is_equipped: false })
      .eq("profile_id", profile!.id);

    await supabase
      .from("user_name_cards")
      .update({ is_equipped: true })
      .eq("profile_id", profile!.id)
      .eq("name_card_id", card.id);

    fetchUserNameCards();
    setNameCardDialogOpen(false);
    toast.success("名片已装备");
  };

  const handleUnequipNameCard = async () => {
    await supabase
      .from("user_name_cards")
      .update({ is_equipped: false })
      .eq("profile_id", profile!.id);

    fetchUserNameCards();
    setNameCardDialogOpen(false);
    toast.success("名片已卸下");
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common": return "text-gray-400";
      case "rare": return "text-blue-400";
      case "epic": return "text-purple-400";
      case "legendary": return "text-amber-400";
      default: return "text-gray-400";
    }
  };

  const getIconComponent = (iconName: string) => {
    return iconMap[iconName] || Award;
  };

  if (!profile) return null;

  return (
    <Card variant="gaming" className="overflow-hidden">
      {/* 图片区（可自己上传） */}
      <div className="h-40 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 relative flex items-center justify-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-neon-pink flex items-center justify-center text-4xl font-gaming text-primary-foreground shadow-lg shadow-primary/30 border-4 border-background">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="avatar" className="w-full h-full rounded-full object-cover" />
          ) : (
            profile.username.charAt(0).toUpperCase()
          )}
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 bg-background/50 hover:bg-background/80"
          onClick={() => toast.info("头像上传功能开发中")}
        >
          <Camera className="w-4 h-4" />
        </Button>
      </div>

      <CardContent className="p-6">
        {/* 勋章区域 */}
        <div className="mb-6">
          <div className="text-xs text-muted-foreground mb-3 text-center">勋章（解锁后可选择三个进行佩戴）</div>
          <div className="flex justify-center gap-4">
            {[0, 1, 2].map((slot) => {
              const badge = equippedBadges[slot];
              return (
                <Dialog 
                  key={slot} 
                  open={badgeDialogOpen && selectedSlot === slot} 
                  onOpenChange={(open) => {
                    setBadgeDialogOpen(open);
                    if (open) setSelectedSlot(slot);
                  }}
                >
                  <DialogTrigger asChild>
                    <button
                      className={cn(
                        "w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center transition-all",
                        badge 
                          ? "border-primary bg-primary/10 hover:bg-primary/20" 
                          : "border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5"
                      )}
                    >
                      {badge ? (
                        (() => {
                          const IconComp = getIconComponent(badge.icon);
                          return <IconComp className={cn("w-8 h-8", getRarityColor(badge.rarity))} />;
                        })()
                      ) : (
                        <Award className="w-6 h-6 text-muted-foreground/50" />
                      )}
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {badge ? "更换勋章" : "选择勋章"} - 槽位 {slot + 1}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3 max-h-[60vh] overflow-y-auto">
                      {badge && (
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          onClick={() => {
                            handleUnequipBadge(slot);
                            setBadgeDialogOpen(false);
                          }}
                        >
                          <X className="w-4 h-4 mr-2" />
                          卸下当前勋章
                        </Button>
                      )}
                      {userBadges.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          暂无勋章，完成成就可获得勋章
                        </div>
                      ) : (
                        userBadges
                          .filter((b) => !equippedBadges.some((e) => e?.id === b.id) || b.id === badge?.id)
                          .map((b) => {
                            const IconComp = getIconComponent(b.icon);
                            return (
                              <Card
                                key={b.id}
                                className={cn(
                                  "cursor-pointer transition-all hover:bg-secondary/50",
                                  b.id === badge?.id && "ring-2 ring-primary"
                                )}
                                onClick={() => handleEquipBadge(b, slot)}
                              >
                                <CardContent className="p-4 flex items-center gap-3">
                                  <div className={cn(
                                    "w-12 h-12 rounded-full flex items-center justify-center",
                                    "bg-gradient-to-br from-primary/20 to-accent/20"
                                  )}>
                                    <IconComp className={cn("w-6 h-6", getRarityColor(b.rarity))} />
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-semibold">{b.name}</div>
                                    <div className="text-sm text-muted-foreground">{b.description}</div>
                                  </div>
                                  <Badge variant="outline" className={getRarityColor(b.rarity)}>
                                    {b.rarity}
                                  </Badge>
                                </CardContent>
                              </Card>
                            );
                          })
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              );
            })}
          </div>
        </div>

        {/* 名片区域 */}
        <Dialog open={nameCardDialogOpen} onOpenChange={setNameCardDialogOpen}>
          <DialogTrigger asChild>
            <div className="mb-6 cursor-pointer">
              <div className="text-xs text-muted-foreground mb-2 text-center">名片（可佩戴自己获得的名片）</div>
              {equippedNameCard ? (
                <Card className={cn(
                  "transition-all hover:scale-[1.02]",
                  `bg-gradient-to-r ${equippedNameCard.background_gradient}`
                )}>
                  <CardContent className="p-4 flex items-center gap-3 text-white">
                    {(() => {
                      const IconComp = getIconComponent(equippedNameCard.icon || "Award");
                      return <IconComp className="w-8 h-8" />;
                    })()}
                    <div className="flex-1">
                      <div className="font-gaming text-lg">{equippedNameCard.name}</div>
                      <div className="text-sm opacity-80">{equippedNameCard.description}</div>
                    </div>
                    {equippedNameCard.rank_position && (
                      <Badge variant="secondary">第{equippedNameCard.rank_position}名</Badge>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-all">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-muted-foreground">
                    <Award className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-sm">点击选择名片</span>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>选择名片</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 max-h-[60vh] overflow-y-auto">
              {equippedNameCard && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleUnequipNameCard}
                >
                  <X className="w-4 h-4 mr-2" />
                  卸下当前名片
                </Button>
              )}
              {userNameCards.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  暂无名片，在排行榜前10名可获得专属名片
                </div>
              ) : (
                userNameCards.map((card) => {
                  const IconComp = getIconComponent(card.icon || "Award");
                  return (
                    <Card
                      key={card.id}
                      className={cn(
                        "cursor-pointer transition-all hover:scale-[1.02]",
                        `bg-gradient-to-r ${card.background_gradient}`,
                        card.is_equipped && "ring-2 ring-white"
                      )}
                      onClick={() => handleEquipNameCard(card)}
                    >
                      <CardContent className="p-4 flex items-center gap-3 text-white">
                        <IconComp className="w-8 h-8" />
                        <div className="flex-1">
                          <div className="font-gaming text-lg">{card.name}</div>
                          <div className="text-sm opacity-80">{card.description}</div>
                        </div>
                        {card.rank_position && (
                          <Badge variant="secondary">第{card.rank_position}名</Badge>
                        )}
                        {card.is_equipped && <Check className="w-6 h-6" />}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* 用户名 */}
        <div className="border-t border-border/50 pt-4">
          <div className="text-center">
            <div className="font-gaming text-xl">{profile.username}</div>
            <div className="text-sm text-muted-foreground">Lv.{profile.level}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileCard;
