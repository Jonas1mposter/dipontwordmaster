import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BadgeCondition {
  badgeId: string;
  name: string;
  check: (data: UserStats) => boolean;
}

interface UserStats {
  wordsLearned: number;
  mathWordsLearned: number;
  scienceWordsLearned: number;
  biologyWordsLearned: number;
  chemistryWordsLearned: number;
  physicsWordsLearned: number;
  totalMathWords: number;
  totalScienceWords: number;
  totalBiologyWords: number;
  totalChemistryWords: number;
  totalPhysicsWords: number;
  totalWins: number;
  totalLosses: number;
  winStreak: number;
  dailyStreak: number;
  coins: number;
  rankTier: string;
  perfectMatches: number;
}

interface Profile {
  id: string;
  wins?: number;
  losses?: number;
  streak?: number;
  coins?: number;
  rank_tier?: string;
}

// Badge IDs from database
const BADGE_CONDITIONS: BadgeCondition[] = [
  // Learning badges (English)
  {
    badgeId: "86f05eb3-51f4-484d-a5d0-50995795ccec", // 初出茅庐
    name: "初出茅庐",
    check: (data) => data.wordsLearned >= 1,
  },
  {
    badgeId: "3a897781-1336-4bd0-9088-3d4d3ab2cda7", // 词汇新秀
    name: "词汇新秀",
    check: (data) => data.wordsLearned >= 100,
  },
  {
    badgeId: "5d80bae0-ac4f-4653-a696-86e2bc92e4cf", // 词海探险家
    name: "词海探险家",
    check: (data) => data.wordsLearned >= 500,
  },
  {
    badgeId: "d0bee7bc-2d84-47a8-a98e-dc0ffcc83d94", // 单词大师
    name: "单词大师",
    check: (data) => data.wordsLearned >= 1000,
  },
  {
    badgeId: "2c2444e9-2ce1-4093-b9a5-f4ad64c0c101", // 学海无涯
    name: "学海无涯",
    check: (data) => data.wordsLearned >= 100,
  },

  // Math Vocabulary badges
  {
    badgeId: "504d6eda-4b66-4da0-bd14-2d16981286af", // 数学启蒙
    name: "数学启蒙",
    check: (data) => data.mathWordsLearned >= 1,
  },
  {
    badgeId: "34d705c8-f92a-4bdd-9a11-16e38a4bc321", // 数学新手
    name: "数学新手",
    check: (data) => data.mathWordsLearned >= 50,
  },
  {
    badgeId: "65479192-5953-4d42-9045-9139ccada4d7", // 数学达人
    name: "数学达人",
    check: (data) => data.mathWordsLearned >= 100,
  },
  {
    badgeId: "f46ceedc-400f-46e3-b00f-314249bb1361", // 数学大师
    name: "数学大师",
    check: (data) => data.totalMathWords > 0 && data.mathWordsLearned >= data.totalMathWords,
  },

  // Science Vocabulary badges
  {
    badgeId: "55d48c0c-3a7c-4561-bc5c-360f162a2a0a", // 科学启蒙
    name: "科学启蒙",
    check: (data) => data.scienceWordsLearned >= 1,
  },
  {
    badgeId: "761682ca-b864-40da-be62-2938d7d8ed14", // 科学新手
    name: "科学新手",
    check: (data) => data.scienceWordsLearned >= 100,
  },
  {
    badgeId: "1ab104fb-c7eb-47e2-9f7e-fb926957aa26", // 科学探索者
    name: "科学探索者",
    check: (data) => data.scienceWordsLearned >= 300,
  },
  {
    badgeId: "c6910711-a338-4cb0-a9cf-665bfa7c75ca", // 科学先锋
    name: "科学先锋",
    check: (data) => data.scienceWordsLearned >= 500,
  },
  {
    badgeId: "173eecc0-f8c3-41ec-971f-7f361d3c9603", // 科学大师
    name: "科学大师",
    check: (data) => data.totalScienceWords > 0 && data.scienceWordsLearned >= data.totalScienceWords,
  },

  // Subject-specific Science badges
  {
    badgeId: "6dda4dc7-55e7-415b-a56a-968cfcc3dde5", // 生物学家
    name: "生物学家",
    check: (data) => data.totalBiologyWords > 0 && data.biologyWordsLearned >= data.totalBiologyWords,
  },
  {
    badgeId: "48407767-b517-4b12-b2c4-a5bbe8cc3632", // 化学家
    name: "化学家",
    check: (data) => data.totalChemistryWords > 0 && data.chemistryWordsLearned >= data.totalChemistryWords,
  },
  {
    badgeId: "14025371-1ede-4da2-8f93-af7316c5733d", // 物理学家
    name: "物理学家",
    check: (data) => data.totalPhysicsWords > 0 && data.physicsWordsLearned >= data.totalPhysicsWords,
  },

  // Battle badges
  {
    badgeId: "4e992412-e0cd-47df-aa01-0a510f22dd37", // 首战告捷
    name: "首战告捷",
    check: (data) => data.totalWins >= 1,
  },
  {
    badgeId: "ae36482b-df96-4f8e-a8d7-0fce63fa7b2b", // 连胜新星
    name: "连胜新星",
    check: (data) => data.winStreak >= 3,
  },
  {
    badgeId: "a1b6a78a-c48d-48d9-84a8-6db154e1ffd0", // 不败战神
    name: "不败战神",
    check: (data) => data.winStreak >= 10,
  },
  {
    badgeId: "d715eec8-1f6c-43c0-8302-c6565a7bf6ae", // 完美主义者
    name: "完美主义者",
    check: (data) => data.perfectMatches >= 1,
  },

  // Streak badges
  {
    badgeId: "0d1e512e-2a69-407a-b4fa-e3f8cfc6998d", // 坚持不懈
    name: "坚持不懈",
    check: (data) => data.dailyStreak >= 7,
  },
  {
    badgeId: "507474af-c4ba-4e0d-97e7-be80324c65b1", // 学霸之路
    name: "学霸之路",
    check: (data) => data.dailyStreak >= 30,
  },

  // Wealth badges
  {
    badgeId: "1f96d78a-ffcd-445d-8241-bd793077f877", // 财富新贵
    name: "财富新贵",
    check: (data) => data.coins >= 1000,
  },

  // Rank badges
  {
    badgeId: "e0f0195a-b4c6-4b25-a87a-84db464b9c8c", // 王者荣耀
    name: "王者荣耀",
    check: (data) => data.rankTier === "diamond" || data.rankTier === "champion",
  },
];

