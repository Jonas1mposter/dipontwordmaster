import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// deno-lint-ignore no-explicit-any
async function generateBatch(
  supabase: any,
  words: Array<{ id: string; word: string; meaning: string }>,
  LOVABLE_API_KEY: string
): Promise<number> {
  const wordList = words.map(w => `- ${w.word} (${w.meaning})`).join("\n");
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are an English teacher creating example sentences for vocabulary learning. 
For each word, create ONE simple, clear example sentence that demonstrates the word's meaning.
The sentence should be appropriate for middle/high school students learning English.
Format your response as JSON array with objects containing "word" and "example" fields.
Keep sentences concise (under 15 words) and easy to understand.
Do not include any markdown formatting, just pure JSON.`
        },
        {
          role: "user",
          content: `Generate example sentences for these words:\n${wordList}\n\nRespond with a JSON array like: [{"word": "example", "example": "This is an example sentence."}]`
        }
      ],
    }),
  });

  if (!response.ok) {
    console.error(`AI gateway error: ${response.status}`);
    return 0;
  }

  const aiData = await response.json();
  const content = aiData.choices?.[0]?.message?.content || "";

  let examples: Array<{ word: string; example: string }> = [];
  try {
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.slice(7);
    }
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith("```")) {
      cleanContent = cleanContent.slice(0, -3);
    }
    examples = JSON.parse(cleanContent.trim());
  } catch (parseError) {
    console.error("Failed to parse AI response:", parseError);
    return 0;
  }

  let updatedCount = 0;
  for (const ex of examples) {
    const wordRecord = words.find(
      w => w.word.toLowerCase() === ex.word.toLowerCase()
    );
    if (wordRecord && ex.example) {
      const { error: updateError } = await supabase
        .from("words")
        .update({ example: ex.example })
        .eq("id", wordRecord.id);

      if (!updateError) {
        updatedCount++;
        console.log(`Updated: ${ex.word} -> ${ex.example}`);
      }
    }
  }

  return updatedCount;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { batchSize = 20, grade, generateAll = false } = await req.json();

    if (generateAll) {
      let countQuery = supabase
        .from("words")
        .select("id", { count: "exact", head: true })
        .is("example", null);
      
      if (grade) {
        countQuery = countQuery.eq("grade", grade);
      }

      const { count: totalCount } = await countQuery;

      if (!totalCount || totalCount === 0) {
        return new Response(
          JSON.stringify({ message: "所有单词都已有例句!", updated: 0, total: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Starting batch generation for ${totalCount} words`);

      const backgroundTask = async () => {
        let totalUpdated = 0;
        const batchSizePerRequest = 20;

        while (true) {
          let query = supabase
            .from("words")
            .select("id, word, meaning")
            .is("example", null)
            .limit(batchSizePerRequest);

          if (grade) {
            query = query.eq("grade", grade);
          }

          const { data: words, error: fetchError } = await query;

          if (fetchError || !words || words.length === 0) {
            console.log(`Batch generation complete. Total updated: ${totalUpdated}`);
            break;
          }

          console.log(`Processing batch: ${words.length} words (total updated so far: ${totalUpdated})`);

          const batchUpdated = await generateBatch(supabase, words, LOVABLE_API_KEY);
          totalUpdated += batchUpdated;

          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`All batches complete. Total updated: ${totalUpdated}`);
      };

      EdgeRuntime.waitUntil(backgroundTask());

      return new Response(
        JSON.stringify({ 
          message: `正在后台生成 ${totalCount} 个单词的例句，请稍后刷新查看进度`,
          started: true,
          total: totalCount
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let query = supabase
      .from("words")
      .select("id, word, meaning")
      .is("example", null)
      .limit(batchSize);

    if (grade) {
      query = query.eq("grade", grade);
    }

    const { data: words, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch words: ${fetchError.message}`);
    }

    if (!words || words.length === 0) {
      return new Response(
        JSON.stringify({ message: "No words without examples found", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating examples for ${words.length} words`);

    const updatedCount = await generateBatch(supabase, words, LOVABLE_API_KEY);

    return new Response(
      JSON.stringify({ 
        message: `Generated examples for ${updatedCount} words`,
        updated: updatedCount,
        total: words.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-examples function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
