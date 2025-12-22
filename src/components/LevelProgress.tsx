import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Star, CheckCircle, Play, Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Level {
  id: string;
  name: string;
  description: string | null;
  word_count: number;
  energy_cost: number;
  order_index: number;
  status: "locked" | "available" | "completed";
  stars: number;
}

interface LevelProgressProps {
  grade: number;
  onSelectLevel: (levelId: string, levelName: string) => void;
}

const LevelProgress = ({ grade, onSelectLevel }: LevelProgressProps) => {
  const { profile } = useAuth();
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLevels = async () => {
      try {
        // Fetch levels for this grade
        const { data: levelsData, error: levelsError } = await supabase
          .from("levels")
          .select("*")
          .eq("grade", grade)
          .order("order_index", { ascending: true });

        if (levelsError) throw levelsError;

        let userProgress: Record<string, { status: string; stars: number }> = {};

        if (profile) {
          // Fetch user's level progress
          const { data: progressData, error: progressError } = await supabase
            .from("level_progress")
            .select("*")
            .eq("profile_id", profile.id);

          if (progressError) throw progressError;

          progressData?.forEach((p) => {
            userProgress[p.level_id] = { status: p.status, stars: p.stars };
          });
        }

        // Merge levels with progress
        const mergedLevels = levelsData?.map((level, index) => {
          const progress = userProgress[level.id];
          let status: "locked" | "available" | "completed" = "locked";
          let stars = 0;

          if (progress) {
            status = progress.status as "locked" | "available" | "completed";
            stars = progress.stars;
          } else if (index === 0) {
            // First level is always available
            status = "available";
          } else {
            // Check if previous level is completed
            const prevLevelId = levelsData[index - 1]?.id;
            const prevProgress = userProgress[prevLevelId];
            if (prevProgress?.status === "completed") {
              status = "available";
            }
          }

          return {
            id: level.id,
            name: level.name,
            description: level.description,
            word_count: level.word_count,
            energy_cost: level.energy_cost,
            order_index: level.order_index,
            status,
            stars,
          };
        }) || [];

        setLevels(mergedLevels);
      } catch (error) {
        console.error("Error fetching levels:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLevels();
  }, [grade, profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (levels.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        暂无关卡数据
      </div>
    );
  }

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

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-gaming text-base">{level.name}</h3>
                  {level.status === "available" && (
                    <Badge variant="energy" className="text-[10px]">
                      <Zap className="w-3 h-3 mr-1" />
                      {level.energy_cost}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {level.word_count} 个单词
                </p>

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

              {level.status === "available" && (
                <Button
                  variant="hero"
                  size="sm"
                  onClick={() => onSelectLevel(level.id, level.name)}
                >
                  开始
                </Button>
              )}
              {level.status === "completed" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectLevel(level.id, level.name)}
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
