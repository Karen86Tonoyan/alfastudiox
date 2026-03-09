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

// ─── OpenAI DALL-E ─────────────────────────────────────────────────
async function renderOpenAI(req: RenderRequest): Promise<{ imageUrl: string; revisedPrompt?: string }> {
  const model = req.model.startsWith("dall-e-3") ? "dall-e-3" : "dall-e-2";
  const isHD = req.model === "dall-e-3-hd";

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
    headers: { Authorization: `Bearer ${req.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenAI error ${res.status}: ${err?.error?.message ?? res.statusText}`);
  }

  const data = await res.json();
  const img = data.data?.[0];
  return { imageUrl: img?.url, revisedPrompt: img?.revised_prompt };
}

// ─── Google Imagen 3 ───────────────────────────────────────────────
async function renderGoogleImagen(req: RenderRequest): Promise<{ imageUrl: string }> {
  const model = req.model === "imagen-3-fast" ? "imagen-3.0-fast-generate-002" : "imagen-3.0-generate-002";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${req.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt: req.prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: getAspectRatio(req.width, req.height),
          personGeneration: "allow_adult",
          safetySetting: "block_medium_and_above",
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Google Imagen error ${res.status}: ${err?.error?.message ?? res.statusText}`);
  }

  const data = await res.json();
  const imageBytes = data.predictions?.[0]?.bytesBase64Encoded;
  if (!imageBytes) throw new Error("No image returned from Imagen 3");
  return { imageUrl: `data:image/png;base64,${imageBytes}` };
}

// ─── Google Gemini Vision ──────────────────────────────────────────
async function renderGeminiVision(req: RenderRequest): Promise<{ imageUrl: string }> {
  const model = "gemini-2.0-flash-exp";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${req.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Generate a high-quality image: ${req.prompt}${req.negativePrompt ? `. Avoid: ${req.negativePrompt}` : ""}. Resolution: ${req.width}x${req.height}.` }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gemini error ${res.status}: ${err?.error?.message ?? res.statusText}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));
  if (!imagePart) {
    const textPart = parts.find((p: any) => p.text);
    throw new Error(`Gemini did not return an image. Response: ${textPart?.text?.substring(0, 200) ?? "empty"}`);
  }
  return { imageUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` };
}

// ─── Replicate ─────────────────────────────────────────────────────
async function renderReplicate(req: RenderRequest): Promise<{ imageUrl: string }> {
  const headers = { Authorization: `Bearer ${req.apiKey}`, "Content-Type": "application/json", Prefer: "wait" };

  // Map model IDs to Replicate versions
  const modelMap: Record<string, string> = {
    "stability-ai/sdxl": "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
    "black-forest-labs/flux-dev": "black-forest-labs/flux-dev",
    "black-forest-labs/flux-schnell": "black-forest-labs/flux-schnell",
  };

  const replicateModel = modelMap[req.model] ?? req.model;
  const isFlux = req.model.includes("flux");

  const input: Record<string, unknown> = {
    prompt: req.prompt,
    width: req.width,
    height: req.height,
  };

  if (!isFlux) {
    input.negative_prompt = req.negativePrompt ?? "";
    input.num_inference_steps = req.steps ?? 30;
    input.guidance_scale = req.cfg ?? 7;
    if (req.seed && req.seed > 0) input.seed = req.seed;
  } else {
    input.num_inference_steps = req.steps ?? 28;
    if (req.seed && req.seed > 0) input.seed = req.seed;
  }

  // Use the "run" endpoint with Prefer: wait for synchronous response
  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers,
    body: JSON.stringify({ version: replicateModel.includes(":") ? replicateModel.split(":")[1] : undefined, model: replicateModel.includes(":") ? undefined : replicateModel, input }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Replicate error ${res.status}: ${err?.detail ?? res.statusText}`);
  }

  let prediction = await res.json();

  // If not completed yet, poll for result
  if (prediction.status !== "succeeded" && prediction.urls?.get) {
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await fetch(prediction.urls.get, { headers: { Authorization: `Bearer ${req.apiKey}` } });
      prediction = await poll.json();
      if (prediction.status === "succeeded") break;
      if (prediction.status === "failed" || prediction.status === "canceled") {
        throw new Error(`Replicate prediction ${prediction.status}: ${prediction.error ?? "unknown"}`);
      }
    }
  }

  if (prediction.status !== "succeeded") throw new Error("Replicate prediction timed out");

  const output = prediction.output;
  const imageUrl = Array.isArray(output) ? output[0] : output;
  if (!imageUrl) throw new Error("No image in Replicate output");
  return { imageUrl };
}

