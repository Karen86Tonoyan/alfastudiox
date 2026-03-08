import type { AIProvider, GenerateImageParams, GenerateResult } from "./types";
import { supabase } from "@/integrations/supabase/client";

function getApiKey(): string | null {
  try {
    const providers = JSON.parse(localStorage.getItem("alfa-cloud-providers") || "[]");
    return providers.find((p: any) => p.id === "huggingface")?.apiKey || null;
  } catch { return null; }
}

export const huggingfaceProvider: AIProvider = {
  id: "huggingface",
  name: "Hugging Face",
  capabilities: ["image"],
  isConfigured: () => !!getApiKey(),

  generateImage: async (params: GenerateImageParams): Promise<GenerateResult> => {
    const { data, error } = await supabase.functions.invoke("cloud-render", {
      body: {
        provider: "huggingface",
        model: "stabilityai/stable-diffusion-xl-base-1.0",
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
        width: params.width || 1024,
        height: params.height || 1024,
        apiKey: getApiKey(),
      },
    });
    if (error) return { error: error.message };
    if (data?.error) return { error: data.error };
    return { url: data?.imageUrl };
  },
};
