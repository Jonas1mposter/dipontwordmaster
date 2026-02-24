import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMatchSounds } from "@/hooks/useMatchSounds";
import { useMatchReconnect } from "@/hooks/useMatchReconnect";
import { useEloSystem, calculateEloRange } from "@/hooks/useEloSystem";
import { useMatchCleanup, isActiveMatchError, handleActiveMatchError, cancelPlayerStaleMatches } from "@/hooks/useMatchCleanup";
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
  Globe,
  AlertTriangle,
  RefreshCw,
  Flame
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateProfileWithXp } from "@/lib/levelUp";

// Pre-computed animation data - REDUCED for better performance
const FREE_SEARCH_PARTICLES = Array.from({ length: 6 }, (_, i) => ({
  left: `${(i * 15 + 5) % 100}%`,
  top: `${(i * 12 + 10) % 100}%`,
}));

// Pre-computed spark positions for VS animation
const FREE_SPARK_POSITIONS = Array.from({ length: 4 }, (_, i) => ({
  left: `${50 + 35 * Math.cos((i * 90 * Math.PI) / 180)}%`,
  top: `${50 + 35 * Math.sin((i * 90 * Math.PI) / 180)}%`,
}));

interface Word {
  id: string;
  word: string;
  meaning: string;
  phonetic: string | null;
  grade?: number;
  source?: 'english' | 'math' | 'science'; // Track word source
  [key: string]: string | number | null | undefined; // Index signature for Json compatibility
}

export type BattleSubject = "mixed" | "english" | "math" | "science";

interface FreeMatchBattleProps {
  onBack: () => void;
  initialMatchId?: string | null;
  subject?: BattleSubject;
}

type MatchStatus = "idle" | "searching" | "found" | "playing" | "finished";

