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
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Crown,
  Medal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface MatchHistoryProps {
  onBack: () => void;
}

interface MatchRecord {
  id: string;
  type: "ranked" | "free";
  opponentName: string;
  opponentAvatar: string | null;
  myScore: number;
  opponentScore: number;
  result: "win" | "loss" | "tie";
  createdAt: string;
  duration: number;
}

const MatchHistory = ({ onBack }: MatchHistoryProps) => {
  const { profile } = useAuth();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "ranked" | "free">("all");

  // Calculate stats
  const stats = {
    total: matches.length,
    wins: matches.filter(m => m.result === "win").length,
    losses: matches.filter(m => m.result === "loss").length,
    ties: matches.filter(m => m.result === "tie").length,
    winRate: matches.length > 0 
      ? Math.round((matches.filter(m => m.result === "win").length / matches.length) * 100) 
      : 0,
  };

  useEffect(() => {
    const fetchMatchHistory = async () => {
      if (!profile) return;

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
            ended_at,
            started_at,
            status,
            player1:profiles!ranked_matches_player1_id_fkey(id, username, avatar_url, grade),
            player2:profiles!ranked_matches_player2_id_fkey(id, username, avatar_url, grade)
          `)
          .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error("Error fetching match history:", error);
          return;
        }

        if (!data) {
          setMatches([]);
          return;
        }

        const formattedMatches: MatchRecord[] = data.map((match: any) => {
          const isPlayer1 = match.player1_id === profile.id;
          const opponent = isPlayer1 ? match.player2 : match.player1;
          
          // Decode scores - remove progress encoding
          const rawMyScore = isPlayer1 ? match.player1_score : match.player2_score;
          const rawOpponentScore = isPlayer1 ? match.player2_score : match.player1_score;
          
          // Scores are encoded as: score + (questionIndex * 100) + (finished ? 10000 : 0)
          const myScore = rawMyScore >= 10000 
            ? (rawMyScore - 10000) % 100 
            : rawMyScore % 100;
          const opponentScore = rawOpponentScore >= 10000 
            ? (rawOpponentScore - 10000) % 100 
            : rawOpponentScore % 100;

          // Determine result
          let result: "win" | "loss" | "tie";
          if (match.winner_id === profile.id) {
            result = "win";
          } else if (match.winner_id === null && myScore === opponentScore) {
            result = "tie";
          } else {
            result = "loss";
          }

          // Calculate duration in seconds
          const startTime = match.started_at ? new Date(match.started_at).getTime() : new Date(match.created_at).getTime();
          const endTime = match.ended_at ? new Date(match.ended_at).getTime() : Date.now();
          const duration = Math.floor((endTime - startTime) / 1000);

          // Determine match type - grade 0 means free match (cross-grade)
          const isFreeMatch = match.grade === 0;

          return {
            id: match.id,
            type: isFreeMatch ? "free" : "ranked",
            opponentName: opponent?.username || "未知对手",
            opponentAvatar: opponent?.avatar_url || null,
            myScore,
            opponentScore,
            result,
            createdAt: match.created_at,
            duration,
          };
        });

        setMatches(formattedMatches);
      } catch (err) {
        console.error("Error in fetchMatchHistory:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatchHistory();
  }, [profile]);

  const filteredMatches = filter === "all" 
    ? matches 
    : matches.filter(m => m.type === filter);

  const getResultIcon = (result: "win" | "loss" | "tie") => {
    switch (result) {
      case "win":
        return <TrendingUp className="w-4 h-4" />;
      case "loss":
        return <TrendingDown className="w-4 h-4" />;
      case "tie":
        return <Minus className="w-4 h-4" />;
    }
  };

  const getResultColor = (result: "win" | "loss" | "tie") => {
    switch (result) {
      case "win":
        return "text-success bg-success/10 border-success/30";
      case "loss":
        return "text-destructive bg-destructive/10 border-destructive/30";
      case "tie":
        return "text-muted-foreground bg-muted/10 border-muted/30";
    }
  };

  const getResultText = (result: "win" | "loss" | "tie") => {
    switch (result) {
      case "win":
        return "胜利";
      case "loss":
        return "失败";
      case "tie":
        return "平局";
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-gaming text-xl text-glow-purple">比赛历史</h1>
            <Badge variant="secondary" className="ml-auto">
              <Trophy className="w-3 h-3 mr-1" />
              共 {stats.total} 场
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="glow" className="border-success/30">
            <CardContent className="p-4 text-center">
              <Crown className="w-6 h-6 mx-auto mb-2 text-success" />
              <p className="text-2xl font-gaming text-success">{stats.wins}</p>
              <p className="text-xs text-muted-foreground">胜场</p>
            </CardContent>
          </Card>
          
          <Card variant="glow" className="border-destructive/30">
            <CardContent className="p-4 text-center">
              <Swords className="w-6 h-6 mx-auto mb-2 text-destructive" />
              <p className="text-2xl font-gaming text-destructive">{stats.losses}</p>
              <p className="text-xs text-muted-foreground">败场</p>
            </CardContent>
          </Card>
          
          <Card variant="glow" className="border-muted/30">
            <CardContent className="p-4 text-center">
              <Minus className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-gaming text-muted-foreground">{stats.ties}</p>
              <p className="text-xs text-muted-foreground">平局</p>
            </CardContent>
          </Card>
          
          <Card variant="glow" className="border-primary/30">
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-gaming text-primary">{stats.winRate}%</p>
              <p className="text-xs text-muted-foreground">胜率</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {[
            { id: "all", label: "全部", icon: Trophy },
            { id: "ranked", label: "排位赛", icon: Swords },
            { id: "free", label: "自由服", icon: Globe },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={filter === tab.id ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(tab.id as typeof filter)}
            >
              <tab.icon className="w-4 h-4 mr-1" />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Match List */}
        <div className="space-y-3">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredMatches.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Swords className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">暂无比赛记录</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  快去参加对战吧！
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredMatches.map((match) => (
              <Card 
                key={match.id} 
                className={cn(
                  "transition-all duration-200 hover:shadow-md",
                  match.result === "win" && "border-l-4 border-l-success",
                  match.result === "loss" && "border-l-4 border-l-destructive",
                  match.result === "tie" && "border-l-4 border-l-muted"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Opponent Avatar */}
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center text-lg font-gaming",
                      match.type === "ranked" 
                        ? "bg-gradient-to-br from-primary to-neon-pink text-primary-foreground"
                        : "bg-gradient-to-br from-neon-cyan to-neon-green text-primary-foreground"
                    )}>
                      {match.opponentAvatar ? (
                        <img 
                          src={match.opponentAvatar} 
                          alt={match.opponentName}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        match.opponentName.charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* Match Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold truncate">{match.opponentName}</span>
                        <Badge variant={match.type === "ranked" ? "outline" : "secondary"} className="text-xs shrink-0">
                          {match.type === "ranked" ? (
                            <><Swords className="w-3 h-3 mr-1" />排位</>
                          ) : (
                            <><Globe className="w-3 h-3 mr-1" />自由</>
                          )}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDistanceToNow(new Date(match.createdAt), { 
                            addSuffix: true,
                            locale: zhCN 
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(match.duration)}
                        </span>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-center shrink-0">
                      <div className="font-gaming text-lg">
                        <span className={match.result === "win" ? "text-success" : match.result === "loss" ? "text-destructive" : "text-foreground"}>
                          {match.myScore}
                        </span>
                        <span className="text-muted-foreground mx-1">:</span>
                        <span className="text-muted-foreground">
                          {match.opponentScore}
                        </span>
                      </div>
                    </div>

                    {/* Result Badge */}
                    <Badge 
                      variant="outline" 
                      className={cn("shrink-0", getResultColor(match.result))}
                    >
                      {getResultIcon(match.result)}
                      <span className="ml-1">{getResultText(match.result)}</span>
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default MatchHistory;