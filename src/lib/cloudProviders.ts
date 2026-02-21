/**
 * Cloud Provider abstractions for GPU rendering
 * RunPod, Replicate, Hugging Face, ComfyUI Cloud
 */

const STORAGE_KEY = "ai-director-cloud-providers";

export type ProviderType = "runpod" | "replicate" | "huggingface" | "comfyui-cloud";

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
    id: "comfyui-cloud",
    name: "ComfyUI Cloud",
    description: "Hosted ComfyUI — run workflows in the cloud",
    apiKey: "",
    baseUrl: "",
    enabled: false,
    status: "disconnected",
    icon: "☁️",
    features: ["ComfyUI Hosted", "Custom Workflows", "Shared GPUs", "Auto-scale"],
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
  if (!provider.apiKey && provider.id !== "comfyui-cloud") return false;

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
        // RunPod returns 404 for base URL but we check auth
        return res.status !== 401;
      }
      case "comfyui-cloud": {
        if (!provider.baseUrl) return false;
        const res = await fetch(provider.baseUrl, {
          signal: AbortSignal.timeout(5000),
        });
        return res.ok;
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}

/** Provider-specific render interfaces (stubs — will be implemented with Cloud backend) */
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
    case "comfyui-cloud":
      return [
        { id: "default", name: "Cloud ComfyUI Instance" },
      ];
    default:
      return [];
  }
}
