import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2, Check, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface WordCardProps {
  word: string;
  meaning: string;
  phonetic?: string;
  example?: string;
  options?: string[];
  onCorrect: () => void;
  onIncorrect: () => void;
  mode: "flashcard" | "quiz";
}

const WordCard = ({
  word,
  meaning,
  phonetic,
  example,
  options,
  onCorrect,
  onIncorrect,
  mode,
}: WordCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleFlip = () => {
    if (mode === "flashcard") {
      setIsFlipped(!isFlipped);
    }
  };

  const handleOptionSelect = (option: string) => {
    if (showResult) return;
    setSelectedOption(option);
    setShowResult(true);
    
    setTimeout(() => {
      if (option === meaning) {
        onCorrect();
      } else {
        onIncorrect();
      }
    }, 1000);
  };

  const handleKnow = () => {
    onCorrect();
    setIsFlipped(false);
  };

  const handleDontKnow = () => {
    onIncorrect();
    setIsFlipped(false);
  };

  const speakWord = () => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
  };

  if (mode === "quiz" && options) {
    return (
      <Card variant="glow" className="p-8 max-w-lg mx-auto animate-scale-in">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <h2 className="text-4xl font-gaming text-glow-purple">{word}</h2>
            <button
              onClick={speakWord}
              className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <Volume2 className="w-5 h-5 text-primary" />
            </button>
          </div>
          {phonetic && (
            <p className="text-muted-foreground text-lg">{phonetic}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          {options.map((option, index) => {
            const isCorrect = option === meaning;
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
      </Card>
    );
  }

  return (
    <div className="perspective-1000 max-w-lg mx-auto">
      <div
        onClick={handleFlip}
        className={cn(
          "relative w-full h-80 cursor-pointer transition-transform duration-500 transform-style-3d",
          isFlipped && "rotate-y-180"
        )}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front */}
        <Card
          variant="glow"
          className={cn(
            "absolute inset-0 p-8 flex flex-col items-center justify-center backface-hidden",
            isFlipped && "invisible"
          )}
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-4xl font-gaming text-glow-purple">{word}</h2>
            <button
              onClick={(e) => {
                e.stopPropagation();
                speakWord();
              }}
              className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <Volume2 className="w-5 h-5 text-primary" />
            </button>
          </div>
          {phonetic && (
            <p className="text-muted-foreground text-lg mb-4">{phonetic}</p>
          )}
          <p className="text-sm text-muted-foreground/70 flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            点击翻转查看释义
          </p>
        </Card>

        {/* Back */}
        <Card
          variant="gold"
          className={cn(
            "absolute inset-0 p-8 flex flex-col items-center justify-center",
            !isFlipped && "invisible"
          )}
          style={{ 
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)"
          }}
        >
          <p className="text-2xl text-foreground mb-4 text-center">{meaning}</p>
          {example && (
            <p className="text-sm text-muted-foreground italic text-center mb-6">
              "{example}"
            </p>
          )}
          <div className="flex gap-4">
            <Button
              variant="success"
              onClick={(e) => {
                e.stopPropagation();
                handleKnow();
              }}
            >
              <Check className="w-4 h-4 mr-2" />
              认识
            </Button>
            <Button
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleDontKnow();
              }}
            >
              <X className="w-4 h-4 mr-2" />
              不认识
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default WordCard;
