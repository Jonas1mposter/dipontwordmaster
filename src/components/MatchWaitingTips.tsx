import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Lightbulb, 
  BookOpen, 
  Volume2, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Target,
  Zap,
  Brain
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchWaitingTipsProps {
  grade?: number;
  variant?: "ranked" | "free";
  className?: string;
}

// Battle tips for different scenarios
const BATTLE_TIPS = [
  {
    icon: Target,
    title: "精准答题",
    content: "正确率比速度更重要，每题正确+1分，错误不扣分",
  },
  {
    icon: Zap,
    title: "连击加成",
    content: "连续答对可以获得连击效果，提升战斗体验",
  },
  {
    icon: Brain,
    title: "冷静思考",
    content: "遇到不确定的词时，可以根据词根词缀推测含义",
  },
  {
    icon: Sparkles,
    title: "每日练习",
    content: "每天完成对战任务可获得额外奖励和经验",
  },
  {
    icon: BookOpen,
    title: "错词复习",
    content: "对战中答错的词会进入错词本，记得定期复习",
  },
];

interface PreviewWord {
  id: string;
  word: string;
  meaning: string;
  phonetic: string | null;
}

const MatchWaitingTips = ({ 
  grade = 7, 
  variant = "ranked",
  className 
}: MatchWaitingTipsProps) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [previewWords, setPreviewWords] = useState<PreviewWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [showDefinition, setShowDefinition] = useState(false);
  const [mode, setMode] = useState<"tips" | "preview">("tips");

  // Fetch random words for preview
  useEffect(() => {
    const fetchPreviewWords = async () => {
      const { data } = await supabase
        .from("words")
        .select("id, word, meaning, phonetic")
        .eq("grade", grade)
        .limit(50);
      
      if (data && data.length > 0) {
        // Shuffle and take 5 random words
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setPreviewWords(shuffled.slice(0, 5));
      }
    };
    
    fetchPreviewWords();
  }, [grade]);

  // Auto-rotate tips every 5 seconds
  useEffect(() => {
    if (mode === "tips") {
      const timer = setInterval(() => {
        setCurrentTipIndex(prev => (prev + 1) % BATTLE_TIPS.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [mode]);

  // Play word pronunciation
  const playWord = (word: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "en-US";
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const nextWord = () => {
    setShowDefinition(false);
    setCurrentWordIndex(prev => (prev + 1) % previewWords.length);
  };

  const prevWord = () => {
    setShowDefinition(false);
    setCurrentWordIndex(prev => (prev - 1 + previewWords.length) % previewWords.length);
  };

  const isRanked = variant === "ranked";
  const primaryColor = isRanked ? "primary" : "neon-cyan";
  const currentTip = BATTLE_TIPS[currentTipIndex];
  const currentWord = previewWords[currentWordIndex];

  return (
    <div className={cn("w-full max-w-sm mx-auto", className)}>
      {/* Mode toggle */}
      <div className="flex justify-center gap-2 mb-4">
        <Button
          variant={mode === "tips" ? "default" : "ghost"}
          size="sm"
          onClick={() => setMode("tips")}
          className={cn(
            "text-xs",
            mode === "tips" && (isRanked ? "bg-primary" : "bg-neon-cyan text-background")
          )}
        >
          <Lightbulb className="w-3 h-3 mr-1" />
          对战技巧
        </Button>
        <Button
          variant={mode === "preview" ? "default" : "ghost"}
          size="sm"
          onClick={() => setMode("preview")}
          disabled={previewWords.length === 0}
          className={cn(
            "text-xs",
            mode === "preview" && (isRanked ? "bg-primary" : "bg-neon-cyan text-background")
          )}
        >
          <BookOpen className="w-3 h-3 mr-1" />
          词汇预习
        </Button>
      </div>

      {/* Content area */}
      <Card className={cn(
        "p-4 border transition-all duration-300",
        isRanked 
          ? "bg-primary/5 border-primary/20" 
          : "bg-neon-cyan/5 border-neon-cyan/20"
      )}>
        {mode === "tips" ? (
          /* Tips mode */
          <div className="text-center animate-fade-in" key={currentTipIndex}>
            <div className={cn(
              "w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center",
              isRanked ? "bg-primary/20" : "bg-neon-cyan/20"
            )}>
              <currentTip.icon className={cn(
                "w-6 h-6",
                isRanked ? "text-primary" : "text-neon-cyan"
              )} />
            </div>
            
            <h4 className={cn(
              "font-gaming text-sm mb-2",
              isRanked ? "text-primary" : "text-neon-cyan"
            )}>
              {currentTip.title}
            </h4>
            
            <p className="text-xs text-muted-foreground leading-relaxed">
              {currentTip.content}
            </p>
            
            {/* Tip indicators */}
            <div className="flex justify-center gap-1 mt-4">
              {BATTLE_TIPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentTipIndex(i)}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-300",
                    i === currentTipIndex
                      ? isRanked ? "bg-primary w-4" : "bg-neon-cyan w-4"
                      : "bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Word preview mode */
          <div className="text-center">
            {currentWord ? (
              <div className="animate-fade-in" key={currentWord.id}>
                {/* Word header */}
                <div className="flex items-center justify-between mb-3">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={prevWord}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <Badge variant="outline" className="text-xs">
                    {currentWordIndex + 1} / {previewWords.length}
                  </Badge>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={nextWord}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Word display */}
                <div className="py-2">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className={cn(
                      "font-gaming text-xl",
                      isRanked ? "text-primary" : "text-neon-cyan"
                    )}>
                      {currentWord.word}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => playWord(currentWord.word)}
                    >
                      <Volume2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {currentWord.phonetic && (
                    <span className="text-xs text-muted-foreground">
                      {currentWord.phonetic}
                    </span>
                  )}
                </div>
                
                {/* Definition area */}
                <div className="mt-3 min-h-[40px]">
                  {showDefinition ? (
                    <p className="text-sm text-foreground animate-fade-in">
                      {currentWord.meaning}
                    </p>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDefinition(true)}
                      className={cn(
                        "text-xs",
                        isRanked 
                          ? "border-primary/30 hover:bg-primary/10" 
                          : "border-neon-cyan/30 hover:bg-neon-cyan/10"
                      )}
                    >
                      点击查看释义
                    </Button>
                  )}
                </div>
                
                {/* Progress dots */}
                <div className="flex justify-center gap-1 mt-4">
                  {previewWords.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setShowDefinition(false);
                        setCurrentWordIndex(i);
                      }}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all duration-300",
                        i === currentWordIndex
                          ? isRanked ? "bg-primary w-4" : "bg-neon-cyan w-4"
                          : "bg-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-4 text-muted-foreground text-sm">
                加载词汇中...
              </div>
            )}
          </div>
        )}
      </Card>
      
      {/* Hint text */}
      <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
        {mode === "tips" ? "自动切换中..." : "左右滑动切换词汇"}
      </p>
    </div>
  );
};

export default MatchWaitingTips;
