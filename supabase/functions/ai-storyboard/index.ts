import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, style, sceneCount } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a professional film director and storyboard artist for ALFA STUDIOX AI Production Studio. Create a detailed storyboard from the user's prompt. Style: ${style || "cinematic"}.`,
          },
          {
            role: "user",
            content: `Create a storyboard with ${sceneCount || 5} scenes for: "${prompt}"`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_storyboard",
              description: "Create a film storyboard with scenes",
              parameters: {
                type: "object",
                properties: {
                  storyboard: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      style: { type: "string" },
                      scenes: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            index: { type: "number" },
                            description: { type: "string", description: "Scene narrative description" },
                            imagePrompt: { type: "string", description: "Detailed image generation prompt for this scene" },
                            duration: { type: "number", description: "Duration in seconds (3-8)" },
                            transition: { type: "string", enum: ["fade", "slide", "zoom", "glitch", "blur"] },
                            subtitle: { type: "string", description: "Optional on-screen text" },
                          },
                          required: ["index", "description", "imagePrompt", "duration", "transition"],
                        },
                      },
                    },
                    required: ["title", "style", "scenes"],
                  },
                },
                required: ["storyboard"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_storyboard" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Zbyt wiele zapytań, spróbuj za chwilę" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Brak kredytów AI" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("No storyboard generated");
  } catch (e) {
    console.error("ai-storyboard error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
