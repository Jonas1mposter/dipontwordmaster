import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMatchSounds } from "@/hooks/useMatchSounds";
import { useGameStateRecovery } from "@/hooks/useGameStateRecovery";
import { useMatchReconnect } from "@/hooks/useMatchReconnect";
import { useEloSystem, calculateEloRange } from "@/hooks/useEloSystem";
import { useMatchCleanup, isActiveMatchError, handleActiveMatchError } from "@/hooks/useMatchCleanup";
import { audioManager } from "@/lib/audioManager";
import { haptics } from "@/lib/haptics";
import { MatchDebugPanel, addMatchDebugLog } from "@/components/MatchDebugPanel";
import MatchSearchProgress from "@/components/MatchSearchProgress";
import MatchWaitingTips from "@/components/MatchWaitingTips";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import PlayerBattleCard from "@/components/battle/PlayerBattleCard";
import BattleQuizCard, { BattleQuizType } from "@/components/battle/BattleQuizCard";
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
  RefreshCw,
  AlertTriangle,
  Flame
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateProfileWithXp } from "@/lib/levelUp";

// Pre-computed animation data - REDUCED for better performance
const SEARCH_PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  left: `${(i * 12 + 5) % 100}%`,
  top: `${(i * 11 + 8) % 100}%`,
}));

const SPARK_POSITIONS = Array.from({ length: 8 }, (_, i) => ({
  left: `${50 + 40 * Math.cos((i * 45 * Math.PI) / 180)}%`,
  top: `${50 + 40 * Math.sin((i * 45 * Math.PI) / 180)}%`,
  delay: `${i * 0.15}s`,
}));

const CONFETTI_ITEMS = Array.from({ length: 15 }, (_, i) => ({
  left: `${(i * 7) % 100}%`,
  color: ['hsl(45, 100%, 55%)', 'hsl(265, 89%, 66%)', 'hsl(200, 100%, 60%)', 'hsl(142, 76%, 45%)', 'hsl(330, 85%, 60%)'][i % 5],
  duration: `${2 + (i % 3)}s`,
  delay: `${(i * 0.1) % 1}s`,
}));

const PROMOTION_STARS = Array.from({ length: 8 }, (_, i) => ({
  left: `${10 + (i % 6) * 15}%`,
  delay: `${i * 0.1}s`,
}));

const DEMOTION_PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  left: `${(i * 10) % 100}%`,
  duration: `${1.5 + (i % 2)}s`,
  delay: `${(i * 0.05) % 0.5}s`,
}));

// Pre-computed promotion rays (12 rays at 30-degree intervals)
const PROMOTION_RAYS = Array.from({ length: 12 }, (_, i) => ({
  transform: `rotate(${i * 30}deg) translateX(-50%)`,
}));

// Available quiz types for battle
const BATTLE_QUIZ_TYPES: BattleQuizType[] = ["meaning", "reverse", "spelling", "listening"];

interface Word {
  id: string;
  word: string;
  meaning: string;
  phonetic: string | null;
  [key: string]: string | null; // Index signature for Json compatibility
}

interface RankedBattleProps {
  onBack: () => void;
  initialMatchId?: string | null;
}

type MatchStatus = "idle" | "searching" | "found" | "playing" | "finished";

type RankTier = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "champion";

