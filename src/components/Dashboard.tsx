import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PlayerStats from "./PlayerStats";
import LevelProgress from "./LevelProgress";
import Leaderboard from "./Leaderboard";
import DailyQuest from "./DailyQuest";
import WordLearning from "./WordLearning";
import { 
  Swords, 
  BookOpen, 
  Trophy, 
  Settings, 
  LogOut,
  ChevronLeft,
  Sparkles
} from "lucide-react";

interface DashboardProps {
  grade: 7 | 8;
  onBack: () => void;
}

const Dashboard = ({ grade, onBack }: DashboardProps) => {
  const [activeView, setActiveView] = useState<"home" | "learn" | "battle" | "leaderboard">("home");
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  // Mock data
  const playerData = {
    username: "学霸小明",
    level: 15,
    xp: 2450,
    xpToNextLevel: 3000,
    energy: 8,
    maxEnergy: 10,
    coins: 12500,
    streak: 7,
    rank: grade === 7 ? "Gold" : "Platinum",
  };

  const levels = [
    { id: 1, name: "Unit 1 - 基础词汇", wordCount: 15, status: "completed" as const, stars: 3, energyCost: 1 },
    { id: 2, name: "Unit 1 - 进阶词汇", wordCount: 15, status: "completed" as const, stars: 2, energyCost: 1 },
    { id: 3, name: "Unit 2 - 日常用语", wordCount: 20, status: "available" as const, stars: 0, energyCost: 2 },
    { id: 4, name: "Unit 2 - 学术词汇", wordCount: 20, status: "locked" as const, stars: 0, energyCost: 2 },
    { id: 5, name: "Unit 3 - 动词短语", wordCount: 25, status: "locked" as const, stars: 0, energyCost: 3 },
  ];

  const leaderboardData = [
    { rank: 1, username: "词汇王者", level: 28, xp: 45600, tier: "Diamond" },
    { rank: 2, username: "英语达人", level: 25, xp: 38900, tier: "Diamond" },
    { rank: 3, username: "单词猎人", level: 23, xp: 35200, tier: "Platinum" },
    { rank: 4, username: "学霸小明", level: 15, xp: 24500, tier: "Gold" },
    { rank: 5, username: "努力的小张", level: 14, xp: 22100, tier: "Gold" },
    { rank: 6, username: "进步中", level: 12, xp: 18900, tier: "Silver" },
  ];

  const quests = [
    { id: "1", title: "每日学习", description: "完成3个关卡", progress: 2, target: 3, reward: { type: "xp" as const, amount: 100 }, completed: false },
    { id: "2", title: "单词挑战", description: "正确拼写20个单词", progress: 20, target: 20, reward: { type: "coins" as const, amount: 50 }, completed: true },
    { id: "3", title: "连续学习", description: "保持7天学习记录", progress: 7, target: 7, reward: { type: "energy" as const, amount: 5 }, completed: true },
  ];

  const handleSelectLevel = (levelId: number) => {
    setSelectedLevel(levelId);
    setActiveView("learn");
  };

  const handleBackFromLearning = () => {
    setSelectedLevel(null);
    setActiveView("home");
  };

  if (activeView === "learn" && selectedLevel !== null) {
    return (
      <WordLearning
        levelId={selectedLevel}
        levelName={levels.find(l => l.id === selectedLevel)?.name || ""}
        onBack={handleBackFromLearning}
        onComplete={() => {
          setSelectedLevel(null);
          setActiveView("home");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="hover:bg-primary/10"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-gaming text-xl text-glow-purple">狄邦单词通</h1>
                <Badge variant={grade === 7 ? "outline" : "champion"} className="text-xs mt-1">
                  {grade}年级专区
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="sticky top-[73px] z-40 bg-background/60 backdrop-blur-lg border-b border-border/30">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 py-2">
            {[
              { id: "home", label: "主页", icon: Sparkles },
              { id: "learn", label: "闯关", icon: BookOpen },
              { id: "battle", label: "排位赛", icon: Swords },
              { id: "leaderboard", label: "排行榜", icon: Trophy },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeView === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveView(tab.id as typeof activeView)}
                className="flex-1 md:flex-none"
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {activeView === "home" && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Player Stats & Quests */}
            <div className="space-y-6">
              <PlayerStats {...playerData} />
              <DailyQuest quests={quests} onClaimReward={(id) => console.log("Claimed:", id)} />
            </div>

            {/* Middle Column - Levels */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-gaming text-xl">学习关卡</h2>
                <Badge variant="energy">
                  Unit {Math.floor(levels.filter(l => l.status === "completed").length / 2) + 1}
                </Badge>
              </div>
              <LevelProgress levels={levels} onSelectLevel={handleSelectLevel} />
            </div>
          </div>
        )}

        {activeView === "learn" && (
          <div className="max-w-3xl mx-auto">
            <h2 className="font-gaming text-xl mb-6">选择关卡</h2>
            <LevelProgress levels={levels} onSelectLevel={handleSelectLevel} />
          </div>
        )}

        {activeView === "battle" && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary to-neon-pink rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Swords className="w-12 h-12 text-primary-foreground" />
            </div>
            <h2 className="font-gaming text-2xl mb-4 text-glow-purple">排位赛</h2>
            <p className="text-muted-foreground mb-8">
              每周二、四晚 19:00-21:00 开放<br />
              与同年级玩家实时对战，提升段位！
            </p>
            <Badge variant="gold" className="text-lg px-6 py-2">
              <Trophy className="w-5 h-5 mr-2" />
              当前段位：{playerData.rank}
            </Badge>
          </div>
        )}

        {activeView === "leaderboard" && (
          <div className="max-w-2xl mx-auto">
            <Leaderboard entries={leaderboardData} currentUser="学霸小明" />
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
