import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Swords, 
  Trophy, 
  Clock, 
  Zap, 
  Crown,
  ChevronLeft,
  Users,
  Star,
  CheckCircle,
  XCircle,
  Volume2,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Word {
  id: string;
  word: string;
  meaning: string;
  phonetic: string | null;
}

interface RankedBattleProps {
  onBack: () => void;
}

type MatchStatus = "idle" | "searching" | "found" | "playing" | "finished";

const RankedBattle = ({ onBack }: RankedBattleProps) => {
  const { profile, refreshProfile } = useAuth();
  const [matchStatus, setMatchStatus] = useState<MatchStatus>("idle");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<any>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [searchTime, setSearchTime] = useState(0);

  // Fetch random words for the match
  const fetchMatchWords = useCallback(async () => {
    if (!profile) return [];
    
    const { data, error } = await supabase
      .from("words")
      .select("id, word, meaning, phonetic")
      .eq("grade", profile.grade)
      .limit(10);

    if (error) {
      console.error("Error fetching words:", error);
      return [];
    }

    return data || [];
  }, [profile]);

  // Generate quiz options
  const generateOptions = useCallback((correctMeaning: string, allWords: Word[]) => {
    const otherMeanings = allWords
      .map(w => w.meaning)
      .filter(m => m !== correctMeaning);
    
    const shuffled = otherMeanings.sort(() => Math.random() - 0.5).slice(0, 3);
    return [...shuffled, correctMeaning].sort(() => Math.random() - 0.5);
  }, []);

  // Start searching for a match
  const startSearch = async () => {
    if (!profile) {
      toast.error("请先登录");
      return;
    }

    setMatchStatus("searching");
    setSearchTime(0);

    try {
      // Check for existing waiting matches
      const { data: existingMatches, error: searchError } = await supabase
        .from("ranked_matches")
        .select("*, player1:profiles!ranked_matches_player1_id_fkey(*)")
        .eq("status", "waiting")
        .eq("grade", profile.grade)
        .neq("player1_id", profile.id)
        .limit(1);

      if (searchError) {
        console.error("Search error:", searchError);
        throw searchError;
      }

      if (existingMatches && existingMatches.length > 0) {
        // Join existing match
        const match = existingMatches[0];
        const matchWords = await fetchMatchWords();
        
        const { error: joinError } = await supabase
          .from("ranked_matches")
          .update({
            player2_id: profile.id,
            status: "in_progress",
            words: matchWords,
            started_at: new Date().toISOString(),
          })
          .eq("id", match.id);

        if (joinError) throw joinError;

        setMatchId(match.id);
        setOpponent(match.player1);
        setWords(matchWords);
        setOptions(generateOptions(matchWords[0].meaning, matchWords));
        setMatchStatus("found");
        
        setTimeout(() => setMatchStatus("playing"), 2000);
      } else {
        // Create new match
        const { data: newMatch, error: createError } = await supabase
          .from("ranked_matches")
          .insert({
            player1_id: profile.id,
            grade: profile.grade,
            status: "waiting",
          })
          .select()
          .single();

        if (createError) throw createError;

        setMatchId(newMatch.id);
        
        // Subscribe to match updates
        const channel = supabase
          .channel(`match-${newMatch.id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "ranked_matches",
              filter: `id=eq.${newMatch.id}`,
            },
            async (payload) => {
              const updatedMatch = payload.new as any;
              
              if (updatedMatch.status === "in_progress" && updatedMatch.player2_id) {
                // Fetch opponent profile
                const { data: opponentData } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", updatedMatch.player2_id)
                  .single();

                setOpponent(opponentData);
                setWords(updatedMatch.words || []);
                if (updatedMatch.words?.length > 0) {
                  setOptions(generateOptions(updatedMatch.words[0].meaning, updatedMatch.words));
                }
                setMatchStatus("found");
                
                setTimeout(() => setMatchStatus("playing"), 2000);
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    } catch (error) {
      console.error("Match error:", error);
      toast.error("匹配失败，请重试");
      setMatchStatus("idle");
    }
  };

  // Cancel search
  const cancelSearch = async () => {
    if (matchId) {
      await supabase
        .from("ranked_matches")
        .update({ status: "cancelled" })
        .eq("id", matchId);
    }
    setMatchStatus("idle");
    setMatchId(null);
  };

  // Handle answer selection
  const handleAnswer = async (selectedMeaning: string) => {
    if (selectedOption || !words[currentWordIndex]) return;

    setSelectedOption(selectedMeaning);
    const isCorrect = selectedMeaning === words[currentWordIndex].meaning;

    if (isCorrect) {
      setMyScore(prev => prev + 1);
    }

    setTimeout(() => {
      if (currentWordIndex < words.length - 1) {
        setCurrentWordIndex(prev => prev + 1);
        setSelectedOption(null);
        setOptions(generateOptions(words[currentWordIndex + 1].meaning, words));
      } else {
        finishMatch();
      }
    }, 800);
  };

  // Finish match
  const finishMatch = async () => {
    setMatchStatus("finished");
    
    // Simulate opponent score (in real app, this would come from real-time updates)
    const simulatedOpponentScore = Math.floor(Math.random() * (words.length + 1));
    setOpponentScore(simulatedOpponentScore);
    
    const won = myScore > simulatedOpponentScore;
    setIsWinner(won);

    if (profile && matchId) {
      // Update match result
      await supabase
        .from("ranked_matches")
        .update({
          player1_score: myScore,
          player2_score: simulatedOpponentScore,
          winner_id: won ? profile.id : opponent?.id,
          status: "completed",
          ended_at: new Date().toISOString(),
        })
        .eq("id", matchId);

      // Update profile stats
      const xpGained = won ? 50 : 20;
      const coinsGained = won ? 30 : 10;
      const rankPointsChange = won ? 25 : -10;

      await supabase
        .from("profiles")
        .update({
          xp: profile.xp + xpGained,
          coins: profile.coins + coinsGained,
          wins: won ? profile.wins + 1 : profile.wins,
          losses: won ? profile.losses : profile.losses + 1,
          rank_points: Math.max(0, profile.rank_points + rankPointsChange),
        })
        .eq("id", profile.id);

      refreshProfile();
    }
  };

  // Timer
  useEffect(() => {
    if (matchStatus === "playing" && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            finishMatch();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [matchStatus, timeLeft]);

  // Search timer
  useEffect(() => {
    if (matchStatus === "searching") {
      const timer = setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [matchStatus]);

  const speakWord = () => {
    if (words[currentWordIndex]) {
      const utterance = new SpeechSynthesisUtterance(words[currentWordIndex].word);
      utterance.lang = "en-US";
      speechSynthesis.speak(utterance);
    }
  };

  const getRankDisplay = (tier: string, stars: number) => {
    const tierNames: Record<string, string> = {
      bronze: "青铜",
      silver: "白银",
      gold: "黄金",
      platinum: "铂金",
      diamond: "钻石",
      champion: "狄邦巅峰",
    };
    return `${tierNames[tier] || tier} ${stars}星`;
  };

  // Idle state - show start button
  if (matchStatus === "idle") {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern flex flex-col">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h1 className="font-gaming text-xl text-glow-purple">排位赛</h1>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-center">
          <div className="text-center max-w-md mx-auto">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary to-neon-pink rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 animate-float">
              <Swords className="w-12 h-12 text-primary-foreground" />
            </div>
            
            <h2 className="font-gaming text-3xl mb-4 text-glow-purple">词汇对决</h2>
            <p className="text-muted-foreground mb-6">
              与同年级玩家实时对战！<br />
              60秒内正确回答越多者获胜
            </p>

            {profile && (
              <Card variant="glow" className="mb-6">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-neon-pink flex items-center justify-center text-lg font-gaming text-primary-foreground">
                        {profile.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{profile.username}</p>
                        <p className="text-xs text-muted-foreground">Lv.{profile.level}</p>
                      </div>
                    </div>
                    <Badge variant="gold">
                      <Trophy className="w-3 h-3 mr-1" />
                      {getRankDisplay(profile.rank_tier, profile.rank_stars)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="text-center bg-success/10 rounded-lg p-2 border border-success/20">
                      <p className="text-2xl font-gaming text-success">{profile.wins}</p>
                      <p className="text-xs text-muted-foreground">胜场</p>
                    </div>
                    <div className="text-center bg-destructive/10 rounded-lg p-2 border border-destructive/20">
                      <p className="text-2xl font-gaming text-destructive">{profile.losses}</p>
                      <p className="text-xs text-muted-foreground">败场</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Badge variant="xp" className="mb-6">
              <Zap className="w-3 h-3 mr-1" />
              全天开放
            </Badge>

            <Button variant="hero" size="xl" onClick={startSearch} className="w-full">
              <Swords className="w-5 h-5 mr-2" />
              开始匹配
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Searching state
  if (matchStatus === "searching") {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <h2 className="font-gaming text-2xl mb-2">正在匹配对手...</h2>
          <p className="text-muted-foreground mb-4">
            搜索时间: {searchTime}秒
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
            <Users className="w-4 h-4" />
            <span>正在寻找{profile?.grade}年级玩家</span>
          </div>
          <Button variant="outline" onClick={cancelSearch}>
            取消匹配
          </Button>
        </div>
      </div>
    );
  }

  // Found opponent
  if (matchStatus === "found") {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center">
        <div className="text-center animate-scale-in">
          <h2 className="font-gaming text-2xl mb-8 text-glow-gold">对手找到！</h2>
          
          <div className="flex items-center justify-center gap-8">
            {/* Me */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-neon-pink flex items-center justify-center text-2xl font-gaming text-primary-foreground shadow-lg shadow-primary/30 mb-2">
                {profile?.username.charAt(0).toUpperCase()}
              </div>
              <p className="font-semibold">{profile?.username}</p>
              <Badge variant="xp" className="mt-1">Lv.{profile?.level}</Badge>
            </div>

            {/* VS */}
            <div className="font-gaming text-3xl text-accent">VS</div>

            {/* Opponent */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-cyan flex items-center justify-center text-2xl font-gaming text-primary-foreground shadow-lg shadow-neon-blue/30 mb-2">
                {opponent?.username?.charAt(0).toUpperCase() || "?"}
              </div>
              <p className="font-semibold">{opponent?.username || "对手"}</p>
              <Badge variant="xp" className="mt-1">Lv.{opponent?.level || 1}</Badge>
            </div>
          </div>

          <p className="text-muted-foreground mt-8">比赛即将开始...</p>
        </div>
      </div>
    );
  }

  // Playing state
  if (matchStatus === "playing" && words[currentWordIndex]) {
    const currentWord = words[currentWordIndex];
    
    return (
      <div className="min-h-screen bg-background bg-grid-pattern">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="container mx-auto px-4 py-3">
            {/* Scores */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-neon-pink flex items-center justify-center text-xs font-gaming text-primary-foreground">
                  {profile?.username.charAt(0).toUpperCase()}
                </div>
                <span className="font-gaming text-xl text-primary">{myScore}</span>
              </div>
              
              <div className={cn(
                "px-4 py-2 rounded-xl font-gaming text-lg",
                timeLeft <= 10 ? "bg-destructive/20 text-destructive animate-pulse" : "bg-accent/20 text-accent"
              )}>
                <Clock className="w-4 h-4 inline mr-2" />
                {timeLeft}s
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-gaming text-xl text-neon-blue">{opponentScore}</span>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-blue to-neon-cyan flex items-center justify-center text-xs font-gaming text-primary-foreground">
                  {opponent?.username?.charAt(0).toUpperCase() || "?"}
                </div>
              </div>
            </div>

            {/* Progress */}
            <Progress value={(currentWordIndex / words.length) * 100} variant="xp" className="h-1" />
          </div>
        </header>

        {/* Word Card */}
        <main className="container mx-auto px-4 py-8">
          <Card variant="glow" className="max-w-lg mx-auto p-8 text-center animate-scale-in">
            <div className="flex items-center justify-center gap-3 mb-6">
              <h2 className="text-4xl font-gaming text-glow-purple">{currentWord.word}</h2>
              <button
                onClick={speakWord}
                className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
              >
                <Volume2 className="w-5 h-5 text-primary" />
              </button>
            </div>
            {currentWord.phonetic && (
              <p className="text-muted-foreground text-lg mb-8">{currentWord.phonetic}</p>
            )}

            <div className="grid grid-cols-1 gap-3">
              {options.map((option, index) => {
                const isCorrect = option === currentWord.meaning;
                const isSelected = selectedOption === option;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(option)}
                    disabled={!!selectedOption}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all duration-300 font-medium",
                      !selectedOption && "hover:border-primary/50 hover:bg-primary/5 border-border bg-card",
                      selectedOption && isCorrect && "border-success bg-success/10 text-success",
                      selectedOption && isSelected && !isCorrect && "border-destructive bg-destructive/10 text-destructive",
                      selectedOption && !isSelected && !isCorrect && "opacity-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option}</span>
                      {selectedOption && isCorrect && <CheckCircle className="w-5 h-5 text-success" />}
                      {selectedOption && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-destructive" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <p className="text-center text-muted-foreground mt-4">
            第 {currentWordIndex + 1} / {words.length} 题
          </p>
        </main>
      </div>
    );
  }

  // Finished state
  if (matchStatus === "finished") {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center animate-scale-in">
          <div className={cn(
            "w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg",
            isWinner 
              ? "bg-gradient-to-br from-accent to-amber-600 shadow-accent/30" 
              : "bg-gradient-to-br from-muted to-secondary shadow-muted/30"
          )}>
            {isWinner ? (
              <Crown className="w-12 h-12 text-background" />
            ) : (
              <Trophy className="w-12 h-12 text-muted-foreground" />
            )}
          </div>

          <h2 className={cn(
            "font-gaming text-3xl mb-2",
            isWinner ? "text-glow-gold" : ""
          )}>
            {isWinner ? "胜利！" : "惜败"}
          </h2>
          <p className="text-muted-foreground mb-8">
            {isWinner ? "恭喜你赢得比赛！" : "再接再厉，下次一定赢！"}
          </p>

          {/* Score comparison */}
          <Card variant={isWinner ? "gold" : "default"} className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-primary to-neon-pink flex items-center justify-center text-lg font-gaming text-primary-foreground mb-2">
                    {profile?.username.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-semibold mb-1">{profile?.username}</p>
                  <p className="font-gaming text-3xl text-primary">{myScore}</p>
                </div>
                
                <div className="font-gaming text-2xl text-muted-foreground px-4">VS</div>
                
                <div className="text-center flex-1">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-neon-blue to-neon-cyan flex items-center justify-center text-lg font-gaming text-primary-foreground mb-2">
                    {opponent?.username?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <p className="font-semibold mb-1">{opponent?.username || "对手"}</p>
                  <p className="font-gaming text-3xl text-neon-blue">{opponentScore}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rewards */}
          <div className="flex justify-center gap-4 mb-8">
            <Badge variant="xp" className="text-base px-4 py-2">
              <Star className="w-4 h-4 mr-2" />
              +{isWinner ? 50 : 20} XP
            </Badge>
            <Badge variant="gold" className="text-base px-4 py-2">
              🪙 +{isWinner ? 30 : 10}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button variant="outline" className="flex-1" onClick={onBack}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <Button variant="hero" className="flex-1" onClick={() => {
              setMatchStatus("idle");
              setMatchId(null);
              setOpponent(null);
              setWords([]);
              setCurrentWordIndex(0);
              setMyScore(0);
              setOpponentScore(0);
              setTimeLeft(60);
              setSelectedOption(null);
              setShowResult(false);
            }}>
              <Swords className="w-4 h-4 mr-2" />
              再来一局
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default RankedBattle;
