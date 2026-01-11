import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Volume2, Check, X, Eye, EyeOff, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { speakWord as speak } from "@/hooks/useSpeech";
import { useMatchSounds } from "@/hooks/useMatchSounds";
import { haptics } from "@/lib/haptics";

export type QuizType = "meaning" | "spelling" | "listening" | "fillBlank" | "reverse";

interface Word {
  id: string;
  word: string;
  meaning: string;
  phonetic?: string | null;
  example?: string | null;
}

interface QuizCardProps {
  word: Word;
  quizType: QuizType;
  options?: string[];
  onCorrect: () => void;
  onIncorrect: () => void;
  comboCount?: number;
}

const QuizCard = ({
  word,
  quizType,
  options = [],
  onCorrect,
  onIncorrect,
  comboCount = 0,
}: QuizCardProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [showHint, setShowHint] = useState(false);
  
  // Sound effects
  const sounds = useMatchSounds();

  // Reset state when word changes
  useEffect(() => {
    setSelectedOption(null);
    setShowResult(false);
    setUserInput("");
    setShowHint(false);
  }, [word.id, quizType]);

  const speakWord = () => {
    speak(word.word);
  };

  const handleOptionSelect = (option: string) => {
    if (showResult) return;
    setSelectedOption(option);
    setShowResult(true);

    const isCorrect = quizType === "reverse" 
      ? option === word.word 
      : option === word.meaning;

    // Play sound and haptic feedback
    if (isCorrect) {
      // Play combo sound if this creates a combo (comboCount is the count BEFORE this answer)
      if (comboCount >= 2) {
        sounds.playCombo(comboCount + 1);
      } else {
        sounds.playCorrect();
      }
      haptics.success();
    } else {
      sounds.playWrong();
      haptics.error();
    }

    setTimeout(() => {
      if (isCorrect) {
        onCorrect();
      } else {
        onIncorrect();
      }
    }, 1000);
  };

  const handleInputSubmit = () => {
    if (showResult || !userInput.trim()) return;
    setShowResult(true);

    const normalizedInput = userInput.trim().toLowerCase();
    const normalizedWord = word.word.toLowerCase();
    const isCorrect = normalizedInput === normalizedWord;

    // Play sound and haptic feedback
    if (isCorrect) {
      if (comboCount >= 2) {
        sounds.playCombo(comboCount + 1);
      } else {
        sounds.playCorrect();
      }
      haptics.success();
    } else {
      sounds.playWrong();
      haptics.error();
    }

    setTimeout(() => {
      if (isCorrect) {
        onCorrect();
      } else {
        onIncorrect();
      }
    }, 1200);
  };

  const getBlankSentence = () => {
    if (!word.example) return `The word is _____.`;
    return word.example.replace(new RegExp(word.word, "gi"), "_____");
  };

  const getHint = () => {
    const len = word.word.length;
    if (len <= 2) return word.word[0] + "_";
    return word.word[0] + "_".repeat(len - 2) + word.word[len - 1];
  };

  // Quiz Type: Select meaning from options (English -> Chinese)
  if (quizType === "meaning" && options.length > 0) {
    return (
      <Card variant="glow" className="p-8 max-w-lg mx-auto animate-scale-in">
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground mb-2">选择正确的中文释义</p>
          <div className="flex items-center justify-center gap-3 mb-4">
            <h2 className="text-4xl font-gaming text-glow-purple">{word.word}</h2>
            <button
              onClick={speakWord}
              className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <Volume2 className="w-5 h-5 text-primary" />
            </button>
          </div>
          {word.phonetic && (
            <p className="text-muted-foreground text-lg">{word.phonetic}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          {options.map((option, index) => {
            const isCorrect = option === word.meaning;
            const isSelected = selectedOption === option;

            return (
              <button
                key={index}
                onClick={() => handleOptionSelect(option)}
                disabled={showResult}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all duration-300 font-medium",
                  !showResult && "hover:border-primary/50 hover:bg-primary/5",
                  !showResult && "border-border bg-card",
                  showResult && isCorrect && "border-success bg-success/10 text-success",
                  showResult && isSelected && !isCorrect && "border-destructive bg-destructive/10 text-destructive",
                  showResult && !isSelected && !isCorrect && "opacity-50"
                )}
              >
                <div className="flex items-center justify-between">
                  <span>{option}</span>
                  {showResult && isCorrect && <Check className="w-5 h-5 text-success" />}
                  {showResult && isSelected && !isCorrect && <X className="w-5 h-5 text-destructive" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* 答错后显示详细解析 */}
        {showResult && selectedOption !== word.meaning && (
          <div className="mt-6 p-4 bg-muted/50 rounded-xl border border-border animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">答案解析</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-gaming">{word.word}</span>
                <button
                  onClick={speakWord}
                  className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <Volume2 className="w-4 h-4 text-primary" />
                </button>
              </div>
              {word.phonetic && (
                <p className="text-sm text-muted-foreground">{word.phonetic}</p>
              )}
              <p className="text-success font-medium">✓ {word.meaning}</p>
              {word.example && (
                <p className="text-sm text-muted-foreground italic mt-2">例句: {word.example}</p>
              )}
            </div>
          </div>
        )}
      </Card>
    );
  }

  // Quiz Type: Select English word from options (Chinese -> English)
  if (quizType === "reverse" && options.length > 0) {
    return (
      <Card variant="glow" className="p-8 max-w-lg mx-auto animate-scale-in">
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground mb-2">选择正确的英文单词</p>
          <h2 className="text-3xl font-gaming text-glow-purple">{word.meaning}</h2>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {options.map((option, index) => {
            const isCorrect = option === word.word;
            const isSelected = selectedOption === option;

            return (
              <button
                key={index}
                onClick={() => handleOptionSelect(option)}
                disabled={showResult}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all duration-300 font-medium",
                  !showResult && "hover:border-primary/50 hover:bg-primary/5",
                  !showResult && "border-border bg-card",
                  showResult && isCorrect && "border-success bg-success/10 text-success",
                  showResult && isSelected && !isCorrect && "border-destructive bg-destructive/10 text-destructive",
                  showResult && !isSelected && !isCorrect && "opacity-50"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono">{option}</span>
                  {showResult && isCorrect && <Check className="w-5 h-5 text-success" />}
                  {showResult && isSelected && !isCorrect && <X className="w-5 h-5 text-destructive" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* 答错后显示详细解析 */}
        {showResult && selectedOption !== word.word && (
          <div className="mt-6 p-4 bg-muted/50 rounded-xl border border-border animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">答案解析</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-gaming">{word.word}</span>
                <button
                  onClick={speakWord}
                  className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <Volume2 className="w-4 h-4 text-primary" />
                </button>
              </div>
              {word.phonetic && (
                <p className="text-sm text-muted-foreground">{word.phonetic}</p>
              )}
              <p className="text-success font-medium">释义: {word.meaning}</p>
              {word.example && (
                <p className="text-sm text-muted-foreground italic mt-2">例句: {word.example}</p>
              )}
            </div>
          </div>
        )}
      </Card>
    );
  }

  // Quiz Type: Spelling (type the word)
  if (quizType === "spelling") {
    return (
      <Card variant="glow" className="p-8 max-w-lg mx-auto animate-scale-in">
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground mb-2">根据中文释义拼写单词</p>
          <h2 className="text-3xl font-gaming text-glow-purple mb-4">{word.meaning}</h2>
          <button
            onClick={() => setShowHint(!showHint)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {showHint ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showHint ? "隐藏提示" : "显示提示"}
          </button>
          {showHint && (
            <p className="text-lg text-primary/70 font-mono mt-2">{getHint()}</p>
          )}
        </div>

        <div className="space-y-4">
          <Input
            type="text"
            placeholder="输入英文单词..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInputSubmit()}
            disabled={showResult}
            className={cn(
              "text-center text-xl font-mono h-14",
              showResult && userInput.toLowerCase() === word.word.toLowerCase() && "border-success bg-success/10",
              showResult && userInput.toLowerCase() !== word.word.toLowerCase() && "border-destructive bg-destructive/10"
            )}
            autoFocus
          />

          {showResult && userInput.toLowerCase() !== word.word.toLowerCase() && (
            <div className="p-4 bg-muted/50 rounded-xl border border-border animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">答案解析</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl font-gaming text-success">{word.word}</span>
                  <button
                    onClick={speakWord}
                    className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <Volume2 className="w-4 h-4 text-primary" />
                  </button>
                </div>
                {word.phonetic && (
                  <p className="text-sm text-muted-foreground text-center">{word.phonetic}</p>
                )}
                {word.example && (
                  <p className="text-sm text-muted-foreground italic text-center mt-2">例句: {word.example}</p>
                )}
              </div>
            </div>
          )}

          {!showResult && (
            <Button
              variant="hero"
              className="w-full"
              onClick={handleInputSubmit}
              disabled={!userInput.trim()}
            >
              确认
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // Quiz Type: Listening (hear the word, type it)
  if (quizType === "listening") {
    return (
      <Card variant="glow" className="p-8 max-w-lg mx-auto animate-scale-in">
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground mb-4">听音拼写单词</p>
          <button
            onClick={speakWord}
            className="w-20 h-20 rounded-full bg-primary/20 hover:bg-primary/30 transition-all hover:scale-105 flex items-center justify-center mx-auto mb-4"
          >
            <Volume2 className="w-10 h-10 text-primary" />
          </button>
          <p className="text-sm text-muted-foreground">点击播放发音</p>
          {showHint && (
            <p className="text-lg text-primary/70 mt-2">{word.meaning}</p>
          )}
          <button
            onClick={() => setShowHint(!showHint)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mt-2"
          >
            {showHint ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showHint ? "隐藏释义" : "显示释义"}
          </button>
        </div>

        <div className="space-y-4">
          <Input
            type="text"
            placeholder="输入你听到的单词..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInputSubmit()}
            disabled={showResult}
            className={cn(
              "text-center text-xl font-mono h-14",
              showResult && userInput.toLowerCase() === word.word.toLowerCase() && "border-success bg-success/10",
              showResult && userInput.toLowerCase() !== word.word.toLowerCase() && "border-destructive bg-destructive/10"
            )}
            autoFocus
          />

          {showResult && userInput.toLowerCase() !== word.word.toLowerCase() && (
            <div className="p-4 bg-muted/50 rounded-xl border border-border animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">答案解析</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl font-gaming text-success">{word.word}</span>
                  <button
                    onClick={speakWord}
                    className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <Volume2 className="w-4 h-4 text-primary" />
                  </button>
                </div>
                {word.phonetic && (
                  <p className="text-sm text-muted-foreground text-center">{word.phonetic}</p>
                )}
                <p className="text-center text-muted-foreground">{word.meaning}</p>
                {word.example && (
                  <p className="text-sm text-muted-foreground italic text-center mt-2">例句: {word.example}</p>
                )}
              </div>
            </div>
          )}
          {showResult && userInput.toLowerCase() === word.word.toLowerCase() && (
            <div className="text-center">
              <p className="text-muted-foreground">{word.meaning}</p>
            </div>
          )}

          {!showResult && (
            <Button
              variant="hero"
              className="w-full"
              onClick={handleInputSubmit}
              disabled={!userInput.trim()}
            >
              确认
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // Quiz Type: Fill in the blank
  if (quizType === "fillBlank") {
    return (
      <Card variant="glow" className="p-8 max-w-lg mx-auto animate-scale-in">
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground mb-2">根据句子填写单词</p>
          <p className="text-lg text-muted-foreground mb-4">{word.meaning}</p>
          <p className="text-xl italic text-foreground/80">"{getBlankSentence()}"</p>
          {showHint && (
            <p className="text-lg text-primary/70 font-mono mt-4">{getHint()}</p>
          )}
          <button
            onClick={() => setShowHint(!showHint)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mt-2"
          >
            {showHint ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showHint ? "隐藏提示" : "显示提示"}
          </button>
        </div>

        <div className="space-y-4">
          <Input
            type="text"
            placeholder="填写缺失的单词..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInputSubmit()}
            disabled={showResult}
            className={cn(
              "text-center text-xl font-mono h-14",
              showResult && userInput.toLowerCase() === word.word.toLowerCase() && "border-success bg-success/10",
              showResult && userInput.toLowerCase() !== word.word.toLowerCase() && "border-destructive bg-destructive/10"
            )}
            autoFocus
          />

          {showResult && userInput.toLowerCase() !== word.word.toLowerCase() && (
            <div className="p-4 bg-muted/50 rounded-xl border border-border animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">答案解析</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl font-gaming text-success">{word.word}</span>
                  <button
                    onClick={speakWord}
                    className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <Volume2 className="w-4 h-4 text-primary" />
                  </button>
                </div>
                {word.phonetic && (
                  <p className="text-sm text-muted-foreground text-center">{word.phonetic}</p>
                )}
                {word.example && (
                  <p className="text-sm text-muted-foreground italic text-center">完整句子: {word.example}</p>
                )}
              </div>
            </div>
          )}

          {!showResult && (
            <Button
              variant="hero"
              className="w-full"
              onClick={handleInputSubmit}
              disabled={!userInput.trim()}
            >
              确认
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return null;
};

export default QuizCard;
