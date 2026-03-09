/**
 * Cloud Provider abstractions for GPU rendering
 * RunPod, Replicate, Hugging Face, OpenAI, Google Gemini, Anthropic Claude, Kimi, Qwen
 */

const STORAGE_KEY = "ai-director-cloud-providers";

export type ProviderType =
  | "runpod"
  | "replicate"
  | "huggingface"
  | "openai"
  | "google"
  | "anthropic"
  | "kimi"
  | "qwen"
  | "agnes";

export interface ProviderConfig {
  id: ProviderType;
  name: string;
  description: string;
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
  status: "connected" | "disconnected" | "error";
  icon: string;
  features: string[];
}

export interface CloudRenderJob {
  id: string;
  provider: ProviderType;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  createdAt: number;
  completedAt?: number;
  output?: string;
  error?: string;
  cost?: number;
}

const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: "runpod",
    name: "RunPod",
    description: "Serverless GPU endpoints — SDXL, Flux, custom models",
    apiKey: "",
    baseUrl: "https://api.runpod.ai/v2",
    enabled: false,
    status: "disconnected",
    icon: "🚀",
    features: ["Serverless GPU", "Custom Endpoints", "SDXL", "Flux", "A100/H100"],
  },
  {
    id: "replicate",
    name: "Replicate",
    description: "Run AI models via API — SDXL, Flux, AnimateDiff, SVD",
    apiKey: "",
    baseUrl: "https://api.replicate.com/v1",
    enabled: false,
    status: "disconnected",
    icon: "🔄",
    features: ["Model Zoo", "SDXL", "Flux", "AnimateDiff", "SVD", "Pay-per-use"],
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    description: "Inference API — access thousands of models from HF Hub",
    apiKey: "",
    baseUrl: "https://api-inference.huggingface.co/models",
    enabled: false,
    status: "disconnected",
    icon: "🤗",
    features: ["Inference API", "10k+ Models", "SDXL", "Free Tier", "Spaces"],
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "DALL-E 3, GPT-4o Vision — generowanie i edycja obrazów",
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    enabled: false,
    status: "disconnected",
    icon: "🧠",
    features: ["DALL-E 3", "GPT-4o Vision", "Image Edit", "Variations", "HD Quality"],
  },
  {
    id: "google",
    name: "Google Gemini",
    description: "Imagen 3, Gemini Pro Vision — multimodalne generowanie",
    apiKey: "",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    enabled: false,
    status: "disconnected",
    icon: "💎",
    features: ["Imagen 3", "Gemini Vision", "Video Gen", "Multimodal", "Veo 2"],
  },
  {
    id: "anthropic",
    name: "Claude",
    description: "Anthropic Claude — analiza wizualna i prompt engineering",
    apiKey: "",
    baseUrl: "https://api.anthropic.com/v1",
    enabled: false,
    status: "disconnected",
    icon: "🎭",
    features: ["Claude 3.5", "Vision Analysis", "Prompt Expert", "200k Context"],
  },
  {
    id: "kimi",
    name: "Kimi (Moonshot)",
    description: "Moonshot AI — generowanie obrazów i wideo z długim kontekstem",
    apiKey: "",
    baseUrl: "https://api.moonshot.cn/v1",
    enabled: false,
    status: "disconnected",
    icon: "🌙",
    features: ["Kimi Vision", "Long Context", "Image Gen", "Video Gen", "128k Window"],
  },
  {
    id: "qwen",
    name: "Qwen (Alibaba)",
    description: "Qwen-VL, Wanx — multimodalny model z generacją obrazów",
    apiKey: "",
    baseUrl: "https://dashscope.aliyuncs.com/api/v1",
    enabled: false,
    status: "disconnected",
    icon: "🐲",
    features: ["Qwen-VL", "Wanx Image", "Video Gen", "Multimodal", "Flux Support"],
  },
  {
    id: "agnes",
    name: "Agnes Cloud",
    description: "Agnes Cloud — generowanie obrazów i chat AI",
    apiKey: "",
    baseUrl: "https://agnes.cloud/api/v1",
    enabled: false,
    status: "disconnected",
    icon: "☁️",
    features: ["Image Gen", "Stable Diffusion", "Custom Models", "Chat AI"],
  },
];

export function loadProviders(): ProviderConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as ProviderConfig[];
      // Merge with defaults to pick up new providers
      return DEFAULT_PROVIDERS.map((def) => {
        const existing = saved.find((s) => s.id === def.id);
        return existing ? { ...def, ...existing } : def;
      });
    }
  } catch {}
  return DEFAULT_PROVIDERS;
}

export function saveProviders(providers: ProviderConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
}

export function updateProvider(id: ProviderType, update: Partial<ProviderConfig>) {
  const providers = loadProviders();
  const updated = providers.map((p) => (p.id === id ? { ...p, ...update } : p));
  saveProviders(updated);
  return updated;
}

