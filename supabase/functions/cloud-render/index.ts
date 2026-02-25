import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RenderRequest {
  provider: string;
  model: string;
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  steps?: number;
  cfg?: number;
  seed?: number;
  apiKey: string;
}

// ─── OpenAI DALL-E 3 ───────────────────────────────────────────────
async function renderOpenAI(req: RenderRequest): Promise<{ imageUrl: string; revisedPrompt?: string }> {
  const model = req.model.startsWith("dall-e-3") ? "dall-e-3" : "dall-e-2";
  const isHD = req.model === "dall-e-3-hd";

  // DALL-E 3 supports: 1024x1024, 1792x1024, 1024x1792
  let size = "1024x1024";
  if (req.width > req.height && req.width >= 1280) size = "1792x1024";
  else if (req.height > req.width && req.height >= 1280) size = "1024x1792";

  const body: Record<string, unknown> = {
    model,
    prompt: req.prompt,
    n: 1,
    size,
    response_format: "url",
  };

  if (model === "dall-e-3") {
    body.quality = isHD ? "hd" : "standard";
    body.style = "vivid";
  }

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${req.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenAI API error ${res.status}: ${err?.error?.message ?? res.statusText}`);
  }

  const data = await res.json();
  const img = data.data?.[0];
  return {
    imageUrl: img?.url,
    revisedPrompt: img?.revised_prompt,
  };
}

// ─── Google Imagen 3 (via Gemini API) ──────────────────────────────
async function renderGoogleImagen(req: RenderRequest): Promise<{ imageUrl: string }> {
  // Use Gemini's image generation endpoint
  const model = req.model === "imagen-3-fast" ? "imagen-3.0-fast-generate-002" : "imagen-3.0-generate-002";

  const body = {
    instances: [
      {
        prompt: req.prompt,
      },
    ],
    parameters: {
      sampleCount: 1,
      aspectRatio: getAspectRatio(req.width, req.height),
      personGeneration: "allow_adult",
      safetySetting: "block_medium_and_above",
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${req.apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Google Imagen API error ${res.status}: ${err?.error?.message ?? res.statusText}`
    );
  }

  const data = await res.json();
  const imageBytes = data.predictions?.[0]?.bytesBase64Encoded;
  if (!imageBytes) throw new Error("No image returned from Imagen 3");

  return {
    imageUrl: `data:image/png;base64,${imageBytes}`,
  };
}

// ─── Google Gemini Vision (image generation via generateContent) ───
async function renderGeminiVision(req: RenderRequest): Promise<{ imageUrl: string }> {
  const model = "gemini-2.0-flash-exp";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${req.apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: `Generate a high-quality image based on this description: ${req.prompt}${
              req.negativePrompt ? `. Avoid: ${req.negativePrompt}` : ""
            }. Resolution: ${req.width}x${req.height}.`,
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Gemini API error ${res.status}: ${err?.error?.message ?? res.statusText}`
    );
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));

  if (!imagePart) {
    // Return text response if no image
    const textPart = parts.find((p: any) => p.text);
    throw new Error(
      `Gemini did not return an image. Response: ${textPart?.text?.substring(0, 200) ?? "empty"}`
    );
  }

  return {
    imageUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
  };
}

function getAspectRatio(w: number, h: number): string {
  const ratio = w / h;
  if (ratio > 1.6) return "16:9";
  if (ratio > 1.2) return "4:3";
  if (ratio < 0.65) return "9:16";
  if (ratio < 0.85) return "3:4";
  return "1:1";
}

// ─── Main handler ──────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabase.auth.getUser(token);
    if (!data.user) throw new Error("Not authenticated");

    const renderReq: RenderRequest = await req.json();

    if (!renderReq.apiKey) throw new Error("API key is required");
    if (!renderReq.prompt) throw new Error("Prompt is required");

    let result: { imageUrl: string; revisedPrompt?: string };

    switch (renderReq.provider) {
      case "openai": {
        if (renderReq.model === "gpt-4o-image") {
          // GPT-4o doesn't generate images, return error
          throw new Error("GPT-4o Image Understanding is for analysis, not generation. Use DALL-E 3.");
        }
        result = await renderOpenAI(renderReq);
        break;
      }
      case "google": {
        if (renderReq.model.startsWith("imagen-3")) {
          result = await renderGoogleImagen(renderReq);
        } else if (renderReq.model.startsWith("gemini")) {
          result = await renderGeminiVision(renderReq);
        } else if (renderReq.model === "veo-2") {
          throw new Error("Veo 2 video generation requires dedicated Vertex AI access. Coming soon.");
        } else {
          throw new Error(`Unsupported Google model: ${renderReq.model}`);
        }
        break;
      }
      default:
        throw new Error(
          `Provider "${renderReq.provider}" is not yet implemented for cloud rendering. Currently supported: OpenAI, Google.`
        );
    }

    // Log render
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabaseAdmin.from("render_logs").insert({
      user_id: data.user.id,
      width: renderReq.width,
      height: renderReq.height,
      steps: renderReq.steps,
      cfg: renderReq.cfg,
      preset: `${renderReq.provider}/${renderReq.model}`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: result.imageUrl,
        revisedPrompt: result.revisedPrompt,
        provider: renderReq.provider,
        model: renderReq.model,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[cloud-render] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
