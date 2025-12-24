import { Star, Crown, Shield, Gem, Award, Medal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type RankTier = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "champion";

interface RankDisplayProps {
  tier: RankTier;
  stars: number;
  wins: number;
  losses: number;
  compact?: boolean;
}

// Rank tier configuration - 与 RankedBattle.tsx 保持一致
// 青铜：30星晋级，失败不扣星
// 白银：40星晋级，失败扣1星
// 黄金：50星晋级，失败扣1星，1星保护
// 铂金：50星晋级，失败扣1星
// 钻石：60星晋级，失败扣2星
// 狄邦巅峰：最高段位，失败扣2星
const RANK_CONFIG: Record<RankTier, {
  starsToPromote: number;
  name: string;
  color: string;
  bgGradient: string;
  icon: typeof Crown;
}> = {
  bronze: {
    starsToPromote: 30,
    name: "青铜",
    color: "text-amber-700",
    bgGradient: "from-amber-700/20 to-amber-900/20",
    icon: Shield,
  },
  silver: {
    starsToPromote: 40,
    name: "白银",
    color: "text-gray-400",
    bgGradient: "from-gray-300/20 to-gray-500/20",
    icon: Shield,
  },
  gold: {
    starsToPromote: 50,
    name: "黄金",
    color: "text-yellow-500",
    bgGradient: "from-yellow-400/20 to-amber-500/20",
    icon: Medal,
  },
  platinum: {
    starsToPromote: 50,
    name: "铂金",
    color: "text-cyan-400",
    bgGradient: "from-cyan-300/20 to-cyan-500/20",
    icon: Award,
  },
  diamond: {
    starsToPromote: 60,
    name: "钻石",
    color: "text-blue-400",
    bgGradient: "from-blue-300/20 to-purple-400/20",
    icon: Gem,
  },
  champion: {
    starsToPromote: 999,
    name: "狄邦巅峰",
    color: "text-purple-400",
    bgGradient: "from-purple-500/20 to-pink-500/20",
    icon: Crown,
  },
};

const TIER_ORDER: RankTier[] = ["bronze", "silver", "gold", "platinum", "diamond", "champion"];

const RankDisplay = ({ tier, stars, wins, losses, compact = false }: RankDisplayProps) => {
  const config = RANK_CONFIG[tier];
  const tierIndex = TIER_ORDER.indexOf(tier);
  const TierIcon = config.icon;
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
  const progressPercent = tier === "champion" ? 100 : (stars / config.starsToPromote) * 100;
  
  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r border border-border/50",
        config.bgGradient
      )}>
        <TierIcon className={cn("w-4 h-4", config.color)} />
        <span className={cn("font-gaming text-sm", config.color)}>{config.name}</span>
        <div className="flex items-center gap-0.5">
          {[...Array(Math.min(stars, 6))].map((_, i) => (
            <Star key={i} className="w-3 h-3 text-accent fill-accent" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card variant="glow" className="overflow-hidden">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", config.bgGradient)} />
      <CardContent className="p-4 relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
              tier === "bronze" && "from-amber-600 to-amber-800",
              tier === "silver" && "from-gray-300 to-gray-500",
              tier === "gold" && "from-yellow-400 to-amber-500",
              tier === "platinum" && "from-cyan-300 to-cyan-500",
              tier === "diamond" && "from-blue-400 to-purple-500",
              tier === "champion" && "from-purple-500 to-pink-500"
            )}>
              <TierIcon className="w-6 h-6 text-white drop-shadow-lg" />
            </div>
            <div>
              <h3 className={cn("font-gaming text-lg", config.color)}>{config.name}</h3>
              <p className="text-xs text-muted-foreground">
                排位赛段位
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-xs text-muted-foreground">胜率</p>
            <p className={cn(
              "font-gaming text-lg",
              winRate >= 60 ? "text-success" : winRate >= 40 ? "text-foreground" : "text-destructive"
            )}>
              {winRate}%
            </p>
          </div>
        </div>

        {/* Star Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">
              {tier === "champion" ? "最高段位" : `晋级进度 ${stars}/${config.starsToPromote}`}
            </span>
            {/* 显示星星数量而非全部星星图标 */}
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-accent fill-accent" />
              <span className="font-gaming text-sm text-accent">{stars}</span>
            </div>
          </div>
          <Progress 
            value={progressPercent} 
            variant={tier === "champion" ? "gold" : "xp"} 
            className="h-2" 
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-background/50 rounded-lg p-2">
            <p className="font-gaming text-lg text-success">{wins}</p>
            <p className="text-xs text-muted-foreground">胜场</p>
          </div>
          <div className="bg-background/50 rounded-lg p-2">
            <p className="font-gaming text-lg text-destructive">{losses}</p>
            <p className="text-xs text-muted-foreground">负场</p>
          </div>
          <div className="bg-background/50 rounded-lg p-2">
            <p className="font-gaming text-lg text-primary">{wins + losses}</p>
            <p className="text-xs text-muted-foreground">总场</p>
          </div>
        </div>

        {/* Next Tier Hint */}
        {tier !== "champion" && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            再获得 {config.starsToPromote - stars} 星晋级到 
            <span className={RANK_CONFIG[TIER_ORDER[tierIndex + 1]].color}>
              {" "}{RANK_CONFIG[TIER_ORDER[tierIndex + 1]].name}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default RankDisplay;
