import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Profile {
  id: string;
  user_id: string;
  username: string;
  level: number;
  xp: number;
  xp_to_next_level: number;
  coins: number;
  wins: number;
  losses: number;
  streak: number;
  grade: number;
  rank_tier: string;
}

interface NameCardCondition {
  id: string;
  name: string;
  check: (stats: UserStats) => boolean;
}

interface UserStats {
  totalXp: number;
  level: number;
  wins: number;
  wordsLearned: number;
  levelsCompleted: number;
  totalLevels: number;
  winStreak: number;
  coins: number;
}

// 名片ID和解锁条件映射
const NAME_CARD_CONDITIONS: NameCardCondition[] = [
  {
    id: "7ab34dd5-7ba8-404e-aa40-05b34b28688e", // 学霸新星
    name: "学霸新星",
    check: (stats) => stats.totalXp >= 1000,
  },
  {
    id: "98289d44-8a14-46e3-9034-620864125418", // 连胜达人
    name: "连胜达人",
    check: (stats) => stats.winStreak >= 5,
  },
  {
    id: "f0a3b7c9-e21b-45cc-9cf8-b2b8afb4b4a7", // 词汇大师
    name: "词汇大师",
    check: (stats) => stats.wordsLearned >= 500,
  },
  {
    id: "b6a219c7-41a3-4de5-b251-4030bb38a49e", // 满级勇士
    name: "满级勇士",
    check: (stats) => stats.level >= 50,
  },
  {
    id: "3ce5b0f9-a460-457e-b748-02cabf75f2d9", // 百战老兵
    name: "百战老兵",
    check: (stats) => stats.wins >= 100,
  },
  {
    id: "d8bb7eea-cb74-4837-8d79-839170da8ea1", // 闯关先锋
    name: "闯关先锋",
    check: (stats) => stats.totalLevels > 0 && stats.levelsCompleted >= stats.totalLevels,
  },
];

export const checkAndAwardNameCards = async (profile: Profile | null) => {
  if (!profile) return;

  try {
    // 获取用户完整信息（包括 total_xp）
    const { data: fullProfile } = await supabase
      .from("profiles")
      .select("total_xp")
      .eq("id", profile.id)
      .single();

    const totalXp = fullProfile?.total_xp || 0;

    // 获取用户已拥有的名片
    const { data: ownedCards } = await supabase
      .from("user_name_cards")
      .select("name_card_id")
      .eq("profile_id", profile.id);

    const ownedCardIds = new Set(ownedCards?.map((c) => c.name_card_id) || []);

    // 获取用户学习进度统计
    const { data: learningProgress } = await supabase
      .from("learning_progress")
      .select("id, mastery_level")
      .eq("profile_id", profile.id);

    const wordsLearned = learningProgress?.filter((p) => p.mastery_level >= 1).length || 0;

    // 获取关卡完成情况
    const { data: levelProgress } = await supabase
      .from("level_progress")
      .select("id, status")
      .eq("profile_id", profile.id)
      .eq("status", "completed");

    const levelsCompleted = levelProgress?.length || 0;

    // 获取总关卡数
    const { count: totalLevels } = await supabase
      .from("levels")
      .select("id", { count: "exact", head: true })
      .eq("grade", profile.grade);

    // 计算连胜（从最近的比赛中计算）
    const { data: recentMatches } = await supabase
      .from("ranked_matches")
      .select("winner_id")
      .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`)
      .eq("status", "completed")
      .order("ended_at", { ascending: false })
      .limit(20);

    let winStreak = 0;
    if (recentMatches) {
      for (const match of recentMatches) {
        if (match.winner_id === profile.id) {
          winStreak++;
        } else {
          break;
        }
      }
    }

    // 构建用户统计
    const userStats: UserStats = {
      totalXp: totalXp,
      level: profile.level || 1,
      wins: profile.wins || 0,
      wordsLearned,
      levelsCompleted,
      totalLevels: totalLevels || 0,
      winStreak,
      coins: profile.coins || 0,
    };

    // 检查并发放名片
    const newCards: string[] = [];

    for (const condition of NAME_CARD_CONDITIONS) {
      if (!ownedCardIds.has(condition.id) && condition.check(userStats)) {
        // 发放名片
        const { error } = await supabase.from("user_name_cards").insert({
          profile_id: profile.id,
          name_card_id: condition.id,
        });

        if (!error) {
          newCards.push(condition.name);
        }
      }
    }

    // 显示获得新名片的提示
    for (const cardName of newCards) {
      toast.success(`🎴 获得新名片: ${cardName}`, {
        description: "快去个人资料页面查看吧！",
        duration: 5000,
      });
    }

    return newCards;
  } catch (error) {
    console.error("Error checking name cards:", error);
    return [];
  }
};

export const useNameCardChecker = (profile: Profile | null) => {
  const checkNameCards = useCallback(() => {
    return checkAndAwardNameCards(profile);
  }, [profile]);

  return checkNameCards;
};
