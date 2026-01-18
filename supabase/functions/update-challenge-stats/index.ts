import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting challenge stats update...");

    // Get active seasons
    const { data: seasons, error: seasonError } = await supabase
      .from("seasons")
      .select("*")
      .eq("is_active", true);

    if (seasonError) {
      console.error("Error fetching seasons:", seasonError);
      throw seasonError;
    }

    if (!seasons || seasons.length === 0) {
      console.log("No active seasons found");
      return new Response(
        JSON.stringify({ success: true, message: "No active seasons" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalUpdated = 0;

    for (const season of seasons) {
      console.log(`Processing season: ${season.name} for grade ${season.grade}`);

      // Get all profiles for this grade with their learning progress
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select(`
          id, 
          username, 
          class, 
          grade, 
          xp,
          level
        `)
        .eq("grade", season.grade);

      if (profileError) {
        console.error("Error fetching profiles:", profileError);
        continue;
      }

      // Get English learning progress
      const { data: learningProgress } = await supabase
        .from("learning_progress")
        .select("profile_id, correct_count, incorrect_count");

      // Get Math learning progress
      const { data: mathLearningProgress } = await supabase
        .from("math_learning_progress")
        .select("profile_id, correct_count, incorrect_count");

      // Get Science learning progress
      const { data: scienceLearningProgress } = await supabase
        .from("science_learning_progress")
        .select("profile_id, correct_count, incorrect_count");

      // Get level progress for completed levels
      const { data: levelProgress } = await supabase
        .from("level_progress")
        .select("profile_id, status")
        .eq("status", "completed");

      // Create maps for quick lookup - combining all three subjects
      const learningMap = new Map<string, { correct: number; total: number }>();
      
      // Process English learning progress
      learningProgress?.forEach((lp) => {
        const existing = learningMap.get(lp.profile_id) || { correct: 0, total: 0 };
        learningMap.set(lp.profile_id, {
          correct: existing.correct + (lp.correct_count || 0),
          total: existing.total + (lp.correct_count || 0) + (lp.incorrect_count || 0),
        });
      });

      // Process Math learning progress
      mathLearningProgress?.forEach((lp) => {
        const existing = learningMap.get(lp.profile_id) || { correct: 0, total: 0 };
        learningMap.set(lp.profile_id, {
          correct: existing.correct + (lp.correct_count || 0),
          total: existing.total + (lp.correct_count || 0) + (lp.incorrect_count || 0),
        });
      });

      // Process Science learning progress
      scienceLearningProgress?.forEach((lp) => {
        const existing = learningMap.get(lp.profile_id) || { correct: 0, total: 0 };
        learningMap.set(lp.profile_id, {
          correct: existing.correct + (lp.correct_count || 0),
          total: existing.total + (lp.correct_count || 0) + (lp.incorrect_count || 0),
        });
      });

      // Count completed levels per user (for English vocab levels)
      const levelMap = new Map<string, number>();
      levelProgress?.forEach((lp) => {
        levelMap.set(lp.profile_id, (levelMap.get(lp.profile_id) || 0) + 1);
      });

      // Count math words mastered (mastery_level >= 1) as "levels"
      const { data: mathMastered } = await supabase
        .from("math_learning_progress")
        .select("profile_id")
        .gte("mastery_level", 1);

      const mathMasteredMap = new Map<string, number>();
      mathMastered?.forEach((m) => {
        mathMasteredMap.set(m.profile_id, (mathMasteredMap.get(m.profile_id) || 0) + 1);
      });

      // Count science words mastered (mastery_level >= 1) as "levels"
      const { data: scienceMastered } = await supabase
        .from("science_learning_progress")
        .select("profile_id")
        .gte("mastery_level", 1);

      const scienceMasteredMap = new Map<string, number>();
      scienceMastered?.forEach((m) => {
        scienceMasteredMap.set(m.profile_id, (scienceMasteredMap.get(m.profile_id) || 0) + 1);
      });

      // Aggregate by class
      const classStats = new Map<string, {
        total_xp: number;
        total_correct: number;
        total_answered: number;
        total_levels_completed: number;
        member_count: number;
      }>();

      // Aggregate for grade
      let gradeStats = {
        total_xp: 0,
        total_correct: 0,
        total_answered: 0,
        total_levels_completed: 0,
        member_count: 0,
      };

      profiles?.forEach((profile) => {
        const learning = learningMap.get(profile.id) || { correct: 0, total: 0 };
        const englishLevelsCompleted = levelMap.get(profile.id) || 0;
        // Count 10 mastered words as 1 "level" for math and science
        const mathLevelsCompleted = Math.floor((mathMasteredMap.get(profile.id) || 0) / 10);
        const scienceLevelsCompleted = Math.floor((scienceMasteredMap.get(profile.id) || 0) / 10);
        const totalLevelsCompleted = englishLevelsCompleted + mathLevelsCompleted + scienceLevelsCompleted;

        // Update grade stats
        gradeStats.total_xp += profile.xp || 0;
        gradeStats.total_correct += learning.correct;
        gradeStats.total_answered += learning.total;
        gradeStats.total_levels_completed += totalLevelsCompleted;
        gradeStats.member_count++;

        // Update class stats if profile has a class
        if (profile.class) {
          const existing = classStats.get(profile.class) || {
            total_xp: 0,
            total_correct: 0,
            total_answered: 0,
            total_levels_completed: 0,
            member_count: 0,
          };

          classStats.set(profile.class, {
            total_xp: existing.total_xp + (profile.xp || 0),
            total_correct: existing.total_correct + learning.correct,
            total_answered: existing.total_answered + learning.total,
            total_levels_completed: existing.total_levels_completed + totalLevelsCompleted,
            member_count: existing.member_count + 1,
          });
        }
      });

      // Calculate composite scores and update class challenges
      const classEntries = Array.from(classStats.entries()).map(([className, stats]) => {
        const accuracy = stats.total_answered > 0 
          ? (stats.total_correct / stats.total_answered) * 100 
          : 0;
        
        // Composite score formula:
        // XP contributes 40%, Accuracy 30%, Levels completed 30%
        // Normalized per member to be fair across different class sizes
        const avgXp = stats.member_count > 0 ? stats.total_xp / stats.member_count : 0;
        const avgLevels = stats.member_count > 0 ? stats.total_levels_completed / stats.member_count : 0;
        
        const composite_score = (avgXp / 100) * 0.4 + accuracy * 0.3 + (avgLevels * 10) * 0.3;

        return {
          class_name: className,
          ...stats,
          composite_score,
        };
      });

      // Sort by composite score and assign ranks
      classEntries.sort((a, b) => b.composite_score - a.composite_score);
      classEntries.forEach((entry, index) => {
        (entry as any).rank_position = index + 1;
      });

      // Upsert class challenges
      for (const entry of classEntries) {
        const { error: upsertError } = await supabase
          .from("class_challenges")
          .upsert({
            season_id: season.id,
            grade: season.grade,
            class_name: entry.class_name,
            total_xp: entry.total_xp,
            total_correct: entry.total_correct,
            total_answered: entry.total_answered,
            total_levels_completed: entry.total_levels_completed,
            member_count: entry.member_count,
            composite_score: entry.composite_score,
            rank_position: (entry as any).rank_position,
          }, {
            onConflict: "season_id,grade,class_name",
          });

        if (!upsertError) {
          totalUpdated++;
        } else {
          console.error("Error upserting class challenge:", upsertError);
        }
      }

      // Update grade challenge
      const gradeAccuracy = gradeStats.total_answered > 0 
        ? (gradeStats.total_correct / gradeStats.total_answered) * 100 
        : 0;
      
      const avgGradeXp = gradeStats.member_count > 0 ? gradeStats.total_xp / gradeStats.member_count : 0;
      const avgGradeLevels = gradeStats.member_count > 0 ? gradeStats.total_levels_completed / gradeStats.member_count : 0;
      
      const gradeCompositeScore = (avgGradeXp / 100) * 0.4 + gradeAccuracy * 0.3 + (avgGradeLevels * 10) * 0.3;

      const { error: gradeUpsertError } = await supabase
        .from("grade_challenges")
        .upsert({
          season_id: season.id,
          grade: season.grade,
          total_xp: gradeStats.total_xp,
          total_correct: gradeStats.total_correct,
          total_answered: gradeStats.total_answered,
          total_levels_completed: gradeStats.total_levels_completed,
          member_count: gradeStats.member_count,
          composite_score: gradeCompositeScore,
        }, {
          onConflict: "season_id,grade",
        });

      if (gradeUpsertError) {
        console.error("Error upserting grade challenge:", gradeUpsertError);
      } else {
        totalUpdated++;
      }
    }

    // Update grade rankings across all grades
    const { data: allGradeChallenges } = await supabase
      .from("grade_challenges")
      .select("id, composite_score")
      .order("composite_score", { ascending: false });

    if (allGradeChallenges) {
      for (let i = 0; i < allGradeChallenges.length; i++) {
        await supabase
          .from("grade_challenges")
          .update({ rank_position: i + 1 })
          .eq("id", allGradeChallenges[i].id);
      }
    }

    console.log(`Total updated: ${totalUpdated}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${totalUpdated} challenge stats (including English, Math, and Science vocabulary)` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in update-challenge-stats:", error);
    return new Response(
      JSON.stringify({ error: errMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
