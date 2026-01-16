import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Star, Trophy, Flame, Clock, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import EnergyPurchaseDialog from "./EnergyPurchaseDialog";

interface PlayerStatsProps {
  username: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  energy: number;
  maxEnergy: number;
  coins: number;
  streak: number;
  rank: string;
  profileId?: string;
  onEnergyPurchased?: () => void;
}

// Calculate time until midnight (next energy restore)
const getTimeUntilMidnight = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
};

// Format milliseconds to HH:MM:SS
const formatCountdown = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const PlayerStats = ({
  username,
  level,
  xp,
  xpToNextLevel,
  energy,
  maxEnergy,
  coins,
  streak,
  rank,
  profileId,
  onEnergyPurchased,
}: PlayerStatsProps) => {
  const [countdown, setCountdown] = useState(getTimeUntilMidnight());
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const xpProgress = (xp / xpToNextLevel) * 100;
  const energyProgress = (energy / maxEnergy) * 100;
  const isEnergyFull = energy >= maxEnergy;

  // Update countdown every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getTimeUntilMidnight());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getRankVariant = (rank: string) => {
    switch (rank.toLowerCase()) {
      case "bronze":
        return "bronze";
      case "silver":
        return "silver";
      case "gold":
        return "gold";
      case "platinum":
        return "platinum";
      case "diamond":
        return "diamond";
      case "champion":
        return "champion";
      default:
        return "secondary";
    }
  };

  return (
    <Card variant="gaming" className="overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <CardContent className="relative p-6">
        <div className="flex items-center gap-4 mb-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-neon-pink flex items-center justify-center text-2xl font-gaming text-primary-foreground shadow-lg shadow-primary/30">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-background rounded-full px-2 py-0.5 border border-primary/30">
              <span className="text-xs font-gaming text-primary">Lv.{level}</span>
            </div>
          </div>

          {/* Player Info */}
          <div className="flex-1">
            <h3 className="font-gaming text-lg text-foreground mb-1">{username}</h3>
            <Badge variant={getRankVariant(rank)} className="text-xs">
              <Trophy className="w-3 h-3 mr-1" />
              {rank}
            </Badge>
          </div>

          {/* Streak */}
          <div className="flex items-center gap-1 bg-destructive/10 rounded-lg px-3 py-2 border border-destructive/20">
            <Flame className="w-5 h-5 text-destructive" />
            <span className="font-gaming text-destructive">{streak}</span>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Star className="w-3 h-3 text-primary" />
              经验值
            </span>
            <span className="text-xs font-gaming text-primary">
              {xp} / {xpToNextLevel}
            </span>
          </div>
          <Progress value={xpProgress} variant="xp" className="h-2" />
        </div>

        {/* Energy Bar with Countdown and Purchase */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Zap className="w-3 h-3 text-neon-cyan" />
              能量值
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-gaming text-neon-cyan">
                {energy} / {maxEnergy}
              </span>
              {!isEnergyFull && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5 cursor-help">
                      <Clock className="w-3 h-3" />
                      <span className="font-mono text-[10px]">{formatCountdown(countdown)}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>每天0点能量自动恢复满</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {profileId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full bg-neon-cyan/10 hover:bg-neon-cyan/20 border border-neon-cyan/30"
                      onClick={() => setShowPurchaseDialog(true)}
                    >
                      <Plus className="w-3 h-3 text-neon-cyan" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>购买能量</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          <Progress value={energyProgress} className="h-2 [&>div]:bg-neon-cyan" />
        </div>

        {/* Energy Purchase Dialog */}
        {profileId && (
          <EnergyPurchaseDialog
            open={showPurchaseDialog}
            onOpenChange={setShowPurchaseDialog}
            currentEnergy={energy}
            maxEnergy={maxEnergy}
            coins={coins}
            profileId={profileId}
            onPurchaseSuccess={onEnergyPurchased || (() => {})}
          />
        )}

        {/* Coins */}
        <div className="flex items-center justify-between bg-accent/10 rounded-lg px-4 py-3 border border-accent/20">
          <span className="text-sm text-muted-foreground">狄邦豆</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-accent/30">
              <span className="text-xs font-bold text-background">豆</span>
            </div>
            <span className="font-gaming text-lg text-accent">{coins.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerStats;
