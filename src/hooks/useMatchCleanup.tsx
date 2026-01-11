import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Constants for cleanup timing
const STALE_MATCH_MINUTES = 5; // Matches waiting longer than this are considered stale
const CLEANUP_INTERVAL_MS = 60 * 1000; // Run cleanup every 60 seconds
const PLAYER_STALE_MATCH_MINUTES = 2; // Player's own matches older than this should be abandoned

/**
 * Check if an error is due to the database trigger preventing multiple active matches
 */
export const isActiveMatchError = (error: any): boolean => {
  const errorMessage = error?.message || error?.details || String(error);
  return errorMessage.includes('already in an active match');
};

/**
 * Show a user-friendly error message for active match constraint violations
 * Note: We don't use setMatchStatus directly to avoid type issues with different MatchStatus types
 */
export const handleActiveMatchError = (): void => {
  toast.error("你已在一场比赛中，请先完成当前比赛", { 
    duration: 4000,
    description: "如需取消当前比赛，请点击「放弃比赛」按钮"
  });
};

interface UseMatchCleanupProps {
  profileId: string | undefined;
  grade?: number; // Optional: 0 for free match, profile.grade for ranked
  enabled?: boolean;
}

/**
 * Hook to periodically clean up stale matches
 * This runs in the background to prevent orphaned waiting matches
 */
export const useMatchCleanup = ({ profileId, grade, enabled = true }: UseMatchCleanupProps) => {
  const lastCleanupRef = useRef<number>(0);

  const cleanupStaleMatches = useCallback(async () => {
    if (!profileId || !enabled) return;
    
    const now = Date.now();
    // Prevent running cleanup too frequently
    if (now - lastCleanupRef.current < CLEANUP_INTERVAL_MS / 2) return;
    lastCleanupRef.current = now;

    try {
      // Clean up player's own stale matches
      const playerStaleTime = new Date(now - PLAYER_STALE_MATCH_MINUTES * 60 * 1000).toISOString();
      await supabase
        .from("ranked_matches")
        .update({ status: "abandoned" })
        .or(`player1_id.eq.${profileId},player2_id.eq.${profileId}`)
        .in("status", ["waiting", "in_progress"])
        .lt("created_at", playerStaleTime);

      // Clean up global stale waiting matches
      const globalStaleTime = new Date(now - STALE_MATCH_MINUTES * 60 * 1000).toISOString();
      const gradeFilter = grade !== undefined ? { grade } : {};
      
      await supabase
        .from("ranked_matches")
        .update({ status: "cancelled" })
        .eq("status", "waiting")
        .lt("created_at", globalStaleTime);

      console.log("Match cleanup completed");
    } catch (error) {
      console.error("Match cleanup error:", error);
    }
  }, [profileId, grade, enabled]);

  // Run cleanup on mount and periodically
  useEffect(() => {
    if (!profileId || !enabled) return;

    // Initial cleanup
    cleanupStaleMatches();

    // Set up periodic cleanup
    const intervalId = setInterval(cleanupStaleMatches, CLEANUP_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [profileId, enabled, cleanupStaleMatches]);

  // Manual cleanup trigger
  const forceCleanup = useCallback(async () => {
    lastCleanupRef.current = 0; // Reset throttle
    await cleanupStaleMatches();
  }, [cleanupStaleMatches]);

  return { cleanupStaleMatches: forceCleanup };
};

/**
 * Helper to check and cancel player's own stale matches before starting a new search
 */
export const cancelPlayerStaleMatches = async (profileId: string, grade?: number): Promise<void> => {
  try {
    // Cancel any old waiting matches from this user
    let query = supabase
      .from("ranked_matches")
      .update({ status: "cancelled" })
      .eq("player1_id", profileId)
      .eq("status", "waiting");
    
    if (grade !== undefined) {
      query = query.eq("grade", grade);
    }
    
    await query;

    // Also abandon any stale in_progress matches
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    await supabase
      .from("ranked_matches")
      .update({ status: "abandoned" })
      .or(`player1_id.eq.${profileId},player2_id.eq.${profileId}`)
      .in("status", ["waiting", "in_progress"])
      .lt("created_at", twoMinutesAgo);
  } catch (error) {
    console.error("Error cancelling stale matches:", error);
  }
};
