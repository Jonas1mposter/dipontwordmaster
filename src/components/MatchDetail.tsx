import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ChevronLeft, 
  Trophy, 
  Swords, 
  Calendar,
  Clock,
  Globe,
  User,
  BookOpen,
  Crown,
  XCircle,
  CheckCircle,
  HelpCircle,
  Volume2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface MatchDetailProps {
  matchId: string;
  onBack: () => void;
}

interface MatchWord {
  id: string;
  word: string;
  meaning: string;
  phonetic?: string;
}

interface MatchData {
  id: string;
  grade: number;
  player1_id: string;
  player2_id: string | null;
  player1_score: number;
  player2_score: number;
  winner_id: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  status: string;
  words: MatchWord[];
  player1: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
  player2: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

const MatchDetail = ({ matchId, onBack }: MatchDetailProps) => {
  const { profile } = useAuth();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMatchDetail = async () => {
      if (!matchId) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("ranked_matches")
          .select(`
            id,
            grade,
            player1_id,
            player2_id,
            player1_score,
            player2_score,
            winner_id,
            created_at,
            started_at,
            ended_at,
            status,
            words,
            player1:profiles!ranked_matches_player1_id_fkey(id, username, avatar_url),
            player2:profiles!ranked_matches_player2_id_fkey(id, username, avatar_url)
          `)
          .eq("id", matchId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching match detail:", error);
          return;
        }

        if (data) {
          // Parse words from JSON
          const rawWords = data.words;
          const words: MatchWord[] = Array.isArray(rawWords) 
            ? rawWords.map((w: any) => ({
                id: w.id || '',
                word: w.word || '',
                meaning: w.meaning || '',
                phonetic: w.phonetic,
              }))
            : [];
          
          setMatch({
            ...data,
            words,
            player1: data.player1 as any,
            player2: data.player2 as any,
          });
        }
      } catch (err) {
        console.error("Error in fetchMatchDetail:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatchDetail();
  }, [matchId]);

  const formatDuration = (startedAt: string | null, endedAt: string | null, createdAt: string) => {
    const start = startedAt ? new Date(startedAt).getTime() : new Date(createdAt).getTime();
    const end = endedAt ? new Date(endedAt).getTime() : Date.now();
    const seconds = Math.floor((end - start) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const decodeScore = (rawScore: number) => {
    return rawScore >= 10000 
      ? (rawScore - 10000) % 100 
      : rawScore % 100;
  };

  const getResultInfo = () => {
    if (!match || !profile) return { result: "unknown", text: "未知", color: "text-muted-foreground" };
    
    const isPlayer1 = match.player1_id === profile.id;
    const myScore = decodeScore(isPlayer1 ? match.player1_score : match.player2_score);
    const opponentScore = decodeScore(isPlayer1 ? match.player2_score : match.player1_score);
    
    if (match.winner_id === profile.id) {
      return { result: "win", text: "胜利", color: "text-success", myScore, opponentScore };
    } else if (match.winner_id === null && myScore === opponentScore) {
      return { result: "tie", text: "平局", color: "text-muted-foreground", myScore, opponentScore };
    } else {
      return { result: "loss", text: "失败", color: "text-destructive", myScore, opponentScore };
    }
  };

  const speakWord = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h1 className="font-gaming text-xl text-glow-purple">比赛详情</h1>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </main>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h1 className="font-gaming text-xl text-glow-purple">比赛详情</h1>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          <Card>
            <CardContent className="p-8 text-center">
              <HelpCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">比赛记录不存在</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const resultInfo = getResultInfo();
  const isPlayer1 = match.player1_id === profile?.id;
  const myPlayer = isPlayer1 ? match.player1 : match.player2;
  const opponent = isPlayer1 ? match.player2 : match.player1;
  const isFreeMatch = match.grade === 0;

  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-gaming text-xl text-glow-purple">比赛详情</h1>
            <Badge variant={isFreeMatch ? "secondary" : "outline"} className="ml-auto">
              {isFreeMatch ? (
                <><Globe className="w-3 h-3 mr-1" />自由服</>
              ) : (
                <><Swords className="w-3 h-3 mr-1" />排位赛</>
              )}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Match Result Card */}
        <Card variant="gaming" className={cn(
          "overflow-hidden border-l-4",
          resultInfo.result === "win" && "border-l-success",
          resultInfo.result === "loss" && "border-l-destructive",
          resultInfo.result === "tie" && "border-l-muted"
        )}>
          <CardContent className="p-6">
            {/* VS Display */}
            <div className="flex items-center justify-center gap-6 mb-6">
              {/* My Player */}
              <div className="text-center">
                <div className={cn(
                  "w-16 h-16 rounded-xl mx-auto mb-2 flex items-center justify-center text-xl font-gaming",
                  "bg-gradient-to-br from-primary to-neon-pink text-primary-foreground shadow-lg shadow-primary/30"
                )}>
                  {myPlayer?.avatar_url ? (
                    <img src={myPlayer.avatar_url} alt={myPlayer.username} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    myPlayer?.username.charAt(0).toUpperCase() || "?"
                  )}
                </div>
                <div className="font-semibold text-sm">{myPlayer?.username || "我"}</div>
                <div className={cn("text-2xl font-gaming mt-1", resultInfo.color)}>
                  {resultInfo.myScore}
                </div>
              </div>

              {/* VS */}
              <div className="flex flex-col items-center">
                <div className="text-2xl font-gaming text-muted-foreground">VS</div>
                <Badge className={cn(
                  "mt-2",
                  resultInfo.result === "win" && "bg-success text-success-foreground",
                  resultInfo.result === "loss" && "bg-destructive text-destructive-foreground",
                  resultInfo.result === "tie" && "bg-muted text-muted-foreground"
                )}>
                  {resultInfo.result === "win" && <Crown className="w-3 h-3 mr-1" />}
                  {resultInfo.text}
                </Badge>
              </div>

              {/* Opponent */}
              <div className="text-center">
                <div className={cn(
                  "w-16 h-16 rounded-xl mx-auto mb-2 flex items-center justify-center text-xl font-gaming",
                  "bg-gradient-to-br from-neon-cyan to-neon-green text-primary-foreground shadow-lg"
                )}>
                  {opponent?.avatar_url ? (
                    <img src={opponent.avatar_url} alt={opponent.username} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    opponent?.username.charAt(0).toUpperCase() || "?"
                  )}
                </div>
                <div className="font-semibold text-sm">{opponent?.username || "对手"}</div>
                <div className="text-2xl font-gaming text-muted-foreground mt-1">
                  {resultInfo.opponentScore}
                </div>
              </div>
            </div>

            {/* Match Info */}
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(match.created_at), "yyyy/MM/dd HH:mm", { locale: zhCN })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDuration(match.started_at, match.ended_at, match.created_at)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Words List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              比赛词汇 ({match.words.length}题)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {match.words.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>暂无词汇数据</p>
              </div>
            ) : (
              match.words.map((word, index) => (
                <div
                  key={word.id || index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-gaming text-primary shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{word.word}</span>
                      <button
                        onClick={() => speakWord(word.word)}
                        className="p-1 rounded hover:bg-secondary/50 transition-colors"
                      >
                        <Volume2 className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {word.phonetic && (
                        <span className="text-xs text-muted-foreground">[{word.phonetic}]</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">{word.meaning}</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Note about answer tracking */}
        <div className="text-center text-xs text-muted-foreground py-4">
          <p>注：详细答题记录功能正在开发中</p>
        </div>
      </main>
    </div>
  );
};

export default MatchDetail;
