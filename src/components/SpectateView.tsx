import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Eye, Trophy, Clock, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpectateViewProps {
  matchId: string;
  onBack: () => void;
}

interface MatchData {
  id: string;
  player1_id: string;
  player2_id: string | null;
  player1_score: number;
  player2_score: number;
  status: string;
  grade: number;
  started_at: string | null;
  ended_at: string | null;
  winner_id: string | null;
}

interface PlayerData {
  id: string;
  username: string;
  avatar_url: string | null;
  level: number;
  rank_tier: string;
  rank_stars: number;
}

interface PlayerProgress {
  questionIndex: number;
  score: number;
  finished: boolean;
}

const SpectateView = ({ matchId, onBack }: SpectateViewProps) => {
  const [match, setMatch] = useState<MatchData | null>(null);
  const [player1, setPlayer1] = useState<PlayerData | null>(null);
  const [player2, setPlayer2] = useState<PlayerData | null>(null);
  const [player1Progress, setPlayer1Progress] = useState<PlayerProgress>({ questionIndex: 0, score: 0, finished: false });
  const [player2Progress, setPlayer2Progress] = useState<PlayerProgress>({ questionIndex: 0, score: 0, finished: false });
  const [loading, setLoading] = useState(true);
  const [matchEnded, setMatchEnded] = useState(false);

  // Fetch match and player data
  useEffect(() => {
    const fetchMatchData = async () => {
      const { data: matchData, error: matchError } = await supabase
        .from("ranked_matches")
        .select("*")
        .eq("id", matchId)
        .single();

      if (matchError || !matchData) {
        console.error("Error fetching match:", matchError);
        return;
      }

      setMatch(matchData);
      
      if (matchData.status === "completed") {
        setMatchEnded(true);
      }

      // Fetch player 1 data
      const { data: p1Data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, level, rank_tier, rank_stars")
        .eq("id", matchData.player1_id)
        .single();
      
      if (p1Data) setPlayer1(p1Data);

      // Fetch player 2 data
      if (matchData.player2_id) {
        const { data: p2Data } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, level, rank_tier, rank_stars")
          .eq("id", matchData.player2_id)
          .single();
        
        if (p2Data) setPlayer2(p2Data);
      }

      setLoading(false);
    };

    fetchMatchData();
  }, [matchId]);

  // Subscribe to battle progress
  useEffect(() => {
    if (!matchId) return;

    console.log("Spectator joining match channel:", matchId);
    
    const channel = supabase.channel(`battle-${matchId}`)
      .on('broadcast', { event: 'player_progress' }, (payload) => {
        const data = payload.payload as any;
        
        console.log("Spectator received progress:", data);
        
        // Update the correct player's progress
        if (data.playerId === match?.player1_id) {
          setPlayer1Progress({
            questionIndex: data.questionIndex,
            score: data.score,
            finished: data.finished,
          });
        } else if (data.playerId === match?.player2_id) {
          setPlayer2Progress({
            questionIndex: data.questionIndex,
            score: data.score,
            finished: data.finished,
          });
        }
        
        // Check if match ended
        if (data.finished) {
          // Refresh match data to get final scores
          setTimeout(async () => {
            const { data: updatedMatch } = await supabase
              .from("ranked_matches")
              .select("*")
              .eq("id", matchId)
              .single();
            
            if (updatedMatch?.status === "completed") {
              setMatch(updatedMatch);
              setMatchEnded(true);
            }
          }, 2000);
        }
      })
      .subscribe((status) => {
        console.log("Spectator channel status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, match?.player1_id, match?.player2_id]);

  const getRankDisplay = (tier: string) => {
    const tierNames: Record<string, string> = {
      bronze: "青铜",
      silver: "白银",
      gold: "黄金",
      platinum: "铂金",
      diamond: "钻石",
      champion: "狄邦巅峰",
    };
    return tierNames[tier] || tier;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-muted-foreground">加载对战信息...</p>
        </div>
      </div>
    );
  }

  if (!match || !player1) {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">对战不存在或已结束</p>
          <Button onClick={onBack}>返回</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
            
            <Badge variant="outline" className="text-primary border-primary/50">
              <Eye className="w-3 h-3 mr-1" />
              观战模式
            </Badge>
            
            <div className="w-16" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Match Ended */}
        {matchEnded ? (
          <Card variant="glow" className="max-w-2xl mx-auto p-8">
            <div className="text-center mb-8">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-accent" />
              <h2 className="font-gaming text-3xl mb-2 text-glow-gold">对战结束</h2>
              {match.winner_id && (
                <p className="text-muted-foreground">
                  获胜者: <span className="text-primary font-gaming">
                    {match.winner_id === player1?.id ? player1?.username : player2?.username}
                  </span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 items-center">
              {/* Player 1 */}
              <div className={cn(
                "text-center p-4 rounded-xl transition-all",
                match.winner_id === player1?.id ? "bg-success/10 border border-success/30" : "bg-card"
              )}>
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-primary to-neon-pink flex items-center justify-center">
                  {player1?.avatar_url ? (
                    <img src={player1.avatar_url} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-2xl font-gaming text-primary-foreground">
                      {player1?.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="font-semibold mb-1">{player1?.username}</p>
                <p className="font-gaming text-3xl text-primary">{match.player1_score}</p>
                <p className="text-xs text-muted-foreground">正确答题</p>
              </div>

              {/* VS */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="font-gaming text-2xl text-accent">VS</span>
                </div>
              </div>

              {/* Player 2 */}
              <div className={cn(
                "text-center p-4 rounded-xl transition-all",
                match.winner_id === player2?.id ? "bg-success/10 border border-success/30" : "bg-card"
              )}>
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-neon-blue to-neon-cyan flex items-center justify-center">
                  {player2?.avatar_url ? (
                    <img src={player2.avatar_url} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-2xl font-gaming text-primary-foreground">
                      {player2?.username?.charAt(0).toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <p className="font-semibold mb-1">{player2?.username || "等待中"}</p>
                <p className="font-gaming text-3xl text-neon-blue">{match.player2_score}</p>
                <p className="text-xs text-muted-foreground">正确答题</p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Button onClick={onBack}>返回好友列表</Button>
            </div>
          </Card>
        ) : (
          /* Live Match */
          <Card variant="glow" className="max-w-2xl mx-auto p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-destructive/10 rounded-full border border-destructive/30 mb-4">
                <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                <span className="text-destructive font-gaming text-sm">对战进行中</span>
              </div>
              <h2 className="font-gaming text-2xl text-glow-purple">
                <Swords className="w-6 h-6 inline mr-2" />
                实时观战
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-4 items-stretch">
              {/* Player 1 */}
              <div className="text-center p-4 rounded-xl bg-card border border-border/50">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br from-primary to-neon-pink flex items-center justify-center">
                  {player1?.avatar_url ? (
                    <img src={player1.avatar_url} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-xl font-gaming text-primary-foreground">
                      {player1?.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="font-semibold mb-1 text-sm">{player1?.username}</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Lv.{player1?.level} · {getRankDisplay(player1?.rank_tier || "bronze")}
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">进度</span>
                    <span className="font-gaming text-primary">{player1Progress.questionIndex}/10</span>
                  </div>
                  <Progress value={(player1Progress.questionIndex / 10) * 100} variant="xp" className="h-2" />
                  
                  {player1Progress.finished && (
                    <Badge variant="outline" className="text-success border-success/50 text-xs">
                      已完成
                    </Badge>
                  )}
                </div>
              </div>

              {/* VS */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mb-3 animate-pulse">
                  <span className="font-gaming text-xl text-accent">VS</span>
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 bg-primary rounded-full animate-dot-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>

              {/* Player 2 */}
              <div className="text-center p-4 rounded-xl bg-card border border-border/50">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br from-neon-blue to-neon-cyan flex items-center justify-center">
                  {player2?.avatar_url ? (
                    <img src={player2.avatar_url} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-xl font-gaming text-primary-foreground">
                      {player2?.username?.charAt(0).toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <p className="font-semibold mb-1 text-sm">{player2?.username || "等待中"}</p>
                <p className="text-xs text-muted-foreground mb-3">
                  {player2 ? `Lv.${player2.level} · ${getRankDisplay(player2.rank_tier)}` : "-"}
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">进度</span>
                    <span className="font-gaming text-neon-blue">{player2Progress.questionIndex}/10</span>
                  </div>
                  <Progress value={(player2Progress.questionIndex / 10) * 100} variant="gold" className="h-2" />
                  
                  {player2Progress.finished && (
                    <Badge variant="outline" className="text-success border-success/50 text-xs">
                      已完成
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <p className="text-center text-muted-foreground text-sm mt-6">
              双方正在答题中，比赛结束后可以看到最终结果
            </p>
          </Card>
        )}
      </main>
    </div>
  );
};

export default SpectateView;
