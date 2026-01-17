import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, Volume2, Check, X, Star, RotateCcw, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSpeech } from "@/hooks/useSpeech";

interface ScienceWord {
  id: string;
  word: string;
  meaning: string;
  subject: string;
  topic: string | null;
  phonetic?: string;
  definition?: string;
}

interface ScienceWordLearningProps {
  levelId: string;
  levelName: string;
  words: ScienceWord[];
  onBack: () => void;
  onComplete: () => void;
}

type Phase = "learn" | "quiz" | "result";

const ScienceWordLearning = ({ levelId, levelName, words, onBack, onComplete }: ScienceWordLearningProps) => {
  const { profile } = useAuth();
  const { speak } = useSpeech();
  const [speaking, setSpeaking] = useState(false);
  
  const [phase, setPhase] = useState<Phase>("learn");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [learnedWords, setLearnedWords] = useState<Set<string>>(new Set());

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;

  // Generate quiz options
  const generateOptions = useCallback((correctWord: ScienceWord) => {
    const options = [correctWord.meaning];
    const otherWords = words.filter(w => w.id !== correctWord.id);
    
    while (options.length < 4 && otherWords.length > 0) {
      const randomIndex = Math.floor(Math.random() * otherWords.length);
      const randomWord = otherWords.splice(randomIndex, 1)[0];
      if (!options.includes(randomWord.meaning)) {
        options.push(randomWord.meaning);
      }
    }
    
    // Shuffle options
    return options.sort(() => Math.random() - 0.5);
  }, [words]);

  useEffect(() => {
    if (phase === "quiz" && currentWord) {
      setQuizOptions(generateOptions(currentWord));
      setSelectedAnswer(null);
      setIsAnswered(false);
    }
  }, [phase, currentIndex, currentWord, generateOptions]);

  const handleSpeak = () => {
    if (currentWord && !speaking) {
      setSpeaking(true);
      speak(currentWord.word);
      setTimeout(() => setSpeaking(false), 1000);
    }
  };

  const handleLearnNext = () => {
    setLearnedWords(prev => new Set(prev).add(currentWord.id));
    
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowMeaning(false);
    } else {
      // Move to quiz phase
      setPhase("quiz");
      setCurrentIndex(0);
    }
  };

  const handleQuizAnswer = async (answer: string) => {
    if (isAnswered) return;
    
    setSelectedAnswer(answer);
    setIsAnswered(true);
    
    const isCorrect = answer === currentWord.meaning;
    
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    } else {
      setIncorrectCount(prev => prev + 1);
    }

    // Save progress to database
    if (profile) {
      try {
        const { error } = await supabase
          .from("science_learning_progress")
          .upsert({
            profile_id: profile.id,
            word_id: currentWord.id,
            mastery_level: isCorrect ? 1 : 0,
            correct_count: isCorrect ? 1 : 0,
            incorrect_count: isCorrect ? 0 : 1,
            last_reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "profile_id,word_id",
          });
        
        if (error) console.error("Failed to save progress:", error);
      } catch (err) {
        console.error("Error saving progress:", err);
      }
    }

    // Auto advance after delay
    setTimeout(() => {
      if (currentIndex < words.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setPhase("result");
      }
    }, 1500);
  };

  const handleRetry = () => {
    setPhase("learn");
    setCurrentIndex(0);
    setCorrectCount(0);
    setIncorrectCount(0);
    setShowMeaning(false);
    setLearnedWords(new Set());
  };

  const getStars = () => {
    const ratio = correctCount / words.length;
    if (ratio >= 0.9) return 3;
    if (ratio >= 0.7) return 2;
    if (ratio >= 0.5) return 1;
    return 0;
  };

  // Learning Phase
  if (phase === "learn") {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern p-4">
        <div className="max-w-lg mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
            <Badge variant="secondary" className="flex items-center gap-1">
              <FlaskConical className="w-3 h-3" />
              {levelName}
            </Badge>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>学习进度</span>
              <span>{currentIndex + 1} / {words.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Word Card */}
          <Card className="border-2 border-green-500/30">
            <CardContent className="p-6 text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-3xl font-bold">{currentWord?.word}</h2>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleSpeak}
                  disabled={speaking}
                >
                  <Volume2 className={cn("w-5 h-5", speaking && "text-primary animate-pulse")} />
                </Button>
              </div>

              {currentWord?.phonetic && (
                <p className="text-muted-foreground">{currentWord.phonetic}</p>
              )}

              {currentWord?.subject && (
                <Badge variant="outline" className="text-xs">
                  {currentWord.subject}
                  {currentWord.topic && ` - ${currentWord.topic}`}
                </Badge>
              )}

              {showMeaning ? (
                <div className="space-y-3 animate-fade-in">
                  <p className="text-xl text-green-500 font-medium">{currentWord?.meaning}</p>
                  {currentWord?.definition && (
                    <p className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">
                      {currentWord.definition}
                    </p>
                  )}
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => setShowMeaning(true)}
                  className="w-full"
                >
                  显示释义
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Action Button */}
          {showMeaning && (
            <Button 
              variant="hero" 
              className="w-full" 
              onClick={handleLearnNext}
            >
              {currentIndex < words.length - 1 ? "下一个" : "开始测试"}
            </Button>
          )}

          {/* Word Preview */}
          <div className="flex flex-wrap gap-1.5 justify-center">
            {words.map((word, idx) => (
              <div
                key={word.id}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  idx === currentIndex && "w-4 bg-green-500",
                  idx < currentIndex && learnedWords.has(word.id) && "bg-success",
                  idx > currentIndex && "bg-secondary"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Quiz Phase
  if (phase === "quiz") {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern p-4">
        <div className="max-w-lg mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
            <div className="flex items-center gap-2">
              <Badge variant="success" className="text-xs">
                <Check className="w-3 h-3 mr-0.5" />
                {correctCount}
              </Badge>
              <Badge variant="destructive" className="text-xs">
                <X className="w-3 h-3 mr-0.5" />
                {incorrectCount}
              </Badge>
            </div>
          </div>

          {/* Progress */}
          <Progress value={progress} className="h-2" />

          {/* Question */}
          <Card className="border-2 border-green-500/30">
            <CardContent className="p-6 text-center space-y-4">
              <p className="text-sm text-muted-foreground">选择正确的中文释义</p>
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-2xl font-bold">{currentWord?.word}</h2>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleSpeak}
                  disabled={speaking}
                >
                  <Volume2 className={cn("w-4 h-4", speaking && "text-primary animate-pulse")} />
                </Button>
              </div>
              {currentWord?.subject && (
                <Badge variant="outline" className="text-xs">
                  {currentWord.subject}
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Options */}
          <div className="grid grid-cols-1 gap-2">
            {quizOptions.map((option, idx) => {
              const isCorrect = option === currentWord?.meaning;
              const isSelected = selectedAnswer === option;
              
              return (
                <Button
                  key={idx}
                  variant="outline"
                  className={cn(
                    "h-auto py-3 px-4 text-left justify-start",
                    isAnswered && isCorrect && "bg-success/20 border-success text-success-foreground",
                    isAnswered && isSelected && !isCorrect && "bg-destructive/20 border-destructive text-destructive-foreground",
                    !isAnswered && "hover:bg-green-500/10 hover:border-green-500"
                  )}
                  onClick={() => handleQuizAnswer(option)}
                  disabled={isAnswered}
                >
                  <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs mr-3">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {option}
                  {isAnswered && isCorrect && <Check className="w-4 h-4 ml-auto text-success" />}
                  {isAnswered && isSelected && !isCorrect && <X className="w-4 h-4 ml-auto text-destructive" />}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Result Phase
  const stars = getStars();
  const accuracy = Math.round((correctCount / words.length) * 100);

  return (
    <div className="min-h-screen bg-background bg-grid-pattern p-4 flex items-center justify-center">
      <Card className="w-full max-w-md border-2 border-green-500/30">
        <CardContent className="p-6 text-center space-y-6">
          <div className="space-y-2">
            <FlaskConical className="w-12 h-12 mx-auto text-green-500" />
            <h2 className="text-2xl font-gaming">学习完成！</h2>
            <p className="text-muted-foreground">{levelName}</p>
          </div>

          {/* Stars */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3].map((star) => (
              <Star
                key={star}
                className={cn(
                  "w-10 h-10 transition-all",
                  star <= stars
                    ? "text-accent fill-accent animate-bounce-in"
                    : "text-muted-foreground/30"
                )}
                style={{ animationDelay: `${star * 0.2}s` }}
              />
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 py-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{correctCount}</p>
              <p className="text-xs text-muted-foreground">正确</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">{incorrectCount}</p>
              <p className="text-xs text-muted-foreground">错误</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{accuracy}%</p>
              <p className="text-xs text-muted-foreground">正确率</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleRetry}>
              <RotateCcw className="w-4 h-4 mr-2" />
              重新学习
            </Button>
            <Button variant="hero" className="flex-1" onClick={onComplete}>
              完成
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScienceWordLearning;
