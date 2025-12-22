import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import PlayerStats from "./PlayerStats";
import LevelProgress from "./LevelProgress";
import Leaderboard from "./Leaderboard";
import DailyQuest from "./DailyQuest";
import WordLearning from "./WordLearning";
import RankedBattle from "./RankedBattle";
import { supabase } from "@/integrations/supabase/client";
import { 
  Swords, 
  BookOpen, 
  Trophy, 
  Settings, 
  LogOut,
  ChevronLeft,
  Sparkles,
  User
} from "lucide-react";
import { toast } from "sonner";

interface DashboardProps {
  grade: 7 | 8;
  onBack: () => void;
}

const Dashboard = ({ grade, onBack }: DashboardProps) => {
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();
  const [activeView, setActiveView] = useState<"home" | "learn" | "battle" | "leaderboard">("home");
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("grade", grade)
        .order("rank_points", { ascending: false })
        .limit(10);

      if (data) {
        setLeaderboardData(data.map((p, index) => ({
          rank: index + 1,
          username: p.username,
          level: p.level,
          xp: p.xp,
          tier: p.rank_tier.charAt(0).toUpperCase() + p.rank_tier.slice(1),
        })));
      }
    };

    fetchLeaderboard();
  }, [grade]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("已退出登录");
    onBack();
  };

  // Mock data for levels and quests
  const levels = [
    { id: 1, name: "Unit 1 - 基础词汇", wordCount: 15, status: "completed" as const, stars: 3, energyCost: 1 },
    { id: 2, name: "Unit 1 - 进阶词汇", wordCount: 15, status: "completed" as const, stars: 2, energyCost: 1 },
    { id: 3, name: "Unit 2 - 日常用语", wordCount: 20, status: "available" as const, stars: 0, energyCost: 2 },
    { id: 4, name: "Unit 2 - 学术词汇", wordCount: 20, status: "locked" as const, stars: 0, energyCost: 2 },
    { id: 5, name: "Unit 3 - 动词短语", wordCount: 25, status: "locked" as const, stars: 0, energyCost: 3 },
  ];

  const quests = [
    { id: "1", title: "每日学习", description: "完成3个关卡", progress: 2, target: 3, reward: { type: "xp" as const, amount: 100 }, completed: false },
    { id: "2", title: "单词挑战", description: "正确拼写20个单词", progress: 20, target: 20, reward: { type: "coins" as const, amount: 50 }, completed: true },
    { id: "3", title: "排位胜利", description: "在排位赛中获胜1次", progress: 0, target: 1, reward: { type: "energy" as const, amount: 5 }, completed: false },
  ];

  const handleSelectLevel = (levelId: number) => {
    setSelectedLevel(levelId);
    setActiveView("learn");
  };

  const handleBackFromLearning = () => {
    setSelectedLevel(null);
    setActiveView("home");
  };

  // Show ranked battle
  if (activeView === "battle") {
    if (!user) {
      return (
        <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center p-6">
          <div className="text-center">
            <Swords className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="font-gaming text-2xl mb-4">登录后参与排位赛</h2>
            <p className="text-muted-foreground mb-6">与同年级玩家实时对战！</p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => setActiveView("home")}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
              <Button variant="hero" onClick={() => navigate("/auth")}>
                <User className="w-4 h-4 mr-2" />
                登录 / 注册
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return <RankedBattle onBack={() => setActiveView("home")} />;
  }

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

  // Player data from profile or mock
  const playerData = profile ? {
    username: profile.username,
    level: profile.level,
    xp: profile.xp,
    xpToNextLevel: profile.xp_to_next_level,
    energy: profile.energy,
    maxEnergy: profile.max_energy,
    coins: profile.coins,
    streak: profile.streak,
    rank: profile.rank_tier.charAt(0).toUpperCase() + profile.rank_tier.slice(1),
  } : {
    username: "游客",
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    energy: 10,
    maxEnergy: 10,
    coins: 0,
    streak: 0,
    rank: "Bronze",
  };

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
              {!user && (
                <Button variant="hero" size="sm" onClick={() => navigate("/auth")}>
                  <User className="w-4 h-4 mr-2" />
                  登录
                </Button>
              )}
              {user && (
                <>
                  <Button variant="ghost" size="icon">
                    <Settings className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleSignOut}>
                    <LogOut className="w-5 h-5" />
                  </Button>
                </>
              )}
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

        {activeView === "leaderboard" && (
          <div className="max-w-2xl mx-auto">
            <Leaderboard entries={leaderboardData} currentUser={profile?.username} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
