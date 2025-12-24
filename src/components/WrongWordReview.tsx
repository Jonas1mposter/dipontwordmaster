import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import QuizCard, { QuizType } from "./QuizCard";
import {
  ChevronLeft,
  Star,
  CheckCircle,
  XCircle,
  Trophy,
  RotateCcw,
  Shuffle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Word {
  id: string;
  word_id: string;
  word: string;
  meaning: string;
  phonetic: string | null;
  example: string | null;
  incorrect_count: number;
  correct_count: number;
}

interface WrongWordReviewProps {
  words: Word[];
  onBack: () => void;
  onComplete: () => void;
}

const QUIZ_TYPES: { type: QuizType; label: string; icon: string }[] = [
  { type: "meaning", label: "选择释义", icon: "📖" },
  { type: "reverse", label: "选择单词", icon: "🔤" },
  { type: "spelling", label: "拼写单词", icon: "✍️" },
  { type: "listening", label: "听音拼写", icon: "🎧" },
  { type: "fillBlank", label: "填空", icon: "📝" },
];

const WrongWordReview = ({ words, onBack, onComplete }: WrongWordReviewProps) => {
  const { profile, refreshProfile } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [quizType, setQuizType] = useState<QuizType>("meaning");
  const [randomQuizMode, setRandomQuizMode] = useState(true);
  const [xpEarned, setXpEarned] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);

  const currentWord = words[currentIndex];
  const progress = words.length > 0 ? ((currentIndex + 1) / words.length) * 100 : 0;

  // Get options for meaning quiz
  const getMeaningOptions = useMemo(() => {
    if (!currentWord) return [];
    const meanings = words.map((w) => w.meaning);
    const correctMeaning = currentWord.meaning;
    const otherMeanings = meanings.filter((m) => m !== correctMeaning);
    const shuffled = otherMeanings.sort(() => Math.random() - 0.5).slice(0, 3);
    return [...shuffled, correctMeaning].sort(() => Math.random() - 0.5);
  }, [currentWord, words]);

  // Get options for word quiz
  const getWordOptions = useMemo(() => {
    if (!currentWord) return [];
    const wordsList = words.map((w) => w.word);
    const correctWord = currentWord.word;
    const otherWords = wordsList.filter((w) => w !== correctWord);
    const shuffled = otherWords.sort(() => Math.random() - 0.5).slice(0, 3);
    return [...shuffled, correctWord].sort(() => Math.random() - 0.5);
  }, [currentWord, words]);

  // Random quiz type
  const getCurrentQuizType = useMemo(() => {
    if (!randomQuizMode) return quizType;
    const types: QuizType[] = ["meaning", "reverse", "spelling", "listening", "fillBlank"];
    return types[Math.floor(Math.random() * types.length)];
  }, [randomQuizMode, quizType, currentIndex]);

  const handleCorrect = async () => {
    setCorrectCount((prev) => prev + 1);

    // Update learning progress
    if (profile && currentWord) {
      try {
        const { data: existing } = await supabase
          .from("learning_progress")
          .select("*")
          .eq("profile_id", profile.id)
          .eq("word_id", currentWord.word_id)
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
        }
      } catch (error) {
        console.error("Error updating progress:", error);
      }
    }

    nextWord();
  };

  const handleIncorrect = async () => {
    setIncorrectCount((prev) => prev + 1);

    // Update learning progress
    if (profile && currentWord) {
      try {
        const { data: existing } = await supabase
          .from("learning_progress")
          .select("*")
          .eq("profile_id", profile.id)
          .eq("word_id", currentWord.word_id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("learning_progress")
            .update({
              incorrect_count: existing.incorrect_count + 1,
              last_reviewed_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        }
      } catch (error) {
        console.error("Error updating progress:", error);
      }
    }

    nextWord();
  };

  const nextWord = () => {
    if (currentIndex < words.length - 1) {
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 500);
    } else {
      finishReview();
    }
  };

  const finishReview = async () => {
    const accuracy = (correctCount + 1) / words.length;
    const baseXp = 30;
    const bonusXp = Math.floor(accuracy * 30);
    const baseCoins = 15;
    const bonusCoins = accuracy === 1 ? 20 : Math.floor(accuracy * 15);

    setXpEarned(baseXp + bonusXp);
    setCoinsEarned(baseCoins + bonusCoins);
    setShowResult(true);

    if (profile) {
      try {
        await supabase
          .from("profiles")
          .update({
            xp: profile.xp + baseXp + bonusXp,
            coins: profile.coins + baseCoins + bonusCoins,
          })
          .eq("id", profile.id);

        await refreshProfile();
      } catch (error) {
        console.error("Error updating profile:", error);
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

  if (showResult) {
    const stars = getStars();
    const accuracy = Math.round((correctCount / words.length) * 100);

    return (
      <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center animate-scale-in">
          <div
            className={cn(
              "w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg",
              stars >= 2
                ? "bg-gradient-to-br from-accent to-amber-600 shadow-accent/30"
                : "bg-gradient-to-br from-primary to-neon-pink shadow-primary/30"
            )}
          >
            <Trophy className="w-12 h-12 text-primary-foreground" />
          </div>

          <h2 className="font-gaming text-3xl mb-2 text-glow-purple">复习完成！</h2>
          <p className="text-muted-foreground mb-6">错题本专项复习</p>

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
            <Button
              variant="hero"
              className="flex-1"
              onClick={() => {
                setCurrentIndex(0);
                setCorrectCount(0);
                setIncorrectCount(0);
                setShowResult(false);
              }}
            >
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
            <Badge variant="destructive">错题复习</Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-gaming">错题本复习</span>
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {words.length}
              </span>
            </div>
            <Progress value={progress} variant="xp" className="h-2" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <Button
            variant={randomQuizMode ? "default" : "outline"}
            size="sm"
            onClick={() => setRandomQuizMode(!randomQuizMode)}
            className="gap-1"
          >
            <Shuffle className="w-3 h-3" />
            随机题型
          </Button>
          {!randomQuizMode &&
            QUIZ_TYPES.map((qt) => (
              <Button
                key={qt.type}
                variant={quizType === qt.type ? "default" : "outline"}
                size="sm"
                onClick={() => setQuizType(qt.type)}
                className="gap-1"
              >
                <span>{qt.icon}</span>
                {qt.label}
              </Button>
            ))}
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {currentWord && (
          <QuizCard
            key={`${currentWord.word_id}-${getCurrentQuizType}`}
            word={{
              id: currentWord.word_id,
              word: currentWord.word,
              meaning: currentWord.meaning,
              phonetic: currentWord.phonetic,
              example: currentWord.example,
            }}
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

export default WrongWordReview;
