import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import WordCard from "./WordCard";
import { 
  ChevronLeft, 
  Star, 
  Zap, 
  CheckCircle,
  XCircle,
  Trophy,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WordLearningProps {
  levelId: number;
  levelName: string;
  onBack: () => void;
  onComplete: () => void;
}

interface Word {
  id: number;
  word: string;
  meaning: string;
  phonetic: string;
  example: string;
}

const WordLearning = ({ levelId, levelName, onBack, onComplete }: WordLearningProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<"flashcard" | "quiz">("flashcard");
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);

  // Mock word data
  const words: Word[] = [
    { id: 1, word: "magnificent", meaning: "壮丽的，宏伟的", phonetic: "/mæɡˈnɪfɪsənt/", example: "The view from the mountain was magnificent." },
    { id: 2, word: "perseverance", meaning: "坚持不懈，毅力", phonetic: "/ˌpɜːsɪˈvɪərəns/", example: "Success requires perseverance and hard work." },
    { id: 3, word: "phenomenon", meaning: "现象，奇迹", phonetic: "/fəˈnɒmɪnən/", example: "The Northern Lights are a natural phenomenon." },
    { id: 4, word: "enthusiasm", meaning: "热情，热忱", phonetic: "/ɪnˈθjuːziæzəm/", example: "She showed great enthusiasm for the project." },
    { id: 5, word: "consequence", meaning: "结果，后果", phonetic: "/ˈkɒnsɪkwəns/", example: "Every action has a consequence." },
  ];

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;

  // Generate quiz options
  const getQuizOptions = () => {
    const meanings = words.map(w => w.meaning);
    const correctMeaning = currentWord.meaning;
    const otherMeanings = meanings.filter(m => m !== correctMeaning);
    
    // Shuffle and pick 3 wrong answers
    const shuffled = otherMeanings.sort(() => Math.random() - 0.5).slice(0, 3);
    
    // Add correct answer and shuffle again
    return [...shuffled, correctMeaning].sort(() => Math.random() - 0.5);
  };

  const handleCorrect = () => {
    setCorrectCount(prev => prev + 1);
    nextWord();
  };

  const handleIncorrect = () => {
    setIncorrectCount(prev => prev + 1);
    nextWord();
  };

  const nextWord = () => {
    if (currentIndex < words.length - 1) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 500);
    } else {
      // Calculate rewards
      const accuracy = correctCount / words.length;
      const baseXp = 50;
      const bonusXp = Math.floor(accuracy * 50);
      const baseCoins = 20;
      const bonusCoins = accuracy === 1 ? 30 : Math.floor(accuracy * 20);
      
      setXpEarned(baseXp + bonusXp);
      setCoinsEarned(baseCoins + bonusCoins);
      setShowResult(true);
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
          {/* Trophy Icon */}
          <div className={cn(
            "w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg",
            stars >= 2 
              ? "bg-gradient-to-br from-accent to-amber-600 shadow-accent/30" 
              : "bg-gradient-to-br from-primary to-neon-pink shadow-primary/30"
          )}>
            <Trophy className="w-12 h-12 text-primary-foreground" />
          </div>

          <h2 className="font-gaming text-3xl mb-2 text-glow-purple">
            关卡完成！
          </h2>
          <p className="text-muted-foreground mb-6">{levelName}</p>

          {/* Stars */}
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
                style={{ animationDelay: `${star * 0.2}s` }}
              />
            ))}
          </div>

          {/* Stats */}
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

          {/* Accuracy */}
          <div className="bg-card rounded-xl p-4 border border-border/50 mb-6">
            <div className="text-sm text-muted-foreground mb-2">正确率</div>
            <div className="font-gaming text-4xl text-primary">{accuracy}%</div>
          </div>

          {/* Rewards */}
          <div className="flex justify-center gap-4 mb-8">
            <Badge variant="xp" className="text-base px-4 py-2">
              <Star className="w-4 h-4 mr-2" />
              +{xpEarned} XP
            </Badge>
            <Badge variant="gold" className="text-base px-4 py-2">
              🪙 +{coinsEarned}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button variant="outline" className="flex-1" onClick={onBack}>
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
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="hover:bg-primary/10"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
            <Badge variant="energy">
              <Zap className="w-3 h-3 mr-1" />
              -2 能量
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-gaming">{levelName}</span>
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {words.length}
              </span>
            </div>
            <Progress value={progress} variant="xp" className="h-2" />
          </div>
        </div>
      </header>

      {/* Mode Toggle */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-center gap-2">
          <Button
            variant={mode === "flashcard" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("flashcard")}
          >
            卡片模式
          </Button>
          <Button
            variant={mode === "quiz" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("quiz")}
          >
            测验模式
          </Button>
        </div>
      </div>

      {/* Word Card */}
      <main className="container mx-auto px-4 py-8">
        <WordCard
          key={currentWord.id}
          word={currentWord.word}
          meaning={currentWord.meaning}
          phonetic={currentWord.phonetic}
          example={currentWord.example}
          options={mode === "quiz" ? getQuizOptions() : undefined}
          onCorrect={handleCorrect}
          onIncorrect={handleIncorrect}
          mode={mode}
        />

        {/* Score Display */}
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
