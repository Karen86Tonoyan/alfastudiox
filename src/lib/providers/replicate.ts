import type { AIProvider, GenerateImageParams, GenerateVideoParams, GenerateResult } from "./types";
import { supabase } from "@/integrations/supabase/client";

function getApiKey(): string | null {
  try {
    const providers = JSON.parse(localStorage.getItem("alfa-cloud-providers") || "[]");
    return providers.find((p: any) => p.id === "replicate")?.apiKey || null;
  } catch { return null; }
}

export const replicateProvider: AIProvider = {
  id: "replicate",
  name: "Replicate",
  capabilities: ["image", "video"],
  isConfigured: () => !!getApiKey(),

  generateImage: async (params: GenerateImageParams): Promise<GenerateResult> => {
    const { data, error } = await supabase.functions.invoke("cloud-render", {
      body: {
        provider: "replicate",
        model: "flux-1.1-pro",
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
        width: params.width || 1024,
        height: params.height || 1024,
        steps: params.steps,
        seed: params.seed,
        apiKey: getApiKey(),
      },
    });
    if (error) return { error: error.message };
    if (data?.error) return { error: data.error };
    return { url: data?.imageUrl };
  },

  generateVideo: async (params: GenerateVideoParams): Promise<GenerateResult> => {
    const { data, error } = await supabase.functions.invoke("cloud-render", {
      body: {
        provider: "replicate",
        model: "svd",
        prompt: params.prompt,
        apiKey: getApiKey(),
      },
    });
    if (error) return { error: error.message };
    if (data?.error) return { error: data.error };
    return { url: data?.imageUrl };
  },
};
