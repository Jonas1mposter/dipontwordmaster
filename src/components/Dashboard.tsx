import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useBadgeChecker } from "@/hooks/useBadgeChecker";
import { useNameCardChecker } from "@/hooks/useNameCardChecker";
import { useMatchReconnect } from "@/hooks/useMatchReconnect";
import PlayerStats from "./PlayerStats";
import LevelProgress from "./LevelProgress";
import LeaderboardTabs from "./LeaderboardTabs";
import DailyQuest from "./DailyQuest";
import ChallengeArena from "./ChallengeArena";
import WordLearning from "./WordLearning";
import RankedBattle from "./RankedBattle";
import FreeMatchBattle from "./FreeMatchBattle";
import ProfileCard from "./ProfileCard";
import BadgeDisplay from "./BadgeDisplay";
import LearningStats from "./LearningStats";
import WrongWordBook from "./WrongWordBook";
import WrongWordReview from "./WrongWordReview";
import SeasonPass from "./SeasonPass";
import { FriendsPanel } from "./friends/FriendsPanel";
import { SettingsSheet } from "./SettingsSheet";
import RankDisplay from "./RankDisplay";
import SpectateView from "./SpectateView";
import { ReconnectDialog } from "./ReconnectDialog";
import { supabase } from "@/integrations/supabase/client";
import { Swords, BookOpen, Trophy, LogOut, ChevronLeft, Sparkles, User, Crown, Users, BookX, GraduationCap, Target, Globe, Book } from "lucide-react";
import { toast } from "sonner";
import logoDashboard from "@/assets/logo-dashboard.jpg";

