import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ActiveMatch {
  id: string;
  type: "ranked" | "free";
  opponentName: string;
  opponentAvatar?: string;
  myScore: number;
  opponentScore: number;
  currentQuestion: number;
  timeRemaining: number;
  createdAt: string;
}

interface UseMatchReconnectProps {
  profileId: string | undefined;
  enabled?: boolean;
}

export const useMatchReconnect = ({ profileId, enabled = true }: UseMatchReconnectProps) => {
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkForActiveMatch = useCallback(async () => {
    if (!profileId || !enabled) return null;
    
    setIsChecking(true);
    
    try {
      // Check for any in-progress matches where we are a participant
      const { data: matches, error } = await supabase
        .from("ranked_matches")
        .select(`
          *,
          player1:profiles!ranked_matches_player1_id_fkey(id, username, avatar_url, grade),
          player2:profiles!ranked_matches_player2_id_fkey(id, username, avatar_url, grade)
        `)
        .or(`player1_id.eq.${profileId},player2_id.eq.${profileId}`)
        .in("status", ["waiting", "playing"])
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (error) {
        console.error("Error checking for active matches:", error);
        return null;
      }
      
      if (!matches || matches.length === 0) {
        setActiveMatch(null);
        return null;
      }
      
      const match = matches[0];
      
      // Check if match is still valid (not too old - 5 minutes max)
      const matchAge = Date.now() - new Date(match.created_at).getTime();
      const maxMatchAge = 5 * 60 * 1000; // 5 minutes
      
      if (matchAge > maxMatchAge) {
        // Match is too old, mark it as cancelled
        await supabase
          .from("ranked_matches")
          .update({ status: "cancelled" })
          .eq("id", match.id);
        setActiveMatch(null);
        return null;
      }
      
      // Determine opponent and our position
      const isPlayer1 = match.player1_id === profileId;
      const opponent = isPlayer1 ? match.player2 : match.player1;
      
      // If no opponent yet (waiting match), skip
      if (!opponent) {
        setActiveMatch(null);
        return null;
      }
      
      // Decode progress from scores
      // Format: encodedProgress = score + (questionIndex * 100) + (finished ? 10000 : 0)
      const rawMyProgress = isPlayer1 ? match.player1_score : match.player2_score;
      const rawOpponentProgress = isPlayer1 ? match.player2_score : match.player1_score;
      
      const myFinished = rawMyProgress >= 10000;
      const myProgressWithoutFinished = myFinished ? rawMyProgress - 10000 : rawMyProgress;
      const myQuestionIndex = Math.floor(myProgressWithoutFinished / 100);
      const myActualScore = myProgressWithoutFinished % 100;
      
      const opponentFinished = rawOpponentProgress >= 10000;
      const opponentProgressWithoutFinished = opponentFinished ? rawOpponentProgress - 10000 : rawOpponentProgress;
      const opponentActualScore = opponentProgressWithoutFinished % 100;
      
      // Calculate remaining time (assuming 150s total for ranked, 60s for free)
      // Determine match type based on grade presence (free match has mixed grades)
      const isFreeMatch = match.player1?.grade !== match.player2?.grade;
      const totalTime = isFreeMatch ? 60 : 150;
      const elapsedSeconds = Math.floor(matchAge / 1000);
      const timeRemaining = Math.max(0, totalTime - elapsedSeconds);
      
      // If time is up, don't offer reconnect
      if (timeRemaining <= 0) {
        await supabase
          .from("ranked_matches")
          .update({ status: "cancelled" })
          .eq("id", match.id);
        setActiveMatch(null);
        return null;
      }
      
      const activeMatchData: ActiveMatch = {
        id: match.id,
        type: isFreeMatch ? "free" : "ranked",
        opponentName: opponent.username,
        opponentAvatar: opponent.avatar_url,
        myScore: myActualScore,
        opponentScore: opponentActualScore,
        currentQuestion: myQuestionIndex,
        timeRemaining,
        createdAt: match.created_at,
      };
      
      setActiveMatch(activeMatchData);
      return activeMatchData;
    } catch (err) {
      console.error("Error in checkForActiveMatch:", err);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [profileId, enabled]);

  // Check for active matches on mount and when profileId changes
  useEffect(() => {
    if (profileId && enabled) {
      checkForActiveMatch();
    }
  }, [profileId, enabled, checkForActiveMatch]);

  const dismissMatch = useCallback(async () => {
    if (!activeMatch) return;
    
    // Mark the match as cancelled (user dismissed the reconnect option)
    await supabase
      .from("ranked_matches")
      .update({ status: "cancelled" })
      .eq("id", activeMatch.id);
    
    setActiveMatch(null);
  }, [activeMatch]);

  const clearActiveMatch = useCallback(() => {
    setActiveMatch(null);
  }, []);

  return {
    activeMatch,
    isChecking,
    checkForActiveMatch,
    dismissMatch,
    clearActiveMatch,
  };
};
