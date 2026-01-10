import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Turtle, Gauge, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpeechSpeed, getSavedSpeed, saveSpeed, speakWord } from "@/hooks/useSpeech";

interface SpeechSpeedSelectorProps {
  className?: string;
  showLabel?: boolean;
  onSpeedChange?: (speed: SpeechSpeed) => void;
}

const speedConfig: Record<SpeechSpeed, { label: string; icon: React.ReactNode; testWord: string }> = {
  slow: { label: "慢速", icon: <Turtle className="w-4 h-4" />, testWord: "vocabulary" },
  normal: { label: "正常", icon: <Gauge className="w-4 h-4" />, testWord: "vocabulary" },
  fast: { label: "快速", icon: <Zap className="w-4 h-4" />, testWord: "vocabulary" },
};

const SpeechSpeedSelector = ({ className, showLabel = true, onSpeedChange }: SpeechSpeedSelectorProps) => {
  const [currentSpeed, setCurrentSpeed] = useState<SpeechSpeed>(getSavedSpeed);

  useEffect(() => {
    // Sync with localStorage on mount
    setCurrentSpeed(getSavedSpeed());
  }, []);

  const handleSpeedChange = (speed: SpeechSpeed) => {
    setCurrentSpeed(speed);
    saveSpeed(speed);
    onSpeedChange?.(speed);
    // Play test word to demonstrate the speed
    speakWord("vocabulary");
  };

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Volume2 className="w-4 h-4" />
          <span>朗读语速</span>
        </div>
      )}
      <div className="flex gap-2">
        {(Object.keys(speedConfig) as SpeechSpeed[]).map((speed) => {
          const config = speedConfig[speed];
          const isActive = currentSpeed === speed;
          
          return (
            <Button
              key={speed}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => handleSpeedChange(speed)}
              className={cn(
                "flex-1 gap-1.5 transition-all",
                isActive && "ring-2 ring-primary/30"
              )}
            >
              {config.icon}
              <span>{config.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default SpeechSpeedSelector;
