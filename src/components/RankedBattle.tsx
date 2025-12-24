import { useState, useEffect, useCallback, useRef } from "react";
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
  Wifi
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateProfileWithXp } from "@/lib/levelUp";

interface Word {
  id: string;
  word: string;
  meaning: string;
  phonetic: string | null;
}

interface RankedBattleProps {
  onBack: () => void;
  initialMatchId?: string | null;
}

type MatchStatus = "idle" | "searching" | "found" | "playing" | "finished";

type RankTier = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "champion";

// Rank tier configuration - higher tiers are harder to climb
const RANK_CONFIG: Record<RankTier, {
  starsToPromote: number;      // Stars needed to promote to next tier
  starsLostOnLose: number;     // Stars lost on defeat
  starsGainedOnWin: number;    // Stars gained on victory
  protectionStars: number;     // Stars where you can't demote (0 = can always demote)
  minScoreToWin: number;       // Minimum score difference to gain full stars
}> = {
  bronze: {
    starsToPromote: 3,
    starsLostOnLose: 0,        // No star loss in bronze
    starsGainedOnWin: 1,
    protectionStars: 0,
    minScoreToWin: 1,
  },
  silver: {
    starsToPromote: 4,
    starsLostOnLose: 1,
    starsGainedOnWin: 1,
    protectionStars: 0,
    minScoreToWin: 2,
  },
  gold: {
    starsToPromote: 5,
    starsLostOnLose: 1,
    starsGainedOnWin: 1,
    protectionStars: 1,        // Can't demote at 1 star
    minScoreToWin: 2,
  },
  platinum: {
    starsToPromote: 5,
    starsLostOnLose: 1,
    starsGainedOnWin: 1,
    protectionStars: 0,
    minScoreToWin: 3,
  },
  diamond: {
    starsToPromote: 6,
    starsLostOnLose: 2,        // Lose 2 stars on defeat
    starsGainedOnWin: 1,
    protectionStars: 0,
    minScoreToWin: 3,
  },
  champion: {
    starsToPromote: 999,       // Can't promote beyond champion
    starsLostOnLose: 2,
    starsGainedOnWin: 1,
    protectionStars: 0,
    minScoreToWin: 4,
  },
};

const TIER_ORDER: RankTier[] = ["bronze", "silver", "gold", "platinum", "diamond", "champion"];

// Calculate rank changes based on match result
const calculateRankChange = (
  currentTier: RankTier,
  currentStars: number,
  won: boolean,
  tie: boolean,
  scoreDiff: number
): { newTier: RankTier; newStars: number; starsChanged: number; promoted: boolean; demoted: boolean } => {
  const config = RANK_CONFIG[currentTier];
  const tierIndex = TIER_ORDER.indexOf(currentTier);
  
  let newStars = currentStars;
  let newTier = currentTier;
  let starsChanged = 0;
  let promoted = false;
  let demoted = false;
  
  if (tie) {
    // No change on tie
    return { newTier, newStars, starsChanged: 0, promoted: false, demoted: false };
  }
  
  if (won) {
    // Gain stars on win
    const fullStars = scoreDiff >= config.minScoreToWin;
    starsChanged = fullStars ? config.starsGainedOnWin : config.starsGainedOnWin;
    newStars = currentStars + starsChanged;
    
    // Check for promotion
    if (newStars >= config.starsToPromote && tierIndex < TIER_ORDER.length - 1) {
      newTier = TIER_ORDER[tierIndex + 1];
      newStars = 0; // Reset stars on promotion
      promoted = true;
    }
  } else {
    // Lose stars on defeat
    starsChanged = -config.starsLostOnLose;
    newStars = currentStars + starsChanged;
    
    // Check for demotion
    if (newStars < 0 && tierIndex > 0) {
      // Check protection
      if (currentStars <= config.protectionStars) {
        // Protected, stay at 0 stars
        newStars = 0;
        starsChanged = -currentStars;
      } else {
        // Demote to previous tier
        newTier = TIER_ORDER[tierIndex - 1];
        const prevConfig = RANK_CONFIG[newTier];
        newStars = prevConfig.starsToPromote - 1; // Start at max-1 stars of previous tier
        demoted = true;
      }
    } else if (newStars < 0) {
      newStars = 0;
      starsChanged = -currentStars;
    }
  }
  
  return { newTier, newStars, starsChanged, promoted, demoted };
};

