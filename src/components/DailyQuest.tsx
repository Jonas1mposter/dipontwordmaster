import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, Gift, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Quest {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: { type: "xp" | "coins" | "energy"; amount: number };
  completed: boolean;
}

interface DailyQuestProps {
  quests: Quest[];
  onClaimReward: (questId: string) => void;
}

const DailyQuest = ({ quests, onClaimReward }: DailyQuestProps) => {
  const getRewardIcon = (type: string) => {
    switch (type) {
      case "xp":
        return "⭐";
      case "coins":
        return "🪙";
      case "energy":
        return "⚡";
      default:
        return "🎁";
    }
  };

  const getRewardLabel = (type: string) => {
    switch (type) {
      case "xp":
        return "经验值";
      case "coins":
        return "狄邦豆";
      case "energy":
        return "能量";
      default:
        return "奖励";
    }
  };

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
        {quests.map((quest) => (
          <div
            key={quest.id}
            className={cn(
              "p-4 rounded-xl border transition-all duration-300",
              quest.completed
                ? "bg-success/5 border-success/30"
                : "bg-card border-border/50 hover:border-primary/30"
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {quest.completed ? (
                    <CheckCircle className="w-4 h-4 text-success" />
                  ) : (
                    <Target className="w-4 h-4 text-primary" />
                  )}
                  <h4 className={cn(
                    "font-semibold",
                    quest.completed && "text-success"
                  )}>
                    {quest.title}
                  </h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {quest.description}
                </p>
              </div>

              {/* Reward */}
              <div className="flex items-center gap-2 bg-accent/10 rounded-lg px-3 py-2 border border-accent/20">
                <span className="text-lg">{getRewardIcon(quest.reward.type)}</span>
                <div className="text-right">
                  <span className="font-gaming text-accent text-sm">
                    +{quest.reward.amount}
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    {getRewardLabel(quest.reward.type)}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  进度
                </span>
                <span className="text-xs font-gaming text-primary">
                  {quest.progress} / {quest.target}
                </span>
              </div>
              <Progress
                value={(quest.progress / quest.target) * 100}
                variant={quest.completed ? "success" : "default"}
                className="h-2"
              />
            </div>

            {/* Claim Button */}
            {quest.completed && quest.progress >= quest.target && (
              <Button
                variant="gold"
                size="sm"
                className="w-full mt-3"
                onClick={() => onClaimReward(quest.id)}
              >
                <Gift className="w-4 h-4 mr-2" />
                领取奖励
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default DailyQuest;
