import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar,
  Flame,
  Snowflake,
  Sun,
  Leaf,
  Sparkles,
  Star,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SeasonData {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  theme?: string;
  bonus_multiplier?: number;
  description?: string;
  icon?: string;
  primary_color?: string;
  secondary_color?: string;
}

interface SeasonThemeCardProps {
  season: SeasonData;
}

const SeasonThemeCard = ({ season }: SeasonThemeCardProps) => {
  const getSeasonProgress = () => {
    const start = new Date(season.start_date).getTime();
    const end = new Date(season.end_date).getTime();
    const now = Date.now();
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  };

  const getDaysRemaining = () => {
    const end = new Date(season.end_date).getTime();
    const now = Date.now();
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  };

  const getThemeIcon = () => {
    const iconName = season.icon || season.theme || "Calendar";
    const iconMap: Record<string, React.ReactNode> = {
      Calendar: <Calendar className="w-6 h-6" />,
      Flame: <Flame className="w-6 h-6" />,
      Snowflake: <Snowflake className="w-6 h-6" />,
      Sun: <Sun className="w-6 h-6" />,
      Leaf: <Leaf className="w-6 h-6" />,
      Sparkles: <Sparkles className="w-6 h-6" />,
      Star: <Star className="w-6 h-6" />,
      Zap: <Zap className="w-6 h-6" />,
      spring: <Leaf className="w-6 h-6" />,
      summer: <Sun className="w-6 h-6" />,
      autumn: <Leaf className="w-6 h-6" />,
      winter: <Snowflake className="w-6 h-6" />,
      default: <Calendar className="w-6 h-6" />,
    };
    return iconMap[iconName] || <Calendar className="w-6 h-6" />;
  };

  const getThemeGradient = () => {
    const theme = season.theme || "default";
    const gradients: Record<string, string> = {
      spring: "from-green-500/20 via-emerald-500/10 to-teal-500/20",
      summer: "from-amber-500/20 via-orange-500/10 to-red-500/20",
      autumn: "from-orange-500/20 via-amber-500/10 to-yellow-500/20",
      winter: "from-blue-500/20 via-indigo-500/10 to-purple-500/20",
      default: "from-primary/20 via-primary/10 to-secondary/20",
    };
    return gradients[theme] || gradients.default;
  };

  const getThemeBorder = () => {
    const theme = season.theme || "default";
    const borders: Record<string, string> = {
      spring: "border-green-500/50",
      summer: "border-amber-500/50",
      autumn: "border-orange-500/50",
      winter: "border-blue-500/50",
      default: "border-primary/50",
    };
    return borders[theme] || borders.default;
  };

  const getThemeIconColor = () => {
    const theme = season.theme || "default";
    const colors: Record<string, string> = {
      spring: "text-green-500",
      summer: "text-amber-500",
      autumn: "text-orange-500",
      winter: "text-blue-500",
      default: "text-primary",
    };
    return colors[theme] || colors.default;
  };

  const daysRemaining = getDaysRemaining();
  const progress = getSeasonProgress();
  const bonusMultiplier = season.bonus_multiplier || 1;

  return (
    <Card className={cn(
      "border-2 bg-gradient-to-br overflow-hidden relative",
      getThemeGradient(),
      getThemeBorder()
    )}>
      {/* Animated background effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn(
          "absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-30",
          season.theme === "spring" && "bg-green-500",
          season.theme === "summer" && "bg-amber-500",
          season.theme === "autumn" && "bg-orange-500",
          season.theme === "winter" && "bg-blue-500",
          (!season.theme || season.theme === "default") && "bg-primary"
        )} />
      </div>
      
      <CardContent className="pt-4 relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg bg-background/50", getThemeIconColor())}>
              {getThemeIcon()}
            </div>
            <div>
              <span className="font-bold text-lg">{season.name}</span>
              {season.description && (
                <p className="text-xs text-muted-foreground">{season.description}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary" className="font-mono">
              {daysRemaining}天后结束
            </Badge>
            {bonusMultiplier > 1 && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <Zap className="w-3 h-3 mr-1" />
                经验 x{bonusMultiplier}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="space-y-1">
          <Progress value={progress} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>赛季进度</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SeasonThemeCard;
