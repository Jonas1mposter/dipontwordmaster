import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// K-factor determines how much ELO changes per match
const K_FACTOR = 32;
const K_FACTOR_NEW_PLAYER = 48; // Higher K for new players (< 30 matches)

interface EloMatchResult {
  newPlayerElo: number;
  newOpponentElo: number;
  playerEloChange: number;
  opponentEloChange: number;
}

// Calculate expected score based on ELO difference
export const calculateExpectedScore = (playerElo: number, opponentElo: number): number => {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
};

// Calculate new ELO ratings after a match
export const calculateEloChange = (
  playerElo: number,
  opponentElo: number,
  playerWon: boolean,
  isDraw: boolean = false,
  isNewPlayer: boolean = false
): EloMatchResult => {
  const kFactor = isNewPlayer ? K_FACTOR_NEW_PLAYER : K_FACTOR;
  const expectedScore = calculateExpectedScore(playerElo, opponentElo);
  
  // Actual score: 1 for win, 0 for loss, 0.5 for draw
  let actualScore: number;
  if (isDraw) {
    actualScore = 0.5;
  } else {
    actualScore = playerWon ? 1 : 0;
  }
  
  const playerEloChange = Math.round(kFactor * (actualScore - expectedScore));
  const opponentEloChange = -playerEloChange;
  
  return {
    newPlayerElo: Math.max(100, playerElo + playerEloChange), // Minimum ELO of 100
    newOpponentElo: Math.max(100, opponentElo + opponentEloChange),
    playerEloChange,
    opponentEloChange,
  };
};

// Calculate dynamic ELO range based on search time
export const calculateEloRange = (searchTimeSeconds: number): number => {
  // Start with ±50, expand by 25 every 5 seconds, max ±200
  const baseRange = 50;
  const expansion = Math.floor(searchTimeSeconds / 5) * 25;
  return Math.min(200, baseRange + expansion);
};

// Get streak bonus multiplier for ELO calculation
export const getStreakBonus = (winStreak: number): number => {
  // Win streaks give bonus ELO: 2-win = 1.1x, 3-win = 1.2x, 4+ = 1.3x max
  if (winStreak >= 4) return 1.3;
  if (winStreak >= 3) return 1.2;
  if (winStreak >= 2) return 1.1;
  return 1.0;
};

interface MatchablePlayer {
  id: string;
  username: string;
  elo: number;
  [key: string]: any;
}

export const useEloSystem = () => {
  // Update player ELO after a match
  const updateEloAfterMatch = useCallback(async (
    profileId: string,
    playerElo: number,
    opponentElo: number,
    playerWon: boolean,
    isDraw: boolean = false,
    isNewPlayer: boolean = false,
    isFreeMatch: boolean = false
  ) => {
    const result = calculateEloChange(playerElo, opponentElo, playerWon, isDraw, isNewPlayer);
    
    const eloField = isFreeMatch ? 'elo_free' : 'elo_rating';
    
    const { error } = await supabase
      .from('profiles')
      .update({ [eloField]: result.newPlayerElo })
      .eq('id', profileId);
    
    if (error) {
      console.error('Failed to update ELO:', error);
    }
    
    return result;
  }, []);

  // Find matches within ELO range
  const findMatchesWithinEloRange = useCallback(async (
    profileId: string,
    playerElo: number,
    searchTimeSeconds: number,
    grade: number, // 0 for free match
    limit: number = 10
  ): Promise<MatchablePlayer[]> => {
    const eloRange = calculateEloRange(searchTimeSeconds);
    const minElo = playerElo - eloRange;
    const maxElo = playerElo + eloRange;
    const eloField = grade === 0 ? 'elo_free' : 'elo_rating';
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    // Get waiting matches with players in ELO range
    const { data: waitingMatches, error } = await supabase
      .from('ranked_matches')
      .select(`
        id,
        player1_id,
        created_at,
        player1:profiles!ranked_matches_player1_id_fkey(
          id,
          username,
          level,
          grade,
          rank_tier,
          rank_stars,
          wins,
          losses,
          free_match_wins,
          free_match_losses,
          elo_rating,
          elo_free,
          avatar_url
        )
      `)
      .eq('status', 'waiting')
      .eq('grade', grade)
      .neq('player1_id', profileId)
      .is('player2_id', null)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: true })
      .limit(limit * 2); // Get more to filter by ELO

    if (error || !waitingMatches) {
      console.error('Error finding matches:', error);
      return [];
    }

    // Filter by ELO range and sort by ELO proximity
    const matchesInRange = waitingMatches
      .filter((m) => {
        const opponentElo = grade === 0 ? m.player1?.elo_free : m.player1?.elo_rating;
        return opponentElo !== undefined && opponentElo >= minElo && opponentElo <= maxElo;
      })
      .map((m) => ({
        matchId: m.id,
        id: m.player1?.id,
        username: m.player1?.username,
        level: m.player1?.level,
        grade: m.player1?.grade,
        rank_tier: m.player1?.rank_tier,
        rank_stars: m.player1?.rank_stars,
        wins: m.player1?.wins,
        losses: m.player1?.losses,
        free_match_wins: m.player1?.free_match_wins,
        free_match_losses: m.player1?.free_match_losses,
        elo: grade === 0 ? m.player1?.elo_free : m.player1?.elo_rating,
        elo_rating: m.player1?.elo_rating,
        elo_free: m.player1?.elo_free,
        avatar_url: m.player1?.avatar_url,
        eloDiff: Math.abs((grade === 0 ? m.player1?.elo_free : m.player1?.elo_rating) - playerElo),
      }))
      .sort((a, b) => a.eloDiff - b.eloDiff) // Sort by closest ELO first
      .slice(0, limit);

    return matchesInRange;
  }, []);

  // Get current win streak for a player
  const getWinStreak = useCallback(async (profileId: string, isFreeMatch: boolean): Promise<number> => {
    // Get recent matches to calculate current streak
    const { data: recentMatches, error } = await supabase
      .from('ranked_matches')
      .select('winner_id, player1_id, player2_id')
      .eq('grade', isFreeMatch ? 0 : 7) // Adjust for actual grade
      .or(`player1_id.eq.${profileId},player2_id.eq.${profileId}`)
      .eq('status', 'finished')
      .order('ended_at', { ascending: false })
      .limit(10);

    if (error || !recentMatches) return 0;

    let streak = 0;
    for (const match of recentMatches) {
      if (match.winner_id === profileId) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, []);

  return {
    calculateExpectedScore,
    calculateEloChange,
    calculateEloRange,
    getStreakBonus,
    updateEloAfterMatch,
    findMatchesWithinEloRange,
    getWinStreak,
  };
};

export default useEloSystem;