// Special badge IDs
const HIDDEN_BADGE_ID = "c0a9a2c2-f89d-46b6-8583-c7a785637d8e"; // 成就收割机
const BETA_BADGE_ID = "281f5f7e-e0d3-402f-92f5-58ed15207a40"; // 内测先驱

export const checkAndAwardBadges = async (profile: Profile | null) => {
  if (!profile) return;

  try {
    // Fetch user stats and all badges
    const [
      { data: learningProgress },
      { data: mathLearningProgress },
      { data: scienceLearningProgress },
      { data: userBadges },
      { data: rankedMatches },
      { data: allBadges },
      { count: totalMathWordsCount },
      { count: totalScienceWordsCount },
      { count: biologyWordsCount },
      { count: chemistryWordsCount },
      { count: physicsWordsCount },
    ] = await Promise.all([
      // English learning progress
      supabase
        .from("learning_progress")
        .select("id")
        .eq("profile_id", profile.id),
      // Math learning progress
      supabase
        .from("math_learning_progress")
        .select("id, word_id")
        .eq("profile_id", profile.id)
        .gte("mastery_level", 1),
      // Science learning progress with word details
      supabase
        .from("science_learning_progress")
        .select("id, word_id, science_words(subject)")
        .eq("profile_id", profile.id)
        .gte("mastery_level", 1),
      supabase
        .from("user_badges")
        .select("badge_id")
        .eq("profile_id", profile.id),
      supabase
        .from("ranked_matches")
        .select("winner_id, player1_id, player2_id, player1_score, player2_score, created_at")
        .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`)
        .eq("status", "completed")
        .order("created_at", { ascending: false }),
      supabase
        .from("badges")
        .select("id"),
      // Total word counts
      supabase
        .from("math_words")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("science_words")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("science_words")
        .select("*", { count: "exact", head: true })
        .eq("subject", "Biology"),
      supabase
        .from("science_words")
        .select("*", { count: "exact", head: true })
        .eq("subject", "Chemistry"),
      supabase
        .from("science_words")
        .select("*", { count: "exact", head: true })
        .eq("subject", "Physics"),
    ]);

    const earnedBadgeIds = userBadges?.map((ub) => ub.badge_id) || [];
    const wordsLearned = learningProgress?.length || 0;
    const mathWordsLearned = mathLearningProgress?.length || 0;
    const scienceWordsLearned = scienceLearningProgress?.length || 0;

    // Count science words by subject
    let biologyWordsLearned = 0;
    let chemistryWordsLearned = 0;
    let physicsWordsLearned = 0;

    scienceLearningProgress?.forEach((progress: any) => {
      const subject = progress.science_words?.subject;
      if (subject === "Biology") biologyWordsLearned++;
      else if (subject === "Chemistry") chemistryWordsLearned++;
      else if (subject === "Physics") physicsWordsLearned++;
    });

    // Calculate battle stats including win streak
    let totalWins = 0;
    let perfectMatches = 0;
    let currentWinStreak = 0;
    
    // Matches are already sorted by created_at desc from query
    rankedMatches?.forEach((match, index) => {
      if (match.winner_id === profile.id) {
        totalWins++;
        // Check if it was a perfect match (opponent scored 0)
        if (match.player1_id === profile.id && match.player2_score === 0) {
          perfectMatches++;
        } else if (match.player2_id === profile.id && match.player1_score === 0) {
          perfectMatches++;
        }
        // Calculate current win streak (consecutive wins from most recent)
        if (index === currentWinStreak) {
          currentWinStreak++;
        }
      }
    });

    const userStats: UserStats = {
      wordsLearned,
      mathWordsLearned,
      scienceWordsLearned,
      biologyWordsLearned,
      chemistryWordsLearned,
      physicsWordsLearned,
      totalMathWords: totalMathWordsCount || 0,
      totalScienceWords: totalScienceWordsCount || 0,
      totalBiologyWords: biologyWordsCount || 0,
      totalChemistryWords: chemistryWordsCount || 0,
      totalPhysicsWords: physicsWordsCount || 0,
      totalWins: profile.wins || 0,
      totalLosses: profile.losses || 0,
      winStreak: currentWinStreak,
      dailyStreak: profile.streak || 0,
      coins: profile.coins || 0,
      rankTier: profile.rank_tier || "bronze",
      perfectMatches,
    };

    // Check each badge condition
    const badgesToAward: { id: string; name: string }[] = [];

    for (const condition of BADGE_CONDITIONS) {
      if (!earnedBadgeIds.includes(condition.badgeId) && condition.check(userStats)) {
        badgesToAward.push({ id: condition.badgeId, name: condition.name });
      }
    }

    // Check for hidden "成就收割机" badge
    // Award if user has all badges except 内测先驱 and 成就收割机 itself
    if (!earnedBadgeIds.includes(HIDDEN_BADGE_ID)) {
      const requiredBadges = allBadges?.filter(b => 
        b.id !== HIDDEN_BADGE_ID && b.id !== BETA_BADGE_ID
      ) || [];
      
      const hasAllRequired = requiredBadges.every(b => earnedBadgeIds.includes(b.id));
      
      if (hasAllRequired && requiredBadges.length > 0) {
        badgesToAward.push({ id: HIDDEN_BADGE_ID, name: "成就收割机" });
      }
    }

    // Award new badges
    if (badgesToAward.length > 0) {
      const insertData = badgesToAward.map((badge) => ({
        profile_id: profile.id,
        badge_id: badge.id,
      }));

      const { error } = await supabase.from("user_badges").insert(insertData);

      if (!error) {
        // Show toast for each new badge
        badgesToAward.forEach((badge) => {
          toast.success(`🎉 解锁新成就: ${badge.name}!`, {
            duration: 5000,
          });
        });
      }
    }
  } catch (error) {
    console.error("Error checking badges:", error);
  }
};

export const useBadgeChecker = (profile: Profile | null) => {
  const checkBadges = useCallback(async () => {
    await checkAndAwardBadges(profile);
  }, [profile]);

  return { checkAndAwardBadges: checkBadges };
};
