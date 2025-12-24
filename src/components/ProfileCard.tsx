import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  User, Award, Crown, Coins, Swords, TrendingUp, 
  BookOpen, Flame, Star, Check, X, Palette, Upload, Loader2, Trash2, Pencil,
  HandMetal, Sprout, BookOpenCheck, Library, Compass, GraduationCap, Sword, Medal, Gem, Trophy, Zap, LucideIcon,
  ChevronUp, Shield
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const iconMap: Record<string, LucideIcon> = {
  User,
  BookOpen,
  Flame,
  Coins,
  Crown,
  Award,
  Swords,
  TrendingUp,
  Star,
  HandMetal,
  Sprout,
  BookOpenCheck,
  Library,
  Compass,
  GraduationCap,
  Sword,
  Medal,
  Gem,
  Trophy,
  Zap,
};

// 预设背景选项
const backgroundOptions = [
  { id: "default", gradient: "from-primary/20 via-accent/10 to-primary/20", name: "默认" },
  { id: "sunset", gradient: "from-orange-500/30 via-pink-500/20 to-purple-500/30", name: "日落" },
  { id: "ocean", gradient: "from-blue-500/30 via-cyan-500/20 to-teal-500/30", name: "海洋" },
  { id: "forest", gradient: "from-green-500/30 via-emerald-500/20 to-lime-500/30", name: "森林" },
  { id: "galaxy", gradient: "from-purple-600/40 via-indigo-500/30 to-blue-600/40", name: "星空" },
  { id: "fire", gradient: "from-red-500/40 via-orange-500/30 to-yellow-500/40", name: "烈焰" },
  { id: "aurora", gradient: "from-green-400/30 via-blue-500/30 to-purple-500/30", name: "极光" },
  { id: "gold", gradient: "from-yellow-400/40 via-amber-500/30 to-orange-400/40", name: "黄金" },
];

// 段位配置 - 与 RankedBattle.tsx 保持一致
type RankTier = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "champion";

const RANK_CONFIG: Record<RankTier, {
  starsToPromote: number;
  starsLostOnLose: number;
  protectionStars: number;
}> = {
  bronze: { starsToPromote: 30, starsLostOnLose: 0, protectionStars: 0 },
  silver: { starsToPromote: 40, starsLostOnLose: 1, protectionStars: 0 },
  gold: { starsToPromote: 50, starsLostOnLose: 1, protectionStars: 1 },
  platinum: { starsToPromote: 50, starsLostOnLose: 1, protectionStars: 0 },
  diamond: { starsToPromote: 60, starsLostOnLose: 2, protectionStars: 0 },
  champion: { starsToPromote: 999, starsLostOnLose: 2, protectionStars: 0 },
};

const TIER_ORDER: RankTier[] = ["bronze", "silver", "gold", "platinum", "diamond", "champion"];

const tierNames: Record<RankTier, string> = {
  bronze: "青铜",
  silver: "白银",
  gold: "黄金",
  platinum: "铂金",
  diamond: "钻石",
  champion: "狄邦巅峰",
};

const tierColors: Record<RankTier, { gradient: string; text: string; bg: string }> = {
  bronze: { gradient: "from-amber-700 to-amber-900", text: "text-amber-500", bg: "bg-amber-500/20" },
  silver: { gradient: "from-gray-300 to-gray-500", text: "text-gray-400", bg: "bg-gray-400/20" },
  gold: { gradient: "from-yellow-400 to-amber-500", text: "text-yellow-500", bg: "bg-yellow-500/20" },
  platinum: { gradient: "from-cyan-300 to-cyan-500", text: "text-cyan-400", bg: "bg-cyan-400/20" },
  diamond: { gradient: "from-blue-300 to-purple-400", text: "text-blue-400", bg: "bg-blue-400/20" },
  champion: { gradient: "from-purple-500 to-pink-500", text: "text-purple-400", bg: "bg-purple-400/20" },
};

