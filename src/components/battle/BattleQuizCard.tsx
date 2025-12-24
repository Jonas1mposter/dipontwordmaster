import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Volume2, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type BattleQuizType = "meaning" | "reverse" | "spelling" | "listening";

interface Word {
  id: string;
  word: string;
  meaning: string;
  phonetic?: string | null;
  example?: string | null;
}

interface BattleQuizCardProps {
  word: Word;
  quizType: BattleQuizType;
  options: string[]; // For multiple choice types
  wordOptions: string[]; // Word options for reverse type
  onAnswer: (isCorrect: boolean) => void;
  disabled?: boolean;
  answerAnimation?: 'correct' | 'wrong' | null;
}

const BattleQuizCard = ({
  word,
  quizType,
  options,
  wordOptions,
  onAnswer,
  disabled = false,
  answerAnimation,
}: BattleQuizCardProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Reset state when word changes
  useEffect(() => {
    setSelectedOption(null);
    setUserInput("");
    setShowResult(false);
    setIsSubmitted(false);
  }, [word.id, quizType]);

  const speakWord = useCallback(() => {
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = "en-US";
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  }, [word.word]);

  // Auto-play for listening type
  useEffect(() => {
    if (quizType === "listening") {
      const timer = setTimeout(speakWord, 300);
      return () => clearTimeout(timer);
    }
  }, [quizType, speakWord]);

  const handleOptionSelect = (option: string) => {
    if (showResult || disabled || isSubmitted) return;
    setSelectedOption(option);
    setShowResult(true);
    setIsSubmitted(true);

    const isCorrect = quizType === "reverse" 
      ? option === word.word 
      : option === word.meaning;

    setTimeout(() => {
      onAnswer(isCorrect);
    }, 600);
  };

  const handleInputSubmit = () => {
    if (showResult || !userInput.trim() || disabled || isSubmitted) return;
    setShowResult(true);
    setIsSubmitted(true);

    const normalizedInput = userInput.trim().toLowerCase();
    const normalizedWord = word.word.toLowerCase();
    const isCorrect = normalizedInput === normalizedWord;

    setTimeout(() => {
      onAnswer(isCorrect);
    }, 600);
  };

  // Handle Enter key for input types
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleInputSubmit();
    }
  };

  // Quiz Type: Select meaning from options (English -> Chinese)
  if (quizType === "meaning") {
    return (
      <Card 
        variant="glow" 
        className={cn(
          "max-w-lg mx-auto p-8 text-center animate-scale-in transition-all",
          answerAnimation === 'correct' && "animate-correct-flash",
          answerAnimation === 'wrong' && "animate-wrong-shake"
        )}
      >
        <div className="mb-2">
          <span className="px-3 py-1 bg-primary/20 text-primary text-xs rounded-full font-medium">
            选择释义
          </span>
        </div>
        <div className="flex items-center justify-center gap-3 mb-6">
          <h2 className="text-4xl font-gaming text-glow-purple">{word.word}</h2>
          <button
            onClick={speakWord}
            className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <Volume2 className="w-5 h-5 text-primary" />
          </button>
        </div>
        {word.phonetic && (
          <p className="text-muted-foreground text-lg mb-8">{word.phonetic}</p>
        )}

        <div className="grid grid-cols-1 gap-3">
          {options.map((option, index) => {
            const isCorrect = option === word.meaning;
            const isSelected = selectedOption === option;
            
            return (
              <button
                key={index}
                onClick={() => handleOptionSelect(option)}
                disabled={showResult || disabled}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all duration-300 font-medium",
                  !showResult && !disabled && "hover:border-primary/50 hover:bg-primary/5 border-border bg-card",
                  (showResult || disabled) && !isSelected && !isCorrect && "opacity-50 cursor-not-allowed",
                  showResult && isCorrect && "border-success bg-success/10 text-success",
                  showResult && isSelected && !isCorrect && "border-destructive bg-destructive/10 text-destructive"
                )}
              >
                <div className="flex items-center justify-between">
                  <span>{option}</span>
                  {showResult && isCorrect && <CheckCircle className="w-5 h-5 text-success" />}
                  {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-destructive" />}
                </div>
              </button>
            );
          })}
        </div>
        
        {showResult && (
          <div className="mt-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            下一题准备中...
          </div>
        )}
      </Card>
    );
  }

  // Quiz Type: Select English word from options (Chinese -> English)
  if (quizType === "reverse") {
    return (
      <Card 
        variant="glow" 
        className={cn(
          "max-w-lg mx-auto p-8 text-center animate-scale-in transition-all",
          answerAnimation === 'correct' && "animate-correct-flash",
          answerAnimation === 'wrong' && "animate-wrong-shake"
        )}
      >
        <div className="mb-2">
          <span className="px-3 py-1 bg-neon-blue/20 text-neon-blue text-xs rounded-full font-medium">
            中译英
          </span>
        </div>
        <h2 className="text-3xl font-gaming text-glow-purple mb-8">{word.meaning}</h2>

        <div className="grid grid-cols-1 gap-3">
          {wordOptions.map((option, index) => {
            const isCorrect = option === word.word;
            const isSelected = selectedOption === option;

            return (
              <button
                key={index}
                onClick={() => handleOptionSelect(option)}
                disabled={showResult || disabled}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all duration-300 font-medium font-mono",
                  !showResult && !disabled && "hover:border-primary/50 hover:bg-primary/5 border-border bg-card",
                  (showResult || disabled) && !isSelected && !isCorrect && "opacity-50 cursor-not-allowed",
                  showResult && isCorrect && "border-success bg-success/10 text-success",
                  showResult && isSelected && !isCorrect && "border-destructive bg-destructive/10 text-destructive"
                )}
              >
                <div className="flex items-center justify-between">
                  <span>{option}</span>
                  {showResult && isCorrect && <CheckCircle className="w-5 h-5 text-success" />}
                  {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-destructive" />}
                </div>
              </button>
            );
          })}
        </div>
        
        {showResult && (
          <div className="mt-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            下一题准备中...
          </div>
        )}
      </Card>
    );
  }

  // Quiz Type: Spelling (type the word based on meaning)
  if (quizType === "spelling") {
    const isCorrect = userInput.trim().toLowerCase() === word.word.toLowerCase();
    
    return (
      <Card 
        variant="glow" 
        className={cn(
          "max-w-lg mx-auto p-8 text-center animate-scale-in transition-all",
          answerAnimation === 'correct' && "animate-correct-flash",
          answerAnimation === 'wrong' && "animate-wrong-shake"
        )}
      >
        <div className="mb-2">
          <span className="px-3 py-1 bg-neon-pink/20 text-neon-pink text-xs rounded-full font-medium">
            拼写单词
          </span>
        </div>
        <h2 className="text-3xl font-gaming text-glow-purple mb-2">{word.meaning}</h2>
        <p className="text-muted-foreground text-sm mb-6">
          首字母提示: <span className="font-mono text-primary">{word.word[0].toUpperCase()}</span>
        </p>

        <div className="space-y-4">
          <Input
            type="text"
            placeholder="输入英文单词后按回车..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={showResult || disabled}
            className={cn(
              "text-center text-xl font-mono h-14",
              showResult && isCorrect && "border-success bg-success/10",
              showResult && !isCorrect && "border-destructive bg-destructive/10"
            )}
            autoFocus
            autoComplete="off"
          />

          {showResult && !isCorrect && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">正确答案:</p>
              <p className="text-xl font-mono text-success">{word.word}</p>
            </div>
          )}

          {!showResult && (
            <button
              onClick={handleInputSubmit}
              disabled={!userInput.trim() || disabled}
              className={cn(
                "w-full py-3 rounded-xl font-medium transition-all",
                userInput.trim() && !disabled
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              确认 (或按回车)
            </button>
          )}
          
          {showResult && (
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              下一题准备中...
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Quiz Type: Listening (hear the word, type it)
  if (quizType === "listening") {
    const isCorrect = userInput.trim().toLowerCase() === word.word.toLowerCase();
    
    return (
      <Card 
        variant="glow" 
        className={cn(
          "max-w-lg mx-auto p-8 text-center animate-scale-in transition-all",
          answerAnimation === 'correct' && "animate-correct-flash",
          answerAnimation === 'wrong' && "animate-wrong-shake"
        )}
      >
        <div className="mb-4">
          <span className="px-3 py-1 bg-accent/20 text-accent text-xs rounded-full font-medium">
            听音拼写
          </span>
        </div>
        
        <button
          onClick={speakWord}
          className="w-20 h-20 rounded-full bg-primary/20 hover:bg-primary/30 transition-all hover:scale-105 flex items-center justify-center mx-auto mb-4"
        >
          <Volume2 className="w-10 h-10 text-primary" />
        </button>
        <p className="text-sm text-muted-foreground mb-6">点击播放发音</p>

        <div className="space-y-4">
          <Input
            type="text"
            placeholder="输入你听到的单词..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={showResult || disabled}
            className={cn(
              "text-center text-xl font-mono h-14",
              showResult && isCorrect && "border-success bg-success/10",
              showResult && !isCorrect && "border-destructive bg-destructive/10"
            )}
            autoFocus
            autoComplete="off"
          />

          {showResult && (
            <div className="text-center space-y-1">
              {!isCorrect && (
                <>
                  <p className="text-sm text-muted-foreground">正确答案:</p>
                  <p className="text-xl font-mono text-success">{word.word}</p>
                </>
              )}
              <p className="text-muted-foreground">{word.meaning}</p>
            </div>
          )}

          {!showResult && (
            <button
              onClick={handleInputSubmit}
              disabled={!userInput.trim() || disabled}
              className={cn(
                "w-full py-3 rounded-xl font-medium transition-all",
                userInput.trim() && !disabled
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              确认 (或按回车)
            </button>
          )}
          
          {showResult && (
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              下一题准备中...
            </div>
          )}
        </div>
      </Card>
    );
  }

  return null;
};

export default BattleQuizCard;
