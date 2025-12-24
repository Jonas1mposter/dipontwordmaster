import { supabase } from "@/integrations/supabase/client";

interface LevelUpResult {
  newLevel: number;
  newXp: number;
  newXpToNextLevel: number;
  leveledUp: boolean;
  levelsGained: number;
}

/**
 * Calculate XP needed for a specific level
 * Formula: 100 * level (Level 1 needs 100, Level 2 needs 200, etc.)
 */
export const getXpForLevel = (level: number): number => {
  return 100 * level;
};

/**
 * Process level up logic when XP is gained
 * Returns the new level, remaining XP, and XP needed for next level
 */
export const processLevelUp = (
  currentLevel: number,
  currentXp: number,
  xpToNextLevel: number,
  xpGained: number
): LevelUpResult => {
  let newXp = currentXp + xpGained;
  let newLevel = currentLevel;
  let newXpToNextLevel = xpToNextLevel;
  let levelsGained = 0;

  // Check for level ups (can level up multiple times)
  while (newXp >= newXpToNextLevel) {
    newXp -= newXpToNextLevel;
    newLevel += 1;
    levelsGained += 1;
    newXpToNextLevel = getXpForLevel(newLevel);
  }

  return {
    newLevel,
    newXp,
    newXpToNextLevel,
    leveledUp: levelsGained > 0,
    levelsGained,
  };
};

/**
 * Update profile with new XP and handle level up
 */
export const updateProfileWithXp = async (
  profileId: string,
  currentLevel: number,
  currentXp: number,
  xpToNextLevel: number,
  xpGained: number,
  additionalUpdates?: Record<string, any>
): Promise<LevelUpResult> => {
  const result = processLevelUp(currentLevel, currentXp, xpToNextLevel, xpGained);

  // First get current total_xp to add to it
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("total_xp")
    .eq("id", profileId)
    .maybeSingle();

  const currentTotalXp = (currentProfile?.total_xp as number) || 0;

  const updates: Record<string, any> = {
    xp: result.newXp,
    level: result.newLevel,
    xp_to_next_level: result.newXpToNextLevel,
    total_xp: currentTotalXp + xpGained,
    ...additionalUpdates,
  };

  await supabase
    .from("profiles")
    .update(updates)
    .eq("id", profileId);

  return result;
};