const FreeMatchBattle = ({ onBack, initialMatchId, subject = "mixed" }: FreeMatchBattleProps) => {
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
  const [vsCountdown, setVsCountdown] = useState(4); // 4-second VS screen countdown
  
  // Real-time battle sync state
  const [isRealPlayer, setIsRealPlayer] = useState(false);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [opponentFinished, setOpponentFinished] = useState(false);
  const [opponentFinalScore, setOpponentFinalScore] = useState<number | null>(null);
  const [myFinished, setMyFinished] = useState(false);
  const [matchFinished, setMatchFinished] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [battleChannel, setBattleChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);
  
  // Cancel reason for display
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  
  // Debug mode state
  const [debugMode, setDebugMode] = useState(false);
  
  // Combo system states
  const [comboCount, setComboCount] = useState(0);
  const [showComboPopup, setShowComboPopup] = useState(false);
  
  // OPTIMIZED: Cache player position to avoid repeated DB queries
  const [isPlayer1, setIsPlayer1] = useState<boolean | null>(null);
  
  // Refs for realtime callbacks
  const myScoreRef = useRef(0);
  const myFinishedRef = useRef(false);
  const matchFinishedRef = useRef(false);
  const opponentFinishedRef = useRef(false);
  const waitingMatchIdRef = useRef<string | null>(null); // CRITICAL: Use ref to avoid useEffect re-runs
  const matchStatusRef = useRef(matchStatus); // Ref to access matchStatus in async functions
  
  // CRITICAL: Global lock to prevent joining multiple matches
  const globalMatchLockRef = useRef(false);
  const activeMatchIdRef = useRef<string | null>(null);
  
  // Profile ref for stable access in useEffect
  const profileRef = useRef(profile);
  
  // Keep refs in sync
  useEffect(() => { myScoreRef.current = myScore; }, [myScore]);
  useEffect(() => { myFinishedRef.current = myFinished; }, [myFinished]);
  useEffect(() => { matchFinishedRef.current = matchFinished; }, [matchFinished]);
  useEffect(() => { opponentFinishedRef.current = opponentFinished; }, [opponentFinished]);
  useEffect(() => { activeMatchIdRef.current = matchId; }, [matchId]);
  useEffect(() => { waitingMatchIdRef.current = waitingMatchId; }, [waitingMatchId]);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { matchStatusRef.current = matchStatus; }, [matchStatus]);

  // VS screen countdown effect - auto-transition from found to playing
  useEffect(() => {
    if (matchStatus !== "found") {
      setVsCountdown(4);
      return;
    }

    // Validate that we have the data needed before transitioning
    if (!opponent || words.length === 0) {
      console.log("[VS] Waiting for match data - opponent:", !!opponent, "words:", words.length);
      // Don't start countdown until data is ready
      return;
    }

    // Countdown timer
    const timer = setInterval(() => {
      setVsCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Update match status in DB to "playing" before transitioning
          if (matchId && matchId !== "queue-waiting") {
            supabase
              .from("ranked_matches")
              .update({ status: "playing", started_at: new Date().toISOString() })
              .eq("id", matchId)
              .in("status", ["in_progress", "waiting"])
              .then(({ error }) => {
                if (error) console.error("Failed to update match status to playing:", error);
              });
          }
          setMatchStatus("playing");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [matchStatus, opponent, words.length, matchId]);

  const reconnectInitialized = useRef(false);
  
  useEffect(() => {
    if (initialMatchId && profile && matchStatus === "idle" && !reconnectInitialized.current) {
      reconnectInitialized.current = true;
      
      // Fetch match data for reconnect
      supabase
        .from("ranked_matches")
        .select("*, player1:profiles!ranked_matches_player1_id_fkey(*), player2:profiles!ranked_matches_player2_id_fkey(*)")
        .eq("id", initialMatchId)
        .single()
        .then(async ({ data: match }) => {
          if (match) {
            const isP1 = match.player1_id === profile.id;
            setIsPlayer1(isP1);
            const opp = isP1 ? match.player2 : match.player1;
            setOpponent(opp);
            setIsRealPlayer(true);
            setMatchId(initialMatchId);
            
            const matchWords = (match.words as any[]).map((w: any) => ({
              id: w.id,
              word: w.word,
              meaning: w.meaning,
              phonetic: w.phonetic,
              grade: w.grade || 7,
            }));
            setWords(matchWords);
            
            // Decode progress: encodedProgress = score + (questionIndex * 100) + (finished ? 10000 : 0)
            const rawMyProgress = isP1 ? match.player1_score : match.player2_score;
            const myProgressWithoutFinished = rawMyProgress >= 10000 ? rawMyProgress - 10000 : rawMyProgress;
            const myQuestionIndex = Math.floor(myProgressWithoutFinished / 100);
            const myActualScore = myProgressWithoutFinished % 100;
            
            // Calculate remaining time based on match start time
            const matchAge = Date.now() - new Date(match.created_at).getTime();
            const totalTime = 60; // 60 seconds for free match
            const elapsedSeconds = Math.floor(matchAge / 1000);
            const remainingTime = Math.max(10, totalTime - elapsedSeconds);
            
            if (match.status === "playing") {
              console.log("Reconnecting to free match:", { myQuestionIndex, myActualScore, remainingTime });
              
              setCurrentWordIndex(myQuestionIndex);
              setMyScore(myActualScore);
              setTimeLeft(remainingTime);
              
              // Generate options for current word
              if (matchWords.length > myQuestionIndex) {
                const currentWord = matchWords[myQuestionIndex];
                const opts = generateOptions(currentWord.meaning, matchWords);
                setOptions(opts);
              }
              
              // Skip VS screen, go straight to playing
              setMatchStatus("playing");
              toast.success("已重新连接到比赛");
            } else {
              // Match not in playing state, just set up normally
              if (matchWords.length > 0) {
                const opts = generateOptions(matchWords[0].meaning, matchWords);
                setOptions(opts);
              }
              setMatchStatus("playing");
            }
          }
        });
    }
  }, [initialMatchId, profile, matchStatus]);
  
  // Use automatic match cleanup hook - ONLY when truly idle (not during searching)
  useMatchCleanup({ 
    profileId: profile?.id, 
    grade: 0, // Free match uses grade 0
    enabled: matchStatus === "idle" && !waitingMatchId
  });

  // OPTIMIZED: Only track presence when in idle state to reduce connections
  // Presence is only needed on the idle screen, not during matches
  useEffect(() => {
    if (!profile || matchStatus !== "idle") return;

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
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, matchStatus]);

  // Fetch random words for the match (from all grades + Math + Science, based on subject)
  const fetchMatchWords = useCallback(async () => {
    if (!profile) return [];
    
    const allWords: Word[] = [];
    
    // Only fetch words for selected subject(s)
    const shouldFetchEnglish = subject === "mixed" || subject === "english";
    const shouldFetchMath = subject === "mixed" || subject === "math";
    const shouldFetchScience = subject === "mixed" || subject === "science";
    
    // Get English words from both grades (7 and 8)
    if (shouldFetchEnglish) {
      const { data: englishWords, error: englishError } = await supabase
        .from("words")
        .select("id, word, meaning, phonetic, grade")
        .in("grade", [7, 8]);

      if (!englishError && englishWords) {
        allWords.push(...englishWords.map(w => ({ ...w, source: 'english' as const })));
      }
    }

    // Fetch Math words (0580 curriculum)
    if (shouldFetchMath) {
      const { data: mathWords, error: mathError } = await supabase
        .from("math_words")
        .select("id, word, meaning, phonetic");
      
      if (!mathError && mathWords) {
        allWords.push(...mathWords.map(w => ({ ...w, source: 'math' as const })));
      }
    }

    // Fetch Science words
    if (shouldFetchScience) {
      const { data: scienceWords, error: scienceError } = await supabase
        .from("science_words")
        .select("id, word, meaning, phonetic");
      
      if (!scienceError && scienceWords) {
        allWords.push(...scienceWords.map(w => ({ ...w, source: 'science' as const })));
      }
    }

    console.log(`Free match: Fetched ${allWords.length} total words for subject: ${subject}`);

    if (allWords.length === 0) return [];

    // For single subject mode, just shuffle and pick 10
    if (subject !== "mixed") {
      return [...allWords].sort(() => Math.random() - 0.5).slice(0, 10);
    }

    // For mixed mode: Weight distribution: ~50% English, ~25% Math, ~25% Science
    const englishWordsFiltered = allWords.filter(w => w.source === 'english');
    const mathWordsFiltered = allWords.filter(w => w.source === 'math');
    const scienceWordsFiltered = allWords.filter(w => w.source === 'science');
    
    const selectedWords: Word[] = [];
    
    // Pick ~5 English words
    const shuffledEnglish = [...englishWordsFiltered].sort(() => Math.random() - 0.5);
    selectedWords.push(...shuffledEnglish.slice(0, 5));
    
    // Pick ~2-3 Math words (if available)
    if (mathWordsFiltered.length > 0) {
      const shuffledMath = [...mathWordsFiltered].sort(() => Math.random() - 0.5);
      selectedWords.push(...shuffledMath.slice(0, 3));
    }
    
    // Pick ~2 Science words (if available)
    if (scienceWordsFiltered.length > 0) {
      const shuffledScience = [...scienceWordsFiltered].sort(() => Math.random() - 0.5);
      selectedWords.push(...shuffledScience.slice(0, 2));
    }
    
    // If we don't have enough, fill with more English words
    while (selectedWords.length < 10 && shuffledEnglish.length > selectedWords.filter(w => w.source === 'english').length) {
      const remaining = shuffledEnglish.filter(w => !selectedWords.includes(w));
      if (remaining.length > 0) {
        selectedWords.push(remaining[0]);
      } else {
        break;
      }
    }
    
    // Final shuffle to mix the order
    return selectedWords.sort(() => Math.random() - 0.5).slice(0, 10);
  }, [profile, subject]);

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
    
    setIsRealPlayer(false);
    setIsPlayer1(true); // AI match, we're always player1
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
    setMatchStatus("playing");
    sounds.playMatchFound();
  };

  // Try to join an existing free match (cross-grade) - with ELO-based matching
  const tryJoinExistingMatch = async (): Promise<boolean> => {
    if (!profile) return false;
    
    const matchWords = await fetchMatchWords();
    if (matchWords.length === 0) return false;

    // Get player's free match ELO
    const playerElo = profile.elo_free || 1000;
    // Use initial wide range (±200) to maximize chances of finding a match immediately
    const eloRange = 200;
    const minElo = playerElo - eloRange;
    const maxElo = playerElo + eloRange;

    // Get all waiting free matches (grade = 0 indicates free match)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: waitingMatches } = await supabase
      .from("ranked_matches")
      .select("*, player1:profiles!ranked_matches_player1_id_fkey(*)")
      .eq("status", "waiting")
      .eq("grade", 0) // grade = 0 for free match
      .neq("player1_id", profile.id)
      .is("player2_id", null) // CRITICAL: Only matches without player2
      .gte("created_at", fiveMinutesAgo)
      .order("created_at", { ascending: true })
      .limit(20);

    console.log("Found waiting free matches:", waitingMatches?.length || 0, "ELO range:", minElo, "-", maxElo);

    if (!waitingMatches || waitingMatches.length === 0) return false;

    // Filter by ELO range and sort by ELO proximity
    const matchesInRange = waitingMatches
      .filter((m) => {
        const opponentElo = m.player1?.elo_free || 1000;
        return opponentElo >= minElo && opponentElo <= maxElo;
      })
      .sort((a, b) => {
        const aEloDiff = Math.abs((a.player1?.elo_free || 1000) - playerElo);
        const bEloDiff = Math.abs((b.player1?.elo_free || 1000) - playerElo);
        return aEloDiff - bEloDiff; // Sort by closest ELO first
      });

    console.log("Free matches in ELO range:", matchesInRange.length);

    // Try to join each match until one succeeds
    for (const matchToJoin of matchesInRange) {
      console.log("Attempting to join free match:", matchToJoin.id, "Opponent ELO:", matchToJoin.player1?.elo_free);
      
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
        .is("player2_id", null) // Atomic check - ensure no one else joined
        .select()
        .maybeSingle();

      if (!joinError && updatedMatch) {
        console.log("Successfully joined free match:", updatedMatch.id);
        addMatchDebugLog(`成功加入对局: ${updatedMatch.id.slice(0, 8)}...`, "success");
        
        // Also update player1_elo for tracking
        await supabase
          .from("ranked_matches")
          .update({ player1_elo: matchToJoin.player1?.elo_free || 1000 })
          .eq("id", matchToJoin.id);
        
        setMatchId(matchToJoin.id);
        setOpponent(matchToJoin.player1);
        setIsRealPlayer(true);
        setIsPlayer1(false); // We joined, so we're player2
        setWords(matchWords);
        setOptions(generateOptions(matchWords[0].meaning, matchWords));
        setMatchStatus("found");
        sounds.playMatchFound();
        return true;
      } else {
        console.log("Failed to join free match:", matchToJoin.id, joinError?.message);
      }
    }
    
    return false;
  };

  // OPTIMIZED: Removed separate broadcast function - now uses combined channel in matchmaking useEffect

  // Lock to prevent multiple startSearch calls - persists across re-renders
  // CRITICAL: This lock should NOT be released until match is found or cancelled
  const searchLockRef = useRef(false);
  
  // Start searching for a free match - with strict lock protection
  const startSearch = async () => {
    if (!profile) {
      toast.error("请先登录");
      return;
    }

    // STRICT lock check - if we're already searching or have an active search, reject
    if (searchLockRef.current) {
      addMatchDebugLog("搜索锁已激活，忽略重复调用", "warn");
      console.log("[startSearch] Lock already active, ignoring call");
      return;
    }
    
    // Also check state-based locks
    if (matchStatus === "searching" || matchStatus === "found" || matchStatus === "playing") {
      addMatchDebugLog(`当前状态(${matchStatus})不允许新搜索`, "warn");
      console.log("[startSearch] Invalid state for new search:", matchStatus);
      return;
    }
    
    // Check if we already have a waiting match
    if (waitingMatchId) {
      addMatchDebugLog("已有等待中的对局，忽略重复调用", "warn");
      console.log("[startSearch] Already have waiting match:", waitingMatchId);
      return;
    }
    
    // Acquire lock IMMEDIATELY and don't release until search ends
    searchLockRef.current = true;
    addMatchDebugLog("获取搜索锁成功", "info");

    // Warmup audio in background - don't block search
    audioManager.warmup();
    
    addMatchDebugLog(`开始搜索自由对战 (玩家: ${profile.username})`, "info");
    setMatchStatus("searching");
    setSearchTime(0);
    setShowAIOption(false);
    
    // Clear any previous cancel reason
    setCancelReason(null);

    try {
      // Start stale match cleanup in background (non-blocking)
      // find_match_in_queue already cancels existing waiting entries internally
      cancelPlayerStaleMatches(profile.id, 0);

      // Check if player is already in a RECENT active match (created within last 10 minutes)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: existingActiveMatch } = await supabase
        .from("ranked_matches")
        .select("*, player1:profiles!ranked_matches_player1_id_fkey(*), player2:profiles!ranked_matches_player2_id_fkey(*)")
        .eq("grade", 0)
        .in("status", ["waiting", "in_progress"])
        .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`)
        .gte("created_at", tenMinutesAgo) // Only consider matches from last 10 minutes
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingActiveMatch) {
        console.log("Player already in active free match:", existingActiveMatch.id, existingActiveMatch.status);
        
        if (existingActiveMatch.status === "in_progress") {
          // Rejoin the existing match
          const isPlayer1 = existingActiveMatch.player1_id === profile.id;
          const opponentData = isPlayer1 ? existingActiveMatch.player2 : existingActiveMatch.player1;
          const matchWords = (existingActiveMatch.words as any[])?.map((w: any) => ({
            id: w.id,
            word: w.word,
            meaning: w.meaning,
            phonetic: w.phonetic,
            grade: w.grade,
          })) || [];
          
          if (matchWords.length > 0 && opponentData) {
            setMatchId(existingActiveMatch.id);
            setOpponent(opponentData);
            setIsRealPlayer(true);
            setIsPlayer1(existingActiveMatch.player1_id === profile.id);
            setWords(matchWords);
            setOptions(generateOptions(matchWords[0].meaning, matchWords));
            setMatchStatus("playing");
            sounds.playMatchFound();
            addMatchDebugLog("重新连接到进行中的对局，释放锁", "success");
            searchLockRef.current = false;
            return;
          }
        }
        
        // Recent waiting match - reuse it
        if (existingActiveMatch.status === "waiting") {
          addMatchDebugLog("复用现有等待对局，锁保持激活", "info");
          setMatchId(existingActiveMatch.id);
          setWaitingMatchId(existingActiveMatch.id);
          // CRITICAL: Do NOT release lock - still waiting for opponent
          return;
        }
      }

      // ===== NEW: USE SERVER-SIDE MATCH QUEUE =====
      // This ensures atomic matching at the database level
      addMatchDebugLog("加入服务器匹配池 (自由对战)...", "info");
      
      const { data: queueResult, error: queueError } = await supabase.rpc('find_match_in_queue', {
        p_profile_id: profile.id,
        p_grade: 0, // Free match uses grade 0
        p_match_type: 'free',
        p_elo_rating: profile.elo_free || 1000,
      });

      if (queueError) {
        console.error("Queue error:", queueError);
        addMatchDebugLog(`匹配池错误: ${queueError.message}`, "error");
        throw queueError;
      }

      // Check if we got matched immediately
      if (queueResult && queueResult.length > 0 && queueResult[0].new_match_id) {
        const result = queueResult[0];
        addMatchDebugLog(`服务器配对成功! 对局ID: ${result.new_match_id.slice(0, 8)}...`, "success");
        
        // Fetch match details with retry to ensure data consistency
        let matchData = null;
        for (let retry = 0; retry < 5; retry++) {
          const { data, error: fetchError } = await supabase
            .from("ranked_matches")
            .select("*, player1:profiles!ranked_matches_player1_id_fkey(*), player2:profiles!ranked_matches_player2_id_fkey(*)")
            .eq("id", result.new_match_id)
            .single();
          
          if (fetchError) {
            addMatchDebugLog(`获取对局数据错误 (尝试${retry + 1}): ${fetchError.message}`, "error");
          }
          
          if (data && data.player1 && data.player2) {
            matchData = data;
            addMatchDebugLog(`对局数据获取成功! p1=${data.player1?.username}, p2=${data.player2?.username}`, "success");
            break;
          }
          
          addMatchDebugLog(`等待对局数据完整... 重试 ${retry + 1}/5`, "info");
          if (retry < 4) {
            await new Promise(r => setTimeout(r, 200));
          }
        }

        if (matchData) {
          const matchWords = await fetchMatchWords();
          if (matchWords.length > 0) {
            // Update match with words
            await supabase
              .from("ranked_matches")
              .update({ words: matchWords })
              .eq("id", result.new_match_id);
            addMatchDebugLog(`已更新${matchWords.length}个词汇到对局`, "success");
          }

          const isPlayer1Matched = matchData.player1_id === profile.id;
          const opponentData = isPlayer1Matched ? matchData.player2 : matchData.player1;
          
          setMatchId(result.new_match_id);
          setOpponent(opponentData);
          setIsRealPlayer(true);
          setIsPlayer1(isPlayer1Matched);
          setWords(matchWords);
          if (matchWords.length > 0) {
            setOptions(generateOptions(matchWords[0].meaning, matchWords));
          }
          setMatchStatus("found");
          sounds.playMatchFound();
          searchLockRef.current = false;
          return;
        } else {
          addMatchDebugLog("❌ 5次重试后仍无法获取完整对局数据，进入轮询模式", "error");
          // Fall through to queue waiting mode
        }
      }

      // No immediate match - we're in the queue, set up waiting state
      // CRITICAL: Do NOT create a ranked_matches record here!
      // Only rely on match_queue - when opponent calls find_match_in_queue,
      // the DB function will create the match and update both queue entries
      addMatchDebugLog("已加入匹配池，等待对手... (纯队列模式)", "info");
      
      // Set marker to indicate we're waiting in queue - this triggers the polling useEffect
      setWaitingMatchId("queue-waiting");
      
      // IMMEDIATE POLLING: Start polling right here instead of waiting for useEffect
      // This ensures we don't miss any matches due to React state timing issues
      addMatchDebugLog("启动即时轮询检查...", "info");
      const startImmediatePolling = async () => {
        let pollCount = 0;
        const maxPolls = 120; // 2 minutes max
        
        while (pollCount < maxPolls) {
          pollCount++;
          await new Promise(r => setTimeout(r, 1000));
          
          // Check if we're still searching
          if (matchStatusRef.current !== "searching") {
            addMatchDebugLog(`即时轮询#${pollCount}: 状态变更(${matchStatusRef.current})，停止轮询`, "info");
            return;
          }
          
          addMatchDebugLog(`即时轮询#${pollCount}: 检查队列状态...`, "info");
          
          try {
            const { data: queueStatus, error: queueError } = await supabase.rpc('check_queue_status', {
              p_profile_id: profile.id,
              p_match_type: 'free',
            });
            
            if (queueError) {
              addMatchDebugLog(`即时轮询#${pollCount}: RPC错误 - ${queueError.message}`, "error");
              continue;
            }
            
            if (!queueStatus || queueStatus.length === 0) {
              addMatchDebugLog(`即时轮询#${pollCount}: 队列中无条目`, "warn");
              continue;
            }
            
            const status = queueStatus[0];
            addMatchDebugLog(`即时轮询#${pollCount}: 状态=${status.queue_status}, match_id=${status.match_id?.slice(0, 8) || 'null'}`, "info");
            
            if (status.queue_status === 'matched' && status.match_id) {
              addMatchDebugLog(`🎉 即时轮询#${pollCount}: 发现匹配! ${status.match_id.slice(0, 8)}...`, "success");
              
              // Fetch full match data with retry
              let matchData = null;
              for (let retry = 0; retry < 5; retry++) {
                const { data, error: fetchError } = await supabase
                  .from("ranked_matches")
                  .select("*, player1:profiles!ranked_matches_player1_id_fkey(*), player2:profiles!ranked_matches_player2_id_fkey(*)")
                  .eq("id", status.match_id)
                  .single();
                
                if (data && data.player1 && data.player2) {
                  matchData = data;
                  addMatchDebugLog(`对局数据获取成功! p1=${data.player1?.username}, p2=${data.player2?.username}`, "success");
                  break;
                }
                
                if (retry < 4) {
                  addMatchDebugLog(`等待对局数据完整... 重试 ${retry + 1}/5`, "info");
                  await new Promise(r => setTimeout(r, 200));
                }
              }
              
              if (matchData) {
                const isPlayer1Matched = matchData.player1_id === profile.id;
                const opponentData = isPlayer1Matched ? matchData.player2 : matchData.player1;
                
                // Get words
                let matchWords = (matchData.words as any[])?.filter(w => w && w.word) || [];
                if (matchWords.length === 0) {
                  matchWords = await fetchMatchWords();
                  if (matchWords.length > 0) {
                    await supabase
                      .from("ranked_matches")
                      .update({ words: matchWords })
                      .eq("id", status.match_id);
                  }
                }
                
                setMatchId(status.match_id);
                setOpponent(opponentData);
                setIsRealPlayer(true);
                setIsPlayer1(isPlayer1Matched);
                setWords(matchWords);
                if (matchWords.length > 0) {
                  setOptions(generateOptions(matchWords[0].meaning, matchWords));
                }
                setWaitingMatchId(null);
                setMatchStatus("found");
                sounds.playMatchFound();
                searchLockRef.current = false;
                addMatchDebugLog("即时轮询匹配完成!", "success");
                return;
              }
            }
          } catch (err) {
            addMatchDebugLog(`即时轮询#${pollCount}: 异常 - ${err}`, "error");
          }
        }
        
        addMatchDebugLog("即时轮询超时，显示AI选项", "warn");
        setShowAIOption(true);
      };
      
      // Start polling in the background (don't await)
      startImmediatePolling();

    } catch (error: any) {
      console.error("Match error:", error);
      addMatchDebugLog(`匹配错误: ${error.message}，释放锁`, "error");
      if (isActiveMatchError(error)) {
        handleActiveMatchError();
        setCancelReason("你已在一场比赛中，请先完成当前比赛后再开始新匹配");
      } else {
        toast.error("匹配失败，请重试");
        setCancelReason("匹配出现错误，请重试");
      }
      setMatchStatus("idle");
      searchLockRef.current = false;
    }
    // NO finally block - lock release is handled explicitly in each path
  };
  
  // Release search lock when match is found or search is cancelled
  useEffect(() => {
    // Release lock when we transition away from searching
    if (matchStatus !== "searching" && matchStatus !== "idle") {
      // We've found a match or are playing
      if (searchLockRef.current) {
        addMatchDebugLog(`状态变为${matchStatus}，释放搜索锁`, "info");
        searchLockRef.current = false;
      }
    }
  }, [matchStatus]);

  // Ref to track if match has been joined - MOVED TO COMPONENT LEVEL
  const matchJoinedRef = useRef(false);
  
  // Helper to check if player is already in an active match (server-side check)
  const checkPlayerInActiveMatch = async () => {
    if (!profile) return false;
    
    const { data } = await supabase
      .from("ranked_matches")
      .select("id, status")
      .eq("grade", 0)
      .in("status", ["in_progress"])
      .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`)
      .limit(1);
    
    return data && data.length > 0;
  };
  
  // Search time tracker and AI fallback timeout
  // Polling is handled by startImmediatePolling in startSearch - no duplicate polling needed
  useEffect(() => {
    if (matchStatus !== "searching") return;

    // Show AI option after 15 seconds
    const aiTimeout = setTimeout(() => {
      setShowAIOption(true);
    }, 15000);

    return () => {
      clearTimeout(aiTimeout);
    };
  }, [matchStatus]);

  // Cancel search - also cleans up queue
  const cancelSearch = async () => {
    // Cancel queue entry
    if (profile) {
      await supabase.rpc('cancel_queue_entry', {
        p_profile_id: profile.id,
        p_match_type: 'free',
      });
    }
    
    if (matchId) {
      await supabase
        .from("ranked_matches")
        .update({ status: "cancelled" })
        .eq("id", matchId);
    }
    // Reset all locks
    globalMatchLockRef.current = false;
    matchJoinedRef.current = false;
    searchLockRef.current = false;
    
    setMatchStatus("idle");
    setMatchId(null);
    setWaitingMatchId(null);
    setShowAIOption(false);
  };

  // Choose to play with AI - also cleans up queue
  const chooseAIBattle = async () => {
    // Cancel queue entry
    if (profile) {
      await supabase.rpc('cancel_queue_entry', {
        p_profile_id: profile.id,
        p_match_type: 'free',
      });
    }
    
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
    if (selectedOption || !words[currentWordIndex] || myFinished || matchFinished) return;

    setSelectedOption(selectedMeaning);
    const isCorrect = selectedMeaning === words[currentWordIndex].meaning;
    const newScore = isCorrect ? myScore + 1 : myScore;
    const newQuestionIndex = currentWordIndex + 1;

    if (isCorrect) {
      setMyScore(newScore);
      setAnswerAnimation('correct');
      
      // Play combo sound for streaks, otherwise normal correct sounds
      const newCombo = comboCount + 1;
      setComboCount(newCombo);
      
      if (newCombo >= 3) {
        sounds.playCombo(newCombo);
        setShowComboPopup(true);
        setTimeout(() => setShowComboPopup(false), 800);
      } else {
        sounds.playCorrect();
      }
      haptics.success();
    } else {
      setAnswerAnimation('wrong');
      sounds.playWrong();
      haptics.error();
      
      // Reset combo on wrong answer
      setComboCount(0);
    }

    // ALWAYS update progress to database for matches (regardless of isRealPlayer flag)
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
      
      // OPTIMIZED: Use cached player position instead of querying DB every answer
      if (isPlayer1 !== null) {
        const isFinished = newQuestionIndex >= 10;
        const encodedProgress = newScore + (newQuestionIndex * 100) + (isFinished ? 10000 : 0);
        
        supabase
          .from("ranked_matches")
          .update({
            [isPlayer1 ? "player1_score" : "player2_score"]: encodedProgress,
          })
          .eq("id", matchId)
          .then(({ error }) => {
            if (error) console.error("Failed to update free match progress:", error);
          });
      }
    }

    setTimeout(() => {
      setAnswerAnimation(null);
      
      // Check if we've answered all 10 questions
      if (currentWordIndex >= 9 || newScore >= 10) {
        setMyFinished(true);
        setWaitingForOpponent(true);
        
        if (!isRealPlayer) {
          // AI match - finish immediately
          setTimeout(() => {
            if (!matchFinished) {
              finishMatchWithAI(newScore);
            }
          }, 1500);
        } else {
          // Real player - check if opponent already finished
          if (opponentFinished && opponentFinalScore !== null) {
            setTimeout(() => {
              if (!matchFinished) {
                finishMatchWithRealPlayer(newScore, opponentFinalScore);
              }
            }, 500);
          } else {
            // Set timeout to auto-finish if opponent doesn't respond within 30 seconds
            setTimeout(() => {
              if (!matchFinishedRef.current && myFinishedRef.current) {
                console.log("Opponent timeout - auto-finishing with current opponent score");
                // Get current opponent score or default to 0
                const currentOpponentScore = opponentFinalScore ?? opponentProgress;
                finishMatchWithRealPlayer(newScore, currentOpponentScore);
              }
            }, 30000); // 30 second timeout
          }
          // Otherwise wait for opponent (handled by realtime listener + polling)
        }
        return;
      }
      
      if (currentWordIndex < words.length - 1) {
        setCurrentWordIndex(prev => prev + 1);
        setSelectedOption(null);
        setOptions(generateOptions(words[currentWordIndex + 1].meaning, words));
      }
    }, 800);
  };

  // Finish match with AI opponent
  const finishMatchWithAI = async (finalScore: number) => {
    if (matchFinished) return;
    setMatchFinished(true);
    setMatchStatus("finished");
    setWaitingForOpponent(false);
    
    // CRITICAL: Reset locks for next match
    globalMatchLockRef.current = false;
    matchJoinedRef.current = false;
    searchLockRef.current = false;
    
    const playerScore = finalScore;
    const simulatedOpponentScore = Math.floor(Math.random() * 10);
    setOpponentScore(simulatedOpponentScore);
    
    const won = playerScore > simulatedOpponentScore;
    const tie = playerScore === simulatedOpponentScore;
    setIsWinner(won);

    if (won) {
      sounds.playVictory();
    } else if (!tie) {
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
            mode: "free_match",
          });
        
        // Update profile max_combo if this is a new record
        if (comboCount > currentMax) {
          await supabase
            .from("profiles")
            .update({ max_combo: comboCount })
            .eq("id", profile.id);
        }
      }

      // CRITICAL: Clean up match_queue entry to allow future matches
      await supabase
        .from("match_queue")
        .delete()
        .eq("profile_id", profile.id)
        .eq("match_type", "free");

      refreshProfile();
    }
  };

  // Finish match with real player
  const finishMatchWithRealPlayer = async (myFinalScore: number, theirFinalScore: number) => {
    if (matchFinished) return;
    setMatchFinished(true);
    setMatchStatus("finished");
    setWaitingForOpponent(false);
    
    // CRITICAL: Reset locks for next match
    globalMatchLockRef.current = false;
    matchJoinedRef.current = false;
    searchLockRef.current = false;
    
    setOpponentScore(theirFinalScore);
    
    // IMPORTANT: Player1 is the authority for determining winner
    // Player2 should read the final result from DB to avoid race conditions
    if (profile && matchId && isPlayer1 !== null) {
      if (isPlayer1) {
        // Player1 is the authority - set winner and complete match
        const won = myFinalScore > theirFinalScore;
        const tie = myFinalScore === theirFinalScore;
        setIsWinner(won);

        if (won) {
          sounds.playVictory();
        } else if (!tie) {
          sounds.playDefeat();
        }

        await supabase
          .from("ranked_matches")
          .update({
            player1_score: myFinalScore,
            winner_id: won ? profile.id : (tie ? null : opponent?.id),
            status: "completed",
            ended_at: new Date().toISOString(),
          })
          .eq("id", matchId);

        // Update ELO for free match
        if (opponent?.elo_free !== undefined) {
          const playerElo = profile.elo_free || 1000;
          const opponentElo = opponent.elo_free || 1000;
          const totalMatches = profile.free_match_wins + profile.free_match_losses;
          const isNewPlayer = totalMatches < 30;
          
          await updateEloAfterMatch(
            profile.id,
            playerElo,
            opponentElo,
            won,
            tie,
            isNewPlayer,
            true // free match
          );
        }

        // Award XP based on result
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
            free_match_wins: won ? (profile.free_match_wins || 0) + 1 : (profile.free_match_wins || 0),
            free_match_losses: won ? (profile.free_match_losses || 0) : (profile.free_match_losses || 0) + 1,
          }
        );
      } else {
        // Player2 - update our score first, then read authoritative result from DB
        await supabase
          .from("ranked_matches")
          .update({
            player2_score: myFinalScore,
          })
          .eq("id", matchId);

        // Wait a moment for player1 to finalize, then read result
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const { data: finalMatch } = await supabase
          .from("ranked_matches")
          .select("player1_score, player2_score, winner_id, status")
          .eq("id", matchId)
          .single();

        if (finalMatch) {
          // Use authoritative scores from DB
          const dbMyScore = finalMatch.player2_score;
          const dbOpponentScore = finalMatch.player1_score;
          setOpponentScore(dbOpponentScore);
          
          // Determine win based on DB data or winner_id
          let won = false;
          let tie = false;
          
          if (finalMatch.winner_id) {
            won = finalMatch.winner_id === profile.id;
          } else if (finalMatch.status === "completed") {
            // If no winner_id, it's a tie
            tie = true;
          } else {
            // Fallback to local calculation if DB not yet updated
            won = dbMyScore > dbOpponentScore;
            tie = dbMyScore === dbOpponentScore;
          }
          
          setIsWinner(won);

          if (won) {
            sounds.playVictory();
          } else if (!tie) {
            sounds.playDefeat();
          }

          // Update ELO for free match (player2)
          if (opponent?.elo_free !== undefined) {
            const playerElo = profile.elo_free || 1000;
            const opponentElo = opponent.elo_free || 1000;
            const totalMatches = profile.free_match_wins + profile.free_match_losses;
            const isNewPlayer = totalMatches < 30;
            
            await updateEloAfterMatch(
              profile.id,
              playerElo,
              opponentElo,
              won,
              tie,
              isNewPlayer,
              true // free match
            );
          }

          // Award XP based on result
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
              free_match_wins: won ? profile.free_match_wins + 1 : profile.free_match_wins,
              free_match_losses: won ? profile.free_match_losses : profile.free_match_losses + 1,
            }
          );
        } else {
          // Fallback if DB read fails
          const won = myFinalScore > theirFinalScore;
          const tie = myFinalScore === theirFinalScore;
          setIsWinner(won);
          
          if (won) {
            sounds.playVictory();
          } else if (!tie) {
            sounds.playDefeat();
          }
        }
      }

      // Save combo record for player2 as well
      if (comboCount >= 3) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("max_combo")
          .eq("id", profile.id)
          .single();
        
        const currentMax = profileData?.max_combo || 0;
        
        await supabase
          .from("combo_records")
          .insert({
            profile_id: profile.id,
            combo_count: comboCount,
            mode: "free_match",
          });
        
        if (comboCount > currentMax) {
          await supabase
            .from("profiles")
            .update({ max_combo: comboCount })
            .eq("id", profile.id);
        }
      }

      // CRITICAL: Clean up match_queue entry to allow future matches
      await supabase
        .from("match_queue")
        .delete()
        .eq("profile_id", profile.id)
        .eq("match_type", "free");

      refreshProfile();
    }
  };
  
  // Legacy finishMatch for timer expiry
  const finishMatch = async (finalScore?: number) => {
    const score = finalScore ?? myScore;
    if (isRealPlayer) {
      setMyFinished(true);
      // Wait for opponent or timeout
      if (opponentFinished && opponentFinalScore !== null) {
        finishMatchWithRealPlayer(score, opponentFinalScore);
      }
    } else {
      finishMatchWithAI(score);
    }
  };

  // Realtime sync for battle progress (real player matches only)
  useEffect(() => {
    if (matchStatus !== "playing" || !matchId || !profile || !isRealPlayer) return;

    console.log("Setting up free match battle sync channel for match:", matchId);
    let isActive = true;
    
    const channel = supabase.channel(`free-battle-sync-${matchId}`)
      .on('broadcast', { event: 'player_progress' }, (payload) => {
        if (!isActive) return;
        const data = payload.payload as any;
        
        // Ignore our own messages
        if (data.playerId === profile.id) return;
        
        console.log("Free match opponent progress:", data);
        
        // Update opponent's current progress
        setOpponentProgress(data.questionIndex);
        
        // Update opponent's progress
        if (data.finished) {
          console.log("Broadcast: Free match opponent finished with score:", data.score);
          setOpponentFinished(true);
          setOpponentFinalScore(data.score);
          
          // If we're also finished, complete the match
          if (myFinishedRef.current && !matchFinishedRef.current) {
            console.log("Both finished via broadcast, completing free match");
            finishMatchWithRealPlayer(myScoreRef.current, data.score);
          }
        }
      })
      .subscribe((status) => {
        console.log("Free match battle sync channel status:", status);
        if (status === 'SUBSCRIBED') {
          setBattleChannel(channel);
        }
      });

    // OPTIMIZED: Polling fallback for opponent progress - uses cached isPlayer1
    // Reduced polling interval from 4s to 2s for better responsiveness
    const pollInterval = setInterval(async () => {
      if (!isActive || matchFinishedRef.current || isPlayer1 === null) return;
      
      const { data: matchData } = await supabase
        .from("ranked_matches")
        .select("player1_score, player2_score, status, started_at")
        .eq("id", matchId)
        .single();
      
      if (!matchData) return;
      
      // Use cached isPlayer1 instead of querying player1_id again
      const rawOpponentProgress = isPlayer1 ? matchData.player2_score : matchData.player1_score;
      
      // Decode progress: encodedProgress = score + (questionIndex * 100) + (finished ? 10000 : 0)
      const opponentHasFinished = rawOpponentProgress >= 10000;
      const progressWithoutFinished = opponentHasFinished ? rawOpponentProgress - 10000 : rawOpponentProgress;
      const opponentQuestionIndex = Math.floor(progressWithoutFinished / 100);
      const actualOpponentScore = progressWithoutFinished % 100;
      
      // Update opponent's current progress (visible progress bar)
      if (opponentQuestionIndex > 0 && opponentQuestionIndex !== opponentProgress) {
        setOpponentProgress(opponentQuestionIndex);
      }
      
      // If opponent has finished and we haven't marked them finished
      if (opponentHasFinished && !opponentFinishedRef.current) {
        setOpponentFinished(true);
        setOpponentFinalScore(actualOpponentScore);
        
        if (myFinishedRef.current && !matchFinishedRef.current) {
          finishMatchWithRealPlayer(myScoreRef.current, actualOpponentScore);
        }
      }
      
      // Check if match was marked completed by opponent
      if (matchData.status === "completed" && !matchFinishedRef.current) {
        setOpponentFinished(true);
        if (actualOpponentScore > 0 || opponentHasFinished) {
          setOpponentFinalScore(actualOpponentScore);
        }
        
        if (myFinishedRef.current) {
          finishMatchWithRealPlayer(myScoreRef.current, actualOpponentScore);
        }
      }
      
      // Check if opponent abandoned/cancelled - immediately end match with win
      if (matchData.status === "cancelled" && !matchFinishedRef.current) {
        console.log("Polling: Opponent abandoned free match, awarding win");
        matchFinishedRef.current = true;
        setMatchFinished(true);
        setMatchStatus("finished");
        setIsWinner(true);
        setOpponentScore(actualOpponentScore);
        
        // Award rewards for win by abandonment using updateProfileWithXp
        if (profile) {
          const xpGain = 6; // Win reward for free match
          const coinGain = 3;
          
          await updateProfileWithXp(
            profile.id,
            profile.level,
            profile.xp,
            profile.xp_to_next_level,
            xpGain,
            {
              coins: profile.coins + coinGain,
              free_match_wins: profile.free_match_wins + 1,
            }
          );
        }
        return;
      }
    }, 2000); // Reduced from 4s to 2s for faster sync

    return () => {
      isActive = false;
      setBattleChannel(null);
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  // FIXED: Removed opponentProgress from deps - it caused channel reconnection on every opponent answer
  }, [matchStatus, matchId, profile?.id, isRealPlayer, isPlayer1]);


  // Timer
  useEffect(() => {
    if (matchStatus === "playing" && timeLeft > 0 && !myFinished && !matchFinished) {
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
  }, [matchStatus, timeLeft, myFinished, matchFinished]);

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

            {/* Active match warning */}
            {activeMatch && activeMatch.type === "free" && (
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

            {/* Cancel reason display */}
            {cancelReason && (
              <Card className="mb-6 border-amber-500/50 bg-amber-500/10">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-500 text-sm mb-1">上次匹配取消原因</p>
                      <p className="text-sm text-muted-foreground">{cancelReason}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-3 w-full text-xs"
                    onClick={() => setCancelReason(null)}
                  >
                    知道了
                  </Button>
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
              disabled={!!activeMatch}
            >
              <Globe className="w-5 h-5 mr-2" />
              {isCheckingActiveMatch ? "检测中..." : "开始自由匹配"}
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
        <div className="absolute inset-0 overflow-hidden">
          {FREE_SEARCH_PARTICLES.map((particle, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-neon-cyan/30 rounded-full animate-pulse"
              style={{
                left: particle.left,
                top: particle.top,
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
          <p className="text-muted-foreground mb-6">正在全服寻找对手...</p>
          
          {/* Search Progress with phases */}
          <MatchSearchProgress 
            searchTime={searchTime} 
            variant="free" 
            className="mb-6"
          />
          
          {/* Waiting tips and word preview */}
          <MatchWaitingTips 
            grade={profile?.grade} 
            variant="free" 
            className="mb-6"
          />

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
        
        {/* Debug Panel */}
        <MatchDebugPanel enabled={debugMode} />
      </div>
    );
  }

  // Match found state - VS screen with 4-second countdown
  if (matchStatus === "found") {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center relative overflow-hidden">
        {/* VS Spark Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {FREE_SPARK_POSITIONS.map((spark, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-neon-cyan rounded-full animate-ping"
              style={{
                left: spark.left,
                top: spark.top,
              }}
            />
          ))}
        </div>

        <div className="text-center relative z-10 px-4">
          {/* Player cards */}
          <div className="flex items-center justify-center gap-4 sm:gap-8 mb-8">
            {/* Me */}
            <div className="flex flex-col items-center animate-slide-in-left">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-neon-cyan to-neon-green flex items-center justify-center text-2xl sm:text-3xl font-gaming text-primary-foreground shadow-2xl mb-3">
                {profile?.username.charAt(0).toUpperCase()}
              </div>
              <p className="font-gaming text-lg sm:text-xl text-neon-cyan">{profile?.username}</p>
              <p className="text-xs text-muted-foreground">Lv.{profile?.level}</p>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-neon-cyan to-neon-blue flex items-center justify-center shadow-2xl animate-pulse">
                <span className="font-gaming text-2xl sm:text-3xl text-white">VS</span>
              </div>
              <div className="mt-3 px-4 py-2 bg-secondary/50 rounded-xl">
                <span className="font-gaming text-2xl sm:text-3xl text-neon-cyan animate-countdown-pop" key={vsCountdown}>
                  {vsCountdown}
                </span>
              </div>
            </div>

            {/* Opponent */}
            <div className="flex flex-col items-center animate-slide-in-right">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-2xl sm:text-3xl font-gaming text-primary-foreground shadow-2xl mb-3">
                {opponent?.username?.charAt(0).toUpperCase() || "?"}
              </div>
              <p className="font-gaming text-lg sm:text-xl text-neon-blue">{opponent?.username || "对手"}</p>
              <p className="text-xs text-muted-foreground">Lv.{opponent?.level || "?"}</p>
            </div>
          </div>

          {/* Match info */}
          <div className="space-y-2 animate-fade-in">
            <p className="text-muted-foreground">自由对战 · 准备开始</p>
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Globe className="w-3 h-3 mr-1" />
                全服匹配
              </Badge>
              <Badge variant="secondary" className="text-xs">
                10道题
              </Badge>
            </div>
          </div>
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
            {/* Top row with abandon button */}
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
              
              <Badge 
                variant={timeLeft <= 10 ? "destructive" : "outline"}
                className={cn("font-mono text-lg px-4", timeLeft <= 10 && "animate-pulse")}
              >
                <Clock className="w-4 h-4 mr-1" />
                {timeLeft}s
              </Badge>
              
              <Button
                variant="outline"
                size="sm"
                className="text-amber-500 border-amber-500/50 hover:bg-amber-500/10"
                onClick={async () => {
                  if (confirm("确定要脱离卡死状态吗？这将退出当前比赛")) {
                    // Clean up match_queue
                    if (profile?.id) {
                      await supabase
                        .from("match_queue")
                        .delete()
                        .eq("profile_id", profile.id);
                    }
                    // Cancel current match
                    if (matchId) {
                      await supabase
                        .from("ranked_matches")
                        .update({
                          status: "cancelled",
                          ended_at: new Date().toISOString(),
                        })
                        .eq("id", matchId);
                    }
                    toast.success("已脱离卡死状态");
                    setMatchStatus("idle");
                    setMatchId(null);
                    setOpponent(null);
                    setWords([]);
                    setCurrentWordIndex(0);
                    setMyScore(0);
                    setOpponentScore(0);
                    setTimeLeft(60);
                  }
                }}
              >
                <AlertTriangle className="w-4 h-4 mr-1" />
                脱离卡死
              </Button>
            </div>
            
            <div className="flex items-center justify-between mb-2">
              <div className="text-center flex-1">
                <div className="text-sm font-semibold text-primary">{profile?.username}</div>
                <div className="text-2xl font-gaming text-success">{myScore}</div>
                <div className="text-xs text-muted-foreground">{currentWordIndex + 1}/10</div>
              </div>
              
              <span className="font-gaming text-muted-foreground">VS</span>
              
              <div className="text-center flex-1">
                <div className="text-sm font-semibold text-neon-cyan">{opponent?.username}</div>
                <div className="text-2xl font-gaming text-neon-blue">
                  {isRealPlayer ? `${opponentProgress}/10` : "?/10"}
                </div>
                <div className="text-xs text-muted-foreground">对手进度</div>
              </div>
            </div>
            
            {/* Progress bars */}
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <Progress 
                  value={(currentWordIndex / 10) * 100} 
                  className="h-1.5"
                />
              </div>
              <span className="text-xs text-muted-foreground">VS</span>
              <div className="flex-1">
                <Progress 
                  value={(opponentProgress / 10) * 100} 
                  className="h-1.5 [&>div]:bg-neon-cyan"
                />
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

        {/* Main game area */}
        <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-center">
          {/* Waiting for opponent overlay */}
          {waitingForOpponent && !matchFinished && (
            <div className="w-full max-w-lg">
              <Card variant="glow" className="border-neon-cyan/30">
                <CardContent className="p-8 text-center">
                  <Loader2 className="w-12 h-12 mx-auto mb-4 text-neon-cyan animate-spin" />
                  <h3 className="font-gaming text-xl text-glow-cyan mb-2">你已完成答题！</h3>
                  <p className="text-muted-foreground mb-4">等待对手完成中...</p>
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span>你的得分: {myScore}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-neon-cyan" />
                      <span>对手进度: {opponentProgress}/10</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    如果对手30秒内无响应将自动结算
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Normal quiz UI */}
          {!waitingForOpponent && currentWord && (
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
              
              {/* Combo counter display */}
              {comboCount >= 2 && (
                <div className="flex items-center justify-center mt-4">
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl transition-all",
                    comboCount >= 5 ? "text-amber-500 bg-amber-500/10" : "text-orange-400 bg-orange-400/10"
                  )}>
                    <Flame className={cn("w-5 h-5", comboCount >= 5 && "animate-pulse")} />
                    <span className="font-gaming">{comboCount}连击</span>
                  </div>
                </div>
              )}
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
                setIsPlayer1(null);
                setIsRealPlayer(false);
                setOpponentFinished(false);
                setOpponentFinalScore(null);
                setMyFinished(false);
                setMatchFinished(false);
                setWaitingForOpponent(false);
                setOpponentProgress(0);
                setComboCount(0);
                setShowComboPopup(false);
                // Reset locks
                globalMatchLockRef.current = false;
                matchJoinedRef.current = false;
                searchLockRef.current = false;
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
