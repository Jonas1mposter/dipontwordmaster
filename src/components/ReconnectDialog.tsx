import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Swords, Globe, Clock, Loader2 } from "lucide-react";

interface ReconnectDialogProps {
  open: boolean;
  matchType: "ranked" | "free";
  opponentName: string;
  opponentAvatar?: string;
  myScore: number;
  opponentScore: number;
  currentQuestion: number;
  timeRemaining: number;
  onReconnect: () => void;
  onDismiss: () => void;
}

export const ReconnectDialog = ({
  open,
  matchType,
  opponentName,
  opponentAvatar,
  myScore,
  opponentScore,
  currentQuestion,
  timeRemaining,
  onReconnect,
  onDismiss,
}: ReconnectDialogProps) => {
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    onReconnect();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {matchType === "ranked" ? (
              <Swords className="w-5 h-5 text-primary" />
            ) : (
              <Globe className="w-5 h-5 text-neon-cyan" />
            )}
            检测到未完成的比赛
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>您有一场正在进行的{matchType === "ranked" ? "排位赛" : "自由服"}比赛</p>
              
              {/* Opponent info */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="w-12 h-12 border-2 border-primary">
                  <AvatarImage src={opponentAvatar} />
                  <AvatarFallback>{opponentName.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">对手: {opponentName}</p>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      第 {currentQuestion + 1}/10 题
                    </Badge>
                    <span>|</span>
                    <span className="text-primary font-medium">{myScore}</span>
                    <span>:</span>
                    <span className="text-destructive font-medium">{opponentScore}</span>
                  </div>
                </div>
              </div>

              {/* Time remaining */}
              <div className="flex items-center justify-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>剩余时间: </span>
                <span className={timeRemaining < 30 ? "text-destructive font-bold" : "text-primary font-medium"}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onDismiss} disabled={isReconnecting}>
            放弃比赛
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleReconnect} disabled={isReconnecting}>
            {isReconnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                重连中...
              </>
            ) : (
              <>
                <Swords className="w-4 h-4 mr-2" />
                重新连接
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
