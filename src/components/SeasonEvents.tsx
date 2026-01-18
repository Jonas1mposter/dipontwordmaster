import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  Coins, 
  Swords, 
  Percent,
  Clock,
  Flame,
  Sparkles,
  Gift
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface SeasonEvent {
  id: string;
  name: string;
  description: string;
  icon: string;
  event_type: string;
  bonus_value: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface SeasonEventsProps {
  seasonId: string;
}

const SeasonEvents = ({ seasonId }: SeasonEventsProps) => {
  const [events, setEvents] = useState<SeasonEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (seasonId) {
      fetchEvents();
    }
  }, [seasonId]);

  useEffect(() => {
    // Update countdown every second
    const interval = setInterval(() => {
      const newTimeLeft = new Map<string, string>();
      events.forEach(event => {
        const now = Date.now();
        const start = new Date(event.start_time).getTime();
        const end = new Date(event.end_time).getTime();

        if (now < start) {
          // Event hasn't started
          newTimeLeft.set(event.id, formatTimeLeft(start - now, true));
        } else if (now < end) {
          // Event is active
          newTimeLeft.set(event.id, formatTimeLeft(end - now, false));
        } else {
          // Event ended
          newTimeLeft.set(event.id, "已结束");
        }
      });
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(interval);
  }, [events]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      
      // Fetch active and upcoming events
      const { data, error } = await supabase
        .from("season_events")
        .select("*")
        .eq("season_id", seasonId)
        .eq("is_active", true)
        .gte("end_time", now)
        .order("start_time");

      if (error) throw error;
      if (data) {
        setEvents(data);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeLeft = (ms: number, isUpcoming: boolean) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return isUpcoming ? `${days}天后开始` : `剩余${days}天`;
    }
    if (hours > 0) {
      return isUpcoming ? `${hours}小时后开始` : `${hours}时${minutes}分`;
    }
    return isUpcoming ? `${minutes}分钟后开始` : `${minutes}分${seconds}秒`;
  };

  const getIcon = (iconName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      Zap: <Zap className="w-5 h-5" />,
      Coins: <Coins className="w-5 h-5" />,
      Swords: <Swords className="w-5 h-5" />,
      Percent: <Percent className="w-5 h-5" />,
      Flame: <Flame className="w-5 h-5" />,
      Sparkles: <Sparkles className="w-5 h-5" />,
      Gift: <Gift className="w-5 h-5" />,
    };
    return iconMap[iconName] || <Zap className="w-5 h-5" />;
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      double_xp: "双倍经验",
      bonus_coins: "金币加成",
      special_battle: "特殊对战",
      flash_sale: "限时折扣",
    };
    return labels[type] || type;
  };

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      double_xp: "from-purple-500 to-indigo-500",
      bonus_coins: "from-amber-500 to-yellow-500",
      special_battle: "from-red-500 to-orange-500",
      flash_sale: "from-green-500 to-emerald-500",
    };
    return colors[type] || "from-blue-500 to-cyan-500";
  };

  const isEventActive = (event: SeasonEvent) => {
    const now = Date.now();
    const start = new Date(event.start_time).getTime();
    const end = new Date(event.end_time).getTime();
    return now >= start && now < end;
  };

  if (loading) {
    return null;
  }

  if (events.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-500" />
          赛季活动
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.map((event) => {
          const active = isEventActive(event);
          const time = timeLeft.get(event.id) || "计算中...";

          return (
            <div
              key={event.id}
              className={cn(
                "relative p-3 rounded-lg border overflow-hidden transition-all",
                active ? "ring-2 ring-purple-500 animate-pulse-slow" : "opacity-80"
              )}
            >
              {/* Background gradient */}
              <div 
                className={cn(
                  "absolute inset-0 opacity-10 bg-gradient-to-r",
                  getEventTypeColor(event.event_type)
                )} 
              />
              
              <div className="relative flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg bg-gradient-to-br text-white shrink-0",
                  getEventTypeColor(event.event_type)
                )}>
                  {getIcon(event.icon)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold truncate">{event.name}</span>
                    {active && (
                      <Badge className="bg-green-500 text-white animate-pulse shrink-0">
                        进行中
                      </Badge>
                    )}
                    {!active && (
                      <Badge variant="secondary" className="shrink-0">
                        即将开始
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{event.description}</p>
                </div>
                
                <div className="text-right shrink-0">
                  <div className={cn(
                    "text-lg font-bold bg-gradient-to-r bg-clip-text text-transparent",
                    getEventTypeColor(event.event_type)
                  )}>
                    x{event.bonus_value}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{time}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default SeasonEvents;
