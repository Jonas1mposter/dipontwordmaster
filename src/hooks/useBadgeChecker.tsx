import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface BadgeCondition {
  badgeId: string;
  name: string;
  check: (data: UserStats) => boolean;
}

interface UserStats {
  wordsLearned: number;
  totalWins: number;
  totalLosses: number;
  winStreak: number;
  streak: number;
  coins: number;
  rankTier: string;
  perfectMatches: number;
}

// Badge IDs from database
const BADGE_CONDITIONS: BadgeCondition[] = [
  // Learning badges
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
    badgeId: "7b265e93-0ffb-48f1-a74a-3b312d1ef5bd", // 连胜新星 (duplicate)
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
    check: (data) => data.streak >= 7,
  },
  {
    badgeId: "507474af-c4ba-4e0d-97e7-be80324c65b1", // 学霸之路
    name: "学霸之路",
    check: (data) => data.streak >= 30,
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

export const useBadgeChecker = () => {
  const { profile } = useAuth();

  const checkAndAwardBadges = useCallback(async () => {
    if (!profile) return;

    try {
      // Fetch user stats
      const [
        { data: learningProgress },
        { data: userBadges },
        { data: rankedMatches },
      ] = await Promise.all([
        supabase
          .from("learning_progress")
          .select("id")
          .eq("profile_id", profile.id),
        supabase
          .from("user_badges")
          .select("badge_id")
          .eq("profile_id", profile.id),
        supabase
          .from("ranked_matches")
          .select("winner_id, player1_id, player2_id, player1_score, player2_score")
          .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`)
          .eq("status", "completed"),
      ]);

      const earnedBadgeIds = userBadges?.map((ub) => ub.badge_id) || [];
      const wordsLearned = learningProgress?.length || 0;

      // Calculate battle stats
      let totalWins = 0;
      let perfectMatches = 0;
      
      rankedMatches?.forEach((match) => {
        if (match.winner_id === profile.id) {
          totalWins++;
          // Check if it was a perfect match (opponent scored 0)
          if (match.player1_id === profile.id && match.player2_score === 0) {
            perfectMatches++;
          } else if (match.player2_id === profile.id && match.player1_score === 0) {
            perfectMatches++;
          }
        }
      });

      // Calculate win streak from profile
      const winStreak = profile.streak || 0;

      const userStats: UserStats = {
        wordsLearned,
        totalWins: profile.wins || 0,
        totalLosses: profile.losses || 0,
        winStreak,
        streak: profile.streak || 0,
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
  }, [profile]);

  useEffect(() => {
    if (profile) {
      checkAndAwardBadges();
    }
  }, [profile, checkAndAwardBadges]);

  return { checkAndAwardBadges };
};
