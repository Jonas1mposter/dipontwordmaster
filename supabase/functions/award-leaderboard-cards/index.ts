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

    console.log("Starting leaderboard name card award process...");

    // Get name cards
    const { data: nameCards, error: ncError } = await supabase
      .from("name_cards")
      .select("id, name, category");

    if (ncError) {
      console.error("Error fetching name cards:", ncError);
      throw ncError;
    }

    const coinsCard = nameCards?.find(c => c.category === "leaderboard_coins");
    const winsCard = nameCards?.find(c => c.category === "leaderboard_wins");
    const xpCard = nameCards?.find(c => c.category === "leaderboard_xp");

    console.log("Found cards:", { coinsCard: coinsCard?.name, winsCard: winsCard?.name, xpCard: xpCard?.name });

    // Get all grades
    const grades = [7, 8];
    let totalAwarded = 0;

    for (const grade of grades) {
      console.log(`Processing grade ${grade}...`);

      // Top 10 by coins
      if (coinsCard) {
        const { data: topCoins } = await supabase
          .from("profiles")
          .select("id, username")
          .eq("grade", grade)
          .order("coins", { ascending: false })
          .limit(10);

        if (topCoins) {
          for (let i = 0; i < topCoins.length; i++) {
            const profile = topCoins[i];
            const { error: upsertError } = await supabase
              .from("user_name_cards")
              .upsert({
                profile_id: profile.id,
                name_card_id: coinsCard.id,
                rank_position: i + 1,
                is_equipped: false,
              }, {
                onConflict: "profile_id,name_card_id",
              });

            if (!upsertError) {
              totalAwarded++;
              console.log(`Awarded ${coinsCard.name} #${i + 1} to ${profile.username}`);
            }
          }
        }
      }

      // Top 10 by wins
      if (winsCard) {
        const { data: topWins } = await supabase
          .from("profiles")
          .select("id, username")
          .eq("grade", grade)
          .order("wins", { ascending: false })
          .limit(10);

        if (topWins) {
          for (let i = 0; i < topWins.length; i++) {
            const profile = topWins[i];
            const { error: upsertError } = await supabase
              .from("user_name_cards")
              .upsert({
                profile_id: profile.id,
                name_card_id: winsCard.id,
                rank_position: i + 1,
                is_equipped: false,
              }, {
                onConflict: "profile_id,name_card_id",
              });

            if (!upsertError) {
              totalAwarded++;
              console.log(`Awarded ${winsCard.name} #${i + 1} to ${profile.username}`);
            }
          }
        }
      }

      // Top 10 by XP
      if (xpCard) {
        const { data: topXp } = await supabase
          .from("profiles")
          .select("id, username")
          .eq("grade", grade)
          .order("xp", { ascending: false })
          .limit(10);

        if (topXp) {
          for (let i = 0; i < topXp.length; i++) {
            const profile = topXp[i];
            const { error: upsertError } = await supabase
              .from("user_name_cards")
              .upsert({
                profile_id: profile.id,
                name_card_id: xpCard.id,
                rank_position: i + 1,
                is_equipped: false,
              }, {
                onConflict: "profile_id,name_card_id",
              });

            if (!upsertError) {
              totalAwarded++;
              console.log(`Awarded ${xpCard.name} #${i + 1} to ${profile.username}`);
            }
          }
        }
      }
    }

    console.log(`Total cards awarded/updated: ${totalAwarded}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Awarded ${totalAwarded} name cards to leaderboard top 10 users` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in award-leaderboard-cards:", error);
    return new Response(
      JSON.stringify({ error: errMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
