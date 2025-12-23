import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, Trophy, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface GradeSelectorProps {
  onSelectGrade: (grade: 7 | 8) => void;
}

const GradeSelector = ({ onSelectGrade }: GradeSelectorProps) => {
  const grades = [
    {
      grade: 7 as const,
      title: "七年级专区",
      subtitle: "Grade 7 Arena",
      wordRange: "1500-2000",
      color: "from-neon-blue to-neon-cyan",
      borderColor: "border-neon-blue/30 hover:border-neon-blue/60",
      shadowColor: "shadow-neon-blue/20 hover:shadow-neon-blue/40",
      stats: { players: 156, levels: 24 },
    },
    {
      grade: 8 as const,
      title: "八年级专区",
      subtitle: "Grade 8 Arena",
      wordRange: "2000-3000",
      color: "from-primary to-neon-pink",
      borderColor: "border-primary/30 hover:border-primary/60",
      shadowColor: "shadow-primary/20 hover:shadow-primary/40",
      stats: { players: 142, levels: 32 },
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-grid-pattern">
      {/* Ambient Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-blue/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
      </div>

      {/* Logo & Title */}
      <div className="text-center mb-12 relative z-10">
        <img 
          src="/logo.png" 
          alt="狄邦单词通" 
          className="w-24 h-24 mx-auto mb-6 rounded-2xl shadow-lg shadow-primary/30 animate-float"
        />
        <h1 className="text-4xl md:text-5xl font-gaming mb-3 text-glow-purple">
          狄邦单词通
        </h1>
        <p className="text-muted-foreground text-lg">
          无锡狄邦文理学校 · 词汇学习平台
        </p>
      </div>

      {/* Grade Selection */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl w-full relative z-10">
        {grades.map((item) => (
          <Card
            key={item.grade}
            className={cn(
              "group cursor-pointer transition-all duration-500 overflow-hidden",
              "border-2 bg-card/80 backdrop-blur-sm",
              item.borderColor,
              "shadow-xl",
              item.shadowColor,
              "hover:scale-[1.02] hover:-translate-y-1"
            )}
            onClick={() => onSelectGrade(item.grade)}
          >
            <CardContent className="p-0">
              {/* Header Gradient */}
              <div className={cn(
                "h-32 bg-gradient-to-br flex items-center justify-center relative overflow-hidden",
                item.color
              )}>
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 shimmer" />
                <div className="relative text-center">
                  <h2 className="text-2xl font-gaming text-white mb-1">
                    {item.title}
                  </h2>
                  <p className="text-white/70 text-sm font-gaming tracking-wider">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline" className="font-gaming">
                    <BookOpen className="w-3 h-3 mr-1" />
                    {item.wordRange} 词汇量
                  </Badge>
                  <Badge variant="xp">
                    {item.stats.levels} 关卡
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{item.stats.players} 玩家在线</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-accent" />
                    <span>赛季进行中</span>
                  </div>
                </div>

                <div className={cn(
                  "flex items-center justify-center gap-2 py-3 rounded-xl",
                  "bg-gradient-to-r text-white font-gaming tracking-wide",
                  "group-hover:shadow-lg transition-all duration-300",
                  item.color
                )}>
                  <span>进入专区</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <p className="text-muted-foreground/60 text-sm mt-12 text-center relative z-10">
        选择你的年级，开启词汇冒险之旅
      </p>
    </div>
  );
};

export default GradeSelector;
