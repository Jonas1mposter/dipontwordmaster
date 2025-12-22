import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  rank: number;
  username: string;
  level: number;
  xp: number;
  tier: string;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUser?: string;
}

const Leaderboard = ({ entries, currentUser }: LeaderboardProps) => {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-accent" />;
      case 2:
        return <Medal className="w-5 h-5 text-silver" />;
      case 3:
        return <Award className="w-5 h-5 text-bronze" />;
      default:
        return <span className="w-6 text-center font-gaming text-muted-foreground">{rank}</span>;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-accent/20 via-accent/10 to-transparent border-accent/30";
      case 2:
        return "bg-gradient-to-r from-silver/10 via-transparent to-transparent border-silver/20";
      case 3:
        return "bg-gradient-to-r from-bronze/10 via-transparent to-transparent border-bronze/20";
      default:
        return "bg-card hover:bg-secondary/50";
    }
  };

  const getTierVariant = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "bronze":
        return "bronze";
      case "silver":
        return "silver";
      case "gold":
        return "gold";
      case "platinum":
        return "platinum";
      case "diamond":
        return "diamond";
      case "champion":
        return "champion";
      default:
        return "secondary";
    }
  };

  return (
    <Card variant="gaming" className="overflow-hidden">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
        <CardTitle className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-accent" />
          <span className="text-glow-gold">排行榜</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/30">
          {entries.map((entry) => (
            <div
              key={entry.rank}
              className={cn(
                "flex items-center gap-4 p-4 transition-all duration-300 border-l-2",
                getRankStyle(entry.rank),
                entry.username === currentUser && "ring-1 ring-primary/30"
              )}
            >
              {/* Rank */}
              <div className="w-10 flex justify-center">
                {getRankIcon(entry.rank)}
              </div>

              {/* Avatar */}
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-gaming shadow-lg",
                entry.rank === 1 && "bg-gradient-to-br from-accent to-amber-600 text-background shadow-accent/30",
                entry.rank === 2 && "bg-gradient-to-br from-gray-300 to-gray-400 text-background",
                entry.rank === 3 && "bg-gradient-to-br from-amber-600 to-amber-800 text-background",
                entry.rank > 3 && "bg-gradient-to-br from-primary/50 to-primary text-primary-foreground"
              )}>
                {entry.username.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-semibold truncate",
                    entry.username === currentUser && "text-primary"
                  )}>
                    {entry.username}
                  </span>
                  {entry.username === currentUser && (
                    <Badge variant="xp" className="text-[10px]">你</Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  Lv.{entry.level}
                </span>
              </div>

              {/* XP & Tier */}
              <div className="text-right">
                <div className="font-gaming text-sm text-primary mb-1">
                  {entry.xp.toLocaleString()} XP
                </div>
                <Badge variant={getTierVariant(entry.tier)} className="text-[10px]">
                  {entry.tier}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
