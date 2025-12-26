import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import WordCard from "./WordCard";
import QuizCard, { QuizType } from "./QuizCard";
import { 
  ChevronLeft, 
  Star, 
  Zap, 
  CheckCircle,
  XCircle,
  Trophy,
  RotateCcw,
  Loader2,
  Shuffle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { updateProfileWithXp } from "@/lib/levelUp";

const QUIZ_TYPES: { type: QuizType; label: string; icon: string }[] = [
  { type: "meaning", label: "选择释义", icon: "📖" },
  { type: "reverse", label: "选择单词", icon: "🔤" },
  { type: "spelling", label: "拼写单词", icon: "✍️" },
  { type: "listening", label: "听音拼写", icon: "🎧" },
  { type: "fillBlank", label: "填空", icon: "📝" },
];

interface WordLearningProps {
  levelId: string;
  levelName: string;
  onBack: () => void;
  onComplete: () => void;
}

interface Word {
  id: string;
  word: string;
  meaning: string;
  phonetic: string | null;
  example: string | null;
}

const WordLearning = ({ levelId, levelName, onBack, onComplete }: WordLearningProps) => {
  const { profile, refreshProfile } = useAuth();
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"learn" | "quiz">("learn"); // 先学后测
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [learnedWords, setLearnedWords] = useState<Set<string>>(new Set()); // 已看过的单词

  useEffect(() => {
    const fetchWords = async () => {
      if (!profile) {
        setLoading(false);
        return;
      }

      try {
        // 检查是否是字母关卡格式 (如 "A-1")
        const letterMatch = levelId.match(/^([A-Z])-(\d+)$/);
        
        if (letterMatch) {
          // 字母关卡格式
          const letter = letterMatch[1];
          const subLevelIndex = parseInt(letterMatch[2]) - 1;
          const WORDS_PER_LEVEL = 10;

          // 获取该年级所有以该字母开头的单词
          const { data: wordsData, error: wordsError } = await supabase
            .from("words")
            .select("id, word, meaning, phonetic, example")
            .eq("grade", profile.grade)
            .ilike("word", `${letter}%`)
            .order("word", { ascending: true });

          if (wordsError) throw wordsError;

          // 分割成小关卡并获取当前关卡的单词
          const startIndex = subLevelIndex * WORDS_PER_LEVEL;
          const endIndex = startIndex + WORDS_PER_LEVEL;
          const subLevelWords = wordsData?.slice(startIndex, endIndex) || [];

          setWords(subLevelWords);
        } else {
          // 旧的关卡格式 (兼容)
          const { data: levelData, error: levelError } = await supabase
            .from("levels")
            .select("unit, grade")
            .eq("id", levelId)
            .single();

          if (levelError) throw levelError;

          const { data: wordsData, error: wordsError } = await supabase
            .from("words")
            .select("id, word, meaning, phonetic, example")
            .eq("grade", levelData.grade)
            .eq("unit", levelData.unit)
            .limit(10);

          if (wordsError) throw wordsError;

          setWords(wordsData || []);
        }
      } catch (error) {
        console.error("Error fetching words:", error);
        toast.error("加载单词失败");
      } finally {
        setLoading(false);
      }
    };

    fetchWords();
  }, [levelId, profile]);

  const currentWord = words[currentIndex];
  const progress = words.length > 0 
    ? phase === "learn" 
      ? ((currentIndex + 1) / words.length) * 50 // Learning is 0-50%
      : 50 + ((currentIndex + 1) / words.length) * 50 // Quiz is 50-100%
    : 0;

  // Get options for meaning quiz (Chinese meanings)
  const getMeaningOptions = useMemo(() => {
    if (!currentWord) return [];
    const meanings = words.map(w => w.meaning);
    const correctMeaning = currentWord.meaning;
    const otherMeanings = meanings.filter(m => m !== correctMeaning);
    const shuffled = otherMeanings.sort(() => Math.random() - 0.5).slice(0, 3);
    return [...shuffled, correctMeaning].sort(() => Math.random() - 0.5);
  }, [currentWord, words]);

  // Get options for reverse quiz (English words)
  const getWordOptions = useMemo(() => {
    if (!currentWord) return [];
    const wordsList = words.map(w => w.word);
    const correctWord = currentWord.word;
    const otherWords = wordsList.filter(w => w !== correctWord);
    const shuffled = otherWords.sort(() => Math.random() - 0.5).slice(0, 3);
    return [...shuffled, correctWord].sort(() => Math.random() - 0.5);
  }, [currentWord, words]);

  // Get random quiz type for each question
  const getCurrentQuizType = useMemo(() => {
    const types: QuizType[] = ["meaning", "reverse", "spelling", "listening", "fillBlank"];
    return types[Math.floor(Math.random() * types.length)];
  }, [currentIndex]);

  const getQuizOptions = () => getMeaningOptions;

  // Mark word as learned in learning phase
  const markWordAsLearned = async (word: Word) => {
    if (!profile) return;
    
    try {
      const { data: existing } = await supabase
        .from("learning_progress")
        .select("*")
        .eq("profile_id", profile.id)
        .eq("word_id", word.id)
        .maybeSingle();

      if (!existing) {
        // Only create if doesn't exist - learning phase just marks as seen
        await supabase
          .from("learning_progress")
          .insert({
            profile_id: profile.id,
            word_id: word.id,
            correct_count: 0,
            last_reviewed_at: new Date().toISOString(),
            mastery_level: 0, // Will be updated to 1 after quiz
          });
      }
    } catch (error) {
      console.error("Error marking word as learned:", error);
    }
  };

  const handleCorrect = async () => {
    setCorrectCount(prev => prev + 1);

    // Update learning progress
    if (profile && currentWord) {
      try {
        const { data: existing } = await supabase
          .from("learning_progress")
          .select("*")
          .eq("profile_id", profile.id)
          .eq("word_id", currentWord.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("learning_progress")
            .update({
              correct_count: existing.correct_count + 1,
              last_reviewed_at: new Date().toISOString(),
              mastery_level: Math.min(5, existing.mastery_level + 1),
            })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("learning_progress")
            .insert({
              profile_id: profile.id,
              word_id: currentWord.id,
              correct_count: 1,
              last_reviewed_at: new Date().toISOString(),
              mastery_level: 1,
            });
        }
      } catch (error) {
        console.error("Error updating learning progress:", error);
      }
    }

    nextWord();
  };

  const handleIncorrect = async () => {
    setIncorrectCount(prev => prev + 1);

    // Update learning progress - still set mastery_level to 1 to mark as "attempted"
    if (profile && currentWord) {
      try {
        const { data: existing } = await supabase
          .from("learning_progress")
          .select("*")
          .eq("profile_id", profile.id)
          .eq("word_id", currentWord.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("learning_progress")
            .update({
              incorrect_count: existing.incorrect_count + 1,
              last_reviewed_at: new Date().toISOString(),
              // Ensure mastery_level is at least 1 after attempting quiz
              mastery_level: Math.max(1, existing.mastery_level),
            })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("learning_progress")
            .insert({
              profile_id: profile.id,
              word_id: currentWord.id,
              incorrect_count: 1,
              last_reviewed_at: new Date().toISOString(),
              mastery_level: 1, // Mark as attempted even if wrong
            });
        }
      } catch (error) {
        console.error("Error updating learning progress:", error);
      }
    }

    nextWord();
  };

  const nextWord = () => {
    if (currentIndex < words.length - 1) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 500);
    } else {
      finishLevel();
    }
  };

  const finishLevel = async () => {
    // correctCount is already updated by handleCorrect/handleIncorrect before nextWord() calls finishLevel()
    const totalAnswered = correctCount + incorrectCount;
    const accuracy = words.length > 0 ? correctCount / words.length : 0;
    
    const baseXp = 5;
    const bonusXp = Math.floor(accuracy * 5);
    const baseCoins = 2;
    const bonusCoins = accuracy === 1 ? 3 : Math.floor(accuracy * 2);
    
    setXpEarned(baseXp + bonusXp);
    setCoinsEarned(baseCoins + bonusCoins);
    setShowResult(true);

    if (profile) {
      try {
        // Calculate stars
        const stars = accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : accuracy >= 0.5 ? 1 : 0;

        // 检查是否是字母关卡格式
        const letterMatch = levelId.match(/^([A-Z])-(\d+)$/);
        
        if (!letterMatch) {
          // 旧的关卡格式才更新 level_progress
          const { data: existingProgress } = await supabase
            .from("level_progress")
            .select("*")
            .eq("profile_id", profile.id)
            .eq("level_id", levelId)
            .maybeSingle();

          if (existingProgress) {
            await supabase
              .from("level_progress")
              .update({
                status: "completed",
                stars: Math.max(existingProgress.stars, stars),
                best_score: Math.max(existingProgress.best_score, Math.round(accuracy * 100)),
                attempts: existingProgress.attempts + 1,
                completed_at: new Date().toISOString(),
              })
              .eq("id", existingProgress.id);
          } else {
            await supabase
              .from("level_progress")
              .insert({
                profile_id: profile.id,
                level_id: levelId,
                status: "completed",
                stars,
                best_score: Math.round(accuracy * 100),
                attempts: 1,
                completed_at: new Date().toISOString(),
              });
          }
        }
        // 字母关卡的进度已经通过 learning_progress 更新了

        // Update profile with level up logic
        const totalXpGained = baseXp + bonusXp;
        const levelUpResult = await updateProfileWithXp(
          profile.id,
          profile.level,
          profile.xp,
          profile.xp_to_next_level,
          totalXpGained,
          { coins: profile.coins + baseCoins + bonusCoins }
        );

        if (levelUpResult.leveledUp) {
          toast.success(`🎉 升级了！现在是 Lv.${levelUpResult.newLevel}！`);
        }

        // Update daily quest progress
        const today = new Date().toISOString().split("T")[0];
        
        // Find learn quest
        const { data: learnQuest } = await supabase
          .from("daily_quests")
          .select("*")
          .eq("quest_type", "learn")
          .single();

        if (learnQuest) {
          const { data: questProgress } = await supabase
            .from("user_quest_progress")
            .select("*")
            .eq("profile_id", profile.id)
            .eq("quest_id", learnQuest.id)
            .eq("quest_date", today)
            .maybeSingle();

          const newProgress = (questProgress?.progress || 0) + 1;
          const completed = newProgress >= learnQuest.target;

          await supabase
            .from("user_quest_progress")
            .upsert({
              profile_id: profile.id,
              quest_id: learnQuest.id,
              quest_date: today,
              progress: newProgress,
              completed,
              claimed: questProgress?.claimed || false,
            });
        }

        // Find words quest
        const { data: wordsQuest } = await supabase
          .from("daily_quests")
          .select("*")
          .eq("quest_type", "words")
          .single();

        if (wordsQuest) {
          const { data: questProgress } = await supabase
            .from("user_quest_progress")
            .select("*")
            .eq("profile_id", profile.id)
            .eq("quest_id", wordsQuest.id)
            .eq("quest_date", today)
            .maybeSingle();

          const newProgress = (questProgress?.progress || 0) + correctCount;
          const completed = newProgress >= wordsQuest.target;

          await supabase
            .from("user_quest_progress")
            .upsert({
              profile_id: profile.id,
              quest_id: wordsQuest.id,
              quest_date: today,
              progress: newProgress,
              completed,
              claimed: questProgress?.claimed || false,
            });
        }

        await refreshProfile();
      } catch (error) {
        console.error("Error finishing level:", error);
      }
    }
  };

  const getStars = () => {
    const accuracy = correctCount / words.length;
    if (accuracy >= 0.9) return 3;
    if (accuracy >= 0.7) return 2;
    if (accuracy >= 0.5) return 1;
    return 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground mb-4">暂无单词数据</p>
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
      </div>
    );
  }

  if (showResult) {
    const stars = getStars();
    const accuracy = Math.round((correctCount / words.length) * 100);

    return (
      <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center animate-scale-in">
          <div className={cn(
            "w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg",
            stars >= 2 
              ? "bg-gradient-to-br from-accent to-amber-600 shadow-accent/30" 
              : "bg-gradient-to-br from-primary to-neon-pink shadow-primary/30"
          )}>
            <Trophy className="w-12 h-12 text-primary-foreground" />
          </div>

          <h2 className="font-gaming text-3xl mb-2 text-glow-purple">关卡完成！</h2>
          <p className="text-muted-foreground mb-6">{levelName}</p>

          <div className="flex justify-center gap-2 mb-8">
            {[1, 2, 3].map((star) => (
              <Star
                key={star}
                className={cn(
                  "w-10 h-10 transition-all duration-500",
                  star <= stars
                    ? "text-accent fill-accent drop-shadow-lg"
                    : "text-muted-foreground/30"
                )}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-success/10 rounded-xl p-4 border border-success/20">
              <CheckCircle className="w-6 h-6 text-success mx-auto mb-2" />
              <div className="font-gaming text-2xl text-success">{correctCount}</div>
              <div className="text-xs text-muted-foreground">正确</div>
            </div>
            <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
              <XCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
              <div className="font-gaming text-2xl text-destructive">{incorrectCount}</div>
              <div className="text-xs text-muted-foreground">错误</div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border/50 mb-6">
            <div className="text-sm text-muted-foreground mb-2">正确率</div>
            <div className="font-gaming text-4xl text-primary">{accuracy}%</div>
          </div>

          <div className="flex justify-center gap-4 mb-8">
            <Badge variant="xp" className="text-base px-4 py-2">
              <Star className="w-4 h-4 mr-2" />
              +{xpEarned} XP
            </Badge>
            <Badge variant="gold" className="text-base px-4 py-2">
              🪙 +{coinsEarned}
            </Badge>
          </div>

          <div className="flex gap-4">
            <Button variant="outline" className="flex-1" onClick={onComplete}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <Button variant="hero" className="flex-1" onClick={() => {
              setCurrentIndex(0);
              setCorrectCount(0);
              setIncorrectCount(0);
              setShowResult(false);
            }}>
              <RotateCcw className="w-4 h-4 mr-2" />
              再来一次
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
            <Badge variant="energy">
              <Zap className="w-3 h-3 mr-1" />
              消耗能量
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-gaming">{levelName}</span>
              <span className="text-sm text-muted-foreground">
                {phase === "learn" ? "学习" : "测验"}: {currentIndex + 1} / {words.length}
              </span>
            </div>
            <Progress value={progress} variant="xp" className="h-2" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-center gap-2 mb-4">
          <Badge 
            variant={phase === "learn" ? "default" : "outline"}
            className="px-4 py-2"
          >
            📖 学习阶段 ({learnedWords.size}/{words.length})
          </Badge>
          <Badge 
            variant={phase === "quiz" ? "default" : "outline"}
            className="px-4 py-2"
          >
            ✍️ 测验阶段
          </Badge>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Learning Phase - Show word cards */}
        {currentWord && phase === "learn" && (
          <WordCard
            key={currentWord.id}
            word={currentWord.word}
            meaning={currentWord.meaning}
            phonetic={currentWord.phonetic || undefined}
            example={currentWord.example || undefined}
            options={undefined}
            onCorrect={() => {
              markWordAsLearned(currentWord);
              setLearnedWords(prev => new Set([...prev, currentWord.id]));
              if (currentIndex < words.length - 1) {
                setCurrentIndex(prev => prev + 1);
              } else {
                setPhase("quiz");
                setCurrentIndex(0);
              }
            }}
            onIncorrect={() => {
              markWordAsLearned(currentWord);
              setLearnedWords(prev => new Set([...prev, currentWord.id]));
              if (currentIndex < words.length - 1) {
                setCurrentIndex(prev => prev + 1);
              } else {
                setPhase("quiz");
                setCurrentIndex(0);
              }
            }}
            mode="flashcard"
          />
        )}

        {/* Quiz Phase - Random question types */}
        {currentWord && phase === "quiz" && (
          <QuizCard
            key={`${currentWord.id}-${getCurrentQuizType}`}
            word={currentWord}
            quizType={getCurrentQuizType}
            options={getCurrentQuizType === "reverse" ? getWordOptions : getMeaningOptions}
            onCorrect={handleCorrect}
            onIncorrect={handleIncorrect}
          />
        )}

        <div className="flex justify-center gap-8 mt-8">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle className="w-5 h-5" />
            <span className="font-gaming">{correctCount}</span>
          </div>
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="w-5 h-5" />
            <span className="font-gaming">{incorrectCount}</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WordLearning;
