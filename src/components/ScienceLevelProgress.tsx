import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Star, CheckCircle, Play, Loader2, ChevronDown, ChevronRight, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery } from "@tanstack/react-query";

interface ScienceWord {
  id: string;
  word: string;
  meaning: string;
  subject: string;
  topic: string | null;
  definition: string | null;
  phonetic: string | null;
}

interface SubjectUnit {
  subject: string;
  words: ScienceWord[];
  isUnlocked: boolean;
  completedCount: number;
}

interface ScienceLevelProgressProps {
  onSelectLevel: (levelId: string, levelName: string, words: ScienceWord[]) => void;
}

const WORDS_PER_LEVEL = 10;

// Subject display names and icons
const SUBJECT_CONFIG: Record<string, { name: string; color: string }> = {
  Biology: { name: "生物", color: "text-green-500" },
  Chemistry: { name: "化学", color: "text-blue-500" },
  Physics: { name: "物理", color: "text-orange-500" },
};

const ScienceLevelProgress = ({ onSelectLevel }: ScienceLevelProgressProps) => {
  const { profile } = useAuth();
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set(["Biology"]));

  // Fetch science words
  const { data: allWords = [], isLoading: wordsLoading } = useQuery({
    queryKey: ["science-words"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("science_words")
        .select("id, word, meaning, subject, topic, definition, phonetic")
        .order("subject", { ascending: true })
        .order("word", { ascending: true });
      if (error) throw error;
      return (data || []) as ScienceWord[];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch user progress
  const { data: userProgress = {}, isLoading: progressLoading } = useQuery({
    queryKey: ["science-learning-progress", profile?.id],
    queryFn: async () => {
      if (!profile) return {};
      const { data, error } = await supabase
        .from("science_learning_progress")
        .select("word_id, mastery_level")
        .eq("profile_id", profile.id);
      if (error) throw error;
      const progressMap: Record<string, { mastery_level: number }> = {};
      data?.forEach((p: any) => {
        progressMap[p.word_id] = { mastery_level: p.mastery_level };
      });
      return progressMap;
    },
    enabled: !!profile,
    staleTime: 30 * 1000,
  });

  const loading = wordsLoading || progressLoading;

  // Group words by subject
  const subjectUnits = useMemo(() => {
    const subjectGroups: Record<string, ScienceWord[]> = {};
    
    allWords.forEach((word) => {
      if (!subjectGroups[word.subject]) {
        subjectGroups[word.subject] = [];
      }
      subjectGroups[word.subject].push(word);
    });

    const units: SubjectUnit[] = [];
    let previousUnlocked = true;

    // Define subject order
    const subjectOrder = ["Biology", "Chemistry", "Physics"];
    
    subjectOrder.forEach((subject) => {
      if (!subjectGroups[subject]) return;
      
      const words = subjectGroups[subject];
      const completedCount = words.filter(w => userProgress[w.id]?.mastery_level >= 1).length;
      const isUnlocked = previousUnlocked;

      units.push({
        subject,
        words,
        isUnlocked,
        completedCount,
      });

      previousUnlocked = completedCount === words.length;
    });

    return units;
  }, [allWords, userProgress]);

  const toggleSubject = (subject: string) => {
    setExpandedSubjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subject)) {
        newSet.delete(subject);
      } else {
        newSet.add(subject);
      }
      return newSet;
    });
  };

  const getSubLevels = (words: ScienceWord[]) => {
    const subLevels: ScienceWord[][] = [];
    for (let i = 0; i < words.length; i += WORDS_PER_LEVEL) {
      subLevels.push(words.slice(i, i + WORDS_PER_LEVEL));
    }
    return subLevels;
  };

  const getSubLevelStatus = (words: ScienceWord[], subjectUnlocked: boolean, subLevelIndex: number, allSubLevels: ScienceWord[][]) => {
    if (!subjectUnlocked) return "locked";
    
    const completedCount = words.filter(w => userProgress[w.id]?.mastery_level >= 1).length;
    const ratio = completedCount / words.length;
    const hasTwoStars = ratio >= 0.7;
    
    if (completedCount === words.length && hasTwoStars) return "completed";
    if (completedCount === words.length && !hasTwoStars) return "needs_retry";
    
    if (subLevelIndex === 0) return "available";
    
    const prevSubLevel = allSubLevels[subLevelIndex - 1];
    const prevCompletedCount = prevSubLevel.filter(w => userProgress[w.id]?.mastery_level >= 1).length;
    const prevRatio = prevCompletedCount / prevSubLevel.length;
    const prevHasTwoStars = prevRatio >= 0.7;
    
    return prevCompletedCount === prevSubLevel.length && prevHasTwoStars ? "available" : "locked";
  };

  const getSubLevelStars = (words: ScienceWord[]) => {
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

  if (subjectUnits.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        暂无科学词汇数据
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
        <FlaskConical className="w-4 h-4 text-green-500 flex-shrink-0" />
        <span className="text-muted-foreground">
          <span className="text-foreground font-medium">IGCSE 科学词汇</span> - Biology, Chemistry, Physics
        </span>
      </div>

      {subjectUnits.map((unit, unitIndex) => {
        const isExpanded = expandedSubjects.has(unit.subject);
        const subLevels = getSubLevels(unit.words);
        const isComplete = unit.completedCount === unit.words.length;
        const subjectConfig = SUBJECT_CONFIG[unit.subject] || { name: unit.subject, color: "text-primary" };

        return (
          <Collapsible
            key={unit.subject}
            open={isExpanded}
            onOpenChange={() => unit.isUnlocked && toggleSubject(unit.subject)}
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
                      "w-14 h-14 rounded-xl flex items-center justify-center shadow-lg",
                      isComplete && "bg-gradient-to-br from-success to-emerald-600 shadow-success/30",
                      unit.isUnlocked && !isComplete && "bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/30",
                      !unit.isUnlocked && "bg-secondary"
                    )}>
                      <FlaskConical className={cn(
                        "w-6 h-6",
                        isComplete ? "text-success-foreground" : unit.isUnlocked ? "text-white" : "text-muted-foreground"
                      )} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-gaming text-base">{unit.subject}</h3>
                        <Badge variant="secondary" className="text-[10px]">
                          {subjectConfig.name}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {subLevels.length} 关
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {unit.completedCount}/{unit.words.length} 个单词
                      </p>

                      <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
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
                    const levelId = `science-${unit.subject}-${subIndex + 1}`;
                    const levelName = `${subjectConfig.name} 关卡 ${subIndex + 1}`;

                    return (
                      <div
                        key={subIndex}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg transition-all",
                          status === "completed" && "bg-success/10 border border-success/20",
                          status === "needs_retry" && "bg-amber-500/10 border border-amber-500/30",
                          status === "available" && "bg-green-500/10 border border-green-500/20",
                          status === "locked" && "bg-secondary/50 opacity-60"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                          status === "completed" && "bg-success text-success-foreground",
                          status === "needs_retry" && "bg-amber-500 text-white",
                          status === "available" && "bg-green-500 text-white",
                          status === "locked" && "bg-secondary text-muted-foreground"
                        )}>
                          {subIndex + 1}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">关卡 {subIndex + 1}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {subLevelWords.length} 个单词
                          </p>

                          {(status === "completed" || status === "needs_retry") && (
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
                            onClick={() => onSelectLevel(levelId, levelName, subLevelWords)}
                          >
                            开始
                          </Button>
                        )}
                        {status === "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSelectLevel(levelId, levelName, subLevelWords)}
                          >
                            重玩
                          </Button>
                        )}
                        {status === "needs_retry" && (
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-600"
                            onClick={() => onSelectLevel(levelId, levelName, subLevelWords)}
                          >
                            重试
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

export default ScienceLevelProgress;
