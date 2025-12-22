import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Star, CheckCircle, Play, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Level {
  id: number;
  name: string;
  wordCount: number;
  status: "locked" | "available" | "completed";
  stars: number;
  energyCost: number;
}

interface LevelProgressProps {
  levels: Level[];
  onSelectLevel: (levelId: number) => void;
}

const LevelProgress = ({ levels, onSelectLevel }: LevelProgressProps) => {
  return (
    <div className="space-y-4">
      {levels.map((level, index) => (
        <Card
          key={level.id}
          variant={level.status === "completed" ? "gold" : level.status === "available" ? "glow" : "default"}
          className={cn(
            "transition-all duration-300 animate-slide-up",
            level.status === "locked" && "opacity-60",
            level.status === "available" && "hover:scale-[1.02]"
          )}
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Level Icon */}
              <div className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center shadow-lg",
                level.status === "completed" && "bg-gradient-to-br from-success to-emerald-600 shadow-success/30",
                level.status === "available" && "bg-gradient-to-br from-primary to-neon-pink shadow-primary/30",
                level.status === "locked" && "bg-secondary"
              )}>
                {level.status === "locked" && <Lock className="w-6 h-6 text-muted-foreground" />}
                {level.status === "available" && <Play className="w-6 h-6 text-primary-foreground" />}
                {level.status === "completed" && <CheckCircle className="w-6 h-6 text-success-foreground" />}
              </div>

              {/* Level Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-gaming text-base">{level.name}</h3>
                  {level.status === "available" && (
                    <Badge variant="energy" className="text-[10px]">
                      <Zap className="w-3 h-3 mr-1" />
                      {level.energyCost}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {level.wordCount} 个单词
                </p>

                {/* Stars */}
                {level.status === "completed" && (
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "w-4 h-4",
                          star <= level.stars
                            ? "text-accent fill-accent"
                            : "text-muted-foreground/30"
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Action */}
              {level.status === "available" && (
                <Button
                  variant="hero"
                  size="sm"
                  onClick={() => onSelectLevel(level.id)}
                >
                  开始
                </Button>
              )}
              {level.status === "completed" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectLevel(level.id)}
                >
                  重玩
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default LevelProgress;
