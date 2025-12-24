import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, Gift, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Quest {
  id: string;
  title: string;
  description: string;
  quest_type: string;
  target: number;
  reward_type: "xp" | "coins" | "energy";
  reward_amount: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

interface DailyQuestProps {
  onQuestUpdate?: () => void;
}

const DailyQuest = ({ onQuestUpdate }: DailyQuestProps) => {
  const { profile, refreshProfile } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuests = async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    try {
      // Fetch daily quests
      const { data: questsData, error: questsError } = await supabase
        .from("daily_quests")
        .select("*")
        .eq("is_active", true);

      if (questsError) throw questsError;

      // Fetch user progress for today
      const today = new Date().toISOString().split("T")[0];
      const { data: progressData, error: progressError } = await supabase
        .from("user_quest_progress")
        .select("*")
        .eq("profile_id", profile.id)
        .eq("quest_date", today);

      if (progressError) throw progressError;

      // Merge quests with progress
      const mergedQuests = questsData?.map((quest) => {
        const progress = progressData?.find((p) => p.quest_id === quest.id);
        return {
          id: quest.id,
          title: quest.title,
          description: quest.description,
          quest_type: quest.quest_type,
          target: quest.target,
          reward_type: quest.reward_type as "xp" | "coins" | "energy",
          reward_amount: quest.reward_amount,
          progress: progress?.progress || 0,
          completed: progress?.completed || false,
          claimed: progress?.claimed || false,
        };
      }) || [];

      setQuests(mergedQuests);
    } catch (error) {
      console.error("Error fetching quests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuests();
  }, [profile]);

  const handleClaimReward = async (quest: Quest) => {
    if (!profile || quest.claimed) return;

    try {
      const today = new Date().toISOString().split("T")[0];

      // First check if already claimed to prevent double claiming
      const { data: existingProgress } = await supabase
        .from("user_quest_progress")
        .select("claimed")
        .eq("profile_id", profile.id)
        .eq("quest_id", quest.id)
        .eq("quest_date", today)
        .maybeSingle();

      if (existingProgress?.claimed) {
        toast.error("奖励已领取过了");
        await fetchQuests(); // Refresh to sync UI
        return;
      }

      // Update quest progress as claimed - use update if exists, insert if not
      const { data: existingRecord } = await supabase
        .from("user_quest_progress")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("quest_id", quest.id)
        .eq("quest_date", today)
        .maybeSingle();

      let updateError;
      if (existingRecord) {
        // Update existing record
        const { error } = await supabase
          .from("user_quest_progress")
          .update({
            completed: true,
            claimed: true,
          })
          .eq("id", existingRecord.id);
        updateError = error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from("user_quest_progress")
          .insert({
            profile_id: profile.id,
            quest_id: quest.id,
            quest_date: today,
            progress: quest.progress,
            completed: true,
            claimed: true,
          });
        updateError = error;
      }

      if (updateError) throw updateError;

      // Add reward to profile
      const updates: Record<string, number> = {};
      if (quest.reward_type === "xp") {
        updates.xp = profile.xp + quest.reward_amount;
      } else if (quest.reward_type === "coins") {
        updates.coins = profile.coins + quest.reward_amount;
      } else if (quest.reward_type === "energy") {
        updates.energy = Math.min(profile.max_energy, profile.energy + quest.reward_amount);
      }

      await supabase
        .from("profiles")
        .update(updates)
        .eq("id", profile.id);

      toast.success(`获得 ${quest.reward_amount} ${getRewardLabel(quest.reward_type)}！`);
      
      await refreshProfile();
      await fetchQuests();
      onQuestUpdate?.();
    } catch (error) {
      console.error("Error claiming reward:", error);
      toast.error("领取奖励失败");
    }
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case "xp": return "⭐";
      case "coins": return "🪙";
      case "energy": return "⚡";
      default: return "🎁";
    }
  };

  const getRewardLabel = (type: string) => {
    switch (type) {
      case "xp": return "经验值";
      case "coins": return "狄邦豆";
      case "energy": return "能量";
      default: return "奖励";
    }
  };

  if (!profile) {
    return (
      <Card variant="gaming" className="overflow-hidden">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="flex items-center gap-3">
            <Target className="w-6 h-6 text-primary" />
            <span>每日任务</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-muted-foreground">
          登录后查看每日任务
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card variant="gaming" className="overflow-hidden">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="flex items-center gap-3">
            <Target className="w-6 h-6 text-primary" />
            <span>每日任务</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-muted-foreground">
          加载中...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="gaming" className="overflow-hidden">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-accent/5 via-transparent to-primary/5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <Target className="w-6 h-6 text-primary" />
            <span>每日任务</span>
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            23:59 重置
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {quests.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">暂无任务</p>
        ) : (
          quests.map((quest) => (
            <div
              key={quest.id}
              className={cn(
                "p-4 rounded-xl border transition-all duration-300",
                quest.claimed
                  ? "bg-muted/30 border-border/30 opacity-60"
                  : quest.completed
                  ? "bg-success/5 border-success/30"
                  : "bg-card border-border/50 hover:border-primary/30"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {quest.claimed ? (
                      <CheckCircle className="w-4 h-4 text-muted-foreground" />
                    ) : quest.completed ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <Target className="w-4 h-4 text-primary" />
                    )}
                    <h4 className={cn(
                      "font-semibold",
                      quest.claimed ? "text-muted-foreground" : quest.completed ? "text-success" : ""
                    )}>
                      {quest.title}
                    </h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{quest.description}</p>
                </div>

                <div className="flex items-center gap-2 bg-accent/10 rounded-lg px-3 py-2 border border-accent/20">
                  <span className="text-lg">{getRewardIcon(quest.reward_type)}</span>
                  <div className="text-right">
                    <span className="font-gaming text-accent text-sm">+{quest.reward_amount}</span>
                    <p className="text-[10px] text-muted-foreground">{getRewardLabel(quest.reward_type)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">进度</span>
                  <span className="text-xs font-gaming text-primary">
                    {Math.min(quest.progress, quest.target)} / {quest.target}
                  </span>
                </div>
                <Progress
                  value={Math.min((quest.progress / quest.target) * 100, 100)}
                  variant={quest.completed ? "success" : "default"}
                  className="h-2"
                />
              </div>

              {quest.completed && !quest.claimed && (
                <Button
                  variant="gold"
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => handleClaimReward(quest)}
                >
                  <Gift className="w-4 h-4 mr-2" />
                  领取奖励
                </Button>
              )}

              {quest.claimed && (
                <p className="text-center text-xs text-muted-foreground mt-3">已领取</p>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default DailyQuest;