// ─── Hugging Face Inference API ────────────────────────────────────
async function renderHuggingFace(req: RenderRequest): Promise<{ imageUrl: string }> {
  const modelMap: Record<string, string> = {
    "stabilityai/stable-diffusion-xl-base-1.0": "stabilityai/stable-diffusion-xl-base-1.0",
    "black-forest-labs/FLUX.1-dev": "black-forest-labs/FLUX.1-dev",
    "black-forest-labs/FLUX.1-schnell": "black-forest-labs/FLUX.1-schnell",
    "stabilityai/stable-diffusion-3-medium": "stabilityai/stable-diffusion-3-medium-diffusers",
  };

  const hfModel = modelMap[req.model] ?? req.model;

  const payload: Record<string, unknown> = {
    inputs: req.prompt,
    parameters: {
      width: req.width,
      height: req.height,
      num_inference_steps: req.steps ?? 30,
      guidance_scale: req.cfg ?? 7,
    },
  };
  if (req.negativePrompt) (payload.parameters as any).negative_prompt = req.negativePrompt;
  if (req.seed && req.seed > 0) (payload.parameters as any).seed = req.seed;

  const res = await fetch(`https://api-inference.huggingface.co/models/${hfModel}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${req.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    // HF may return JSON error or text
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("json")) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`HuggingFace error ${res.status}: ${err?.error ?? res.statusText}`);
    }
    throw new Error(`HuggingFace error ${res.status}: ${res.statusText}`);
  }

  // HF returns raw image bytes
  const contentType = res.headers.get("content-type") ?? "image/png";
  const buffer = await res.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  return { imageUrl: `data:${contentType};base64,${base64}` };
}

// ─── Kimi / Moonshot ───────────────────────────────────────────────
async function renderKimi(req: RenderRequest): Promise<{ imageUrl: string }> {
  // Kimi uses a chat-based image generation approach
  const res = await fetch("https://api.moonshot.cn/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${req.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: req.model.startsWith("kimi-") ? "moonshot-v1-128k" : req.model,
      messages: [
        { role: "system", content: "You are an AI image generation assistant. Generate a detailed image description based on the user's prompt." },
        { role: "user", content: `Generate an image: ${req.prompt}${req.negativePrompt ? `. Avoid: ${req.negativePrompt}` : ""}. Dimensions: ${req.width}x${req.height}.` },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Kimi error ${res.status}: ${err?.error?.message ?? res.statusText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  // Kimi doesn't natively generate images — return the enhanced prompt description
  throw new Error(
    `Kimi (Moonshot) currently provides prompt enhancement only, not direct image generation. Enhanced prompt: "${content.substring(0, 300)}"`
  );
}

// ─── Qwen / DashScope (Wanx) ──────────────────────────────────────
async function renderQwen(req: RenderRequest): Promise<{ imageUrl: string }> {
  const isWanx = req.model.startsWith("wanx");
  const isFlux = req.model === "flux-schnell";

  const model = isFlux ? "flux-schnell" : isWanx ? "wanx-v1" : req.model;

  const input: Record<string, unknown> = {
    prompt: req.prompt,
  };
  if (req.negativePrompt) input.negative_prompt = req.negativePrompt;

  const parameters: Record<string, unknown> = {
    size: `${req.width}*${req.height}`,
    n: 1,
  };
  if (req.steps) parameters.steps = req.steps;
  if (req.seed && req.seed > 0) parameters.seed = req.seed;

  // Create async task
  const createRes = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${req.apiKey}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable",
    },
    body: JSON.stringify({ model, input, parameters }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(`Qwen/DashScope error ${createRes.status}: ${err?.message ?? createRes.statusText}`);
  }

  const createData = await createRes.json();
  const taskId = createData.output?.task_id;
  if (!taskId) throw new Error("No task_id returned from DashScope");

  // Poll for result
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));

    const statusRes = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${req.apiKey}` },
    });

    if (!statusRes.ok) continue;

    const statusData = await statusRes.json();
    const taskStatus = statusData.output?.task_status;

    if (taskStatus === "SUCCEEDED") {
      const results = statusData.output?.results;
      const imageUrl = results?.[0]?.url;
      if (!imageUrl) throw new Error("No image URL in DashScope results");
      return { imageUrl };
    }

    if (taskStatus === "FAILED") {
      throw new Error(`DashScope task failed: ${statusData.output?.message ?? "unknown"}`);
    }
  }

  throw new Error("DashScope task timed out after 3 minutes");
}

// ─── Agnes Cloud ───────────────────────────────────────────────────
async function renderAgnes(req: RenderRequest): Promise<{ imageUrl: string }> {
  const res = await fetch("https://agnes.cloud/api/v1/images/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${req.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: req.prompt,
      negative_prompt: req.negativePrompt,
      width: req.width,
      height: req.height,
      steps: req.steps ?? 30,
      seed: req.seed && req.seed > 0 ? req.seed : undefined,
      model: req.model !== "agnes-default" ? req.model : undefined,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Agnes Cloud error ${res.status}: ${err?.error ?? err?.message ?? res.statusText}`);
  }

  const data = await res.json();
  
  // Agnes może zwrócić URL lub base64
  if (data?.url) return { imageUrl: data.url };
  if (data?.image) return { imageUrl: `data:image/png;base64,${data.image}` };
  if (data?.data?.[0]?.url) return { imageUrl: data.data[0].url };
  if (data?.data?.[0]?.b64_json) return { imageUrl: `data:image/png;base64,${data.data[0].b64_json}` };
  
  throw new Error("No image returned from Agnes Cloud");
}

// ─── Helpers ───────────────────────────────────────────────────────
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
          throw new Error("GPT-4o Image Understanding is for analysis, not generation. Use DALL-E 3.");
        }
        result = await renderOpenAI(renderReq);
        break;
      }
      case "google": {
        if (renderReq.model.startsWith("imagen-3")) result = await renderGoogleImagen(renderReq);
        else if (renderReq.model.startsWith("gemini")) result = await renderGeminiVision(renderReq);
        else if (renderReq.model === "veo-2") throw new Error("Veo 2 video generation requires Vertex AI. Coming soon.");
        else throw new Error(`Unsupported Google model: ${renderReq.model}`);
        break;
      }
      case "replicate": {
        result = await renderReplicate(renderReq);
        break;
      }
      case "huggingface": {
        result = await renderHuggingFace(renderReq);
        break;
      }
      case "kimi": {
        result = await renderKimi(renderReq);
        break;
      }
      case "qwen": {
        result = await renderQwen(renderReq);
        break;
      }
      default:
        throw new Error(`Provider "${renderReq.provider}" is not supported. Supported: OpenAI, Google, Replicate, Hugging Face, Kimi, Qwen.`);
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
      JSON.stringify({ success: true, imageUrl: result.imageUrl, revisedPrompt: result.revisedPrompt, provider: renderReq.provider, model: renderReq.model }),
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