interface DashboardProps {
  grade: 7 | 8;
}
const Dashboard = ({
  grade
}: DashboardProps) => {
  const navigate = useNavigate();
  const {
    user,
    profile,
    signOut,
    refreshProfile
  } = useAuth();
  const {
    isAdmin
  } = useAdminRole();
  const {
    checkAndAwardBadges
  } = useBadgeChecker(profile);
  const checkNameCards = useNameCardChecker(profile);
  const [activeView, setActiveView] = useState<"home" | "learn" | "battle" | "freematch" | "leaderboard" | "profile" | "friends" | "wrongbook" | "challenge" | "seasonpass" | "spectate">("home");
  const [selectedLevel, setSelectedLevel] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [friendBattleMatchId, setFriendBattleMatchId] = useState<string | null>(null);
  const [wrongWordsToReview, setWrongWordsToReview] = useState<any[] | null>(null);
  const [spectateMatchId, setSpectateMatchId] = useState<string | null>(null);
  const [reconnectMatchId, setReconnectMatchId] = useState<string | null>(null);
  const [reconnectMatchType, setReconnectMatchType] = useState<"ranked" | "free">("ranked");

  // Check for active matches to reconnect
  const { activeMatch, dismissMatch, clearActiveMatch } = useMatchReconnect({
    profileId: profile?.id,
    enabled: activeView === "home", // Only check when on home view
  });

  // Empty placeholder for removed leaderboard fetch

  const handleSignOut = async () => {
    await signOut();
    toast.success("已退出登录");
    navigate("/auth");
  };
  const handleSelectLevel = (levelId: string, levelName: string) => {
    setSelectedLevel({
      id: levelId,
      name: levelName
    });
    setActiveView("learn");
  };
  const handleBackFromLearning = () => {
    setSelectedLevel(null);
    setActiveView("home");
    setRefreshKey(prev => prev + 1);
    refreshProfile();
    // Check for new badges and name cards after learning
    setTimeout(() => {
      checkAndAwardBadges();
      checkNameCards();
    }, 500);
  };

  // Handle friend battle start
  const handleFriendBattleStart = (matchId: string) => {
    setFriendBattleMatchId(matchId);
    setActiveView("battle");
  };

  // Handle spectate
  const handleSpectate = (matchId: string) => {
    setSpectateMatchId(matchId);
    setActiveView("spectate");
  };

  // Handle reconnect to match
  const handleReconnect = () => {
    if (!activeMatch) return;
    
    setReconnectMatchId(activeMatch.id);
    setReconnectMatchType(activeMatch.type);
    clearActiveMatch();
    
    if (activeMatch.type === "ranked") {
      setActiveView("battle");
    } else {
      setActiveView("freematch");
    }
  };

  // Handle dismiss reconnect
  const handleDismissReconnect = async () => {
    await dismissMatch();
    toast.info("已放弃比赛");
  };

  // Show spectate view
  if (activeView === "spectate" && spectateMatchId) {
    return <SpectateView matchId={spectateMatchId} onBack={() => {
      setSpectateMatchId(null);
      setActiveView("friends");
    }} />;
  }

  // Show ranked battle
  if (activeView === "battle") {
    if (!user) {
      return <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center p-6">
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
        </div>;
    }
    // Use reconnectMatchId if available, otherwise friendBattleMatchId
    const matchIdToUse = reconnectMatchId || friendBattleMatchId;
    return <RankedBattle onBack={() => {
      setActiveView("home");
      setRefreshKey(prev => prev + 1);
      refreshProfile();
      setFriendBattleMatchId(null);
      setReconnectMatchId(null);
      setTimeout(() => {
        checkAndAwardBadges();
        checkNameCards();
      }, 500);
    }} initialMatchId={matchIdToUse} />;
  }

  // Show free match battle
  if (activeView === "freematch") {
    if (!user) {
      return <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center p-6">
          <div className="text-center">
            <Globe className="w-16 h-16 text-neon-cyan mx-auto mb-4" />
            <h2 className="font-gaming text-2xl mb-4">登录后参与自由服</h2>
            <p className="text-muted-foreground mb-6">跨年级自由匹配对战！</p>
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
        </div>;
    }
    return <FreeMatchBattle onBack={() => {
      setActiveView("home");
      setRefreshKey(prev => prev + 1);
      refreshProfile();
      setReconnectMatchId(null);
      setTimeout(() => {
        checkAndAwardBadges();
        checkNameCards();
      }, 500);
    }} initialMatchId={reconnectMatchType === "free" ? reconnectMatchId : null} />;
  }

  // Wrong word review mode
  if (activeView === "wrongbook" && wrongWordsToReview) {
    return <WrongWordReview words={wrongWordsToReview} onBack={() => {
      setWrongWordsToReview(null);
    }} onComplete={() => {
      setWrongWordsToReview(null);
      setRefreshKey(prev => prev + 1);
      refreshProfile();
    }} />;
  }
  if (activeView === "learn" && selectedLevel) {
    return <WordLearning levelId={selectedLevel.id} levelName={selectedLevel.name} onBack={handleBackFromLearning} onComplete={handleBackFromLearning} />;
  }

  // Player data from profile or default
  const playerData = profile ? {
    username: profile.username,
    level: profile.level,
    xp: profile.xp,
    xpToNextLevel: profile.xp_to_next_level,
    energy: profile.energy,
    maxEnergy: profile.max_energy,
    coins: profile.coins,
    streak: profile.streak,
    rank: profile.rank_tier.charAt(0).toUpperCase() + profile.rank_tier.slice(1)
  } : {
    username: "游客",
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    energy: 10,
    maxEnergy: 10,
    coins: 0,
    streak: 0,
    rank: "Bronze"
  };
  return <div className="min-h-screen bg-background bg-grid-pattern">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img alt="狄邦单词通" className="w-10 h-10 rounded-lg shadow-md" src={logoDashboard} />
              <div>
                <h1 className="font-gaming text-xl text-glow-purple">狄邦单词通</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={grade === 7 ? "outline" : "champion"} className="text-xs flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" />
                    {grade === 7 ? "七" : "八"}年级专区
                  </Badge>
                  {profile?.class && <Badge variant="secondary" className="text-xs">
                      {profile.class}班
                    </Badge>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!user && <Button variant="hero" size="sm" onClick={() => navigate("/auth")}>
                  <User className="w-4 h-4 mr-2" />
                  登录
                </Button>}
              {user && <>
                  {isAdmin && <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
                      <Crown className="w-4 h-4 mr-2" />
                      后台
                    </Button>}
                  <SettingsSheet />
                  <Button variant="ghost" size="icon" onClick={handleSignOut}>
                    <LogOut className="w-5 h-5" />
                  </Button>
                </>}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="sticky top-[73px] z-40 bg-background/60 backdrop-blur-lg border-b border-border/30">
        <div className="container mx-auto px-2">
          <div className="flex gap-0.5 py-1.5 overflow-x-auto scrollbar-hide">
            {[{
            id: "home",
            label: "主页",
            icon: Sparkles
          }, {
            id: "learn",
            label: "闯关",
            icon: BookOpen
          }, {
            id: "wrongbook",
            label: "错题本",
            icon: BookX
          }, {
            id: "battle",
            label: "排位赛",
            icon: Swords
          }, {
            id: "freematch",
            label: "自由服",
            icon: Globe
          }, {
            id: "challenge",
            label: "挑战赛",
            icon: Target
          }, {
            id: "seasonpass",
            label: "手册",
            icon: Book
          }, {
            id: "friends",
            label: "好友",
            icon: Users
          }, {
            id: "leaderboard",
            label: "排行榜",
            icon: Trophy
          }, {
            id: "profile",
            label: "个人",
            icon: User
          }].map(tab => <Button key={tab.id} variant={activeView === tab.id ? "default" : "ghost"} size="sm" onClick={() => setActiveView(tab.id as typeof activeView)} className="px-2 py-1 h-8 text-xs whitespace-nowrap">
                <tab.icon className="w-3.5 h-3.5 mr-1" />
                {tab.label}
              </Button>)}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {activeView === "home" && <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Player Stats & Rank & Quests */}
            <div className="space-y-6">
              <PlayerStats {...playerData} />
              {profile && <RankDisplay tier={profile.rank_tier as "bronze" | "silver" | "gold" | "platinum" | "diamond" | "champion"} stars={profile.rank_stars} wins={profile.wins} losses={profile.losses} />}
              <DailyQuest key={refreshKey} onQuestUpdate={() => refreshProfile()} />
            </div>

            {/* Middle Column - Levels */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-gaming text-xl">学习关卡</h2>
                <Badge variant="energy">
                  {grade}年级
                </Badge>
              </div>
              <LevelProgress key={refreshKey} grade={grade} onSelectLevel={handleSelectLevel} />
            </div>
          </div>}

        {activeView === "learn" && <div className="max-w-3xl mx-auto">
            <h2 className="font-gaming text-xl mb-6">选择关卡</h2>
            <LevelProgress key={refreshKey} grade={grade} onSelectLevel={handleSelectLevel} />
          </div>}

        {activeView === "leaderboard" && <div className="max-w-2xl mx-auto">
            <LeaderboardTabs grade={grade} currentUser={profile?.username} currentProfileId={profile?.id} currentClass={profile?.class} />
          </div>}

        {activeView === "challenge" && <div className="max-w-2xl mx-auto">
            <ChallengeArena grade={grade} currentClass={profile?.class} profileId={profile?.id} />
          </div>}

        {activeView === "seasonpass" && profile && <div className="max-w-2xl mx-auto">
            <SeasonPass grade={grade} profileId={profile.id} />
          </div>}

        {activeView === "wrongbook" && profile && <div className="max-w-2xl mx-auto">
            <WrongWordBook onStartReview={words => {
          setWrongWordsToReview(words);
        }} />
          </div>}

        {activeView === "friends" && profile && <div className="max-w-2xl mx-auto">
            <FriendsPanel currentProfileId={profile.id} currentGrade={profile.grade} onBattleStart={handleFriendBattleStart} onSpectate={handleSpectate} />
          </div>}

        {activeView === "profile" && profile && <div className="max-w-2xl mx-auto space-y-6">
            <ProfileCard />
            <LearningStats />
            <BadgeDisplay />
          </div>}
      </main>

      {/* Reconnect Dialog */}
      {activeMatch && (
        <ReconnectDialog
          open={true}
          matchType={activeMatch.type}
          opponentName={activeMatch.opponentName}
          opponentAvatar={activeMatch.opponentAvatar}
          myScore={activeMatch.myScore}
          opponentScore={activeMatch.opponentScore}
          currentQuestion={activeMatch.currentQuestion}
          timeRemaining={activeMatch.timeRemaining}
          onReconnect={handleReconnect}
          onDismiss={handleDismissReconnect}
        />
      )}
    </div>;
};
export default Dashboard;