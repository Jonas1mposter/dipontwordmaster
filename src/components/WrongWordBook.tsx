import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  BookX,
  Volume2,
  Search,
  Play,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WrongWord {
  id: string;
  word_id: string;
  word: string;
  meaning: string;
  phonetic: string | null;
  example: string | null;
  incorrect_count: number;
  correct_count: number;
  last_reviewed_at: string | null;
}

interface WrongWordBookProps {
  onStartReview: (words: WrongWord[]) => void;
}

const WrongWordBook = ({ onStartReview }: WrongWordBookProps) => {
  const { profile } = useAuth();
  const [wrongWords, setWrongWords] = useState<WrongWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchWrongWords();
  }, [profile]);

  const fetchWrongWords = async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get learning progress with incorrect_count > 0
      const { data: progressData, error: progressError } = await supabase
        .from("learning_progress")
        .select("id, word_id, incorrect_count, correct_count, last_reviewed_at")
        .eq("profile_id", profile.id)
        .gt("incorrect_count", 0)
        .order("incorrect_count", { ascending: false });

      if (progressError) throw progressError;

      if (!progressData || progressData.length === 0) {
        setWrongWords([]);
        setLoading(false);
        return;
      }

      // Get word details
      const wordIds = progressData.map((p) => p.word_id);
      const { data: wordsData, error: wordsError } = await supabase
        .from("words")
        .select("id, word, meaning, phonetic, example")
        .in("id", wordIds);

      if (wordsError) throw wordsError;

      // Combine data
      const combined = progressData.map((progress) => {
        const wordData = wordsData?.find((w) => w.id === progress.word_id);
        return {
          id: progress.id,
          word_id: progress.word_id,
          word: wordData?.word || "",
          meaning: wordData?.meaning || "",
          phonetic: wordData?.phonetic || null,
          example: wordData?.example || null,
          incorrect_count: progress.incorrect_count,
          correct_count: progress.correct_count,
          last_reviewed_at: progress.last_reviewed_at,
        };
      }).filter((w) => w.word);

      setWrongWords(combined);
    } catch (error) {
      console.error("Error fetching wrong words:", error);
      toast.error("加载错题本失败");
    } finally {
      setLoading(false);
    }
  };

  const filteredWords = useMemo(() => {
    if (!searchQuery.trim()) return wrongWords;
    const query = searchQuery.toLowerCase();
    return wrongWords.filter(
      (w) =>
        w.word.toLowerCase().includes(query) ||
        w.meaning.toLowerCase().includes(query)
    );
  }, [wrongWords, searchQuery]);

  const speakWord = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
  };

  const toggleWordSelection = (wordId: string) => {
    setSelectedWords((prev) => {
      const next = new Set(prev);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedWords.size === filteredWords.length) {
      setSelectedWords(new Set());
    } else {
      setSelectedWords(new Set(filteredWords.map((w) => w.word_id)));
    }
  };

  const handleStartReview = () => {
    const wordsToReview = selectedWords.size > 0
      ? wrongWords.filter((w) => selectedWords.has(w.word_id))
      : wrongWords;

    if (wordsToReview.length === 0) {
      toast.error("没有可复习的单词");
      return;
    }

    onStartReview(wordsToReview);
  };

  const clearMasteredWords = async () => {
    if (!profile) return;

    try {
      // Clear words where correct_count >= incorrect_count * 2
      const masteredIds = wrongWords
        .filter((w) => w.correct_count >= w.incorrect_count * 2)
        .map((w) => w.id);

      if (masteredIds.length === 0) {
        toast.info("暂无已掌握的单词");
        return;
      }

      // Reset incorrect_count to 0 for mastered words
      const { error } = await supabase
        .from("learning_progress")
        .update({ incorrect_count: 0 })
        .in("id", masteredIds);

      if (error) throw error;

      toast.success(`已移除 ${masteredIds.length} 个已掌握的单词`);
      fetchWrongWords();
    } catch (error) {
      console.error("Error clearing mastered words:", error);
      toast.error("操作失败");
    }
  };

  const getMasteryLevel = (correct: number, incorrect: number) => {
    if (incorrect === 0) return "mastered";
    const ratio = correct / incorrect;
    if (ratio >= 2) return "mastered";
    if (ratio >= 1) return "learning";
    return "weak";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center">
            <BookX className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h2 className="font-gaming text-xl">错题本</h2>
            <p className="text-sm text-muted-foreground">
              共 {wrongWords.length} 个需要复习的单词
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchWrongWords}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {wrongWords.length === 0 ? (
        <Card variant="glow" className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h3 className="font-gaming text-xl mb-2">太棒了！</h3>
          <p className="text-muted-foreground">
            你还没有错题，继续保持！
          </p>
        </Card>
      ) : (
        <>
          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索单词..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={selectAll}>
              {selectedWords.size === filteredWords.length ? "取消全选" : "全选"}
            </Button>
            <Button variant="outline" size="sm" onClick={clearMasteredWords}>
              <Trash2 className="w-4 h-4 mr-2" />
              移除已掌握
            </Button>
            <Button variant="hero" onClick={handleStartReview}>
              <Play className="w-4 h-4 mr-2" />
              {selectedWords.size > 0
                ? `复习选中 (${selectedWords.size})`
                : "全部复习"}
            </Button>
          </div>

          {/* Word List */}
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {filteredWords.map((word) => {
                const mastery = getMasteryLevel(word.correct_count, word.incorrect_count);
                const isSelected = selectedWords.has(word.word_id);

                return (
                  <Card
                    key={word.id}
                    className={cn(
                      "p-4 cursor-pointer transition-all",
                      isSelected && "ring-2 ring-primary bg-primary/5"
                    )}
                    onClick={() => toggleWordSelection(word.word_id)}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1",
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {isSelected && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-gaming text-lg">{word.word}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              speakWord(word.word);
                            }}
                            className="p-1 rounded-full hover:bg-primary/10"
                          >
                            <Volume2 className="w-4 h-4 text-primary" />
                          </button>
                          {word.phonetic && (
                            <span className="text-sm text-muted-foreground">
                              {word.phonetic}
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground">{word.meaning}</p>
                        {word.example && (
                          <p className="text-sm text-muted-foreground/70 italic mt-1 truncate">
                            "{word.example}"
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs">
                            <XCircle className="w-3 h-3 text-destructive" />
                            <span className="text-destructive">{word.incorrect_count}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <CheckCircle className="w-3 h-3 text-success" />
                            <span className="text-success">{word.correct_count}</span>
                          </div>
                        </div>
                        <Badge
                          variant={
                            mastery === "mastered"
                              ? "success"
                              : mastery === "learning"
                              ? "default"
                              : "destructive"
                          }
                          className="text-xs"
                        >
                          {mastery === "mastered"
                            ? "已掌握"
                            : mastery === "learning"
                            ? "学习中"
                            : "需加强"}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3 h-3 text-destructive" />
              <span>需加强：正确率 &lt; 50%</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3 h-3 text-primary" />
              <span>学习中：正确率 50-100%</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-success" />
              <span>已掌握：正确率 &gt; 200%</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WrongWordBook;
