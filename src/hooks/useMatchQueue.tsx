import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { addMatchDebugLog } from "@/components/MatchDebugPanel";

interface MatchQueueResult {
  isQueued: boolean;
  matchId: string | null;
  opponentId: string | null;
  error: string | null;
}

interface UseMatchQueueOptions {
  profileId: string | null;
  grade: number;
  matchType: 'ranked' | 'free';
  eloRating: number;
  enabled: boolean;
  onMatchFound: (matchId: string, opponentId: string) => void;
}

export const useMatchQueue = ({
  profileId,
  grade,
  matchType,
  eloRating,
  enabled,
  onMatchFound,
}: UseMatchQueueOptions) => {
  const [isQueued, setIsQueued] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matchFoundRef = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Join the match queue and try to find a match
  const joinQueue = useCallback(async () => {
    if (!profileId || !enabled || isSearching) {
      return null;
    }

    setIsSearching(true);
    setError(null);
    matchFoundRef.current = false;
    
    addMatchDebugLog(`加入匹配池 (类型: ${matchType}, ELO: ${eloRating})`, "info");

    try {
      // Call the database function to find a match
      const { data, error: rpcError } = await supabase.rpc('find_match_in_queue', {
        p_profile_id: profileId,
        p_grade: matchType === 'free' ? 0 : grade, // Use 0 for free matches
        p_match_type: matchType,
        p_elo_rating: eloRating,
      });

      if (rpcError) {
        console.error("Queue RPC error:", rpcError);
        addMatchDebugLog(`匹配池错误: ${rpcError.message}`, "error");
        setError(rpcError.message);
        setIsSearching(false);
        return null;
      }

      // Check if we got matched immediately
      if (data && data.length > 0 && data[0].new_match_id) {
        const result = data[0];
        addMatchDebugLog(`立即匹配成功! 对局ID: ${result.new_match_id.slice(0, 8)}...`, "success");
        matchFoundRef.current = true;
        setIsQueued(false);
        setIsSearching(false);
        onMatchFound(result.new_match_id, result.matched_profile_id);
        return result.new_match_id;
      }

      // No immediate match - we're now in the queue
      addMatchDebugLog("已加入匹配池，等待对手...", "info");
      setIsQueued(true);
      
      // Start polling for match status
      startPolling();
      
      // Also subscribe to realtime updates
      subscribeToQueueUpdates();
      
      return null;
    } catch (err: any) {
      console.error("Queue error:", err);
      addMatchDebugLog(`匹配池异常: ${err.message}`, "error");
      setError(err.message);
      setIsSearching(false);
      return null;
    }
  }, [profileId, grade, matchType, eloRating, enabled, onMatchFound]);

  // Poll for queue status
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    const poll = async () => {
      if (!profileId || matchFoundRef.current) return;

      try {
        const { data, error: rpcError } = await supabase.rpc('check_queue_status', {
          p_profile_id: profileId,
          p_match_type: matchType,
        });

        if (rpcError) {
          console.error("Queue status check error:", rpcError);
          return;
        }

        if (data && data.length > 0) {
          const status = data[0];
          if (status.queue_status === 'matched' && status.match_id && !matchFoundRef.current) {
            addMatchDebugLog(`轮询发现匹配! 对局ID: ${status.match_id.slice(0, 8)}...`, "success");
            matchFoundRef.current = true;
            setIsQueued(false);
            setIsSearching(false);
            stopPolling();
            onMatchFound(status.match_id, status.matched_with);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    // Poll every 1.5 seconds
    pollingIntervalRef.current = setInterval(poll, 1500);
  }, [profileId, matchType, onMatchFound]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Subscribe to realtime queue updates
  const subscribeToQueueUpdates = useCallback(() => {
    if (!profileId || channelRef.current) return;

    const channel = supabase
      .channel(`match-queue-${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'match_queue',
          filter: `profile_id=eq.${profileId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData.status === 'matched' && newData.match_id && !matchFoundRef.current) {
            addMatchDebugLog(`实时更新发现匹配! 对局ID: ${newData.match_id.slice(0, 8)}...`, "success");
            matchFoundRef.current = true;
            setIsQueued(false);
            setIsSearching(false);
            stopPolling();
            onMatchFound(newData.match_id, newData.matched_with);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [profileId, onMatchFound, stopPolling]);

  // Leave the queue
  const leaveQueue = useCallback(async () => {
    if (!profileId) return;

    addMatchDebugLog("离开匹配池...", "info");
    stopPolling();

    // Unsubscribe from realtime
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Cancel queue entry in database
    try {
      await supabase.rpc('cancel_queue_entry', {
        p_profile_id: profileId,
        p_match_type: matchType,
      });
      addMatchDebugLog("已离开匹配池", "info");
    } catch (err) {
      console.error("Error canceling queue:", err);
    }

    setIsQueued(false);
    setIsSearching(false);
    matchFoundRef.current = false;
  }, [profileId, matchType, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [stopPolling]);

  return {
    isQueued,
    isSearching,
    error,
    joinQueue,
    leaveQueue,
  };
};
