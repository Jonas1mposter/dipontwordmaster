import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Book, 
  Crown, 
  Coins, 
  Zap, 
  Battery, 
  Gift,
  Lock,
  Check,
  Sparkles,
  Star,
  Award,
  CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface SeasonPassItem {
  id: string;
  level: number;
  is_premium: boolean;
  reward_type: string;
  reward_value: number;
  icon: string;
  name: string;
  description: string;
}

interface UserSeasonPass {
  id: string;
  is_premium: boolean;
  current_level: number;
  current_xp: number;
  xp_to_next_level: number;
}

interface SeasonPassProps {
  grade: number;
  profileId?: string;
}

const PREMIUM_COST = 500; // 500 Dibang beans to unlock premium

const SeasonPass = ({ grade, profileId }: SeasonPassProps) => {
  const { profile, refreshProfile } = useAuth();
  const [season, setSeason] = useState<{ id: string; name: string } | null>(null);
  const [items, setItems] = useState<SeasonPassItem[]>([]);
  const [userPass, setUserPass] = useState<UserSeasonPass | null>(null);
  const [claimedRewards, setClaimedRewards] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!profileId) return;
      
      setLoading(true);
      
      // Fetch active season
      const { data: seasonData } = await supabase
        .from("seasons")
        .select("id, name")
        .eq("grade", grade)
        .eq("is_active", true)
        .single();

      if (!seasonData) {
        setLoading(false);
        return;
      }

      setSeason(seasonData);

      // Fetch season pass items
      const { data: itemsData } = await supabase
        .from("season_pass_items")
        .select("*")
        .eq("season_id", seasonData.id)
        .order("level", { ascending: true })
        .order("is_premium", { ascending: true });

      if (itemsData) {
        setItems(itemsData);
      }

      // Fetch user's season pass progress
      const { data: passData } = await supabase
        .from("user_season_pass")
        .select("*")
        .eq("profile_id", profileId)
        .eq("season_id", seasonData.id)
        .single();

      if (passData) {
        setUserPass(passData);
      } else {
        // Create new pass for user
        const { data: newPass } = await supabase
          .from("user_season_pass")
          .insert({
            profile_id: profileId,
            season_id: seasonData.id,
          })
          .select()
          .single();
        
        if (newPass) {
          setUserPass(newPass);
        }
      }

      // Fetch claimed rewards
      const { data: claimedData } = await supabase
        .from("user_pass_rewards")
        .select("season_pass_item_id")
        .eq("profile_id", profileId);

      if (claimedData) {
        setClaimedRewards(new Set(claimedData.map(r => r.season_pass_item_id)));
      }

      setLoading(false);
    };

    fetchData();
  }, [grade, profileId]);

  const handlePurchasePremium = async () => {
    if (!profileId || !userPass || !season || !profile) return;
    
    if (profile.coins < PREMIUM_COST) {
      toast.error(`狄邦豆不足！需要 ${PREMIUM_COST} 豆`);
      return;
    }

    setPurchasing(true);

    try {
      // Deduct coins
      const { error: coinError } = await supabase
        .from("profiles")
        .update({ coins: profile.coins - PREMIUM_COST })
        .eq("id", profileId);

      if (coinError) throw coinError;

      // Upgrade to premium
      const { error: passError } = await supabase
        .from("user_season_pass")
        .update({ 
          is_premium: true, 
          purchased_at: new Date().toISOString() 
        })
        .eq("id", userPass.id);

      if (passError) throw passError;

      setUserPass({ ...userPass, is_premium: true });
      refreshProfile();
      toast.success("成功解锁高级赛季手册！");
      setShowPurchaseDialog(false);
    } catch (error) {
      console.error("Purchase error:", error);
      toast.error("购买失败，请重试");
    } finally {
      setPurchasing(false);
    }
  };

  const handleClaimReward = async (item: SeasonPassItem) => {
    if (!profileId || !userPass) return;
    
    // Check if already claimed
    if (claimedRewards.has(item.id)) {
      toast.error("已经领取过了");
      return;
    }

    // Check level requirement
    if (userPass.current_level < item.level) {
      toast.error(`需要达到等级 ${item.level} 才能领取`);
      return;
    }

    // Check premium requirement
    if (item.is_premium && !userPass.is_premium) {
      toast.error("需要解锁高级版才能领取");
      return;
    }

    try {
      // Record claimed reward
      const { error: claimError } = await supabase
        .from("user_pass_rewards")
        .insert({
          profile_id: profileId,
          season_pass_item_id: item.id,
        });

      if (claimError) throw claimError;

      // Give reward based on type
      if (item.reward_type === "coins" && profile) {
        await supabase
          .from("profiles")
          .update({ coins: profile.coins + item.reward_value })
          .eq("id", profileId);
      } else if (item.reward_type === "energy" && profile) {
        await supabase
          .from("profiles")
          .update({ energy: Math.min(profile.energy + item.reward_value, profile.max_energy) })
          .eq("id", profileId);
      }
      // Other reward types would need additional handling

      setClaimedRewards(new Set([...claimedRewards, item.id]));
      refreshProfile();
      toast.success(`成功领取：${item.name}`);
    } catch (error) {
      console.error("Claim error:", error);
      toast.error("领取失败，请重试");
    }
  };

  const getRewardIcon = (iconName: string) => {
    switch (iconName) {
      case "Coins":
      case "Gem":
        return <Coins className="w-5 h-5" />;
      case "Zap":
      case "Sparkles":
        return <Zap className="w-5 h-5" />;
      case "Battery":
      case "BatteryFull":
        return <Battery className="w-5 h-5" />;
      case "Star":
        return <Star className="w-5 h-5" />;
      case "Award":
        return <Award className="w-5 h-5" />;
      case "CreditCard":
      case "Frame":
        return <CreditCard className="w-5 h-5" />;
      default:
        return <Gift className="w-5 h-5" />;
    }
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

  if (!season) {
    return (
      <Card variant="gaming">
        <CardContent className="p-8 text-center text-muted-foreground">
          当前没有进行中的赛季
        </CardContent>
      </Card>
    );
  }

  // Group items by level
  const groupedItems: Record<number, { normal?: SeasonPassItem; premium?: SeasonPassItem }> = {};
  items.forEach((item) => {
    if (!groupedItems[item.level]) {
      groupedItems[item.level] = {};
    }
    if (item.is_premium) {
      groupedItems[item.level].premium = item;
    } else {
      groupedItems[item.level].normal = item;
    }
  });

  const levels = Object.keys(groupedItems).map(Number).sort((a, b) => a - b);

  return (
    <>
      <Card variant="gaming" className="overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-amber-500/10 via-transparent to-purple-500/10">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <Book className="w-6 h-6 text-accent" />
              <span>赛季手册</span>
              <Badge variant="outline">{season.name}</Badge>
            </CardTitle>
            
            {userPass && !userPass.is_premium && (
              <Button 
                variant="hero" 
                size="sm"
                onClick={() => setShowPurchaseDialog(true)}
                className="gap-2"
              >
                <Crown className="w-4 h-4" />
                解锁高级版
              </Button>
            )}
            
            {userPass?.is_premium && (
              <Badge variant="champion" className="gap-1">
                <Crown className="w-3 h-3" />
                高级版
              </Badge>
            )}
          </div>
          
          {/* Progress bar */}
          {userPass && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">等级 {userPass.current_level}</span>
                <span className="text-muted-foreground">
                  {userPass.current_xp} / {userPass.xp_to_next_level} XP
                </span>
              </div>
              <Progress 
                value={(userPass.current_xp / userPass.xp_to_next_level) * 100} 
                className="h-3"
              />
            </div>
          )}
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[600px] p-4 space-y-3">
              {levels.map((level) => {
                const normal = groupedItems[level].normal;
                const premium = groupedItems[level].premium;
                const isUnlocked = userPass && userPass.current_level >= level;
                const isPremiumUnlocked = userPass?.is_premium;
                
                return (
                  <div 
                    key={level}
                    className={cn(
                      "relative grid grid-cols-[1fr_auto_1fr] gap-4 p-4 rounded-lg border transition-all",
                      isUnlocked 
                        ? "bg-gradient-to-r from-primary/5 via-transparent to-accent/5 border-primary/30"
                        : "bg-card/50 border-border/30 opacity-60"
                    )}
                  >
                    {/* Normal reward */}
                    {normal && (
                      <div className={cn(
                        "flex items-center gap-3 p-2 rounded-lg",
                        claimedRewards.has(normal.id) && "opacity-50"
                      )}>
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          "bg-gradient-to-br from-primary/20 to-primary/10"
                        )}>
                          {getRewardIcon(normal.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{normal.name}</div>
                          <div className="text-xs text-muted-foreground">{normal.description}</div>
                        </div>
                        {isUnlocked && !claimedRewards.has(normal.id) && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleClaimReward(normal)}
                          >
                            领取
                          </Button>
                        )}
                        {claimedRewards.has(normal.id) && (
                          <Check className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                    )}
                    
                    {/* Level indicator */}
                    <div className="flex flex-col items-center justify-center">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-gaming text-lg",
                        isUnlocked 
                          ? "bg-gradient-to-br from-primary to-accent text-white"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {level}
                      </div>
                    </div>
                    
                    {/* Premium reward */}
                    {premium && (
                      <div className={cn(
                        "flex items-center gap-3 p-2 rounded-lg relative",
                        "bg-gradient-to-br from-amber-500/10 to-purple-500/10",
                        (!isPremiumUnlocked || claimedRewards.has(premium.id)) && "opacity-50"
                      )}>
                        {!isPremiumUnlocked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg backdrop-blur-sm">
                            <Lock className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          "bg-gradient-to-br from-amber-500/30 to-purple-500/30"
                        )}>
                          {getRewardIcon(premium.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate flex items-center gap-1">
                            <Crown className="w-3 h-3 text-accent" />
                            {premium.name}
                          </div>
                          <div className="text-xs text-muted-foreground">{premium.description}</div>
                        </div>
                        {isUnlocked && isPremiumUnlocked && !claimedRewards.has(premium.id) && (
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => handleClaimReward(premium)}
                          >
                            领取
                          </Button>
                        )}
                        {claimedRewards.has(premium.id) && (
                          <Check className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-accent" />
              解锁高级赛季手册
            </DialogTitle>
            <DialogDescription>
              解锁高级版可以获得更多专属奖励！
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-accent/30">
              <h4 className="font-gaming mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                高级版专属福利
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  双倍狄邦豆奖励
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  专属头像框
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  限定名片
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  赛季专属徽章
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  超级经验加成
                </li>
              </ul>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-lg bg-card border">
              <span className="font-medium">价格</span>
              <div className="flex items-center gap-2 font-gaming text-lg">
                <Coins className="w-5 h-5 text-accent" />
                <span>{PREMIUM_COST}</span>
              </div>
            </div>
            
            {profile && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">当前余额</span>
                <span className={cn(
                  profile.coins >= PREMIUM_COST ? "text-green-500" : "text-red-500"
                )}>
                  {profile.coins} 豆
                </span>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPurchaseDialog(false)}>
              取消
            </Button>
            <Button 
              variant="hero"
              onClick={handlePurchasePremium}
              disabled={purchasing || !profile || profile.coins < PREMIUM_COST}
            >
              {purchasing ? "购买中..." : "确认购买"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SeasonPass;