const RankedBattle = ({ onBack, initialMatchId }: RankedBattleProps) => {
  const { profile, refreshProfile } = useAuth();
  const sounds = useMatchSounds();
  const [matchStatus, setMatchStatus] = useState<MatchStatus>("idle");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<any>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120); // Increased to 120 seconds for 10 questions
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
  const [isAnswerLocked, setIsAnswerLocked] = useState(false); // Lock to prevent rapid clicking
  const [myFinished, setMyFinished] = useState(false); // Track if I finished all 10 questions
  const [waitingForOpponent, setWaitingForOpponent] = useState(false); // Waiting for opponent to finish
  const [matchFinished, setMatchFinished] = useState(false); // Prevent double finishMatch calls
  const [opponentFinished, setOpponentFinished] = useState(false); // Track if opponent finished
  const [opponentFinalScore, setOpponentFinalScore] = useState<number | null>(null); // Opponent's final score from realtime
  const [opponentProgress, setOpponentProgress] = useState(0); // Opponent's current question index (0-10)
  const [isRealPlayer, setIsRealPlayer] = useState(false); // Track if playing against real player
  const [rankChangeResult, setRankChangeResult] = useState<{
    starsChanged: number;
    promoted: boolean;
    demoted: boolean;
    newTier: RankTier;
    newStars: number;
  } | null>(null);
  const [battleChannel, setBattleChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);

  // Refs to track latest state values without triggering re-subscriptions
  const myFinishedRef = useRef(myFinished);
  const matchFinishedRef = useRef(matchFinished);
  const myScoreRef = useRef(myScore);
  const opponentFinishedRef = useRef(opponentFinished);
  
  // Keep refs in sync
  useEffect(() => {
    myFinishedRef.current = myFinished;
    matchFinishedRef.current = matchFinished;
    myScoreRef.current = myScore;
    opponentFinishedRef.current = opponentFinished;
  }, [myFinished, matchFinished, myScore, opponentFinished]);

  // Handle initial match from friend challenge
  useEffect(() => {
    if (initialMatchId && profile) {
      setMatchId(initialMatchId);
      setMatchStatus("playing");
      
      // Fetch match data
      supabase
        .from("ranked_matches")
        .select("*, player1:profiles!ranked_matches_player1_id_fkey(*), player2:profiles!ranked_matches_player2_id_fkey(*)")
        .eq("id", initialMatchId)
        .single()
        .then(({ data: match }) => {
          if (match) {
            const opp = match.player1_id === profile.id ? match.player2 : match.player1;
            setOpponent(opp);
            const matchWords = (match.words as any[]).map((w: any) => ({
              id: w.id,
              word: w.word,
              meaning: w.meaning,
              phonetic: w.phonetic,
            }));
            setWords(matchWords);
            setOptions(generateOptions(matchWords[0].meaning, matchWords));
          }
        });
    }
  }, [initialMatchId, profile]);

  // Track online presence
  useEffect(() => {
    if (!profile) return;

    const channel = supabase.channel(`ranked-lobby-grade-${profile.grade}`, {
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
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  // Fetch random words for the match
  const fetchMatchWords = useCallback(async () => {
    if (!profile) return [];
    
    // Fetch more words and randomly select 10 to ensure variety
    const { data, error } = await supabase
      .from("words")
      .select("id, word, meaning, phonetic")
      .eq("grade", profile.grade)
      .limit(100); // Get more words for randomization

    if (error) {
      console.error("Error fetching words:", error);
      return [];
    }

    if (!data || data.length === 0) return [];
    
    // Shuffle and pick 10 random words
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
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
  const aiNames = ["小词霸", "单词达人", "词汇精灵", "学习小能手", "英语之星", "词汇王者"];

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
    
    setOpponent({
      id: "ai-opponent",
      username: aiName,
      level: aiLevel,
      rank_tier: profile?.rank_tier || "bronze",
      rank_stars: Math.floor(Math.random() * 3),
      isAI: true,
    });
    setIsRealPlayer(false); // AI opponent
    setWords(matchWords);
    setOptions(generateOptions(matchWords[0].meaning, matchWords));
    setMatchStatus("found");
    sounds.playMatchFound();
    
    setTimeout(() => setMatchStatus("playing"), 2000);
  };

  // Try to join an existing match (called once at start)
  const tryJoinExistingMatch = async (): Promise<boolean> => {
    if (!profile) return false;
    
    const matchWords = await fetchMatchWords();
    if (matchWords.length === 0) return false;

    // Get all waiting matches from other players in same grade (include recent ones)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: waitingMatches } = await supabase
      .from("ranked_matches")
      .select("*, player1:profiles!ranked_matches_player1_id_fkey(*)")
      .eq("status", "waiting")
      .eq("grade", profile.grade)
      .neq("player1_id", profile.id)
      .gte("created_at", fiveMinutesAgo)
      .order("created_at", { ascending: true })
      .limit(10);

    console.log("Found waiting matches:", waitingMatches?.length || 0);

    if (!waitingMatches || waitingMatches.length === 0) return false;

    // Try to join each match until one succeeds
    for (const matchToJoin of waitingMatches) {
      console.log("Attempting to join match:", matchToJoin.id);
      
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
        console.log("Successfully joined match:", updatedMatch.id);
        setMatchId(matchToJoin.id);
        setOpponent(matchToJoin.player1);
        setWords(matchWords);
        setOptions(generateOptions(matchWords[0].meaning, matchWords));
        setMatchStatus("found");
        sounds.playMatchFound();
        setTimeout(() => setMatchStatus("playing"), 2000);
        return true;
      } else {
        console.log("Failed to join match:", matchToJoin.id, joinError?.message);
      }
    }
    
    return false;
  };

  // Broadcast match request to other players
  const broadcastMatchRequest = useCallback((matchId: string) => {
    if (!profile) return;
    
    const channel = supabase.channel(`matchmaking-broadcast-${profile.grade}`);
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.send({
          type: 'broadcast',
          event: 'match_request',
          payload: {
            matchId,
            playerId: profile.id,
            username: profile.username,
            grade: profile.grade,
            timestamp: Date.now(),
          }
        });
        // Keep channel open for responses
      }
    });
  }, [profile]);

  // Start searching for a match
  const startSearch = async () => {
    if (!profile) {
      toast.error("请先登录");
      return;
    }

    setMatchStatus("searching");
    setSearchTime(0);
    setShowAIOption(false);

    try {
      // First, cancel any old waiting matches from this user
      await supabase
        .from("ranked_matches")
        .update({ status: "cancelled" })
        .eq("player1_id", profile.id)
        .eq("status", "waiting");

      // Clean up stale matches from others (older than 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      await supabase
        .from("ranked_matches")
        .update({ status: "cancelled" })
        .eq("status", "waiting")
        .lt("created_at", fiveMinutesAgo);

      // Try to join an existing match first
      const joined = await tryJoinExistingMatch();
      if (joined) return;

      // No match to join, create our own and wait
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

      console.log("Created new match, waiting for opponent:", newMatch.id);
      setMatchId(newMatch.id);
      setWaitingMatchId(newMatch.id);
      
      // Broadcast to other players
      broadcastMatchRequest(newMatch.id);

    } catch (error) {
      console.error("Match error:", error);
      toast.error("匹配失败，请重试");
      setMatchStatus("idle");
    }
  };

  // Realtime + Polling + Broadcast hybrid for reliable matchmaking
  useEffect(() => {
    if (matchStatus !== "searching" || !profile) return;

    console.log("Setting up matchmaking subscription");
    let isActive = true;
    
    // Function to handle successful match join
    const onMatchJoined = async (matchData: any, opponentData: any, matchWords: Word[]) => {
      if (!isActive) return;
      isActive = false;
      
      console.log("Match joined successfully:", matchData.id);
      
      // Cancel our waiting match if different
      if (waitingMatchId && waitingMatchId !== matchData.id) {
        await supabase
          .from("ranked_matches")
          .update({ status: "cancelled" })
          .eq("id", waitingMatchId);
      }

      setMatchId(matchData.id);
      setOpponent(opponentData);
      setIsRealPlayer(true); // Real player opponent
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
      .channel(`matchmaking-db-${profile.id}-${Date.now()}`)
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
          if (!record || record.grade !== profile.grade) return;
          
          console.log("Realtime DB event:", payload.eventType, record.id, record.status);
          
          // Case 1: Someone created a new waiting match we can join
          if (payload.eventType === "INSERT" && 
              record.status === "waiting" && 
              record.player1_id !== profile.id) {
            console.log("Realtime: New waiting match detected:", record.id);
            
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
              .is("player2_id", null) // Ensure no one else joined
              .select("*, player1:profiles!ranked_matches_player1_id_fkey(*)")
              .maybeSingle();

            if (!error && updatedMatch && isActive) {
              await onMatchJoined(updatedMatch, updatedMatch.player1, matchWords);
            }
          }
          
          // Case 2: Our waiting match was joined by someone
          if (payload.eventType === "UPDATE" && 
              waitingMatchId && 
              record.id === waitingMatchId && 
              record.status === "in_progress" && 
              record.player2_id) {
            console.log("Realtime: Opponent joined our match!");
            
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
            })) || [];
            
            if (isActive) {
              await onMatchJoined(record, opponentData, matchWords);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("DB Realtime subscription status:", status);
      });

    // Broadcast channel - listen for match requests from other players
    const broadcastChannel = supabase
      .channel(`matchmaking-broadcast-${profile.grade}`)
      .on('broadcast', { event: 'match_request' }, async (payload) => {
        if (!isActive || !waitingMatchId) return;
        
        const data = payload.payload as any;
        if (data.playerId === profile.id) return;
        
        console.log("Broadcast: Received match request from", data.username);
        
        // Try to join their match
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
          .is("player2_id", null) // Ensure no one else joined
          .select("*, player1:profiles!ranked_matches_player1_id_fkey(*)")
          .maybeSingle();

        if (!error && updatedMatch && isActive) {
          await onMatchJoined(updatedMatch, updatedMatch.player1, matchWords);
        }
      })
      .subscribe((status) => {
        console.log("Broadcast subscription status:", status);
      });

    // Faster polling every 1 second to catch missed events
    const pollInterval = setInterval(async () => {
      if (!isActive) return;
      
      // Check if our match was joined
      if (waitingMatchId) {
        const { data: ourMatch } = await supabase
          .from("ranked_matches")
          .select("*, player2:profiles!ranked_matches_player2_id_fkey(*)")
          .eq("id", waitingMatchId)
          .single();
        
        if (ourMatch?.status === "in_progress" && ourMatch?.player2_id && isActive) {
          console.log("Polling: Opponent joined our match!");
          const matchWords = (ourMatch.words as any[])?.map((w: any) => ({
            id: w.id,
            word: w.word,
            meaning: w.meaning,
            phonetic: w.phonetic,
          })) || [];
          await onMatchJoined(ourMatch, ourMatch.player2, matchWords);
          return;
        }
      }
      
      // Also try to join any available matches
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: waitingMatches } = await supabase
        .from("ranked_matches")
        .select("*, player1:profiles!ranked_matches_player1_id_fkey(*)")
        .eq("status", "waiting")
        .eq("grade", profile.grade)
        .neq("player1_id", profile.id)
        .gte("created_at", fiveMinutesAgo)
        .order("created_at", { ascending: true })
        .limit(5);

      if (waitingMatches && waitingMatches.length > 0 && isActive) {
        console.log("Polling: Found", waitingMatches.length, "waiting matches");
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
            .is("player2_id", null) // Ensure no one else joined
            .select()
            .maybeSingle();

          if (!error && updatedMatch && isActive) {
            await onMatchJoined(updatedMatch, matchToJoin.player1, matchWords);
            return;
          }
        }
      }
    }, 1000); // Poll every 1 second for faster matching

    // Show AI option after 15 seconds (reduced from 30)
    const aiTimeout = setTimeout(() => {
      setShowAIOption(true);
    }, 15000);

    return () => {
      console.log("Cleaning up matchmaking subscription");
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
    if (selectedOption || !words[currentWordIndex] || isAnswerLocked || myFinished || matchFinished) return;

    setSelectedOption(selectedMeaning);
    setIsAnswerLocked(true); // Lock immediately to prevent double-clicking
    
    const isCorrect = selectedMeaning === words[currentWordIndex].meaning;
    const newScore = isCorrect ? myScore + 1 : myScore;
    const newQuestionIndex = currentWordIndex + 1;

    if (isCorrect) {
      setMyScore(newScore);
      setAnswerAnimation('correct');
      sounds.playCorrect();
    } else {
      setAnswerAnimation('wrong');
      sounds.playWrong();
    }

    // Broadcast progress to opponent (for real player matches)
    if (isRealPlayer && matchId && profile) {
      // Try broadcast first
      if (battleChannel) {
        battleChannel.send({
          type: 'broadcast',
          event: 'player_progress',
          payload: {
            playerId: profile.id,
            questionIndex: newQuestionIndex,
            score: newScore,
            finished: newQuestionIndex >= 10,
          }
        });
      }
      
      // Also update database when finished (as fallback sync mechanism)
      if (newQuestionIndex >= 10) {
        const { data: currentMatch } = await supabase
          .from("ranked_matches")
          .select("player1_id")
          .eq("id", matchId)
          .single();
        
        if (currentMatch) {
          const isPlayer1 = currentMatch.player1_id === profile.id;
          await supabase
            .from("ranked_matches")
            .update({
              [isPlayer1 ? "player1_score" : "player2_score"]: newScore,
            })
            .eq("id", matchId);
        }
      }
    }

    // After showing result, wait before moving to next question
    setTimeout(() => {
      setAnswerAnimation(null);
      
      // Check if we've answered all 10 questions
      if (currentWordIndex >= 9) {
        // Finished all questions
        setMyFinished(true);
        setWaitingForOpponent(true);
        
        // For real player: wait for opponent to finish
        // For AI: simulate opponent and finish
        if (!isRealPlayer) {
          setTimeout(() => {
            if (!matchFinished) {
              finishMatchWithAI(newScore);
            }
          }, 1500);
        } else {
          // Check if opponent already finished
          if (opponentFinished && opponentFinalScore !== null) {
            setTimeout(() => {
              if (!matchFinished) {
                finishMatchWithRealPlayer(newScore, opponentFinalScore);
              }
            }, 500);
          }
          // Otherwise wait for opponent (handled by realtime listener + polling)
        }
        return;
      }
      
      // Move to next question after short delay
      setTimeout(() => {
        setCurrentWordIndex(prev => prev + 1);
        setSelectedOption(null);
        setIsAnswerLocked(false); // Unlock for next question
        setOptions(generateOptions(words[currentWordIndex + 1].meaning, words));
      }, 500); // 0.5 second delay between questions
      
    }, 600); // Show answer result for 600ms
  };

  // Finish match with AI opponent
  const finishMatchWithAI = async (finalScore: number) => {
    if (matchFinished) return;
    setMatchFinished(true);
    
    setMatchStatus("finished");
    setWaitingForOpponent(false);
    
    const playerScore = finalScore;
    
    // AI opponent accuracy based on tier
    const currentTier = (profile?.rank_tier || "bronze") as RankTier;
    const tierIndex = TIER_ORDER.indexOf(currentTier);
    
    const baseAccuracy = 0.4 + tierIndex * 0.05;
    const accuracyRange = 0.2;
    const aiAccuracy = baseAccuracy + Math.random() * accuracyRange;
    
    let simulatedOpponentScore = 0;
    for (let i = 0; i < 10; i++) {
      if (Math.random() < aiAccuracy) {
        simulatedOpponentScore++;
      }
    }
    
    await completeMatch(playerScore, simulatedOpponentScore);
  };

  // Finish match with real player
  const finishMatchWithRealPlayer = async (myFinalScore: number, theirFinalScore: number) => {
    if (matchFinished) return;
    setMatchFinished(true);
    
    setMatchStatus("finished");
    setWaitingForOpponent(false);
    
    await completeMatch(myFinalScore, theirFinalScore);
  };

  // Complete match and update scores
  const completeMatch = async (playerScore: number, opponentScoreValue: number) => {
    setOpponentScore(opponentScoreValue);
    
    const currentTier = (profile?.rank_tier || "bronze") as RankTier;
    const tierIndex = TIER_ORDER.indexOf(currentTier);
    
    // Compare scores - whoever got more correct wins
    const won = playerScore > opponentScoreValue;
    const tie = playerScore === opponentScoreValue;
    setIsWinner(won);

    // Calculate rank changes
    const scoreDiff = playerScore - opponentScoreValue;
    const rankChange = calculateRankChange(
      currentTier,
      profile?.rank_stars || 0,
      won,
      tie,
      Math.abs(scoreDiff)
    );
    setRankChangeResult(rankChange);

    // Play victory or defeat sound
    if (won) {
      sounds.playVictory();
    } else if (!tie) {
      sounds.playDefeat();
    }

    if (profile && matchId) {
      // Update match result
      await supabase
        .from("ranked_matches")
        .update({
          player1_score: playerScore,
          player2_score: opponentScoreValue,
          winner_id: won ? profile.id : (tie ? null : opponent?.id),
          status: "completed",
          ended_at: new Date().toISOString(),
        })
        .eq("id", matchId);

      // Update daily quest progress for battle wins
      if (won) {
        const today = new Date().toISOString().split("T")[0];
        
        // Find the battle quest
        const { data: battleQuest } = await supabase
          .from("daily_quests")
          .select("id, target")
          .eq("quest_type", "battle")
          .eq("is_active", true)
          .single();

        if (battleQuest) {
          // Get current progress
          const { data: currentProgress } = await supabase
            .from("user_quest_progress")
            .select("*")
            .eq("profile_id", profile.id)
            .eq("quest_id", battleQuest.id)
            .eq("quest_date", today)
            .maybeSingle();

          const newProgress = (currentProgress?.progress || 0) + 1;
          const isCompleted = newProgress >= battleQuest.target;

          // Upsert progress
          await supabase
            .from("user_quest_progress")
            .upsert({
              profile_id: profile.id,
              quest_id: battleQuest.id,
              quest_date: today,
              progress: newProgress,
              completed: isCompleted,
              claimed: currentProgress?.claimed || false,
            });
        }
      }

      // Update profile stats with level up logic
      // XP scales with tier - real player matches give bonus XP
      const tierMultiplier = tierIndex + 1;
      const realPlayerBonus = isRealPlayer ? 1.5 : 1;
      const xpGained = Math.floor((won ? 30 * tierMultiplier : (tie ? 15 * tierMultiplier : 10 * tierMultiplier)) * realPlayerBonus);
      const coinsGained = Math.floor((won ? 20 * tierMultiplier : (tie ? 10 * tierMultiplier : 5 * tierMultiplier)) * realPlayerBonus);

      await updateProfileWithXp(
        profile.id,
        profile.level,
        profile.xp,
        profile.xp_to_next_level,
        xpGained,
        {
          coins: profile.coins + coinsGained,
          wins: won ? profile.wins + 1 : profile.wins,
          losses: won ? profile.losses : (tie ? profile.losses : profile.losses + 1),
          rank_tier: rankChange.newTier,
          rank_stars: rankChange.newStars,
        }
      );

      refreshProfile();
    }
  };

  // Realtime sync for battle progress (real player matches only)
  useEffect(() => {
    if (matchStatus !== "playing" || !matchId || !profile || !isRealPlayer) return;

    console.log("Setting up battle sync channel for match:", matchId);
    let isActive = true;
    let retryCount = 0;
    const maxRetries = 3;
    
    const setupChannel = () => {
      const channel = supabase.channel(`battle-${matchId}-${Date.now()}`)
        .on('broadcast', { event: 'player_progress' }, (payload) => {
          if (!isActive) return;
          const data = payload.payload as any;
          
          // Ignore our own messages
          if (data.playerId === profile.id) return;
          
          console.log("Opponent progress:", data);
          
          // Update opponent's current progress
          setOpponentProgress(data.questionIndex);
          
          // Update opponent's progress
          if (data.finished) {
            setOpponentFinished(true);
            setOpponentFinalScore(data.score);
            
            // If we're also finished, complete the match (using refs to get current values)
            if (myFinishedRef.current && !matchFinishedRef.current) {
              finishMatchWithRealPlayer(myScoreRef.current, data.score);
            }
          }
        })
        .subscribe((status) => {
          console.log("Battle sync channel status:", status);
          if (status === 'SUBSCRIBED') {
            // Store channel reference for sending messages
            setBattleChannel(channel);
            retryCount = 0; // Reset retry count on success
          } else if (status === 'CHANNEL_ERROR' && isActive && retryCount < maxRetries) {
            // Retry on error
            retryCount++;
            console.log(`Channel error, retrying (${retryCount}/${maxRetries})...`);
            supabase.removeChannel(channel);
            setTimeout(() => {
              if (isActive) setupChannel();
            }, 1000 * retryCount);
          }
        });
      
      return channel;
    };
    
    const channel = setupChannel();

    // Polling fallback to ensure we catch opponent progress even if broadcast fails
    const pollInterval = setInterval(async () => {
      if (!isActive || matchFinishedRef.current) return;
      
      // Check match status in database for opponent completion
      const { data: matchData } = await supabase
        .from("ranked_matches")
        .select("*")
        .eq("id", matchId)
        .single();
      
      if (!matchData) return;
      
      const isPlayer1 = matchData.player1_id === profile.id;
      const opponentScore = isPlayer1 ? matchData.player2_score : matchData.player1_score;
      const opponentHasScore = opponentScore > 0;
      
      // If opponent has score recorded and we haven't marked them finished, sync it
      if (opponentHasScore && !opponentFinishedRef.current) {
        console.log("Polling: Detected opponent score:", opponentScore);
        setOpponentFinished(true);
        setOpponentFinalScore(opponentScore);
        
        if (myFinishedRef.current && !matchFinishedRef.current) {
          finishMatchWithRealPlayer(myScoreRef.current, opponentScore);
        }
      }
      
      // Also check if match was marked completed
      if (matchData.status === "completed" && !matchFinishedRef.current) {
        console.log("Polling: Match completed, syncing final state");
        setOpponentFinished(true);
        setOpponentFinalScore(opponentScore);
        
        if (myFinishedRef.current) {
          finishMatchWithRealPlayer(myScoreRef.current, opponentScore);
        }
      }
    }, 2000); // Poll every 2 seconds

    return () => {
      isActive = false;
      setBattleChannel(null);
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  // Only re-subscribe when essential values change (matchStatus, matchId, profile, isRealPlayer)
  // Other values are accessed via refs to prevent channel reconnection
  }, [matchStatus, matchId, profile?.id, isRealPlayer]);

  // Handle case where opponent finished before us
  useEffect(() => {
    if (myFinished && opponentFinished && opponentFinalScore !== null && !matchFinished) {
      finishMatchWithRealPlayer(myScore, opponentFinalScore);
    }
  }, [myFinished, opponentFinished, opponentFinalScore, matchFinished, myScore]);

  // Timer - only runs when playing and not finished
  useEffect(() => {
    if (matchStatus === "playing" && timeLeft > 0 && !matchFinished && !myFinished) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up - finish with current score
            if (!matchFinished) {
              if (isRealPlayer) {
                // For real player: check if opponent finished
                if (opponentFinished && opponentFinalScore !== null) {
                  finishMatchWithRealPlayer(myScore, opponentFinalScore);
                } else {
                  // Force finish - opponent ran out of time too
                  setMyFinished(true);
                  setWaitingForOpponent(true);
                }
              } else {
                finishMatchWithAI(myScore);
              }
            }
            return 0;
          }
          // Play urgent sound when time is low
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
  }, [matchStatus, timeLeft, matchFinished, myFinished, myScore, isRealPlayer, opponentFinished, opponentFinalScore]);

  // Search timer with sound
  useEffect(() => {
    if (matchStatus === "searching") {
      const timer = setInterval(() => {
        setSearchTime(prev => {
          // Play searching beep every 2 seconds
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
      <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center relative overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-primary/40 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
        
        {/* Radar effect */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-80 h-80 rounded-full border border-primary/10 animate-radar-ping" />
          <div className="absolute w-60 h-60 rounded-full border border-primary/20 animate-radar-ping" style={{ animationDelay: '0.5s' }} />
          <div className="absolute w-40 h-40 rounded-full border border-primary/30 animate-radar-ping" style={{ animationDelay: '1s' }} />
        </div>

        <div className="text-center relative z-10">
          {/* Sound toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-16 right-0"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              sounds.toggleSounds(!soundEnabled);
            }}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>

          {/* Radar scanner */}
          <div className="w-32 h-32 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-primary/30" />
            <div className="absolute inset-2 rounded-full border-2 border-primary/20" />
            <div className="absolute inset-4 rounded-full border border-primary/10" />
            
            {/* Sweep line */}
            <div className="absolute inset-0 animate-radar-sweep origin-center">
              <div className="absolute top-1/2 left-1/2 w-1/2 h-0.5 bg-gradient-to-r from-primary to-transparent origin-left" />
            </div>
            
            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 bg-primary rounded-full animate-search-pulse shadow-lg shadow-primary/50" />
            </div>
            
            {/* Random blips */}
            {searchTime > 3 && (
              <div 
                className="absolute w-2 h-2 bg-accent rounded-full animate-pulse"
                style={{ 
                  left: `${30 + Math.sin(searchTime) * 20}%`, 
                  top: `${40 + Math.cos(searchTime) * 15}%` 
                }}
              />
            )}
          </div>
          
          <h2 className="font-gaming text-2xl mb-2 text-glow-purple">正在匹配对手</h2>
          
          {/* Animated dots */}
          <div className="flex items-center justify-center gap-1 mb-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-primary rounded-full animate-dot-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-full border border-border/50 mb-4">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-gaming text-lg">{searchTime}</span>
            <span className="text-muted-foreground text-sm">秒</span>
          </div>
          
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mb-6">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/30 rounded-full">
              <Wifi className="w-4 h-4 text-primary animate-pulse" />
              <span>正在寻找{profile?.grade}年级玩家</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-success/20 rounded-full border border-success/30">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-success font-medium">{onlineCount} 人在线</span>
            </div>
          </div>
          
          {showAIOption && (
            <div className="mb-4 p-4 bg-accent/10 rounded-xl border border-accent/20 animate-scale-in max-w-xs mx-auto">
              <p className="text-sm text-muted-foreground mb-3">暂未找到真人对手</p>
              <Button variant="default" onClick={chooseAIBattle} className="w-full mb-2">
                <Zap className="w-4 h-4 mr-2" />
                与AI对战
              </Button>
            </div>
          )}
          
          <Button variant="outline" onClick={cancelSearch} className="hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive transition-colors">
            取消匹配
          </Button>
        </div>
      </div>
    );
  }

  // Found opponent - Show both profiles with epic animations
  if (matchStatus === "found") {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center p-4 overflow-hidden relative">
        {/* Background energy effects */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Left side glow */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          {/* Right side glow */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-neon-blue/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
          {/* Center explosion */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/10 rounded-full blur-2xl animate-vs-pulse" />
        </div>

        <div className="w-full max-w-5xl relative z-10">
          <h2 className="font-gaming text-3xl mb-8 text-glow-gold text-center animate-slide-up">
            ⚔️ 对手找到！⚔️
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* My Profile Card */}
            <PlayerBattleCard 
              profile={profile ? {
                id: profile.id,
                username: profile.username,
                level: profile.level,
                rank_tier: profile.rank_tier,
                rank_stars: profile.rank_stars,
                wins: profile.wins,
                losses: profile.losses,
                avatar_url: profile.avatar_url,
              } : null}
              variant="left"
            />

            {/* VS - Dramatic center animation */}
            <div className="flex flex-col items-center justify-center py-8 relative">
              {/* Outer rings */}
              <div className="absolute w-32 h-32 rounded-full border-2 border-accent/30 animate-energy-ring" />
              <div className="absolute w-40 h-40 rounded-full border border-accent/20 animate-energy-ring" style={{ animationDirection: 'reverse', animationDuration: '3s' }} />
              
              {/* Sparks */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-accent rounded-full animate-spark"
                  style={{
                    left: `${50 + 40 * Math.cos((i * 45 * Math.PI) / 180)}%`,
                    top: `${50 + 40 * Math.sin((i * 45 * Math.PI) / 180)}%`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
              
              {/* VS badge */}
              <div className="animate-vs-appear">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent via-amber-500 to-accent flex items-center justify-center shadow-2xl animate-vs-pulse">
                  <span className="font-gaming text-4xl text-background drop-shadow-lg">VS</span>
                </div>
              </div>
              
              <p className="text-muted-foreground mt-6 text-sm font-gaming animate-pulse">比赛即将开始...</p>
              
              {/* Loading dots */}
              <div className="flex gap-2 mt-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div 
                    key={i} 
                    className="w-2 h-2 rounded-full bg-accent"
                    style={{ 
                      animation: 'bounce 1s infinite',
                      animationDelay: `${i * 0.1}s` 
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Opponent Profile Card */}
            <PlayerBattleCard 
              profile={opponent ? {
                id: opponent.id,
                username: opponent.username,
                level: opponent.level,
                rank_tier: opponent.rank_tier,
                rank_stars: opponent.rank_stars,
                wins: opponent.wins || 0,
                losses: opponent.losses || 0,
                avatar_url: opponent.avatar_url,
                isAI: opponent.isAI,
              } : null}
              variant="right"
            />
          </div>
        </div>
      </div>
    );
  }

  // Playing state
  if (matchStatus === "playing") {
    // Show waiting screen if finished all questions
    if (waitingForOpponent) {
      return (
        <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-spin" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-2 rounded-full border-2 border-primary/50 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
            </div>
            
            <h2 className="font-gaming text-2xl mb-2 text-glow-purple">答题完成！</h2>
            <p className="text-muted-foreground mb-4">你的得分：<span className="font-gaming text-xl text-primary">{myScore}/10</span></p>
            
            {isRealPlayer && (
              <div className="mb-4 p-4 bg-secondary/30 rounded-xl border border-border/50">
                <p className="text-sm text-muted-foreground mb-2">对手进度</p>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="font-gaming text-lg text-neon-blue">{opponentProgress}/10</span>
                  <span className="text-muted-foreground text-sm">题</span>
                </div>
                <Progress value={(opponentProgress / 10) * 100} variant="xp" className="h-2" />
              </div>
            )}
            
            <p className="text-muted-foreground">等待对手完成答题...</p>
            
            <div className="flex items-center justify-center gap-1 mt-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-primary rounded-full animate-dot-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (!words[currentWordIndex]) return null;
    const currentWord = words[currentWordIndex];
    
    return (
      <div className="min-h-screen bg-background bg-grid-pattern">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="container mx-auto px-4 py-3">
            {/* Top row with exit button */}
            <div className="flex items-center justify-between mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  if (confirm("确定要退出比赛吗？退出将判负")) {
                    setMatchStatus("finished");
                    setIsWinner(false);
                    setOpponentScore(10);
                  }
                }}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                退出
              </Button>
              
              <div className={cn(
                "px-4 py-2 rounded-xl font-gaming text-lg transition-all",
                timeLeft <= 10 ? "bg-destructive/20 text-destructive animate-urgent-pulse" : "bg-accent/20 text-accent"
              )}>
                <Clock className="w-4 h-4 inline mr-2" />
                <span className={cn(timeLeft <= 10 && "animate-countdown-pop")} key={timeLeft}>{timeLeft}s</span>
              </div>
              
              <div className="w-16" /> {/* Spacer for balance */}
            </div>
            
            {/* Scores and Progress */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-neon-pink flex items-center justify-center text-xs font-gaming text-primary-foreground">
                    {profile?.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-gaming text-lg text-primary">{myScore}/10</span>
                </div>
                <Progress value={((currentWordIndex + 1) / 10) * 100} variant="xp" className="h-1.5" />
              </div>
              
              <div className="px-4">
                <span className="font-gaming text-muted-foreground">VS</span>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-end gap-2 mb-1">
                  <span className="font-gaming text-lg text-neon-blue">
                    {isRealPlayer ? `${opponentProgress}/10` : "?/10"}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-blue to-neon-cyan flex items-center justify-center text-xs font-gaming text-primary-foreground">
                    {opponent?.username?.charAt(0).toUpperCase() || "?"}
                  </div>
                </div>
                {isRealPlayer && (
                  <Progress value={(opponentProgress / 10) * 100} variant="gold" className="h-1.5" />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Word Card */}
        <main className="container mx-auto px-4 py-8">
          <Card 
            variant="glow" 
            className={cn(
              "max-w-lg mx-auto p-8 text-center animate-scale-in transition-all",
              answerAnimation === 'correct' && "animate-correct-flash",
              answerAnimation === 'wrong' && "animate-wrong-shake"
            )}
          >
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
                    disabled={!!selectedOption || isAnswerLocked}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all duration-300 font-medium",
                      !selectedOption && !isAnswerLocked && "hover:border-primary/50 hover:bg-primary/5 border-border bg-card",
                      (selectedOption || isAnswerLocked) && !isSelected && !isCorrect && "opacity-50 cursor-not-allowed",
                      selectedOption && isCorrect && "border-success bg-success/10 text-success",
                      selectedOption && isSelected && !isCorrect && "border-destructive bg-destructive/10 text-destructive"
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
            
            {/* Show delay indicator when transitioning */}
            {selectedOption && !waitingForOpponent && (
              <div className="mt-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                下一题准备中...
              </div>
            )}
          </Card>

          <p className="text-center text-muted-foreground mt-4">
            第 {currentWordIndex + 1} / 10 题
          </p>
        </main>
      </div>
    );
  }

  // Finished state
  if (matchStatus === "finished") {
    const tierNames: Record<string, string> = {
      bronze: "青铜",
      silver: "白银",
      gold: "黄金",
      platinum: "铂金",
      diamond: "钻石",
      champion: "狄邦巅峰",
    };
    
    const tierColors: Record<string, string> = {
      bronze: "from-amber-700 to-amber-900",
      silver: "from-gray-300 to-gray-500",
      gold: "from-yellow-400 to-amber-500",
      platinum: "from-cyan-300 to-cyan-500",
      diamond: "from-blue-300 to-purple-400",
      champion: "from-purple-500 to-pink-500",
    };

    const currentTier = (profile?.rank_tier || "bronze") as RankTier;
    const tierIndex = TIER_ORDER.indexOf(currentTier);
    const tierMultiplier = tierIndex + 1;
    const xpGained = isWinner ? 30 * tierMultiplier : (myScore === opponentScore ? 15 * tierMultiplier : 10 * tierMultiplier);
    const coinsGained = isWinner ? 20 * tierMultiplier : (myScore === opponentScore ? 10 * tierMultiplier : 5 * tierMultiplier);
    
    return (
      <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center p-6 relative overflow-hidden">
        {/* Victory confetti effect */}
        {isWinner && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-sm"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10px',
                  backgroundColor: ['hsl(45, 100%, 55%)', 'hsl(265, 89%, 66%)', 'hsl(200, 100%, 60%)', 'hsl(142, 76%, 45%)', 'hsl(330, 85%, 60%)'][i % 5],
                  animation: `confettiFall ${2 + Math.random() * 3}s linear forwards`,
                  animationDelay: `${Math.random() * 1}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Promotion effect */}
        {rankChangeResult?.promoted && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-accent/30 via-transparent to-transparent animate-pulse" />
          </div>
        )}

        {/* Background glow */}
        <div className={cn(
          "absolute inset-0 transition-all duration-1000",
          isWinner ? "bg-gradient-radial from-accent/10 via-transparent to-transparent" : "bg-gradient-radial from-muted/10 via-transparent to-transparent"
        )} />

        <div className="max-w-md w-full text-center relative z-10">
          <div className={cn(
            "w-28 h-28 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg transition-all",
            isWinner 
              ? "bg-gradient-to-br from-accent to-amber-600 shadow-accent/50 animate-victory-burst" 
              : "bg-gradient-to-br from-muted to-secondary shadow-muted/30 animate-scale-in"
          )}>
            {isWinner ? (
              <Crown className="w-14 h-14 text-background drop-shadow-lg" />
            ) : (
              <Trophy className="w-12 h-12 text-muted-foreground" />
            )}
          </div>

          <h2 className={cn(
            "font-gaming text-4xl mb-2 animate-slide-up",
            isWinner ? "text-glow-gold" : ""
          )}>
            {isWinner ? "🎉 胜利！🎉" : myScore === opponentScore ? "⚔️ 平局" : "惜败"}
          </h2>
          <p className="text-muted-foreground mb-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {isWinner ? "恭喜你赢得比赛！" : myScore === opponentScore ? "势均力敌！" : "再接再厉，下次一定赢！"}
          </p>

          {/* Rank Change Display */}
          {rankChangeResult && (
            <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
              {rankChangeResult.promoted ? (
                <div className="p-4 bg-accent/20 rounded-xl border-2 border-accent animate-pulse">
                  <p className="text-accent font-gaming text-xl mb-2">🎊 晋级成功！🎊</p>
                  <div className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r text-white font-gaming",
                    tierColors[rankChangeResult.newTier]
                  )}>
                    <Crown className="w-5 h-5" />
                    {tierNames[rankChangeResult.newTier]}
                  </div>
                </div>
              ) : rankChangeResult.demoted ? (
                <div className="p-4 bg-destructive/20 rounded-xl border-2 border-destructive/50">
                  <p className="text-destructive font-gaming text-lg mb-2">段位下降</p>
                  <div className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r text-white font-gaming",
                    tierColors[rankChangeResult.newTier]
                  )}>
                    {tierNames[rankChangeResult.newTier]}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-secondary/50 rounded-xl border border-border">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className={cn(
                      "px-3 py-1 rounded-full bg-gradient-to-r text-white text-sm font-gaming",
                      tierColors[rankChangeResult.newTier]
                    )}>
                      {tierNames[rankChangeResult.newTier]}
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    {/* Show stars */}
                    {[...Array(RANK_CONFIG[rankChangeResult.newTier as RankTier].starsToPromote)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={cn(
                          "w-5 h-5 transition-all",
                          i < rankChangeResult.newStars 
                            ? "text-accent fill-accent" 
                            : "text-muted-foreground/30"
                        )} 
                      />
                    ))}
                  </div>
                  {rankChangeResult.starsChanged !== 0 && (
                    <p className={cn(
                      "text-sm mt-2 font-gaming",
                      rankChangeResult.starsChanged > 0 ? "text-success" : "text-destructive"
                    )}>
                      {rankChangeResult.starsChanged > 0 ? `+${rankChangeResult.starsChanged}` : rankChangeResult.starsChanged} ⭐
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Score comparison */}
          <Card variant={isWinner ? "gold" : "default"} className="mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className={cn(
                    "w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-primary to-neon-pink flex items-center justify-center text-lg font-gaming text-primary-foreground mb-2",
                    isWinner && "ring-4 ring-accent/50"
                  )}>
                    {profile?.username.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-semibold mb-1">{profile?.username}</p>
                  <p className={cn(
                    "font-gaming text-4xl",
                    isWinner ? "text-accent" : "text-primary"
                  )}>{myScore}/10</p>
                </div>
                
                <div className="font-gaming text-2xl text-muted-foreground px-4">VS</div>
                
                <div className="text-center flex-1">
                  <div className={cn(
                    "w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-neon-blue to-neon-cyan flex items-center justify-center text-lg font-gaming text-primary-foreground mb-2",
                    !isWinner && myScore !== opponentScore && "ring-4 ring-neon-blue/50"
                  )}>
                    {opponent?.username?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <p className="font-semibold mb-1">{opponent?.username || "对手"}</p>
                  <p className="font-gaming text-4xl text-neon-blue">{opponentScore}/10</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rewards */}
          <div className="flex justify-center gap-4 mb-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <Badge variant="xp" className={cn(
              "text-base px-4 py-2 transition-all",
              isWinner && "animate-pulse"
            )}>
              <Zap className="w-4 h-4 mr-2" />
              +{xpGained} XP
            </Badge>
            <Badge variant="gold" className={cn(
              "text-base px-4 py-2 transition-all",
              isWinner && "animate-pulse"
            )}>
              🪙 +{coinsGained}
            </Badge>
          </div>

          {/* Tier difficulty hint */}
          <p className="text-xs text-muted-foreground mb-4 animate-slide-up" style={{ animationDelay: '0.35s' }}>
            {tierNames[currentTier]}段位 · 晋级需要 {RANK_CONFIG[currentTier].starsToPromote} 星
            {RANK_CONFIG[currentTier].starsLostOnLose > 0 && ` · 失败扣 ${RANK_CONFIG[currentTier].starsLostOnLose} 星`}
          </p>

          {/* Actions */}
          <div className="flex gap-4 animate-slide-up" style={{ animationDelay: '0.4s' }}>
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
              setTimeLeft(120);
              setSelectedOption(null);
              setShowResult(false);
              setAnswerAnimation(null);
              setIsAnswerLocked(false);
              setMyFinished(false);
              setWaitingForOpponent(false);
              setRankChangeResult(null);
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
