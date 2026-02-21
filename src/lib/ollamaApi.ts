/**
 * Ollama REST API client
 * Connects to local Ollama instance (no token required)
 * Default: http://localhost:11434
 */

const STORAGE_KEY = "ai-director-ollama-config";

export interface OllamaConfig {
  baseUrl: string;
  defaultModel: string;
  enabled: boolean;
}

export function getOllamaConfig(): OllamaConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { baseUrl: "http://localhost:11434", defaultModel: "llama3.2", enabled: true };
}

export function saveOllamaConfig(config: OllamaConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  images?: string[]; // base64 encoded
}

export interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
  total_duration?: number;
  eval_count?: number;
}

export interface OllamaChatResponse {
  model: string;
  message: OllamaChatMessage;
  done: boolean;
  total_duration?: number;
}

async function ollamaFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const config = getOllamaConfig();
  const url = `${config.baseUrl}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`Ollama API error (${res.status}): ${text}`);
  }

  return res.json();
}

/** Check if Ollama is reachable */
export async function pingOllama(): Promise<boolean> {
  try {
    const config = getOllamaConfig();
    const res = await fetch(config.baseUrl, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** List installed models */
export async function listModels(): Promise<OllamaModel[]> {
  const data = await ollamaFetch<{ models: OllamaModel[] }>("/api/tags");
  return data.models ?? [];
}

/** Generate text (non-streaming) */
export async function generate(
  prompt: string,
  model?: string,
  system?: string
): Promise<string> {
  const config = getOllamaConfig();
  const data = await ollamaFetch<OllamaGenerateResponse>("/api/generate", {
    method: "POST",
    body: JSON.stringify({
      model: model ?? config.defaultModel,
      prompt,
      system,
      stream: false,
    }),
  });
  return data.response;
}

/** Chat completion (non-streaming) */
export async function chat(
  messages: OllamaChatMessage[],
  model?: string
): Promise<OllamaChatMessage> {
  const config = getOllamaConfig();
  const data = await ollamaFetch<OllamaChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      model: model ?? config.defaultModel,
      messages,
      stream: false,
    }),
  });
  return data.message;
}

/** Stream generate — yields text chunks */
export async function* streamGenerate(
  prompt: string,
  model?: string,
  system?: string,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const config = getOllamaConfig();
  const res = await fetch(`${config.baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model ?? config.defaultModel,
      prompt,
      system,
      stream: true,
    }),
    signal,
  });

  if (!res.ok || !res.body) throw new Error(`Ollama stream error: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        if (json.response) yield json.response;
        if (json.done) return;
      } catch {}
    }
  }
}

/** Prompt enhancement — generates a better prompt from a basic one */
export async function enhancePrompt(basicPrompt: string, modelType: "image" | "video"): Promise<string> {
  const system = modelType === "video"
    ? `You are an expert at writing prompts for AI video generation models like AnimateDiff and Stable Video Diffusion. Transform the user's basic description into a detailed, high-quality prompt. Include motion descriptors, camera movement, lighting, and temporal flow. Return ONLY the enhanced prompt, no explanations.`
    : `You are an expert at writing prompts for AI image generation models like SDXL, Flux, and Stable Diffusion. Transform the user's basic description into a detailed, high-quality prompt with artistic style, lighting, composition, and quality tags. Return ONLY the enhanced prompt, no explanations.`;

  return generate(basicPrompt, undefined, system);
}

/** Auto-suggest render parameters based on a prompt description */
export async function suggestParameters(description: string): Promise<Record<string, any>> {
  const system = `You are an AI render parameter optimizer. Given a scene description, suggest optimal render parameters as JSON. Include: model (sdxl/flux-dev/flux-schnell), sampler, steps (10-50), cfg (1-15), width, height, lora (none/detail-tweaker/film-grain/cinematic/anime/photorealistic), loraWeight (0-1). For video scenes, also include: frames (8-64), fps (8-24). Return ONLY valid JSON, no markdown or explanations.`;

  const response = await generate(description, undefined, system);
  try {
    // Try to extract JSON from the response
    const match = response.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return {};
}

/** Analyze/describe an image (requires multimodal model like llava) */
export async function analyzeImage(base64Image: string, question?: string): Promise<string> {
  const config = getOllamaConfig();
  const data = await ollamaFetch<OllamaChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      model: config.defaultModel,
      messages: [
        {
          role: "user",
          content: question ?? "Describe this image in detail, including style, composition, lighting, and mood. Be specific about artistic choices.",
          images: [base64Image],
        },
      ],
      stream: false,
    }),
  });
  return data.message.content;
}
