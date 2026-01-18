import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  Trophy, 
  Star, 
  Sparkles, 
  Swords, 
  Gift,
  CheckCircle2,
  Lock,
  Coins
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Milestone {
  id: string;
  name: string;
  description: string;
  icon: string;
  target_type: string;
  target_value: number;
  reward_type: string;
  reward_value: number;
  is_global: boolean;
  order_index: number;
}

interface UserMilestoneProgress {
  id: string;
  milestone_id: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
  completed_at?: string | null;
}

interface SeasonMilestonesProps {
  seasonId: string;
  profileId?: string;
}

const SeasonMilestones = ({ seasonId, profileId }: SeasonMilestonesProps) => {
  const { profile, refreshProfile } = useAuth();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [userProgress, setUserProgress] = useState<Map<string, UserMilestoneProgress>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (seasonId) {
      fetchMilestones();
    }
  }, [seasonId, profileId]);

  const fetchMilestones = async () => {
    setLoading(true);
    try {
      // Fetch milestones for this season
      const { data: milestonesData, error: milestonesError } = await supabase
        .from("season_milestones")
        .select("*")
        .eq("season_id", seasonId)
        .order("order_index");

      if (milestonesError) throw milestonesError;
      if (milestonesData) {
        setMilestones(milestonesData);
      }

      // Fetch user progress if logged in
      if (profileId) {
        const { data: progressData } = await supabase
          .from("user_season_milestones")
          .select("*")
          .eq("profile_id", profileId);

        if (progressData) {
          const progressMap = new Map<string, UserMilestoneProgress>();
          progressData.forEach(p => progressMap.set(p.milestone_id, p));
          setUserProgress(progressMap);
        }

        // Calculate and update progress for each milestone
        await calculateAndUpdateProgress(milestonesData || []);
      }
    } catch (error) {
      console.error("Error fetching milestones:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAndUpdateProgress = async (milestonesData: Milestone[]) => {
    if (!profileId || !profile) return;

    // Fetch profile data for XP and wins
    const { data: profileData } = await supabase
      .from("profiles")
      .select("total_xp, wins")
      .eq("id", profileId)
      .single();

    for (const milestone of milestonesData) {
      let currentProgress = 0;

      switch (milestone.target_type) {
        case "xp":
          currentProgress = profileData?.total_xp || 0;
          break;
        case "levels":
          const { count: levelsCount } = await supabase
            .from("level_progress")
            .select("*", { count: "exact", head: true })
            .eq("profile_id", profileId)
            .eq("status", "completed");
          currentProgress = levelsCount || 0;
          break;
        case "words":
          const [{ count: englishCount }, { count: mathCount }, { count: scienceCount }] = await Promise.all([
            supabase.from("learning_progress").select("*", { count: "exact", head: true }).eq("profile_id", profileId).gte("mastery_level", 1),
            supabase.from("math_learning_progress").select("*", { count: "exact", head: true }).eq("profile_id", profileId).gte("mastery_level", 1),
            supabase.from("science_learning_progress").select("*", { count: "exact", head: true }).eq("profile_id", profileId).gte("mastery_level", 1)
          ]);
          currentProgress = (englishCount || 0) + (mathCount || 0) + (scienceCount || 0);
          break;
        case "battles":
          currentProgress = profileData?.wins || 0;
          break;
        case "accuracy":
          const { data: learningData } = await supabase
            .from("learning_progress")
            .select("correct_count, incorrect_count")
            .eq("profile_id", profileId);
          if (learningData && learningData.length >= 100) {
            const totalCorrect = learningData.reduce((sum, l) => sum + (l.correct_count || 0), 0);
            const totalAnswered = learningData.reduce((sum, l) => sum + (l.correct_count || 0) + (l.incorrect_count || 0), 0);
            currentProgress = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
          }
          break;
      }

      const completed = currentProgress >= milestone.target_value;
      const existing = userProgress.get(milestone.id);

      // Upsert progress
      await supabase
        .from("user_season_milestones")
        .upsert({
          profile_id: profileId,
          milestone_id: milestone.id,
          progress: currentProgress,
          completed,
          completed_at: completed && !existing?.completed ? new Date().toISOString() : (existing?.completed_at || null)
        }, { onConflict: "profile_id,milestone_id" });
    }

    // Refetch progress
    const { data: progressData } = await supabase
      .from("user_season_milestones")
      .select("*")
      .eq("profile_id", profileId);

    if (progressData) {
      const progressMap = new Map<string, UserMilestoneProgress>();
      progressData.forEach(p => progressMap.set(p.milestone_id, p));
      setUserProgress(progressMap);
    }
  };

  const handleClaimReward = async (milestone: Milestone) => {
    if (!profileId || !profile) return;

    const progress = userProgress.get(milestone.id);
    if (!progress?.completed || progress.claimed) return;

    try {
      // Mark as claimed
      await supabase
        .from("user_season_milestones")
        .update({ claimed: true, claimed_at: new Date().toISOString() })
        .eq("profile_id", profileId)
        .eq("milestone_id", milestone.id);

      // Apply reward
      if (milestone.reward_type === "coins") {
        await supabase
          .from("profiles")
          .update({ coins: profile.coins + milestone.reward_value })
          .eq("id", profileId);
      } else if (milestone.reward_type === "energy") {
        await supabase
          .from("profiles")
          .update({ energy: Math.min(profile.energy + milestone.reward_value, profile.max_energy) })
          .eq("id", profileId);
      }

      toast.success(`成功领取 ${milestone.reward_value} ${milestone.reward_type === 'coins' ? '狄邦豆' : '能量'}！`);
      
      await refreshProfile();
      await fetchMilestones();
    } catch (error) {
      console.error("Error claiming reward:", error);
      toast.error("领取失败，请重试");
    }
  };

  const getIcon = (iconName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      Target: <Target className="w-5 h-5" />,
      Trophy: <Trophy className="w-5 h-5" />,
      Star: <Star className="w-5 h-5" />,
      Sparkles: <Sparkles className="w-5 h-5" />,
      Swords: <Swords className="w-5 h-5" />,
    };
    return iconMap[iconName] || <Target className="w-5 h-5" />;
  };

  const getProgressPercent = (milestone: Milestone, progress?: UserMilestoneProgress) => {
    if (!progress) return 0;
    return Math.min(100, (progress.progress / milestone.target_value) * 100);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (milestones.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          赛季里程碑
          <Badge variant="secondary" className="ml-2">
            {userProgress.size > 0 ? 
              `${Array.from(userProgress.values()).filter(p => p.completed).length}/${milestones.length}` : 
              `0/${milestones.length}`
            }
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {milestones.map((milestone) => {
          const progress = userProgress.get(milestone.id);
          const isCompleted = progress?.completed || false;
          const isClaimed = progress?.claimed || false;
          const progressPercent = getProgressPercent(milestone, progress);

          return (
            <div
              key={milestone.id}
              className={cn(
                "p-3 rounded-lg border transition-all",
                isCompleted && !isClaimed && "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/50",
                isClaimed && "bg-muted/50 border-muted opacity-70",
                !isCompleted && "bg-background/50"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  isCompleted ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"
                )}>
                  {getIcon(milestone.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold truncate">{milestone.name}</span>
                    {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{milestone.description}</p>
                  <div className="flex items-center gap-2">
                    <Progress value={progressPercent} className="h-2 flex-1" />
                    <span className="text-xs font-medium min-w-[60px] text-right">
                      {progress?.progress || 0}/{milestone.target_value}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 text-amber-500">
                    <Coins className="w-4 h-4" />
                    <span className="text-sm font-bold">{milestone.reward_value}</span>
                  </div>
                  {isCompleted && !isClaimed ? (
                    <Button 
                      size="sm" 
                      className="h-7 px-2 text-xs"
                      onClick={() => handleClaimReward(milestone)}
                    >
                      <Gift className="w-3 h-3 mr-1" />
                      领取
                    </Button>
                  ) : isClaimed ? (
                    <Badge variant="secondary" className="text-xs">已领取</Badge>
                  ) : (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default SeasonMilestones;
