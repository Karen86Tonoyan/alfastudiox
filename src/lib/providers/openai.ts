import type { AIProvider, GenerateImageParams, GenerateResult, LLMChatParams, LLMResult } from "./types";
import { supabase } from "@/integrations/supabase/client";

function getApiKey(): string | null {
  try {
    const providers = JSON.parse(localStorage.getItem("alfa-cloud-providers") || "[]");
    return providers.find((p: any) => p.id === "openai")?.apiKey || null;
  } catch { return null; }
}

export const openaiProvider: AIProvider = {
  id: "openai",
  name: "OpenAI",
  capabilities: ["image", "video", "llm"],
  isConfigured: () => !!getApiKey(),

  generateImage: async (params: GenerateImageParams): Promise<GenerateResult> => {
    const { data, error } = await supabase.functions.invoke("cloud-render", {
      body: {
        provider: "openai",
        model: "dall-e-3",
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
        width: params.width || 1024,
        height: params.height || 1024,
        apiKey: getApiKey(),
      },
    });
    if (error) return { error: error.message };
    if (data?.error) return { error: data.error };
    return { url: data?.imageUrl, revisedPrompt: data?.revisedPrompt };
  },

  chat: async (params: LLMChatParams): Promise<LLMResult> => {
    const apiKey = getApiKey();
    if (!apiKey) return { text: "", error: "Brak klucza API OpenAI" };
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: params.messages,
          max_tokens: params.maxTokens || 2048,
          temperature: params.temperature || 0.7,
        }),
      });
      const json = await res.json();
      if (json.error) return { text: "", error: json.error.message };
      return { text: json.choices?.[0]?.message?.content || "" };
    } catch (e: any) {
      return { text: "", error: e.message };
    }
  },
};