/** Test provider connection */
export async function testProviderConnection(provider: ProviderConfig): Promise<boolean> {
  if (!provider.apiKey) return false;

  try {
    switch (provider.id) {
      case "replicate": {
        const res = await fetch("https://api.replicate.com/v1/models", {
          headers: { Authorization: `Bearer ${provider.apiKey}` },
          signal: AbortSignal.timeout(5000),
        });
        return res.ok;
      }
      case "huggingface": {
        const res = await fetch("https://huggingface.co/api/whoami-v2", {
          headers: { Authorization: `Bearer ${provider.apiKey}` },
          signal: AbortSignal.timeout(5000),
        });
        return res.ok;
      }
      case "runpod": {
        const res = await fetch("https://api.runpod.ai/v2", {
          headers: { Authorization: `Bearer ${provider.apiKey}` },
          signal: AbortSignal.timeout(5000),
        });
        return res.status !== 401;
      }
      case "openai": {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${provider.apiKey}` },
          signal: AbortSignal.timeout(5000),
        });
        return res.ok;
      }
      case "google": {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${provider.apiKey}`,
          { signal: AbortSignal.timeout(5000) }
        );
        return res.ok;
      }
      case "anthropic": {
        const res = await fetch("https://api.anthropic.com/v1/models", {
          headers: {
            "x-api-key": provider.apiKey,
            "anthropic-version": "2023-06-01",
          },
          signal: AbortSignal.timeout(5000),
        });
        return res.ok;
      }
      case "kimi": {
        const res = await fetch("https://api.moonshot.cn/v1/models", {
          headers: { Authorization: `Bearer ${provider.apiKey}` },
          signal: AbortSignal.timeout(5000),
        });
        return res.ok;
      }
      case "qwen": {
        const res = await fetch("https://dashscope.aliyuncs.com/api/v1/models", {
          headers: { Authorization: `Bearer ${provider.apiKey}` },
          signal: AbortSignal.timeout(5000),
        });
        return res.ok || res.status !== 401;
      }
      case "agnes": {
        const res = await fetch("https://agnes.cloud/api/v1/models", {
          headers: { Authorization: `Bearer ${provider.apiKey}` },
          signal: AbortSignal.timeout(5000),
        });
        return res.ok || res.status !== 401;
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}

/** Provider-specific render interfaces */
export interface RenderRequest {
  provider: ProviderType;
  model: string;
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  steps: number;
  cfg: number;
  seed?: number;
  lora?: string;
  loraWeight?: number;
}

export function getProviderModels(provider: ProviderType): { id: string; name: string }[] {
  switch (provider) {
    case "replicate":
      return [
        { id: "stability-ai/sdxl", name: "SDXL 1.0" },
        { id: "black-forest-labs/flux-dev", name: "Flux Dev" },
        { id: "black-forest-labs/flux-schnell", name: "Flux Schnell" },
        { id: "stability-ai/stable-video-diffusion", name: "SVD" },
        { id: "lucataco/animate-diff", name: "AnimateDiff" },
      ];
    case "huggingface":
      return [
        { id: "stabilityai/stable-diffusion-xl-base-1.0", name: "SDXL 1.0" },
        { id: "black-forest-labs/FLUX.1-dev", name: "Flux Dev" },
        { id: "black-forest-labs/FLUX.1-schnell", name: "Flux Schnell" },
        { id: "stabilityai/stable-diffusion-3-medium", name: "SD3 Medium" },
      ];
    case "runpod":
      return [
        { id: "sdxl", name: "SDXL (Custom Endpoint)" },
        { id: "flux", name: "Flux (Custom Endpoint)" },
        { id: "comfyui", name: "ComfyUI (Serverless)" },
      ];
    case "openai":
      return [
        { id: "dall-e-3", name: "DALL-E 3" },
        { id: "dall-e-3-hd", name: "DALL-E 3 HD" },
        { id: "dall-e-2", name: "DALL-E 2" },
        { id: "gpt-4o-image", name: "GPT-4o (Image Understanding)" },
      ];
    case "google":
      return [
        { id: "imagen-3", name: "Imagen 3" },
        { id: "imagen-3-fast", name: "Imagen 3 Fast" },
        { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (Vision)" },
        { id: "veo-2", name: "Veo 2 (Video)" },
      ];
    case "anthropic":
      return [
        { id: "claude-3.5-sonnet", name: "Claude 3.5 Sonnet (Vision)" },
        { id: "claude-3-opus", name: "Claude 3 Opus (Vision)" },
        { id: "claude-3-haiku", name: "Claude 3 Haiku (Vision)" },
      ];
    case "kimi":
      return [
        { id: "moonshot-v1-128k", name: "Kimi 128k (Vision)" },
        { id: "moonshot-v1-32k", name: "Kimi 32k" },
        { id: "kimi-image", name: "Kimi Image Gen" },
        { id: "kimi-video", name: "Kimi Video Gen" },
      ];
    case "qwen":
      return [
        { id: "wanx-v1", name: "Wanx (Image Gen)" },
        { id: "qwen-vl-max", name: "Qwen-VL Max (Vision)" },
        { id: "qwen-vl-plus", name: "Qwen-VL Plus" },
        { id: "wanx-video", name: "Wanx Video" },
        { id: "flux-schnell", name: "Flux Schnell (via DashScope)" },
      ];
    case "agnes":
      return [
        { id: "stable-diffusion-xl", name: "Stable Diffusion XL" },
        { id: "stable-diffusion-3", name: "Stable Diffusion 3" },
        { id: "flux-1", name: "Flux.1" },
        { id: "agnes-chat", name: "Agnes Chat (LLM)" },
      ];
    default:
      return [];
  }
}
