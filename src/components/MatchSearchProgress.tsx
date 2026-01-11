import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Clock, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchSearchProgressProps {
  searchTime: number;
  variant?: "ranked" | "free";
  className?: string;
}

// Estimated wait times based on time of day and historical data
const getEstimatedWaitTime = (searchTime: number): number => {
  // Base estimate: 15 seconds, adjusts based on current wait
  if (searchTime < 5) return 15;
  if (searchTime < 10) return 20;
  if (searchTime < 20) return 30;
  return 45;
};

const getSearchPhase = (searchTime: number): {
  label: string;
  description: string;
  icon: "search" | "expand" | "global";
} => {
  if (searchTime < 10) {
    return {
      label: "精准匹配",
      description: "寻找ELO相近的对手",
      icon: "search",
    };
  }
  if (searchTime < 25) {
    return {
      label: "扩大范围",
      description: "放宽匹配条件",
      icon: "expand",
    };
  }
  return {
    label: "全服匹配",
    description: "搜索全年级玩家",
    icon: "global",
  };
};

const MatchSearchProgress = ({ 
  searchTime, 
  variant = "ranked",
  className 
}: MatchSearchProgressProps) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const estimatedTime = getEstimatedWaitTime(searchTime);
  const phase = getSearchPhase(searchTime);
  
  // Calculate progress percentage (capped at 95% to show it's still searching)
  const targetProgress = Math.min((searchTime / estimatedTime) * 100, 95);
  
  // Smooth animation for progress bar
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(prev => {
        const diff = targetProgress - prev;
        // Smooth easing towards target
        return prev + diff * 0.1;
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [targetProgress, animatedProgress]);

  const isRanked = variant === "ranked";
  const primaryColor = isRanked ? "primary" : "neon-cyan";
  
  // Phase indicator dots
  const phases = [
    { time: 0, label: "精准" },
    { time: 10, label: "扩大" },
    { time: 25, label: "全服" },
  ];

  return (
    <div className={cn("w-full max-w-sm mx-auto", className)}>
      {/* Progress bar container */}
      <div className="relative mb-4">
        {/* Background glow effect */}
        <div 
          className={cn(
            "absolute inset-0 rounded-full blur-md opacity-30",
            isRanked ? "bg-primary" : "bg-neon-cyan"
          )}
          style={{ width: `${animatedProgress}%` }}
        />
        
        {/* Main progress bar */}
        <div className="relative">
          <Progress 
            value={animatedProgress} 
            variant={isRanked ? "xp" : "gold"}
            className="h-3 bg-secondary/30"
          />
          
          {/* Animated shimmer effect */}
          <div 
            className="absolute inset-0 overflow-hidden rounded-full"
            style={{ width: `${animatedProgress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        </div>
        
        {/* Phase markers */}
        <div className="absolute -bottom-5 left-0 right-0 flex justify-between px-1">
          {phases.map((p, i) => {
            const isActive = searchTime >= p.time;
            const isCurrent = i === phases.length - 1 
              ? searchTime >= p.time 
              : searchTime >= p.time && searchTime < phases[i + 1]?.time;
            
            return (
              <div 
                key={p.time}
                className={cn(
                  "flex flex-col items-center transition-all duration-300",
                  isCurrent && "scale-110"
                )}
              >
                <div 
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    isActive 
                      ? isRanked 
                        ? "bg-primary shadow-lg shadow-primary/50" 
                        : "bg-neon-cyan shadow-lg shadow-neon-cyan/50"
                      : "bg-muted-foreground/30"
                  )}
                />
                <span 
                  className={cn(
                    "text-[10px] mt-1 transition-colors duration-300",
                    isCurrent 
                      ? isRanked ? "text-primary font-medium" : "text-neon-cyan font-medium"
                      : "text-muted-foreground/50"
                  )}
                >
                  {p.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Current phase info */}
      <div className="mt-8 text-center">
        <div className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-500",
          isRanked 
            ? "bg-primary/10 border-primary/30 text-primary" 
            : "bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan"
        )}>
          {phase.icon === "search" && <Users className="w-4 h-4" />}
          {phase.icon === "expand" && <Zap className="w-4 h-4" />}
          {phase.icon === "global" && <Users className="w-4 h-4 animate-pulse" />}
          <span className="font-gaming text-sm">{phase.label}</span>
        </div>
        
        <p className="text-xs text-muted-foreground mt-2 animate-fade-in">
          {phase.description}
        </p>
      </div>
      
      {/* Estimated time */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>预计等待: </span>
        <span className={cn(
          "font-mono",
          isRanked ? "text-primary" : "text-neon-cyan"
        )}>
          ~{Math.max(estimatedTime - searchTime, 5)}s
        </span>
      </div>
      
      {/* Animated particles along the progress bar */}
      <div className="relative h-1 mt-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "absolute w-1 h-1 rounded-full animate-pulse",
              isRanked ? "bg-primary" : "bg-neon-cyan"
            )}
            style={{
              left: `${(animatedProgress * 0.3) + (i * 15)}%`,
              opacity: animatedProgress > i * 20 ? 0.6 : 0,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default MatchSearchProgress;
