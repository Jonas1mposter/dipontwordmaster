import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Star, CheckCircle, Play, Zap, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Word {
  id: string;
  word: string;
  meaning: string;
}

interface LetterUnit {
  letter: string;
  words: Word[];
  isUnlocked: boolean;
  completedCount: number;
}

interface LevelProgressProps {
  grade: number;
  onSelectLevel: (levelId: string, levelName: string) => void;
}

const WORDS_PER_LEVEL = 10;

const LevelProgress = ({ grade, onSelectLevel }: LevelProgressProps) => {
  const { profile } = useAuth();
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLetters, setExpandedLetters] = useState<Set<string>>(new Set());
  const [userProgress, setUserProgress] = useState<Record<string, { mastery_level: number }>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) {
        setLoading(false);
        return;
      }

      try {
        // 并行获取单词和学习进度
        const [wordsResult, progressResult] = await Promise.all([
          supabase
            .from("words")
            .select("id, word, meaning")
            .eq("grade", grade)
            .order("word", { ascending: true })
            .limit(2000),
          supabase
            .from("learning_progress")
            .select("word_id, mastery_level")
            .eq("profile_id", profile.id)
        ]);

        if (wordsResult.error) throw wordsResult.error;
        
        const words = wordsResult.data || [];
        setAllWords(words);

        // 处理进度数据
        const progressMap: Record<string, { mastery_level: number }> = {};
        if (!progressResult.error && progressResult.data) {
          progressResult.data.forEach((p) => {
            progressMap[p.word_id] = { mastery_level: p.mastery_level };
          });
        }
        setUserProgress(progressMap);

        // 默认展开第一个未完成的字母
        const letterGroups: Record<string, Word[]> = {};
        words.forEach((word) => {
          const firstLetter = word.word.charAt(0).toUpperCase();
          if (!letterGroups[firstLetter]) {
            letterGroups[firstLetter] = [];
          }
          letterGroups[firstLetter].push(word);
        });

        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
        let previousUnlocked = true;
        for (const letter of alphabet) {
          const letterWords = letterGroups[letter] || [];
          if (letterWords.length > 0 && previousUnlocked) {
            const completedCount = letterWords.filter(w => progressMap[w.id]?.mastery_level >= 1).length;
            if (completedCount < letterWords.length) {
              setExpandedLetters(new Set([letter]));
              break;
            }
            previousUnlocked = completedCount === letterWords.length;
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [grade, profile]);

  // 使用 useMemo 缓存字母单元计算
  const letterUnits = useMemo(() => {
    const letterGroups: Record<string, Word[]> = {};
    allWords.forEach((word) => {
      const firstLetter = word.word.charAt(0).toUpperCase();
      if (!letterGroups[firstLetter]) {
        letterGroups[firstLetter] = [];
      }
      letterGroups[firstLetter].push(word);
    });

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const units: LetterUnit[] = [];
    let previousUnlocked = true;

    alphabet.forEach((letter) => {
      const words = letterGroups[letter] || [];
      if (words.length > 0) {
        const completedCount = words.filter(w => userProgress[w.id]?.mastery_level >= 1).length;
        const isUnlocked = previousUnlocked;

        units.push({
          letter,
          words,
          isUnlocked,
          completedCount,
        });

        previousUnlocked = completedCount === words.length;
      }
    });

    return units;
  }, [allWords, userProgress]);

  const toggleLetter = (letter: string) => {
    setExpandedLetters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(letter)) {
        newSet.delete(letter);
      } else {
        newSet.add(letter);
      }
      return newSet;
    });
  };

  // 将单词分成小关卡
  const getSubLevels = (words: Word[]) => {
    const subLevels: Word[][] = [];
    for (let i = 0; i < words.length; i += WORDS_PER_LEVEL) {
      subLevels.push(words.slice(i, i + WORDS_PER_LEVEL));
    }
    return subLevels;
  };

  // 获取小关卡状态
  const getSubLevelStatus = (words: Word[], letterUnlocked: boolean, subLevelIndex: number, allSubLevels: Word[][]) => {
    if (!letterUnlocked) return "locked";
    
    const completedCount = words.filter(w => userProgress[w.id]?.mastery_level >= 1).length;
    
    if (completedCount === words.length) return "completed";
    
    // 检查前一个小关卡是否完成
    if (subLevelIndex === 0) return "available";
    
    const prevSubLevel = allSubLevels[subLevelIndex - 1];
    const prevCompleted = prevSubLevel.filter(w => userProgress[w.id]?.mastery_level >= 1).length;
    
    return prevCompleted === prevSubLevel.length ? "available" : "locked";
  };

  // 获取小关卡星星数
  const getSubLevelStars = (words: Word[]) => {
    const completedCount = words.filter(w => userProgress[w.id]?.mastery_level >= 1).length;
    const ratio = completedCount / words.length;
    if (ratio === 1) return 3;
    if (ratio >= 0.7) return 2;
    if (ratio >= 0.3) return 1;
    return 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (letterUnits.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        暂无单词数据
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 学习提示 */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
        <Play className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-muted-foreground">
          <span className="text-foreground font-medium">学习流程：</span>先学习单词，再进行测试
        </span>
      </div>
      {letterUnits.map((unit, unitIndex) => {
        const isExpanded = expandedLetters.has(unit.letter);
        const subLevels = getSubLevels(unit.words);
        const isComplete = unit.completedCount === unit.words.length;

        return (
          <Collapsible
            key={unit.letter}
            open={isExpanded}
            onOpenChange={() => unit.isUnlocked && toggleLetter(unit.letter)}
          >
            <Card
              variant={isComplete ? "gold" : unit.isUnlocked ? "glow" : "default"}
              className={cn(
                "transition-all duration-300 animate-slide-up overflow-hidden",
                !unit.isUnlocked && "opacity-60"
              )}
              style={{ animationDelay: `${unitIndex * 0.05}s` }}
            >
              <CollapsibleTrigger asChild disabled={!unit.isUnlocked}>
                <CardContent className="p-4 cursor-pointer hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center shadow-lg font-gaming text-2xl",
                      isComplete && "bg-gradient-to-br from-success to-emerald-600 shadow-success/30 text-success-foreground",
                      unit.isUnlocked && !isComplete && "bg-gradient-to-br from-primary to-neon-pink shadow-primary/30 text-primary-foreground",
                      !unit.isUnlocked && "bg-secondary text-muted-foreground"
                    )}>
                      {unit.letter}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-gaming text-base">字母 {unit.letter}</h3>
                        <Badge variant="secondary" className="text-[10px]">
                          {subLevels.length} 关
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {unit.completedCount}/{unit.words.length} 个单词
                      </p>

                      {/* 进度条 */}
                      <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-neon-pink transition-all duration-500"
                          style={{ width: `${(unit.completedCount / unit.words.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    {unit.isUnlocked ? (
                      isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )
                    ) : (
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-2">
                  {subLevels.map((subLevelWords, subIndex) => {
                    const status = getSubLevelStatus(subLevelWords, unit.isUnlocked, subIndex, subLevels);
                    const stars = getSubLevelStars(subLevelWords);
                    const levelId = `${unit.letter}-${subIndex + 1}`;
                    const levelName = `${unit.letter} 关卡 ${subIndex + 1}`;

                    return (
                      <div
                        key={subIndex}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg transition-all",
                          status === "completed" && "bg-success/10 border border-success/20",
                          status === "available" && "bg-primary/10 border border-primary/20",
                          status === "locked" && "bg-secondary/50 opacity-60"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                          status === "completed" && "bg-success text-success-foreground",
                          status === "available" && "bg-primary text-primary-foreground",
                          status === "locked" && "bg-secondary text-muted-foreground"
                        )}>
                          {subIndex + 1}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">关卡 {subIndex + 1}</span>
                            {status === "available" && (
                              <Badge variant="energy" className="text-[10px]">
                                <Zap className="w-3 h-3 mr-0.5" />1
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {subLevelWords.length} 个单词
                          </p>

                          {status === "completed" && (
                            <div className="flex gap-0.5 mt-1">
                              {[1, 2, 3].map((star) => (
                                <Star
                                  key={star}
                                  className={cn(
                                    "w-3 h-3",
                                    star <= stars
                                      ? "text-accent fill-accent"
                                      : "text-muted-foreground/30"
                                  )}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        {status === "available" && (
                          <Button
                            variant="hero"
                            size="sm"
                            onClick={() => onSelectLevel(levelId, levelName)}
                          >
                            开始
                          </Button>
                        )}
                        {status === "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSelectLevel(levelId, levelName)}
                          >
                            重玩
                          </Button>
                        )}
                        {status === "locked" && (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
};

export default LevelProgress;
