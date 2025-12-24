import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMatchSounds } from "@/hooks/useMatchSounds";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import PlayerBattleCard from "@/components/battle/PlayerBattleCard";
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
  VolumeX,
  Loader2,
  Wifi,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateProfileWithXp } from "@/lib/levelUp";

interface Word {
  id: string;
  word: string;
  meaning: string;
  phonetic: string | null;
  grade: number;
}

interface FreeMatchBattleProps {
  onBack: () => void;
}

type MatchStatus = "idle" | "searching" | "found" | "playing" | "finished";

const FreeMatchBattle = ({ onBack }: FreeMatchBattleProps) => {
  const { profile, refreshProfile } = useAuth();
  const sounds = useMatchSounds();
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
  const [showAIOption, setShowAIOption] = useState(false);
  const [waitingMatchId, setWaitingMatchId] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [answerAnimation, setAnswerAnimation] = useState<'correct' | 'wrong' | null>(null);

  // Track online presence for free match (all grades)
  useEffect(() => {
    if (!profile) return;

    const channel = supabase.channel(`free-match-lobby`, {
      config: { presence: { key: profile.id } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setOnlineCount(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: profile.id,
            username: profile.username,
            grade: profile.grade,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  // Fetch random words for the match (mixed from both grades)
  const fetchMatchWords = useCallback(async () => {
    if (!profile) return [];
    
    // Get words from both grade 7 and grade 8
    const { data: grade7Words, error: error7 } = await supabase
      .from("words")
      .select("id, word, meaning, phonetic, grade")
      .eq("grade", 7)
      .limit(5);

    const { data: grade8Words, error: error8 } = await supabase
      .from("words")
      .select("id, word, meaning, phonetic, grade")
      .eq("grade", 8)
      .limit(5);

    if (error7 || error8) {
      console.error("Error fetching words:", error7 || error8);
      return [];
    }

    // Mix words from both grades
    const allWords = [...(grade7Words || []), ...(grade8Words || [])];
    // Shuffle the words
    const shuffled = allWords.sort(() => Math.random() - 0.5).slice(0, 10);
    return shuffled;
  }, [profile]);

  // Generate quiz options
  const generateOptions = useCallback((correctMeaning: string, allWords: Word[]) => {
    const otherMeanings = allWords
      .map(w => w.meaning)
      .filter(m => m !== correctMeaning);
    
    const shuffled = otherMeanings.sort(() => Math.random() - 0.5).slice(0, 3);
    return [...shuffled, correctMeaning].sort(() => Math.random() - 0.5);
  }, []);

  // AI opponent names
  const aiNames = ["跨年级王者", "自由之星", "词汇霸主", "无界学霸", "全能选手", "混战大师"];

  // Start match with AI opponent
  const startMatchWithAI = async () => {
    const matchWords = await fetchMatchWords();
    if (matchWords.length === 0) {
      toast.error("获取单词失败，请重试");
      setMatchStatus("idle");
      return;
    }

    const aiName = aiNames[Math.floor(Math.random() * aiNames.length)];
    const aiLevel = Math.max(1, (profile?.level || 1) + Math.floor(Math.random() * 3) - 1);
    const aiGrade = Math.random() > 0.5 ? 7 : 8;
    
    setOpponent({
      id: "ai-opponent",
      username: aiName,
      level: aiLevel,
      grade: aiGrade,
      rank_tier: profile?.rank_tier || "bronze",
      rank_stars: Math.floor(Math.random() * 3),
      isAI: true,
    });
    setWords(matchWords);
    setOptions(generateOptions(matchWords[0].meaning, matchWords));
    setMatchStatus("found");
    sounds.playMatchFound();
    
    setTimeout(() => setMatchStatus("playing"), 2000);
  };

  // Try to join an existing free match (cross-grade)
  const tryJoinExistingMatch = async (): Promise<boolean> => {
    if (!profile) return false;
    
    const matchWords = await fetchMatchWords();
    if (matchWords.length === 0) return false;

    // Get all waiting free matches (grade = 0 indicates free match)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: waitingMatches } = await supabase
      .from("ranked_matches")
      .select("*, player1:profiles!ranked_matches_player1_id_fkey(*)")
      .eq("status", "waiting")
      .eq("grade", 0) // grade = 0 for free match
      .neq("player1_id", profile.id)
      .gte("created_at", fiveMinutesAgo)
      .order("created_at", { ascending: true })
      .limit(10);

    console.log("Found waiting free matches:", waitingMatches?.length || 0);

    if (!waitingMatches || waitingMatches.length === 0) return false;

    // Try to join each match until one succeeds
    for (const matchToJoin of waitingMatches) {
      console.log("Attempting to join free match:", matchToJoin.id);
      
      const { data: updatedMatch, error: joinError } = await supabase
        .from("ranked_matches")
        .update({
          player2_id: profile.id,
          status: "in_progress",
          words: matchWords,
          started_at: new Date().toISOString(),
        })
        .eq("id", matchToJoin.id)
        .eq("status", "waiting")
        .select()
        .maybeSingle();

      if (!joinError && updatedMatch) {
        console.log("Successfully joined free match:", updatedMatch.id);
        setMatchId(matchToJoin.id);
        setOpponent(matchToJoin.player1);
        setWords(matchWords);
        setOptions(generateOptions(matchWords[0].meaning, matchWords));
        setMatchStatus("found");
        sounds.playMatchFound();
        setTimeout(() => setMatchStatus("playing"), 2000);
        return true;
      } else {
        console.log("Failed to join free match:", matchToJoin.id, joinError?.message);
      }
    }
    
    return false;
  };

  // Broadcast match request to other players
  const broadcastMatchRequest = useCallback((matchId: string) => {
    if (!profile) return;
    
    const channel = supabase.channel(`free-matchmaking-broadcast`);
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.send({
          type: 'broadcast',
          event: 'free_match_request',
          payload: {
            matchId,
            playerId: profile.id,
            username: profile.username,
            grade: profile.grade,
            timestamp: Date.now(),
          }
        });
      }
    });
  }, [profile]);

  // Start searching for a free match
  const startSearch = async () => {
    if (!profile) {
      toast.error("请先登录");
      return;
    }

    setMatchStatus("searching");
    setSearchTime(0);
    setShowAIOption(false);

    try {
      // Cancel any old waiting free matches from this user
      await supabase
        .from("ranked_matches")
        .update({ status: "cancelled" })
        .eq("player1_id", profile.id)
        .eq("status", "waiting")
        .eq("grade", 0);

      // Clean up stale free matches
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      await supabase
        .from("ranked_matches")
        .update({ status: "cancelled" })
        .eq("status", "waiting")
        .eq("grade", 0)
        .lt("created_at", fiveMinutesAgo);

      // Try to join an existing match first
      const joined = await tryJoinExistingMatch();
      if (joined) return;

      // No match to join, create our own with grade = 0 (free match)
      const { data: newMatch, error: createError } = await supabase
        .from("ranked_matches")
        .insert({
          player1_id: profile.id,
          grade: 0, // 0 indicates free match (cross-grade)
          status: "waiting",
        })
        .select()
        .single();

      if (createError) throw createError;

      console.log("Created new free match, waiting for opponent:", newMatch.id);
      setMatchId(newMatch.id);
      setWaitingMatchId(newMatch.id);
      
      broadcastMatchRequest(newMatch.id);

    } catch (error) {
      console.error("Match error:", error);
      toast.error("匹配失败，请重试");
      setMatchStatus("idle");
    }
  };

  // Realtime + Polling for reliable matchmaking
  useEffect(() => {
    if (matchStatus !== "searching" || !profile) return;

    console.log("Setting up free match subscription");
    let isActive = true;
    
    const onMatchJoined = async (matchData: any, opponentData: any, matchWords: Word[]) => {
      if (!isActive) return;
      isActive = false;
      
      console.log("Free match joined successfully:", matchData.id);
      
      if (waitingMatchId && waitingMatchId !== matchData.id) {
        await supabase
          .from("ranked_matches")
          .update({ status: "cancelled" })
          .eq("id", waitingMatchId);
      }

      setMatchId(matchData.id);
      setOpponent(opponentData);
      setWords(matchWords);
      if (matchWords.length > 0) {
        setOptions(generateOptions(matchWords[0].meaning, matchWords));
      }
      setWaitingMatchId(null);
      setMatchStatus("found");
      sounds.playMatchFound();
      setTimeout(() => setMatchStatus("playing"), 2000);
    };

    // Realtime channel for database changes
    const dbChannel = supabase
      .channel(`free-matchmaking-db-${profile.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ranked_matches",
        },
        async (payload) => {
          if (!isActive) return;
          const record = payload.new as any;
          if (!record || record.grade !== 0) return; // Only free matches
          
          console.log("Realtime DB event (free):", payload.eventType, record.id, record.status);
          
          if (payload.eventType === "INSERT" && 
              record.status === "waiting" && 
              record.player1_id !== profile.id) {
            console.log("Realtime: New waiting free match detected:", record.id);
            
            const matchWords = await fetchMatchWords();
            if (matchWords.length === 0 || !isActive) return;
            
            const { data: updatedMatch, error } = await supabase
              .from("ranked_matches")
              .update({
                player2_id: profile.id,
                status: "in_progress",
                words: matchWords,
                started_at: new Date().toISOString(),
              })
              .eq("id", record.id)
              .eq("status", "waiting")
              .select("*, player1:profiles!ranked_matches_player1_id_fkey(*)")
              .maybeSingle();

            if (!error && updatedMatch && isActive) {
              await onMatchJoined(updatedMatch, updatedMatch.player1, matchWords);
            }
          }
          
          if (payload.eventType === "UPDATE" && 
              waitingMatchId && 
              record.id === waitingMatchId && 
              record.status === "in_progress" && 
              record.player2_id) {
            console.log("Realtime: Opponent joined our free match!");
            
            const { data: opponentData } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", record.player2_id)
              .single();

            const matchWords = (record.words as any[])?.map((w: any) => ({
              id: w.id,
              word: w.word,
              meaning: w.meaning,
              phonetic: w.phonetic,
              grade: w.grade,
            })) || [];
            
            if (isActive) {
              await onMatchJoined(record, opponentData, matchWords);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("Free DB Realtime subscription status:", status);
      });

    // Broadcast channel
    const broadcastChannel = supabase
      .channel(`free-matchmaking-broadcast`)
      .on('broadcast', { event: 'free_match_request' }, async (payload) => {
        if (!isActive || !waitingMatchId) return;
        
        const data = payload.payload as any;
        if (data.playerId === profile.id) return;
        
        console.log("Broadcast: Received free match request from", data.username, "Grade", data.grade);
        
        const matchWords = await fetchMatchWords();
        if (matchWords.length === 0 || !isActive) return;
        
        const { data: updatedMatch, error } = await supabase
          .from("ranked_matches")
          .update({
            player2_id: profile.id,
            status: "in_progress",
            words: matchWords,
            started_at: new Date().toISOString(),
          })
          .eq("id", data.matchId)
          .eq("status", "waiting")
          .select("*, player1:profiles!ranked_matches_player1_id_fkey(*)")
          .maybeSingle();

        if (!error && updatedMatch && isActive) {
          await onMatchJoined(updatedMatch, updatedMatch.player1, matchWords);
        }
      })
      .subscribe((status) => {
        console.log("Free Broadcast subscription status:", status);
      });

    // Polling
    const pollInterval = setInterval(async () => {
      if (!isActive) return;
      
      if (waitingMatchId) {
        const { data: ourMatch } = await supabase
          .from("ranked_matches")
          .select("*, player2:profiles!ranked_matches_player2_id_fkey(*)")
          .eq("id", waitingMatchId)
          .single();
        
        if (ourMatch?.status === "in_progress" && ourMatch?.player2_id && isActive) {
          console.log("Polling: Opponent joined our free match!");
          const matchWords = (ourMatch.words as any[])?.map((w: any) => ({
            id: w.id,
            word: w.word,
            meaning: w.meaning,
            phonetic: w.phonetic,
            grade: w.grade,
          })) || [];
          await onMatchJoined(ourMatch, ourMatch.player2, matchWords);
          return;
        }
      }
      
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: waitingMatches } = await supabase
        .from("ranked_matches")
        .select("*, player1:profiles!ranked_matches_player1_id_fkey(*)")
        .eq("status", "waiting")
        .eq("grade", 0)
        .neq("player1_id", profile.id)
        .gte("created_at", fiveMinutesAgo)
        .order("created_at", { ascending: true })
        .limit(5);

      if (waitingMatches && waitingMatches.length > 0 && isActive) {
        console.log("Polling: Found", waitingMatches.length, "waiting free matches");
        const matchWords = await fetchMatchWords();
        if (matchWords.length === 0 || !isActive) return;
        
        for (const matchToJoin of waitingMatches) {
          const { data: updatedMatch, error } = await supabase
            .from("ranked_matches")
            .update({
              player2_id: profile.id,
              status: "in_progress",
              words: matchWords,
              started_at: new Date().toISOString(),
            })
            .eq("id", matchToJoin.id)
            .eq("status", "waiting")
            .select()
            .maybeSingle();

          if (!error && updatedMatch && isActive) {
            await onMatchJoined(updatedMatch, matchToJoin.player1, matchWords);
            return;
          }
        }
      }
    }, 1000);

    const aiTimeout = setTimeout(() => {
      setShowAIOption(true);
    }, 15000);

    return () => {
      console.log("Cleaning up free match subscription");
      isActive = false;
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(broadcastChannel);
      clearInterval(pollInterval);
      clearTimeout(aiTimeout);
    };
  }, [matchStatus, waitingMatchId, profile, generateOptions, fetchMatchWords]);

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
    setWaitingMatchId(null);
    setShowAIOption(false);
  };

  // Choose to play with AI
  const chooseAIBattle = async () => {
    if (matchId) {
      await supabase
        .from("ranked_matches")
        .update({ status: "cancelled" })
        .eq("id", matchId);
    }
    setMatchId(null);
    setWaitingMatchId(null);
    setShowAIOption(false);
    startMatchWithAI();
  };

  // Handle answer selection
  const handleAnswer = async (selectedMeaning: string) => {
    if (selectedOption || !words[currentWordIndex]) return;

    setSelectedOption(selectedMeaning);
    const isCorrect = selectedMeaning === words[currentWordIndex].meaning;
    const newScore = isCorrect ? myScore + 1 : myScore;

    if (isCorrect) {
      setMyScore(newScore);
      setAnswerAnimation('correct');
      sounds.playCorrect();
    } else {
      setAnswerAnimation('wrong');
      sounds.playWrong();
    }

    setTimeout(() => {
      setAnswerAnimation(null);
      if (newScore >= 10) {
        finishMatch(newScore);
        return;
      }
      
      if (currentWordIndex < words.length - 1) {
        setCurrentWordIndex(prev => prev + 1);
        setSelectedOption(null);
        setOptions(generateOptions(words[currentWordIndex + 1].meaning, words));
      } else {
        finishMatch(newScore);
      }
    }, 800);
  };

  // Finish match
  const finishMatch = async (finalScore?: number) => {
    setMatchStatus("finished");
    
    const playerScore = finalScore ?? myScore;
    
    const simulatedOpponentScore = playerScore >= 10 
      ? Math.floor(Math.random() * 10) 
      : Math.floor(Math.random() * (words.length + 1));
    setOpponentScore(simulatedOpponentScore);
    
    const won = playerScore > simulatedOpponentScore;
    setIsWinner(won);

    if (won) {
      sounds.playVictory();
    } else {
      sounds.playDefeat();
    }

    if (profile && matchId) {
      await supabase
        .from("ranked_matches")
        .update({
          player1_score: playerScore,
          player2_score: simulatedOpponentScore,
          winner_id: won ? profile.id : opponent?.id,
          status: "completed",
          ended_at: new Date().toISOString(),
        })
        .eq("id", matchId);

      // Free match gives bonus XP for cross-grade battle
      const xpGained = won ? 6 : 2;
      const coinsGained = won ? 3 : 1;

      await updateProfileWithXp(
        profile.id,
        profile.level,
        profile.xp,
        profile.xp_to_next_level,
        xpGained,
        {
          coins: profile.coins + coinsGained,
          wins: won ? profile.wins + 1 : profile.wins,
          losses: won ? profile.losses : profile.losses + 1,
        }
      );

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
          if (prev <= 10) {
            sounds.playUrgent();
          } else if (prev <= 30 && prev % 5 === 0) {
            sounds.playTick();
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
        setSearchTime(prev => {
          if (prev % 2 === 0) {
            sounds.playSearchingBeep();
          }
          return prev + 1;
        });
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

  const getGradeDisplay = (grade: number) => {
    return grade === 7 ? "七年级" : "八年级";
  };

  // Idle state
  if (matchStatus === "idle") {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern flex flex-col">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h1 className="font-gaming text-xl text-glow-cyan">自由服</h1>
              <Badge variant="xp" className="ml-auto">
                <Globe className="w-3 h-3 mr-1" />
                跨年级对战
              </Badge>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-center">
          <div className="text-center max-w-md mx-auto">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-neon-cyan to-neon-green rounded-2xl flex items-center justify-center shadow-lg shadow-neon-cyan/30 animate-float">
              <Globe className="w-12 h-12 text-primary-foreground" />
            </div>
            
            <h2 className="font-gaming text-3xl mb-4 text-glow-cyan">自由对决</h2>
            <p className="text-muted-foreground mb-6">
              打破年级界限！<br />
              七年级和八年级玩家自由匹配<br />
              <span className="text-neon-cyan">混合题库，更多挑战！</span>
            </p>

            {profile && (
              <Card variant="glow" className="mb-6 border-neon-cyan/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-green flex items-center justify-center text-lg font-gaming text-primary-foreground">
                        {profile.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{profile.username}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">Lv.{profile.level}</p>
                          <Badge variant="outline" className="text-xs">
                            {getGradeDisplay(profile.grade)}
                          </Badge>
                        </div>
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

            <div className="flex items-center justify-center gap-2 mb-6">
              <Badge variant="secondary">
                <Users className="w-3 h-3 mr-1" />
                {onlineCount} 人在线
              </Badge>
              <Badge variant="xp">
                <Zap className="w-3 h-3 mr-1" />
                全天开放
              </Badge>
            </div>

            <Button 
              variant="hero" 
              size="xl" 
              onClick={startSearch} 
              className="w-full bg-gradient-to-r from-neon-cyan to-neon-green hover:from-neon-cyan/90 hover:to-neon-green/90"
            >
              <Globe className="w-5 h-5 mr-2" />
              开始自由匹配
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Searching state
  if (matchStatus === "searching") {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-neon-cyan/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        <div className="text-center relative z-10">
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-neon-cyan/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-transparent border-t-neon-cyan rounded-full animate-spin" />
            <div className="absolute inset-4 border-4 border-transparent border-t-neon-green rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Globe className="w-12 h-12 text-neon-cyan" />
            </div>
          </div>
          
          <h2 className="font-gaming text-2xl mb-2 text-glow-cyan">自由匹配中</h2>
          <p className="text-muted-foreground mb-4">正在全服寻找对手...</p>
          
          <div className="flex items-center justify-center gap-2 mb-6">
            <Clock className="w-4 h-4 text-neon-cyan" />
            <span className="font-mono text-lg">{searchTime}s</span>
          </div>

          {showAIOption && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-sm text-muted-foreground">等待时间较长？</p>
              <Button variant="outline" onClick={chooseAIBattle} className="border-neon-cyan/50 hover:bg-neon-cyan/10">
                <Zap className="w-4 h-4 mr-2" />
                与AI对战
              </Button>
            </div>
          )}

          <Button variant="ghost" onClick={cancelSearch} className="mt-6">
            取消匹配
          </Button>
        </div>
      </div>
    );
  }

  // Found state
  if (matchStatus === "found") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="flex items-center justify-center gap-8 mb-8">
            <PlayerBattleCard 
              profile={profile}
              variant="left"
            />
            
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-neon-cyan to-neon-green rounded-full flex items-center justify-center animate-pulse">
                <Swords className="w-8 h-8 text-primary-foreground" />
              </div>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 font-gaming text-lg whitespace-nowrap text-glow-cyan">
                VS
              </span>
            </div>
            
            <PlayerBattleCard 
              profile={opponent}
              variant="right"
            />
          </div>
          
          <p className="text-muted-foreground animate-pulse">对战即将开始...</p>
        </div>
      </div>
    );
  }

  // Playing state
  if (matchStatus === "playing") {
    const currentWord = words[currentWordIndex];
    
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header with scores */}
        <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/50 p-4">
          <div className="container mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="text-center">
                <div className="text-sm font-semibold text-primary">{profile?.username}</div>
                <div className="text-2xl font-gaming text-success">{myScore}</div>
              </div>
              
              <div className="flex flex-col items-center">
                <Badge 
                  variant={timeLeft <= 10 ? "destructive" : "outline"}
                  className={cn("font-mono text-lg px-4", timeLeft <= 10 && "animate-pulse")}
                >
                  <Clock className="w-4 h-4 mr-1" />
                  {timeLeft}s
                </Badge>
                <span className="text-xs text-muted-foreground mt-1">
                  {currentWordIndex + 1}/{words.length}
                </span>
              </div>
              
              <div className="text-center">
                <div className="text-sm font-semibold text-neon-cyan">{opponent?.username}</div>
                <div className="text-2xl font-gaming text-destructive">{opponentScore}</div>
              </div>
            </div>
            
            <Progress 
              value={(currentWordIndex / words.length) * 100} 
              className="h-1"
            />
          </div>
        </header>

        {/* Main game area */}
        <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-center">
          {currentWord && (
            <div className={cn(
              "w-full max-w-lg transition-all duration-300",
              answerAnimation === 'correct' && "animate-correct-answer",
              answerAnimation === 'wrong' && "animate-wrong-answer"
            )}>
              <Card variant="glow" className="mb-8 border-neon-cyan/30">
                <CardContent className="p-8 text-center">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={speakWord}
                    className="mb-4"
                  >
                    <Volume2 className="w-4 h-4 mr-1" />
                    发音
                  </Button>
                  <h2 className="font-gaming text-4xl mb-2 text-glow-cyan">{currentWord.word}</h2>
                  {currentWord.phonetic && (
                    <p className="text-muted-foreground">{currentWord.phonetic}</p>
                  )}
                  <Badge variant="outline" className="mt-2 text-xs">
                    {currentWord.grade === 7 ? "七年级词汇" : "八年级词汇"}
                  </Badge>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-3">
                {options.map((option, index) => {
                  const isCorrect = option === currentWord.meaning;
                  const isSelected = selectedOption === option;
                  
                  return (
                    <Button
                      key={index}
                      variant={
                        selectedOption
                          ? isCorrect
                            ? "default"
                            : isSelected
                              ? "destructive"
                              : "outline"
                          : "outline"
                      }
                      className={cn(
                        "h-auto py-4 text-left justify-start text-base transition-all",
                        selectedOption && isCorrect && "bg-success hover:bg-success border-success",
                        !selectedOption && "hover:border-neon-cyan/50 hover:bg-neon-cyan/5"
                      )}
                      onClick={() => handleAnswer(option)}
                      disabled={!!selectedOption}
                    >
                      <span className="mr-3 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm">
                        {String.fromCharCode(65 + index)}
                      </span>
                      {option}
                      {selectedOption && isCorrect && (
                        <CheckCircle className="w-5 h-5 ml-auto text-success-foreground" />
                      )}
                      {selectedOption && isSelected && !isCorrect && (
                        <XCircle className="w-5 h-5 ml-auto" />
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Finished state
  if (matchStatus === "finished") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className={cn(
            "w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg animate-bounce-in",
            isWinner 
              ? "bg-gradient-to-br from-gold to-gold-foreground shadow-gold/30" 
              : "bg-gradient-to-br from-muted to-muted-foreground shadow-muted/30"
          )}>
            {isWinner ? (
              <Crown className="w-12 h-12 text-primary-foreground" />
            ) : (
              <Trophy className="w-12 h-12 text-muted-foreground" />
            )}
          </div>
          
          <h2 className={cn(
            "font-gaming text-3xl mb-2",
            isWinner ? "text-gold text-glow-gold" : "text-muted-foreground"
          )}>
            {isWinner ? "胜利！" : "再接再厉"}
          </h2>
          
          <p className="text-muted-foreground mb-6">
            {isWinner ? "太棒了，你赢得了这场自由对决！" : "下次一定能赢！"}
          </p>

          {/* Score display */}
          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">你的得分</p>
              <p className="text-4xl font-gaming text-success">{myScore}</p>
            </div>
            <div className="text-2xl font-gaming text-muted-foreground">:</div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">对手得分</p>
              <p className="text-4xl font-gaming text-destructive">{opponentScore}</p>
            </div>
          </div>

          {/* Rewards */}
          <Card variant="glow" className="mb-6 border-neon-cyan/30">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">获得奖励</h3>
              <div className="flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-neon-cyan" />
                  <span className="font-gaming">+{isWinner ? 60 : 25} XP</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-gold" />
                  <span className="font-gaming">+{isWinner ? 35 : 12} 狄邦豆</span>
                </div>
              </div>
              <p className="text-xs text-neon-cyan mt-2">自由服额外奖励加成！</p>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack} className="flex-1">
              返回
            </Button>
            <Button 
              variant="hero" 
              onClick={() => {
                setMatchStatus("idle");
                setMatchId(null);
                setOpponent(null);
                setWords([]);
                setCurrentWordIndex(0);
                setMyScore(0);
                setOpponentScore(0);
                setTimeLeft(60);
                setSelectedOption(null);
              }} 
              className="flex-1 bg-gradient-to-r from-neon-cyan to-neon-green"
            >
              再来一局
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default FreeMatchBattle;