const ProfileCard = () => {
  const { profile, user, refreshProfile } = useAuth();
  const [userBadges, setUserBadges] = useState<BadgeData[]>([]);
  const [userNameCards, setUserNameCards] = useState<NameCardData[]>([]);
  const [equippedBadges, setEquippedBadges] = useState<(BadgeData | null)[]>([null, null, null]);
  const [equippedNameCard, setEquippedNameCard] = useState<NameCardData | null>(null);
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [nameCardDialogOpen, setNameCardDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [bgDialogOpen, setBgDialogOpen] = useState(false);
  const [profileEditDialogOpen, setProfileEditDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 背景状态
  const [backgroundType, setBackgroundType] = useState<string>("gradient");
  const [backgroundValue, setBackgroundValue] = useState<string>("default");

  useEffect(() => {
    if (profile?.id) {
      fetchUserBadges();
      fetchUserNameCards();
      setEditUsername(profile.username);
      // 加载用户保存的背景设置
      if ((profile as any).background_type) {
        setBackgroundType((profile as any).background_type);
        setBackgroundValue((profile as any).background_value || "default");
      }
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

  const handleSelectGradient = async (bgId: string) => {
    setBackgroundType("gradient");
    setBackgroundValue(bgId);
    setBgDialogOpen(false);

    // 保存到数据库
    await supabase
      .from("profiles")
      .update({ 
        background_type: "gradient", 
        background_value: bgId 
      })
      .eq("id", profile!.id);

    const bg = backgroundOptions.find(b => b.id === bgId);
    toast.success(`已切换为${bg?.name || "默认"}背景`);
  };

  const handleUploadBackground = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !user) {
      return;
    }

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    if (!fileExt || !allowedExts.includes(fileExt)) {
      toast.error("请上传 JPG、PNG、GIF 或 WebP 格式的图片");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("图片大小不能超过 5MB");
      return;
    }

    setUploading(true);

    try {
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // 删除旧的背景图片
      if (backgroundType === "image" && backgroundValue) {
        const oldPath = backgroundValue.split('/profile-backgrounds/')[1];
        if (oldPath) {
          await supabase.storage.from('profile-backgrounds').remove([oldPath]);
        }
      }

      // 上传新背景
      const { error: uploadError } = await supabase.storage
        .from('profile-backgrounds')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 获取公共 URL
      const { data: urlData } = supabase.storage
        .from('profile-backgrounds')
        .getPublicUrl(fileName);

      const newBgUrl = urlData.publicUrl;

      // 更新 profile
      await supabase
        .from('profiles')
        .update({ 
          background_type: 'image', 
          background_value: newBgUrl 
        })
        .eq('id', profile!.id);

      setBackgroundType("image");
      setBackgroundValue(newBgUrl);
      setBgDialogOpen(false);
      toast.success("背景上传成功！");
    } catch (error: any) {
      console.error("Error uploading background:", error);
      toast.error("上传失败，请重试");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveCustomBackground = async () => {
    if (backgroundType === "image" && backgroundValue) {
      const oldPath = backgroundValue.split('/profile-backgrounds/')[1];
      if (oldPath) {
        await supabase.storage.from('profile-backgrounds').remove([oldPath]);
      }
    }

    await supabase
      .from('profiles')
      .update({ 
        background_type: 'gradient', 
        background_value: 'default' 
      })
      .eq('id', profile!.id);

    setBackgroundType("gradient");
    setBackgroundValue("default");
    toast.success("已恢复默认背景");
  };

  const handleSaveProfile = async () => {
    if (!editUsername.trim()) {
      toast.error("用户名不能为空");
      return;
    }
    if (editUsername.trim().length > 20) {
      toast.error("用户名不能超过20个字符");
      return;
    }

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: editUsername.trim() })
        .eq('id', profile!.id);

      if (error) throw error;

      await refreshProfile();
      setProfileEditDialogOpen(false);
      toast.success("个人信息已更新");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("更新失败，请重试");
    } finally {
      setSavingProfile(false);
    }
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

  const getBackgroundStyle = () => {
    if (backgroundType === "image" && backgroundValue) {
      return {
        backgroundImage: `url(${backgroundValue})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    return {};
  };

  const getBackgroundGradient = () => {
    if (backgroundType === "gradient") {
      const bg = backgroundOptions.find(b => b.id === backgroundValue);
      return bg?.gradient || backgroundOptions[0].gradient;
    }
    return "";
  };

  if (!profile) return null;

  return (
    <Card variant="gaming" className="overflow-hidden">
      {/* 背景区域 - 可自定义 */}
      <div 
        className={cn(
          "h-48 relative flex items-center justify-center",
          backgroundType === "gradient" && `bg-gradient-to-br ${getBackgroundGradient()}`
        )}
        style={getBackgroundStyle()}
      >
        {/* 自定义背景按钮 */}
        <Dialog open={bgDialogOpen} onOpenChange={setBgDialogOpen}>
          <DialogTrigger asChild>
            <button className="absolute top-3 right-3 p-2 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/70 transition-all">
              <Palette className="w-4 h-4 text-foreground/70" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>自定义背景</DialogTitle>
            </DialogHeader>
            
            {/* 上传自定义图片 */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground">上传图片</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleUploadBackground}
                className="hidden"
                disabled={uploading}
              />
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      上传中...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      选择图片
                    </>
                  )}
                </Button>
                {backgroundType === "image" && (
                  <Button 
                    variant="destructive" 
                    size="icon"
                    onClick={handleRemoveCustomBackground}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">支持 JPG、PNG、GIF、WebP，最大 5MB</p>
            </div>

            {/* 预设渐变背景 */}
            <div className="space-y-3 mt-4">
              <div className="text-sm font-medium text-muted-foreground">预设背景</div>
              <div className="grid grid-cols-2 gap-3">
                {backgroundOptions.map((bg) => (
                  <button
                    key={bg.id}
                    className={cn(
                      "h-16 rounded-lg bg-gradient-to-br transition-all",
                      bg.gradient,
                      backgroundType === "gradient" && backgroundValue === bg.id 
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
                        : "hover:opacity-80"
                    )}
                    onClick={() => handleSelectGradient(bg.id)}
                  >
                    <span className="text-sm font-medium text-foreground/80 drop-shadow-md">{bg.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* 勋章区域 - 覆盖在图片底部 */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-1/2">
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
                        "w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all shadow-lg",
                        badge 
                          ? "border-primary bg-background hover:bg-primary/10" 
                          : "border-dashed border-muted-foreground/50 bg-background/90 hover:border-primary/50"
                      )}
                    >
                      {badge ? (
                        (() => {
                          const IconComp = getIconComponent(badge.icon);
                          return <IconComp className={cn("w-7 h-7", getRarityColor(badge.rarity))} />;
                        })()
                      ) : (
                        <Award className="w-5 h-5 text-muted-foreground/50" />
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
      </div>

      {/* 间隔区域给勋章留空间 */}
      <div className="h-12" />

      {/* 段位进度条区域 */}
      {profile.rank_tier && (
        <div className="px-4 py-3 border-t border-border/50">
          {(() => {
            const currentTier = (profile.rank_tier || "bronze") as RankTier;
            const currentStars = profile.rank_stars || 0;
            const config = RANK_CONFIG[currentTier];
            const tierIndex = TIER_ORDER.indexOf(currentTier);
            const nextTier = tierIndex < TIER_ORDER.length - 1 ? TIER_ORDER[tierIndex + 1] : null;
            const progressPercent = currentTier === "champion" 
              ? 100 
              : Math.min((currentStars / config.starsToPromote) * 100, 100);
            
            return (
              <div className="space-y-2">
                {/* 段位标题行 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br",
                      tierColors[currentTier].gradient
                    )}>
                      {currentTier === "champion" ? (
                        <Crown className="w-4 h-4 text-white" />
                      ) : (
                        <Shield className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div>
                      <div className={cn("font-gaming text-sm", tierColors[currentTier].text)}>
                        {tierNames[currentTier]}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {currentStars} / {config.starsToPromote} 星
                      </div>
                    </div>
                  </div>
                  
                  {/* 下一段位预览 */}
                  {nextTier && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ChevronUp className="w-3 h-3" />
                      <span>下一段位:</span>
                      <span className={cn("font-gaming", tierColors[nextTier].text)}>
                        {tierNames[nextTier]}
                      </span>
                    </div>
                  )}
                  
                  {currentTier === "champion" && (
                    <Badge variant="gold" className="text-xs">
                      <Crown className="w-3 h-3 mr-1" />
                      最高段位
                    </Badge>
                  )}
                </div>
                
                {/* 进度条 */}
                <div className="relative">
                  <div className="h-3 bg-secondary/50 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500 bg-gradient-to-r",
                        tierColors[currentTier].gradient
                      )}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  
                  {/* 星星标记 - 仅显示部分关键节点 */}
                  {currentTier !== "champion" && (
                    <div className="absolute inset-0 flex items-center">
                      {[0.25, 0.5, 0.75].map((pos) => (
                        <div 
                          key={pos}
                          className="absolute top-1/2 -translate-y-1/2"
                          style={{ left: `${pos * 100}%` }}
                        >
                          <div className={cn(
                            "w-1 h-1 rounded-full",
                            progressPercent >= pos * 100 ? "bg-white/80" : "bg-muted-foreground/30"
                          )} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* 段位规则提示 */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {config.starsLostOnLose > 0 ? (
                      <span>失败扣 {config.starsLostOnLose} 星</span>
                    ) : (
                      <span className="text-success">失败不扣星</span>
                    )}
                    {config.protectionStars > 0 && (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="text-accent">{config.protectionStars} 星保护</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-accent fill-accent" />
                    <span>胜利 +1 星</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 底部区域：用户名 + 名片区 */}
      <div className="border-t border-border/50">
        <div className="flex">
          {/* 用户名区域 - 可编辑 */}
          <Dialog open={profileEditDialogOpen} onOpenChange={(open) => {
            setProfileEditDialogOpen(open);
            if (open) setEditUsername(profile.username);
          }}>
            <DialogTrigger asChild>
              <div className="flex-1 p-4 flex items-center gap-2 cursor-pointer hover:bg-secondary/30 transition-all">
                <div className="font-gaming text-lg">{profile.username}</div>
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>编辑个人信息</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">用户名</Label>
                  <Input
                    id="username"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="输入用户名"
                    maxLength={20}
                  />
                  <p className="text-xs text-muted-foreground">最多20个字符</p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setProfileEditDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      "保存"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* 名片区域 */}
          <Dialog open={nameCardDialogOpen} onOpenChange={setNameCardDialogOpen}>
            <DialogTrigger asChild>
              <div className="flex-1 p-4 cursor-pointer border-l border-border/50 hover:bg-secondary/30 transition-all">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-xs text-muted-foreground">名片区</div>
                    {equippedNameCard ? (
                      <div className="text-sm font-medium text-primary">{equippedNameCard.name}</div>
                    ) : (
                      <div className="text-sm text-muted-foreground">可佩戴自己获得的名片</div>
                    )}
                  </div>
                </div>
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
        </div>
      </div>
    </Card>
  );
};

export default ProfileCard;
