import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Constants for cleanup timing
const STALE_WAITING_MATCH_MINUTES = 10; // Waiting matches older than this are considered stale
const CLEANUP_INTERVAL_MS = 120 * 1000; // Run cleanup every 2 minutes (reduced frequency)

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
 * IMPORTANT: Only cleans up the CURRENT PLAYER's own matches, never other players' matches
 */
export const useMatchCleanup = ({ profileId, grade, enabled = true }: UseMatchCleanupProps) => {
  const lastCleanupRef = useRef<number>(0);

  const cleanupStaleMatches = useCallback(async () => {
    if (!profileId || !enabled) return;
    
    const now = Date.now();
    // Prevent running cleanup too frequently (at least 1 minute between cleanups)
    if (now - lastCleanupRef.current < 60000) return;
    lastCleanupRef.current = now;

    try {
      // ONLY clean up this player's own stale WAITING matches (10+ minutes old)
      // NEVER touch other players' matches or global cleanup
      const waitingStaleTime = new Date(now - STALE_WAITING_MATCH_MINUTES * 60 * 1000).toISOString();
      
      let query = supabase
        .from("ranked_matches")
        .update({ status: "cancelled" })
        .eq("player1_id", profileId) // CRITICAL: Only this player's matches where they are player1
        .eq("status", "waiting")
        .lt("created_at", waitingStaleTime);
      
      // If grade is specified, also filter by grade
      if (grade !== undefined) {
        query = query.eq("grade", grade);
      }
      
      await query;

      console.log("Match cleanup completed for player:", profileId);
    } catch (error) {
      console.error("Match cleanup error:", error);
    }
  }, [profileId, grade, enabled]);

  // Run cleanup on mount and periodically
  useEffect(() => {
    if (!profileId || !enabled) return;

    // Initial cleanup (delayed by 5 seconds to not interfere with page load)
    const initialTimeout = setTimeout(cleanupStaleMatches, 5000);

    // Set up periodic cleanup (every 2 minutes)
    const intervalId = setInterval(cleanupStaleMatches, CLEANUP_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
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
 * ONLY cancels this player's matches, never others
 */
export const cancelPlayerStaleMatches = async (profileId: string, grade?: number): Promise<void> => {
  try {
    // Cancel any old waiting matches from this user (only where they are player1)
    let query = supabase
      .from("ranked_matches")
      .update({ status: "cancelled" })
      .eq("player1_id", profileId)
      .eq("status", "waiting");
    
    if (grade !== undefined) {
      query = query.eq("grade", grade);
    }
    
    await query;
  } catch (error) {
    console.error("Error cancelling stale matches:", error);
  }
};