// Rank tier configuration - 段位规则
// 青铜：30星晋级，失败不扣星
// 白银：40星晋级，失败扣1星
// 黄金：50星晋级，失败扣1星，1星保护（不会掉段）
// 铂金：50星晋级，失败扣1星
// 钻石：60星晋级，失败扣2星
// 狄邦巅峰：最高段位，失败扣2星
const RANK_CONFIG: Record<RankTier, {
  starsToPromote: number;      // Stars needed to promote to next tier
  starsLostOnLose: number;     // Stars lost on defeat
  starsGainedOnWin: number;    // Stars gained on victory
  protectionStars: number;     // Stars where you can't demote (0 = can always demote)
  minScoreToWin: number;       // Minimum score difference to gain full stars
}> = {
  bronze: {
    starsToPromote: 30,
    starsLostOnLose: 0,        // 失败不扣星
    starsGainedOnWin: 1,
    protectionStars: 0,
    minScoreToWin: 1,
  },
  silver: {
    starsToPromote: 40,
    starsLostOnLose: 1,        // 失败扣1星
    starsGainedOnWin: 1,
    protectionStars: 0,
    minScoreToWin: 1,
  },
  gold: {
    starsToPromote: 50,
    starsLostOnLose: 1,        // 失败扣1星
    starsGainedOnWin: 1,
    protectionStars: 1,        // 1星保护（不会掉段）
    minScoreToWin: 1,
  },
  platinum: {
    starsToPromote: 50,
    starsLostOnLose: 1,        // 失败扣1星
    starsGainedOnWin: 1,
    protectionStars: 0,
    minScoreToWin: 1,
  },
  diamond: {
    starsToPromote: 60,
    starsLostOnLose: 2,        // 失败扣2星
    starsGainedOnWin: 1,
    protectionStars: 0,
    minScoreToWin: 1,
  },
  champion: {
    starsToPromote: 999,       // 最高段位，无法晋级
    starsLostOnLose: 2,        // 失败扣2星
    starsGainedOnWin: 1,
    protectionStars: 0,
    minScoreToWin: 1,
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

// Convert Tailwind gradient classes to CSS gradient
const getGradientStyle = (gradientClasses: string) => {
  if (gradientClasses.startsWith('linear-gradient') || gradientClasses.startsWith('radial-gradient')) {
    return gradientClasses;
  }
  
  const colorMap: Record<string, string> = {
    'amber-500': '#f59e0b', 'amber-600': '#d97706', 'amber-400': '#fbbf24',
    'yellow-400': '#facc15', 'yellow-500': '#eab308',
    'purple-600': '#9333ea', 'purple-500': '#a855f7',
    'pink-500': '#ec4899', 'pink-600': '#db2777',
    'cyan-500': '#06b6d4', 'cyan-600': '#0891b2',
    'blue-500': '#3b82f6', 'blue-600': '#2563eb',
    'indigo-600': '#4f46e5', 'indigo-500': '#6366f1',
    'red-500': '#ef4444', 'red-600': '#dc2626',
    'green-500': '#22c55e', 'green-600': '#16a34a',
    'orange-500': '#f97316', 'orange-600': '#ea580c',
    'primary': 'hsl(265, 89%, 66%)', 'neon-pink': 'hsl(330, 85%, 60%)',
    'neon-blue': 'hsl(200, 100%, 60%)', 'neon-cyan': 'hsl(180, 100%, 50%)',
  };
  
  const fromMatch = gradientClasses.match(/from-([a-z]+-?\d*)/);
  const viaMatch = gradientClasses.match(/via-([a-z]+-?\d*)/);
  const toMatch = gradientClasses.match(/to-([a-z]+-?\d*)/);
  
  const fromColor = fromMatch ? colorMap[fromMatch[1]] || '#8b5cf6' : '#8b5cf6';
  const viaColor = viaMatch ? colorMap[viaMatch[1]] : null;
  const toColor = toMatch ? colorMap[toMatch[1]] || '#ec4899' : '#ec4899';
  
  if (viaColor) {
    return `linear-gradient(135deg, ${fromColor} 0%, ${viaColor} 50%, ${toColor} 100%)`;
  }
  return `linear-gradient(135deg, ${fromColor} 0%, ${toColor} 100%)`;
};

interface EquippedNameCard {
  id: string;
  name: string;
  background_gradient: string;
  icon: string | null;
  rank_position: number | null;
}

const RankedBattle = ({ onBack, initialMatchId }: RankedBattleProps) => {
  const { profile, refreshProfile } = useAuth();
  const sounds = useMatchSounds();
  const { updateEloAfterMatch, findMatchesWithinEloRange } = useEloSystem();
  
  // Active match detection for reconnection
  const { 
    activeMatch, 
    isChecking: isCheckingActiveMatch, 
    dismissMatch: dismissActiveMatch,
    clearActiveMatch 
  } = useMatchReconnect({ 
    profileId: profile?.id, 
    enabled: !initialMatchId // Only check if not already reconnecting
  });
  
  const [myNameCard, setMyNameCard] = useState<EquippedNameCard | null>(null);
  const [opponentNameCard, setOpponentNameCard] = useState<EquippedNameCard | null>(null);
  const [matchStatus, setMatchStatus] = useState<MatchStatus>("idle");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<any>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(150); // 150 seconds for varied quiz types
  const [options, setOptions] = useState<string[]>([]);
  const [wordOptions, setWordOptions] = useState<string[]>([]); // Word options for reverse type
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [currentQuizType, setCurrentQuizType] = useState<BattleQuizType>("meaning");
  const [quizTypes, setQuizTypes] = useState<BattleQuizType[]>([]); // Pre-generated quiz types for each question
  const [showResult, setShowResult] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [showAIOption, setShowAIOption] = useState(false);
  const [waitingMatchId, setWaitingMatchId] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [answerAnimation, setAnswerAnimation] = useState<'correct' | 'wrong' | null>(null);
  const [vsCountdown, setVsCountdown] = useState(8);
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
  
  // Debug mode state
  const [debugMode, setDebugMode] = useState(false);
  
  // Combo system states
  const [comboCount, setComboCount] = useState(0);
  const [showComboPopup, setShowComboPopup] = useState(false);

  // Refs to track latest state values without triggering re-subscriptions
  const myFinishedRef = useRef(myFinished);
  const matchFinishedRef = useRef(matchFinished);
  const myScoreRef = useRef(myScore);
  const opponentFinishedRef = useRef(opponentFinished);
  const waitingMatchIdRef = useRef(waitingMatchId); // CRITICAL: Use ref to avoid useEffect re-runs
  const profileRef = useRef(profile); // Ref to access profile without dependency
  
  // Keep refs in sync
  useEffect(() => {
    myFinishedRef.current = myFinished;
    matchFinishedRef.current = matchFinished;
    myScoreRef.current = myScore;
    opponentFinishedRef.current = opponentFinished;
    waitingMatchIdRef.current = waitingMatchId;
    profileRef.current = profile;
  }, [myFinished, matchFinished, myScore, opponentFinished, waitingMatchId, profile]);

  // Full state reset function for error recovery
  const resetGameState = useCallback(() => {
    console.log("[RankedBattle] Resetting all game state for recovery");
    setMatchStatus("idle");
    setMatchId(null);
    setOpponent(null);
    setWords([]);
    setCurrentWordIndex(0);
    setMyScore(0);
    setOpponentScore(0);
    setTimeLeft(150);
    setSelectedOption(null);
    setShowResult(false);
    setAnswerAnimation(null);
    setIsWinner(false);
    setMyFinished(false);
    setWaitingForOpponent(false);
    setRankChangeResult(null);
    setMatchFinished(false);
    setOpponentFinished(false);
    setOpponentFinalScore(null);
    setOpponentProgress(0);
    setIsRealPlayer(false);
    setQuizTypes([]);
    setOptions([]);
    setWordOptions([]);
    setCurrentQuizType("meaning");
    setSearchTime(0);
    setShowAIOption(false);
    setWaitingMatchId(null);
    setOpponentNameCard(null);
    setBattleChannel(null);
    setIsAnswerLocked(false);
    setComboCount(0);
    setShowComboPopup(false);
    friendMatchInitialized.current = false;
  }, []);

  // Game state recovery hook
  const { manualReset } = useGameStateRecovery(
    {
      matchStatus,
      currentWordIndex,
      words,
      timeLeft,
      myFinished,
      matchFinished,
      quizTypes,
      options,
      isPlaying: matchStatus === "playing",
    },
    {
      onReset: resetGameState,
    }
  );

  // Handle initial match from friend challenge or reconnect - only run once when idle
  const friendMatchInitialized = useRef(false);
  
  useEffect(() => {
    // Only initialize friend match once and only when idle
    if (initialMatchId && profile && matchStatus === "idle" && !friendMatchInitialized.current) {
      friendMatchInitialized.current = true;
      setMatchId(initialMatchId);
      setIsRealPlayer(true); // Friend battles and reconnects are always real player matches
      
      // Fetch match data
      supabase
        .from("ranked_matches")
        .select("*, player1:profiles!ranked_matches_player1_id_fkey(*), player2:profiles!ranked_matches_player2_id_fkey(*)")
        .eq("id", initialMatchId)
        .single()
        .then(({ data: match }) => {
          if (match) {
            const isPlayer1 = match.player1_id === profile.id;
            const opp = isPlayer1 ? match.player2 : match.player1;
            setOpponent(opp);
            const matchWords = (match.words as any[]).map((w: any) => ({
              id: w.id,
              word: w.word,
              meaning: w.meaning,
              phonetic: w.phonetic,
            }));
            setWords(matchWords);
            
            // Generate quiz types for all 10 questions
            const types = generateQuizTypes();
            setQuizTypes(types);
            
            // Check if this is a reconnect (match already in progress)
            const rawMyProgress = isPlayer1 ? match.player1_score : match.player2_score;
            const myHasProgress = rawMyProgress > 0;
            
            // Decode progress: encodedProgress = score + (questionIndex * 100) + (finished ? 10000 : 0)
            const myProgressWithoutFinished = rawMyProgress >= 10000 ? rawMyProgress - 10000 : rawMyProgress;
            const myQuestionIndex = Math.floor(myProgressWithoutFinished / 100);
            const myActualScore = myProgressWithoutFinished % 100;
            
            // Calculate remaining time based on match start time
            const matchAge = Date.now() - new Date(match.created_at).getTime();
            const totalTime = 150; // 150 seconds for ranked
            const elapsedSeconds = Math.floor(matchAge / 1000);
            const remainingTime = Math.max(10, totalTime - elapsedSeconds); // At least 10 seconds
            
            if (myHasProgress && match.status === "playing") {
              // This is a reconnect - restore progress
              console.log("Reconnecting to match:", { myQuestionIndex, myActualScore, remainingTime });
              
              setCurrentWordIndex(myQuestionIndex);
              setMyScore(myActualScore);
              setTimeLeft(remainingTime);
              
              // Setup current question with its quiz type
              if (matchWords.length > myQuestionIndex) {
                setupQuizForWord(matchWords[myQuestionIndex], types[myQuestionIndex], matchWords);
              }
              
              // Skip VS screen, go straight to playing
              setMatchStatus("playing");
              toast.success("已重新连接到比赛");
            } else {
              // Normal friend battle start
              // Setup first question with its quiz type
              if (matchWords.length > 0) {
                setupQuizForWord(matchWords[0], types[0], matchWords);
              }
              
              // Show VS screen briefly before starting
              setMatchStatus("found");
              setTimeout(() => setMatchStatus("playing"), 5000);
            }
          }
        });
    }
  }, [initialMatchId, profile, matchStatus]);

  // Fetch equipped name cards for result display
  useEffect(() => {
    if (!profile) return;

    const fetchMyNameCard = async () => {
      const { data } = await supabase
        .from("user_name_cards")
        .select(`
          rank_position,
          name_cards:name_card_id (
            id,
            name,
            background_gradient,
            icon
          )
        `)
        .eq("profile_id", profile.id)
        .eq("is_equipped", true)
        .single();

      if (data && data.name_cards) {
        const card = data.name_cards as any;
        setMyNameCard({
          id: card.id,
          name: card.name,
          background_gradient: card.background_gradient,
          icon: card.icon,
          rank_position: data.rank_position,
        });
      }
    };

    fetchMyNameCard();
  }, [profile]);

  // Fetch opponent's name card when opponent is set
  useEffect(() => {
    if (!opponent || opponent.isAI) return;

    const fetchOpponentNameCard = async () => {
      const { data } = await supabase
        .from("user_name_cards")
        .select(`
          rank_position,
          name_cards:name_card_id (
            id,
            name,
            background_gradient,
            icon
          )
        `)
        .eq("profile_id", opponent.id)
        .eq("is_equipped", true)
        .single();

      if (data && data.name_cards) {
        const card = data.name_cards as any;
        setOpponentNameCard({
          id: card.id,
          name: card.name,
          background_gradient: card.background_gradient,
          icon: card.icon,
          rank_position: data.rank_position,
        });
      }
    };

    fetchOpponentNameCard();
  }, [opponent]);

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

  // Fetch random words for the match - 获取所有词汇
  const fetchMatchWords = useCallback(async () => {
    if (!profile) return [];
    
    // Fetch ALL words for the grade (handle pagination for large datasets)
    let allWords: Word[] = [];
    let from = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from("words")
        .select("id, word, meaning, phonetic")
        .eq("grade", profile.grade)
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("Error fetching words:", error);
        break;
      }

      if (!data || data.length === 0) break;
      
      allWords = [...allWords, ...data];
      
      if (data.length < pageSize) break;
      from += pageSize;
    }

    if (allWords.length === 0) return [];
    
    // Shuffle and pick 10 random words from ALL vocabulary
    const shuffled = [...allWords].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
  }, [profile]);

  // Generate meaning options (for "meaning" quiz type)
  const generateOptions = useCallback((correctMeaning: string, allWords: Word[]) => {
    const otherMeanings = allWords
      .map(w => w.meaning)
      .filter(m => m !== correctMeaning);
    
    const shuffled = otherMeanings.sort(() => Math.random() - 0.5).slice(0, 3);
    return [...shuffled, correctMeaning].sort(() => Math.random() - 0.5);
  }, []);

  // Generate word options (for "reverse" quiz type)
  const generateWordOptions = useCallback((correctWord: string, allWords: Word[]) => {
    const otherWords = allWords
      .map(w => w.word)
      .filter(w => w !== correctWord);
    
    const shuffled = otherWords.sort(() => Math.random() - 0.5).slice(0, 3);
    return [...shuffled, correctWord].sort(() => Math.random() - 0.5);
  }, []);

  // Generate random quiz types for all questions
  const generateQuizTypes = useCallback((): BattleQuizType[] => {
    const types: BattleQuizType[] = [];
    for (let i = 0; i < 10; i++) {
      // Weighted distribution: meaning 35%, reverse 30%, spelling 20%, listening 15%
      const rand = Math.random();
      if (rand < 0.35) {
        types.push("meaning");
      } else if (rand < 0.65) {
        types.push("reverse");
      } else if (rand < 0.85) {
        types.push("spelling");
      } else {
        types.push("listening");
      }
    }
    return types;
  }, []);

  // Setup quiz for current word and quiz type
  const setupQuizForWord = useCallback((word: Word, qType: BattleQuizType, allWords: Word[]) => {
    setCurrentQuizType(qType);
    if (qType === "meaning") {
      setOptions(generateOptions(word.meaning, allWords));
      setWordOptions([]);
    } else if (qType === "reverse") {
      setWordOptions(generateWordOptions(word.word, allWords));
      setOptions([]);
    } else {
      // spelling and listening don't need options
      setOptions([]);
      setWordOptions([]);
    }
  }, [generateOptions, generateWordOptions]);

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
    
    // Generate quiz types for all 10 questions
    const types = generateQuizTypes();
    setQuizTypes(types);
    
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
    
    // Setup first question with its quiz type
    setupQuizForWord(matchWords[0], types[0], matchWords);
    
    setMatchStatus("found");
    sounds.playMatchFound();
    
    setTimeout(() => setMatchStatus("playing"), 5000);
  };

  // Try to join an existing match (called once at start) - with ELO-based matching
  const tryJoinExistingMatch = async (): Promise<boolean> => {
    if (!profile) return false;
    
    const matchWords = await fetchMatchWords();
    if (matchWords.length === 0) return false;

    // Get player's current ELO
    const playerElo = profile.elo_rating || 1000;
    // Use initial wide range (±200) to maximize chances of finding a match immediately
    const eloRange = 200;
    const minElo = playerElo - eloRange;
    const maxElo = playerElo + eloRange;

    // Get all waiting matches from other players in same grade within ELO range
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: waitingMatches } = await supabase
      .from("ranked_matches")
      .select("*, player1:profiles!ranked_matches_player1_id_fkey(*)")
      .eq("status", "waiting")
      .eq("grade", profile.grade)
      .neq("player1_id", profile.id)
      .is("player2_id", null) // CRITICAL: Only get matches without player2
      .gte("created_at", fiveMinutesAgo)
      .order("created_at", { ascending: true })
      .limit(20);

    console.log("Found waiting matches:", waitingMatches?.length || 0, "ELO range:", minElo, "-", maxElo);

    if (!waitingMatches || waitingMatches.length === 0) return false;

    // Filter by ELO range and sort by ELO proximity
    const matchesInRange = waitingMatches
      .filter((m) => {
        const opponentElo = m.player1?.elo_rating || 1000;
        return opponentElo >= minElo && opponentElo <= maxElo;
      })
      .sort((a, b) => {
        const aEloDiff = Math.abs((a.player1?.elo_rating || 1000) - playerElo);
        const bEloDiff = Math.abs((b.player1?.elo_rating || 1000) - playerElo);
        return aEloDiff - bEloDiff; // Sort by closest ELO first
      });

    console.log("Matches in ELO range:", matchesInRange.length);

    // Try to join each match until one succeeds
    for (const matchToJoin of matchesInRange) {
      console.log("Attempting to join match:", matchToJoin.id, "Opponent ELO:", matchToJoin.player1?.elo_rating);
      
      // CRITICAL: Use atomic update with .is("player2_id", null) to prevent race conditions
      const { data: updatedMatch, error: joinError } = await supabase
        .from("ranked_matches")
        .update({
          player2_id: profile.id,
          player2_elo: playerElo,
          status: "in_progress",
          words: matchWords,
          started_at: new Date().toISOString(),
        })
        .eq("id", matchToJoin.id)
        .eq("status", "waiting")
        .is("player2_id", null) // CRITICAL: Atomic check - only join if no one else has joined
        .select()
        .maybeSingle();

      if (!joinError && updatedMatch) {
        console.log("Successfully joined match:", updatedMatch.id);
        addMatchDebugLog(`成功加入对局: ${updatedMatch.id.slice(0, 8)}...`, "success");
        
        // Also update player1_elo for tracking
        await supabase
          .from("ranked_matches")
          .update({ player1_elo: matchToJoin.player1?.elo_rating || 1000 })
          .eq("id", matchToJoin.id);
        
        // Generate quiz types for all 10 questions
        const types = generateQuizTypes();
        setQuizTypes(types);
        
        setMatchId(matchToJoin.id);
        setOpponent(matchToJoin.player1);
        setIsRealPlayer(true); // Real player match
        setWords(matchWords);
        
        // Setup first question with its quiz type
        setupQuizForWord(matchWords[0], types[0], matchWords);
        
        setMatchStatus("found");
        sounds.playMatchFound();
        setTimeout(() => setMatchStatus("playing"), 8000);
        return true;
      } else {
        console.log("Failed to join match (likely already taken):", matchToJoin.id, joinError?.message);
      }
    }
    
    return false;
  };

  // Use automatic match cleanup hook - ONLY when truly idle (not during searching)
  useMatchCleanup({ 
    profileId: profile?.id, 
    grade: profile?.grade,
    enabled: matchStatus === "idle" && !waitingMatchId
  });

  // Lock to prevent multiple startSearch calls
  const searchLockRef = useRef(false);
  
  // Start searching for a match - with lock protection
  const startSearch = async () => {
    if (!profile) {
      toast.error("请先登录");
      return;
    }
    
    // Prevent duplicate calls
    if (searchLockRef.current) {
      addMatchDebugLog("搜索已在进行中，忽略重复调用", "warn");
      return;
    }
    searchLockRef.current = true;

    // Warmup audio system before starting match
    await audioManager.warmup();
    
    addMatchDebugLog(`开始搜索匹配 (玩家: ${profile.username}, ELO: ${profile.elo_rating || 1000}, 年级: ${profile.grade})`, "info");
    setMatchStatus("searching");
    setSearchTime(0);
    setShowAIOption(false);

    try {
      // First, cancel any old waiting matches from this user
      const { data: cancelledMatches } = await supabase
        .from("ranked_matches")
        .update({ status: "cancelled" })
        .eq("player1_id", profile.id)
        .eq("status", "waiting")
        .select("id");
      
      if (cancelledMatches && cancelledMatches.length > 0) {
        addMatchDebugLog(`已取消 ${cancelledMatches.length} 个旧等待对局`, "info");
      }

      // Try to join an existing match first
      addMatchDebugLog("正在搜索可加入的比赛...", "info");
      const joined = await tryJoinExistingMatch();
      if (joined) {
        addMatchDebugLog("成功加入现有比赛", "success");
        searchLockRef.current = false;
        return;
      }
      addMatchDebugLog("没有找到可加入的比赛，创建新比赛", "info");

      // No match to join, create our own
      const { data: newMatch, error: createError } = await supabase
        .from("ranked_matches")
        .insert({
          player1_id: profile.id,
          player1_elo: profile.elo_rating || 1000,
          grade: profile.grade,
          status: "waiting",
        })
        .select()
        .single();

      if (createError) {
        if (isActiveMatchError(createError)) {
          handleActiveMatchError();
          setMatchStatus("idle");
          searchLockRef.current = false;
          return;
        }
        throw createError;
      }

      console.log("Created new match, waiting for opponent:", newMatch.id);
      addMatchDebugLog(`创建新比赛: ${newMatch.id.slice(0, 8)}...`, "success");
      setMatchId(newMatch.id);
      setWaitingMatchId(newMatch.id);

    } catch (error: any) {
      console.error("Match error:", error);
      addMatchDebugLog(`匹配错误: ${error.message}`, "error");
      if (isActiveMatchError(error)) {
        handleActiveMatchError();
      } else {
        toast.error("匹配失败，请重试");
      }
      setMatchStatus("idle");
    } finally {
      searchLockRef.current = false;
    }
  };

  // Simplified matchmaking: Realtime + Polling only (NO creation in polling!)
  // CRITICAL: Use empty deps + refs to avoid re-running effect on profile changes
  useEffect(() => {
    // Check conditions inside effect, not as dependencies
    if (matchStatus !== "searching") return;
    
    const currentProfile = profileRef.current;
    if (!currentProfile) return;
    
    const currentProfileId = currentProfile.id;
    const currentGrade = currentProfile.grade;
    const currentWaitingId = waitingMatchIdRef.current;

    // If no waiting match ID yet, wait for startSearch to set it
    if (!currentWaitingId) {
      addMatchDebugLog("等待创建对局...", "info");
      return;
    }

    console.log("Setting up matchmaking subscription for match:", currentWaitingId);
    addMatchDebugLog(`监听对局: ${currentWaitingId.slice(0, 8)}...`, "info");
    
    let isActive = true;
    let matchJoinedLock = false;
    
    // Function to handle successful match found
    const onMatchJoined = async (matchData: any, opponentData: any, matchWords: Word[]) => {
      if (!isActive || matchJoinedLock) {
        addMatchDebugLog("已锁定或不活跃，跳过", "warn");
        return;
      }
      matchJoinedLock = true;
      isActive = false;
      
      console.log("Match joined successfully:", matchData.id);
      addMatchDebugLog(`匹配成功: ${matchData.id.slice(0, 8)}...`, "success");

      const types = generateQuizTypes();
      setQuizTypes(types);
      
      setMatchId(matchData.id);
      setOpponent(opponentData);
      setIsRealPlayer(true);
      setWords(matchWords);
      if (matchWords.length > 0) {
        setupQuizForWord(matchWords[0], types[0], matchWords);
      }
      setWaitingMatchId(null);
      setMatchStatus("found");
      sounds.playMatchFound();
      setTimeout(() => setMatchStatus("playing"), 5000);
    };

    // Realtime subscription - filter by specific match ID
    const matchmakingChannel = supabase
      .channel(`ranked-match-${currentWaitingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ranked_matches",
          filter: `id=eq.${currentWaitingId}`,
        },
        async (payload) => {
          if (!isActive || matchJoinedLock) return;
          const record = payload.new as any;
          if (!record) return;
          
          if (record.status === "in_progress" && record.player2_id) {
            console.log("Realtime: Opponent joined our match!", currentWaitingId);
            addMatchDebugLog(`实时：对手加入! ${record.player2_id.slice(0, 8)}...`, "success");
            
            if (matchJoinedLock) return;
            matchJoinedLock = true;
            isActive = false;
            
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
            
            await onMatchJoined(record, opponentData, matchWords as Word[]);
          }
        }
      )
      .subscribe((status) => {
        console.log("Matchmaking channel status:", status);
        addMatchDebugLog(`频道状态: ${status}`, "info");
      });

    // Polling every 3 seconds - ONLY checks, NEVER creates
    const pollInterval = setInterval(async () => {
      if (!isActive || matchJoinedLock) return;
      
      const { data: ourMatch } = await supabase
        .from("ranked_matches")
        .select("*, player2:profiles!ranked_matches_player2_id_fkey(*)")
        .eq("id", currentWaitingId)
        .single();
      
      if (ourMatch?.status === "in_progress" && ourMatch?.player2_id && isActive && !matchJoinedLock) {
        console.log("Polling: Opponent joined our match!");
        addMatchDebugLog(`轮询：对手加入!`, "success");
        matchJoinedLock = true;
        isActive = false;
        
        const matchWords = (ourMatch.words as any[])?.map((w: any) => ({
          id: w.id,
          word: w.word,
          meaning: w.meaning,
          phonetic: w.phonetic,
        })) || [];
        await onMatchJoined(ourMatch, ourMatch.player2, matchWords as Word[]);
        return;
      }
      
      // If our match got cancelled, stop searching
      if (ourMatch?.status === "cancelled" || !ourMatch) {
        addMatchDebugLog("对局被取消，停止搜索", "warn");
        isActive = false;
        setWaitingMatchId(null);
        setMatchStatus("idle");
        toast.error("匹配被取消，请重新搜索");
        return;
      }
    }, 3000);

    // Show AI option after 15 seconds
    const aiTimeout = setTimeout(() => {
      setShowAIOption(true);
    }, 15000);
    
    return () => {
      console.log("Cleaning up matchmaking subscription");
      isActive = false;
      supabase.removeChannel(matchmakingChannel);
      clearInterval(pollInterval);
      clearTimeout(aiTimeout);
    };
  }, [matchStatus, waitingMatchId]); // Only re-run when matchStatus or waitingMatchId changes

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

  // Handle answer from BattleQuizCard
  const handleBattleAnswer = async (isCorrect: boolean) => {
    if (!words[currentWordIndex] || isAnswerLocked || myFinished || matchFinished) return;

    setIsAnswerLocked(true);
    
    const newScore = isCorrect ? myScore + 1 : myScore;
    const newQuestionIndex = currentWordIndex + 1;

    if (isCorrect) {
      setMyScore(newScore);
      setAnswerAnimation('correct');
      // Note: Sound and haptic feedback are now handled in BattleQuizCard with combo support
      
      // Update combo
      const newCombo = comboCount + 1;
      setComboCount(newCombo);
      
      // Show combo popup for streaks of 3+
      if (newCombo >= 3) {
        setShowComboPopup(true);
        setTimeout(() => setShowComboPopup(false), 800);
      }
    } else {
      setAnswerAnimation('wrong');
      // Note: Sound and haptic feedback are now handled in BattleQuizCard
      
      // Reset combo on wrong answer
      setComboCount(0);
    }

    // ALWAYS update progress to database for real player matches (regardless of isRealPlayer flag)
    if (matchId && profile) {
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
      
      // ALWAYS update database with current progress
      try {
        const { data: currentMatch } = await supabase
          .from("ranked_matches")
          .select("player1_id, player2_id")
          .eq("id", matchId)
          .single();
        
        if (currentMatch) {
          const isPlayer1 = currentMatch.player1_id === profile.id;
          const isPlayer2 = currentMatch.player2_id === profile.id;
          const isFinished = newQuestionIndex >= 10;
          const encodedProgress = newScore + (newQuestionIndex * 100) + (isFinished ? 10000 : 0);
          
          console.log("Updating progress:", { isPlayer1, isPlayer2, encodedProgress, matchId });
          
          if (isPlayer1 || isPlayer2) {
            const { error } = await supabase
              .from("ranked_matches")
              .update({
                [isPlayer1 ? "player1_score" : "player2_score"]: encodedProgress,
              })
              .eq("id", matchId);
            
            if (error) {
              console.error("Failed to update match progress:", error);
            }
          } else {
            console.error("Player not found in match!", { profileId: profile.id, player1: currentMatch.player1_id, player2: currentMatch.player2_id });
          }
        }
      } catch (err) {
        console.error("Error updating match progress:", err);
      }
    }

    // After showing result, wait before moving to next question
    setTimeout(() => {
      setAnswerAnimation(null);
      
      // Check if we've answered all 10 questions
      if (currentWordIndex >= 9) {
        setMyFinished(true);
        setWaitingForOpponent(true);
        
        if (!isRealPlayer) {
          setTimeout(() => {
            if (!matchFinished) {
              finishMatchWithAI(newScore);
            }
          }, 1500);
        } else {
          if (opponentFinished && opponentFinalScore !== null) {
            setTimeout(() => {
              if (!matchFinished) {
                finishMatchWithRealPlayer(newScore, opponentFinalScore);
              }
            }, 500);
          }
        }
        return;
      }
      
      // Move to next question after short delay
      setTimeout(() => {
        const nextIndex = currentWordIndex + 1;
        setCurrentWordIndex(nextIndex);
        setSelectedOption(null);
        setIsAnswerLocked(false);
        
        // Setup next question with its quiz type
        if (quizTypes[nextIndex] && words[nextIndex]) {
          setupQuizForWord(words[nextIndex], quizTypes[nextIndex], words);
        }
      }, 500);
      
    }, 600);
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

  // Finish match with real player - FIXED: Only player1 updates winner_id to prevent double-win
  const finishMatchWithRealPlayer = async (myFinalScore: number, theirFinalScore: number) => {
    if (matchFinished) return;
    setMatchFinished(true);
    
    setMatchStatus("finished");
    setWaitingForOpponent(false);
    
    if (!profile || !matchId) return;
    
    // Get current match to determine if we're player1 or player2
    const { data: currentMatch } = await supabase
      .from("ranked_matches")
      .select("player1_id, player2_id")
      .eq("id", matchId)
      .single();
    
    if (!currentMatch) {
      console.error("Could not fetch match data");
      return;
    }
    
    const isPlayer1 = currentMatch.player1_id === profile.id;
    console.log("Finishing match:", { isPlayer1, myFinalScore, theirFinalScore });
    
    if (isPlayer1) {
      // Player 1 is the authority - but first get the latest opponent score from DB
      // to ensure we have the correct score for winner calculation
      const { data: latestMatch } = await supabase
        .from("ranked_matches")
        .select("player2_score")
        .eq("id", matchId)
        .single();
      
      // Decode player2's score from the database
      let actualOpponentScore = theirFinalScore;
      if (latestMatch) {
        const rawScore = latestMatch.player2_score;
        if (rawScore >= 10000) {
          actualOpponentScore = (rawScore - 10000) % 100;
        } else if (rawScore >= 100) {
          actualOpponentScore = rawScore % 100;
        } else {
          actualOpponentScore = rawScore;
        }
      }
      
      console.log("Player1 finishing match:", { myFinalScore, actualOpponentScore, rawFromBroadcast: theirFinalScore });
      
      const won = myFinalScore > actualOpponentScore;
      const tie = myFinalScore === actualOpponentScore;
      const winnerId = won ? profile.id : (tie ? null : currentMatch.player2_id);
      
      await supabase
        .from("ranked_matches")
        .update({
          player1_score: myFinalScore,
          winner_id: winnerId,
          status: "completed",
          ended_at: new Date().toISOString(),
        })
        .eq("id", matchId);
      
      // Complete match with the correct opponent score
      await completeMatch(myFinalScore, actualOpponentScore, isPlayer1);
    } else {
      // Player 2 - only update our score, then wait for authoritative result
      await supabase
        .from("ranked_matches")
        .update({
          player2_score: myFinalScore,
        })
        .eq("id", matchId);
      
      // Wait a bit for player1 to finalize, then fetch the authoritative result
      setTimeout(async () => {
        const { data: finalMatch } = await supabase
          .from("ranked_matches")
          .select("player1_score, player2_score, winner_id, player1_id")
          .eq("id", matchId)
          .single();
        
        if (finalMatch) {
          // Decode player1's score if it's encoded
          let player1FinalScore = finalMatch.player1_score;
          if (player1FinalScore >= 10000) {
            player1FinalScore = (player1FinalScore - 10000) % 100;
          } else if (player1FinalScore >= 100) {
            player1FinalScore = player1FinalScore % 100;
          }
          
          // Use authoritative winner_id from database
          const authoritativeWon = finalMatch.winner_id === profile.id;
          const authoritativeTie = finalMatch.winner_id === null;
          
          // Complete match with authoritative result
          await completeMatch(myFinalScore, player1FinalScore, isPlayer1, authoritativeWon, authoritativeTie);
        } else {
          // Fallback: use our own calculation
          await completeMatch(myFinalScore, theirFinalScore, isPlayer1);
        }
      }, 1500);
    }
  };

  // Complete match and update scores
  const completeMatch = async (
    playerScore: number, 
    opponentScoreValue: number, 
    isPlayer1: boolean = true,
    authoritativeWon?: boolean,
    authoritativeTie?: boolean
  ) => {
    setOpponentScore(opponentScoreValue);
    
    const currentTier = (profile?.rank_tier || "bronze") as RankTier;
    const tierIndex = TIER_ORDER.indexOf(currentTier);
    
    // Determine win/loss - use authoritative result if provided (for player2)
    let won: boolean;
    let tie: boolean;
    
    if (authoritativeWon !== undefined && authoritativeTie !== undefined) {
      // Player2: use authoritative result from database
      won = authoritativeWon;
      tie = authoritativeTie;
    } else {
      // Player1 or AI match: calculate ourselves
      won = playerScore > opponentScoreValue;
      tie = playerScore === opponentScoreValue;
    }
    
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

      // Update ELO rating for real player matches
      if (isRealPlayer && opponent?.elo_rating) {
        const playerElo = profile.elo_rating || 1000;
        const opponentElo = opponent.elo_rating || 1000;
        const totalMatches = profile.wins + profile.losses;
        const isNewPlayer = totalMatches < 30;
        
        await updateEloAfterMatch(
          profile.id,
          playerElo,
          opponentElo,
          won,
          tie,
          isNewPlayer,
          false // ranked match, not free match
        );
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

      // Save combo record if achieved 3+ combo
      if (comboCount >= 3) {
        // Check if this is a new personal best
        const { data: profileData } = await supabase
          .from("profiles")
          .select("max_combo")
          .eq("id", profile.id)
          .single();
        
        const currentMax = profileData?.max_combo || 0;
        
        // Insert combo record
        await supabase
          .from("combo_records")
          .insert({
            profile_id: profile.id,
            combo_count: comboCount,
            mode: "ranked",
          });
        
        // Update profile max_combo if this is a new record
        if (comboCount > currentMax) {
          await supabase
            .from("profiles")
            .update({ max_combo: comboCount })
            .eq("id", profile.id);
        }
      }

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
      // Use only matchId so both players join the same channel
      const channel = supabase.channel(`battle-sync-${matchId}`)
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
            console.log("Broadcast: Opponent finished with score:", data.score);
            setOpponentFinished(true);
            setOpponentFinalScore(data.score);
            
            // If we're also finished, complete the match (using refs to get current values)
            if (myFinishedRef.current && !matchFinishedRef.current) {
              console.log("Both finished via broadcast, completing match");
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

    // Polling fallback (every 4 seconds for server optimization)
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
      const rawOpponentProgress = isPlayer1 ? matchData.player2_score : matchData.player1_score;
      
      // Decode progress: encodedProgress = score + (questionIndex * 100) + (finished ? 10000 : 0)
      const opponentHasFinished = rawOpponentProgress >= 10000;
      const progressWithoutFinished = opponentHasFinished ? rawOpponentProgress - 10000 : rawOpponentProgress;
      const opponentQuestionIndex = Math.floor(progressWithoutFinished / 100);
      const actualOpponentScore = progressWithoutFinished % 100;
      
      // Update opponent's current progress
      if (opponentQuestionIndex > 0) {
        setOpponentProgress(opponentQuestionIndex);
        console.log("Polling: Opponent progress - question:", opponentQuestionIndex, "score:", actualOpponentScore);
      }
      
      // If opponent has finished and we haven't marked them finished, sync it
      if (opponentHasFinished && !opponentFinishedRef.current) {
        console.log("Polling: Detected opponent finished with score:", actualOpponentScore);
        setOpponentFinished(true);
        setOpponentFinalScore(actualOpponentScore);
        
        if (myFinishedRef.current && !matchFinishedRef.current) {
          finishMatchWithRealPlayer(myScoreRef.current, actualOpponentScore);
        }
      }
      
      // Also check if match was marked completed
      if (matchData.status === "completed" && !matchFinishedRef.current) {
        console.log("Polling: Match completed, syncing final state");
        setOpponentFinished(true);
        setOpponentFinalScore(actualOpponentScore);
        
        if (myFinishedRef.current) {
          finishMatchWithRealPlayer(myScoreRef.current, actualOpponentScore);
        }
      }
    }, 4000); // Poll every 4 seconds (optimized for server capacity)

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

  // VS countdown timer
  useEffect(() => {
    if (matchStatus === "found") {
      setVsCountdown(8);
      const timer = setInterval(() => {
        setVsCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [matchStatus]);

  const speakWord = () => {
    if (words[currentWordIndex]) {
      import("@/hooks/useSpeech").then(({ speakWord: speak }) => speak(words[currentWordIndex].word));
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

            {/* Active match warning */}
            {activeMatch && activeMatch.type === "ranked" && (
              <Card className="mb-6 border-amber-500/50 bg-amber-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <span className="font-semibold text-amber-500">检测到未完成的比赛</span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">
                    <p>对手: {activeMatch.opponentName}</p>
                    <p>当前得分: {activeMatch.myScore} : {activeMatch.opponentScore}</p>
                    <p>进度: 第{activeMatch.currentQuestion + 1}题</p>
                    <p>剩余时间: {activeMatch.timeRemaining}秒</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        clearActiveMatch();
                        // Navigate to reconnect by setting initialMatchId
                        window.location.hash = `/?reconnect=${activeMatch.id}`;
                        window.location.reload();
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      恢复比赛
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-destructive hover:bg-destructive/10"
                      onClick={async () => {
                        await dismissActiveMatch();
                        toast.info("已放弃比赛");
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      放弃比赛
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Badge variant="xp" className="mb-6">
              <Zap className="w-3 h-3 mr-1" />
              全天开放
            </Badge>

            <Button 
              variant="hero" 
              size="xl" 
              onClick={startSearch} 
              className="w-full"
              disabled={!!activeMatch}
            >
              <Swords className="w-5 h-5 mr-2" />
              {isCheckingActiveMatch ? "检测中..." : "开始匹配"}
            </Button>

            {/* Debug mode toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDebugMode(!debugMode)}
              className="mt-4 text-xs text-muted-foreground hover:text-foreground"
            >
              {debugMode ? "🔧 调试模式已开启" : "🔧 开启调试模式"}
            </Button>
          </div>
        </main>
        
        {/* Debug Panel */}
        <MatchDebugPanel enabled={debugMode} />
      </div>
    );
  }

  // Searching state
  if (matchStatus === "searching") {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center relative overflow-hidden">
        {/* Animated background particles - using pre-computed positions */}
        <div className="absolute inset-0">
          {SEARCH_PARTICLES.map((particle, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-primary/40 rounded-full animate-pulse"
              style={{
                left: particle.left,
                top: particle.top,
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
            
            {/* Search blip - static position with animation */}
            {searchTime > 3 && (
              <div 
                className="absolute w-2 h-2 bg-accent rounded-full animate-pulse"
                style={{ left: '35%', top: '45%' }}
              />
            )}
          </div>
          
          <h2 className="font-gaming text-2xl mb-2 text-glow-purple">正在匹配对手</h2>
          
          {/* Animated dots - simplified with CSS only */}
          <div className="flex items-center justify-center gap-1 mb-4">
            <div className="w-2 h-2 bg-primary rounded-full animate-dot-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-dot-bounce" style={{ animationDelay: '0.15s' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-dot-bounce" style={{ animationDelay: '0.3s' }} />
          </div>
          
          {/* Search Progress with phases */}
          <MatchSearchProgress 
            searchTime={searchTime} 
            variant="ranked" 
            className="mb-6"
          />
          
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
          
          {/* Waiting tips and word preview */}
          <MatchWaitingTips 
            grade={profile?.grade} 
            variant="ranked" 
            className="mb-6"
          />
          
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
        
        {/* Debug Panel */}
        <MatchDebugPanel enabled={debugMode} />
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
              
              {/* Sparks - using pre-computed positions */}
              {SPARK_POSITIONS.map((spark, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-accent rounded-full animate-spark"
                  style={{
                    left: spark.left,
                    top: spark.top,
                    animationDelay: spark.delay,
                  }}
                />
              ))}
              
              {/* VS badge */}
              <div className="animate-vs-appear">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent via-amber-500 to-accent flex items-center justify-center shadow-2xl animate-vs-pulse">
                  <span className="font-gaming text-4xl text-background drop-shadow-lg">VS</span>
                </div>
              </div>
              
              {/* Countdown timer */}
              <div className="mt-6">
                <div className="w-20 h-20 rounded-full bg-background/80 border-2 border-accent/50 flex items-center justify-center shadow-lg">
                  <span className="font-gaming text-4xl text-accent animate-pulse">
                    {vsCountdown}
                  </span>
                </div>
              </div>
              
              <p className="text-muted-foreground mt-3 text-xs font-gaming">
                对战即将开始
              </p>
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
              <div className="w-2 h-2 bg-primary rounded-full animate-dot-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-dot-bounce" style={{ animationDelay: '0.15s' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-dot-bounce" style={{ animationDelay: '0.3s' }} />
            </div>

            {/* Emergency reset button after waiting too long */}
            <Button
              variant="ghost"
              size="sm"
              className="mt-6 text-muted-foreground hover:text-destructive"
              onClick={() => {
                if (confirm("如果游戏卡住，点击确定重置游戏状态")) {
                  manualReset();
                }
              }}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              遇到问题？重置
            </Button>
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
                onClick={async () => {
                  if (confirm("确定要放弃比赛吗？放弃将判负")) {
                    // Update match in database as abandoned
                    if (matchId) {
                      await supabase
                        .from("ranked_matches")
                        .update({
                          status: "completed",
                          winner_id: opponent?.id || null,
                          ended_at: new Date().toISOString(),
                        })
                        .eq("id", matchId);
                    }
                    toast.info("你已放弃比赛");
                    setMatchStatus("finished");
                    setIsWinner(false);
                    setOpponentScore(10);
                  }
                }}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                放弃
              </Button>
              
              <div className={cn(
                "px-4 py-2 rounded-xl font-gaming text-lg transition-all",
                timeLeft <= 10 ? "bg-destructive/20 text-destructive animate-urgent-pulse" : "bg-accent/20 text-accent"
              )}>
                <Clock className="w-4 h-4 inline mr-2" />
                <span className={cn(timeLeft <= 10 && "animate-countdown-pop")} key={timeLeft}>{timeLeft}s</span>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  if (confirm("如果游戏卡住，点击确定重置游戏状态")) {
                    manualReset();
                  }
                }}
                title="重置游戏"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
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

        {/* Combo Popup */}
        {showComboPopup && comboCount >= 3 && (
          <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
            <div className={cn(
              "animate-scale-in flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl",
              comboCount >= 10 ? "bg-gradient-to-r from-amber-500 to-orange-500" :
              comboCount >= 7 ? "bg-gradient-to-r from-purple-500 to-pink-500" :
              comboCount >= 5 ? "bg-gradient-to-r from-neon-blue to-neon-cyan" :
              "bg-gradient-to-r from-primary to-neon-pink"
            )}>
              <Flame className={cn(
                "w-8 h-8 text-white",
                comboCount >= 5 && "animate-pulse"
              )} />
              <div className="text-white">
                <div className="font-gaming text-3xl">{comboCount} 连击!</div>
                <div className="text-sm opacity-80">
                  {comboCount >= 10 ? "无敌了！🔥" :
                   comboCount >= 7 ? "势不可挡！💪" :
                   comboCount >= 5 ? "太强了！⚡" :
                   "继续保持！🎯"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quiz Card - using BattleQuizCard for multiple quiz types */}
        <main className="container mx-auto px-4 py-8">
          <BattleQuizCard
            word={currentWord}
            quizType={currentQuizType}
            options={options}
            wordOptions={wordOptions}
            onAnswer={handleBattleAnswer}
            disabled={isAnswerLocked}
            answerAnimation={answerAnimation}
            comboCount={comboCount}
          />

          <div className="flex items-center justify-center gap-4 mt-4">
            <p className="text-muted-foreground">
              第 {currentWordIndex + 1} / 10 题
            </p>
            {comboCount >= 2 && (
              <div className={cn(
                "flex items-center gap-2 transition-all",
                comboCount >= 5 ? "text-amber-500" : "text-orange-400"
              )}>
                <Flame className={cn("w-5 h-5", comboCount >= 5 && "animate-pulse")} />
                <span className="font-gaming">{comboCount}连击</span>
              </div>
            )}
          </div>
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
        {/* Victory confetti effect - using pre-computed values */}
        {isWinner && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {CONFETTI_ITEMS.map((confetti, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-sm"
                style={{
                  left: confetti.left,
                  top: '-10px',
                  backgroundColor: confetti.color,
                  animation: `confettiFall ${confetti.duration} linear forwards`,
                  animationDelay: confetti.delay,
                }}
              />
            ))}
          </div>
        )}

        {/* Promotion effect - enhanced with rays and sparkles */}
        {rankChangeResult?.promoted && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-accent/40 via-accent/20 to-transparent animate-pulse" />
            
            {/* Rotating rays - using pre-computed positions */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute w-[800px] h-[800px] animate-promotion-rays">
                {PROMOTION_RAYS.map((ray, i) => (
                  <div
                    key={i}
                    className="absolute top-1/2 left-1/2 w-2 h-[400px] bg-gradient-to-t from-accent/30 to-transparent origin-bottom"
                    style={{ transform: ray.transform }}
                  />
                ))}
              </div>
            </div>
            
            {/* Rising stars - using pre-computed positions */}
            {PROMOTION_STARS.map((star, i) => (
              <div
                key={i}
                className="absolute text-2xl animate-promotion-stars"
                style={{
                  left: star.left,
                  bottom: '30%',
                  animationDelay: star.delay,
                }}
              >
                ⭐
              </div>
            ))}
          </div>
        )}

        {/* Demotion effect - shattered/falling */}
        {rankChangeResult?.demoted && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Dark overlay with red tint */}
            <div className="absolute inset-0 bg-gradient-to-b from-destructive/20 via-transparent to-destructive/10" />
            
            {/* Falling particles - using pre-computed values */}
            {DEMOTION_PARTICLES.map((particle, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-destructive/60 rounded-sm"
                style={{
                  left: particle.left,
                  top: '-10px',
                  animation: `confettiFall ${particle.duration} linear forwards`,
                  animationDelay: particle.delay,
                }}
              />
            ))}
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
                <div className="relative p-6 bg-accent/20 rounded-2xl border-2 border-accent overflow-hidden animate-promotion-glow">
                  {/* Shine overlay */}
                  <div className="absolute inset-0 animate-promotion-shine" />
                  
                  <p className="text-accent font-gaming text-2xl mb-4 relative z-10 animate-promotion-burst">
                    🎊 晋级成功！🎊
                  </p>
                  
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    {/* Old tier with arrow to new tier */}
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-sm">
                        {tierNames[TIER_ORDER[TIER_ORDER.indexOf(rankChangeResult.newTier) - 1] || 'bronze']}
                      </span>
                      <span className="text-accent text-xl">→</span>
                    </div>
                    
                    {/* New tier badge with animation */}
                    <div className={cn(
                      "inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r text-white font-gaming text-xl animate-promotion-burst",
                      tierColors[rankChangeResult.newTier]
                    )} style={{ animationDelay: '0.2s' }}>
                      <Crown className="w-6 h-6" />
                      {tierNames[rankChangeResult.newTier]}
                    </div>
                  </div>
                  
                  {/* Sparkle decorations */}
                  <div className="absolute top-2 left-4 text-lg animate-pulse">✨</div>
                  <div className="absolute top-4 right-6 text-lg animate-pulse" style={{ animationDelay: '0.3s' }}>✨</div>
                  <div className="absolute bottom-4 left-8 text-lg animate-pulse" style={{ animationDelay: '0.6s' }}>✨</div>
                  <div className="absolute bottom-2 right-4 text-lg animate-pulse" style={{ animationDelay: '0.9s' }}>✨</div>
                </div>
              ) : rankChangeResult.demoted ? (
                <div className="relative p-6 bg-destructive/20 rounded-2xl border-2 border-destructive/50 overflow-hidden animate-demotion-shake">
                  <p className="text-destructive font-gaming text-xl mb-4 animate-demotion-fall">
                    💔 段位下降 💔
                  </p>
                  
                  <div className="flex flex-col items-center gap-3">
                    {/* Old tier */}
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-sm line-through">
                        {tierNames[TIER_ORDER[TIER_ORDER.indexOf(rankChangeResult.newTier) + 1] || 'champion']}
                      </span>
                      <span className="text-destructive text-xl">↓</span>
                    </div>
                    
                    {/* New tier badge */}
                    <div className={cn(
                      "inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r text-white font-gaming text-lg opacity-80 animate-demotion-fall",
                      tierColors[rankChangeResult.newTier]
                    )} style={{ animationDelay: '0.2s' }}>
                      {tierNames[rankChangeResult.newTier]}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-3 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                    继续努力，你一定能重新晋级！
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-secondary/50 rounded-xl border border-border">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div className={cn(
                      "px-4 py-1.5 rounded-full bg-gradient-to-r text-white text-sm font-gaming",
                      tierColors[rankChangeResult.newTier]
                    )}>
                      {tierNames[rankChangeResult.newTier]}
                    </div>
                  </div>
                  
                  {/* Star display with animation - show max 10 stars for visual clarity */}
                  <div className="flex items-center justify-center gap-1 flex-wrap max-w-[200px] mx-auto">
                    {[...Array(Math.min(RANK_CONFIG[rankChangeResult.newTier as RankTier].starsToPromote, 10))].map((_, i) => (
                      <Star 
                        key={i} 
                        className={cn(
                          "w-5 h-5 transition-all",
                          i < Math.min(rankChangeResult.newStars, 10)
                            ? "text-accent fill-accent animate-star-rise" 
                            : "text-muted-foreground/30"
                        )}
                        style={{ animationDelay: `${i * 0.05}s` }}
                      />
                    ))}
                  </div>
                  
                  {/* Show progress text for large star counts */}
                  <p className="text-xs text-muted-foreground mt-2">
                    {rankChangeResult.newStars} / {RANK_CONFIG[rankChangeResult.newTier as RankTier].starsToPromote} 星
                  </p>
                  
                  {rankChangeResult.starsChanged !== 0 && (
                    <p className={cn(
                      "text-base mt-2 font-gaming animate-scale-in",
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
                  <div 
                    className={cn(
                      "w-14 h-14 mx-auto rounded-xl flex items-center justify-center text-lg font-gaming text-primary-foreground mb-2",
                      isWinner && "ring-4 ring-accent/50"
                    )}
                    style={{
                      background: myNameCard 
                        ? getGradientStyle(myNameCard.background_gradient)
                        : 'linear-gradient(135deg, hsl(265, 89%, 66%) 0%, hsl(330, 85%, 60%) 100%)'
                    }}
                  >
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
                  <div 
                    className={cn(
                      "w-14 h-14 mx-auto rounded-xl flex items-center justify-center text-lg font-gaming text-primary-foreground mb-2",
                      !isWinner && myScore !== opponentScore && "ring-4 ring-neon-blue/50"
                    )}
                    style={{
                      background: opponentNameCard 
                        ? getGradientStyle(opponentNameCard.background_gradient)
                        : 'linear-gradient(135deg, hsl(200, 100%, 60%) 0%, hsl(180, 100%, 50%) 100%)'
                    }}
                  >
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
            <Button variant="hero" className="flex-1" onClick={resetGameState}>
              <Swords className="w-4 h-4 mr-2" />
              再来一局
            </Button>
          </div>

          {/* Manual reset hint */}
          <p className="text-xs text-muted-foreground mt-2 animate-slide-up" style={{ animationDelay: '0.5s' }}>
            遇到问题？点击返回重新开始
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default RankedBattle;
