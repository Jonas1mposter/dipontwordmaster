import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

interface GameState {
  matchStatus: string;
  currentWordIndex: number;
  words: any[];
  timeLeft: number;
  myFinished: boolean;
  matchFinished: boolean;
  quizTypes: string[];
  options: string[];
  isPlaying: boolean;
}

interface RecoveryCallbacks {
  onReset: () => void;
}

/**
 * Hook to detect and recover from game state anomalies
 * Monitors for stuck states and auto-recovers when issues are detected
 */
export const useGameStateRecovery = (
  state: GameState,
  callbacks: RecoveryCallbacks
) => {
  const stuckCheckCount = useRef(0);
  const lastWordIndex = useRef(-1);
  const lastCheckTime = useRef(Date.now());
  const recoveryAttempts = useRef(0);
  const maxRecoveryAttempts = 3;

  // Check for stuck state: playing but not progressing
  const checkForStuckState = useCallback(() => {
    const now = Date.now();
    const timeSinceLastCheck = now - lastCheckTime.current;
    lastCheckTime.current = now;

    // Only check if we're in playing state and not finished
    if (!state.isPlaying || state.myFinished || state.matchFinished) {
      stuckCheckCount.current = 0;
      lastWordIndex.current = -1;
      return false;
    }

    // Anomaly 1: Playing but no words loaded
    if (state.words.length === 0) {
      console.warn("[GameStateRecovery] Anomaly detected: No words loaded while playing");
      return true;
    }

    // Anomaly 2: Playing but no quiz types generated
    if (state.quizTypes.length === 0) {
      console.warn("[GameStateRecovery] Anomaly detected: No quiz types while playing");
      return true;
    }

    // Anomaly 3: Current word index out of bounds
    if (state.currentWordIndex >= state.words.length) {
      console.warn("[GameStateRecovery] Anomaly detected: Word index out of bounds");
      return true;
    }

    // Anomaly 4: Stuck on same question for too long (30+ seconds without options)
    if (
      state.currentWordIndex === lastWordIndex.current &&
      state.options.length === 0 &&
      timeSinceLastCheck < 5000 // Only count if check is frequent
    ) {
      stuckCheckCount.current++;
      
      if (stuckCheckCount.current >= 6) {
        // ~30 seconds of being stuck
        console.warn("[GameStateRecovery] Anomaly detected: Stuck on same question without options");
        return true;
      }
    } else {
      stuckCheckCount.current = 0;
    }

    lastWordIndex.current = state.currentWordIndex;
    return false;
  }, [state]);

  // Attempt recovery
  const attemptRecovery = useCallback(() => {
    if (recoveryAttempts.current >= maxRecoveryAttempts) {
      toast.error("游戏状态异常，请返回重新开始", {
        description: "多次恢复尝试失败",
        duration: 5000,
      });
      return;
    }

    recoveryAttempts.current++;
    console.log(`[GameStateRecovery] Attempting recovery (attempt ${recoveryAttempts.current}/${maxRecoveryAttempts})`);
    
    toast.warning("检测到游戏状态异常，正在恢复...", {
      description: "请稍候",
      duration: 3000,
    });

    // Trigger the reset callback
    callbacks.onReset();
  }, [callbacks]);

  // Reset recovery attempts when match status changes to idle
  useEffect(() => {
    if (state.matchStatus === "idle") {
      recoveryAttempts.current = 0;
      stuckCheckCount.current = 0;
      lastWordIndex.current = -1;
    }
  }, [state.matchStatus]);

  // Periodic state check while playing
  useEffect(() => {
    if (!state.isPlaying || state.myFinished || state.matchFinished) {
      return;
    }

    const checkInterval = setInterval(() => {
      const isStuck = checkForStuckState();
      if (isStuck) {
        attemptRecovery();
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(checkInterval);
  }, [state.isPlaying, state.myFinished, state.matchFinished, checkForStuckState, attemptRecovery]);

  // Manual reset function
  const manualReset = useCallback(() => {
    console.log("[GameStateRecovery] Manual reset triggered");
    recoveryAttempts.current = 0;
    callbacks.onReset();
    toast.info("游戏状态已重置");
  }, [callbacks]);

  return {
    manualReset,
    recoveryAttempts: recoveryAttempts.current,
  };
};
