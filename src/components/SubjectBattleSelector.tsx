import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Calculator, 
  FlaskConical, 
  Swords, 
  ChevronLeft,
  Sparkles,
  Zap,
  Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";

export type BattleSubject = "mixed" | "english" | "math" | "science";

interface SubjectBattleSelectorProps {
  onSelectSubject: (subject: BattleSubject) => void;
  onBack: () => void;
  battleType: "ranked" | "free";
}

const SubjectBattleSelector = ({ onSelectSubject, onBack, battleType }: SubjectBattleSelectorProps) => {
  const [selectedSubject, setSelectedSubject] = useState<BattleSubject | null>(null);

  const subjects = [
    {
      id: "mixed" as BattleSubject,
      name: "综合词汇",
      description: "英语、数学、科学混合出题",
      icon: Sparkles,
      color: "from-purple-500 to-pink-500",
      borderColor: "border-purple-500/50",
      bgColor: "bg-purple-500/10",
      badge: "推荐",
      badgeColor: "bg-purple-500",
    },
    {
      id: "english" as BattleSubject,
      name: "英语词汇",
      description: "仅英语课本词汇",
      icon: BookOpen,
      color: "from-blue-500 to-cyan-500",
      borderColor: "border-blue-500/50",
      bgColor: "bg-blue-500/10",
    },
    {
      id: "math" as BattleSubject,
      name: "数学词汇",
      description: "0580数学专业术语",
      icon: Calculator,
      color: "from-amber-500 to-orange-500",
      borderColor: "border-amber-500/50",
      bgColor: "bg-amber-500/10",
      badge: "新",
      badgeColor: "bg-amber-500",
    },
    {
      id: "science" as BattleSubject,
      name: "科学词汇",
      description: "物理、化学、生物术语",
      icon: FlaskConical,
      color: "from-green-500 to-emerald-500",
      borderColor: "border-green-500/50",
      bgColor: "bg-green-500/10",
      badge: "新",
      badgeColor: "bg-green-500",
    },
  ];

  const handleConfirm = () => {
    if (selectedSubject) {
      onSelectSubject(selectedSubject);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {battleType === "ranked" ? (
                <>
                  <Trophy className="w-5 h-5 text-amber-500" />
                  排位赛 - 选择科目
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 text-cyan-500" />
                  自由服 - 选择科目
                </>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">选择你想要PK的词汇类型</p>
          </div>
        </div>

        {/* Subject Cards */}
        <div className="grid gap-3">
          {subjects.map((subject) => {
            const Icon = subject.icon;
            const isSelected = selectedSubject === subject.id;
            
            return (
              <Card
                key={subject.id}
                className={cn(
                  "cursor-pointer transition-all duration-200 border-2",
                  isSelected
                    ? `${subject.borderColor} ring-2 ring-offset-2 ring-offset-background ${subject.borderColor.replace('/50', '')}`
                    : "border-border hover:border-muted-foreground/30",
                  subject.bgColor
                )}
                onClick={() => setSelectedSubject(subject.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br",
                      subject.color,
                      "shadow-lg"
                    )}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{subject.name}</h3>
                        {subject.badge && (
                          <Badge className={cn("text-xs text-white", subject.badgeColor)}>
                            {subject.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{subject.description}</p>
                    </div>
                    
                    {/* Selection indicator */}
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                      isSelected
                        ? `${subject.borderColor.replace('/50', '')} bg-gradient-to-br ${subject.color}`
                        : "border-muted-foreground/30"
                    )}>
                      {isSelected && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Confirm Button */}
        <Button
          className={cn(
            "w-full h-14 text-lg font-bold transition-all duration-300",
            selectedSubject
              ? "bg-gradient-to-r from-primary to-neon-pink hover:opacity-90"
              : "bg-muted text-muted-foreground"
          )}
          disabled={!selectedSubject}
          onClick={handleConfirm}
        >
          <Swords className="w-5 h-5 mr-2" />
          开始匹配
        </Button>

        {/* Info */}
        <p className="text-center text-xs text-muted-foreground">
          选择专项模式后，对战中将只出现该科目的词汇
        </p>
      </div>
    </div>
  );
};

export default SubjectBattleSelector;
