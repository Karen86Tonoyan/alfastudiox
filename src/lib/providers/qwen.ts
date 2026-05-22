import type { AIProvider, GenerateImageParams, GenerateResult, LLMChatParams, LLMResult } from "./types";
import { supabase } from "@/integrations/supabase/client";

function getApiKey(): string | null {
  try {
    const providers = JSON.parse(localStorage.getItem("alfa-cloud-providers") || "[]");
    return providers.find((p: { id: string; apiKey?: string }) => p.id === "qwen")?.apiKey || null;
  } catch { return null; }
}

export const qwenProvider: AIProvider = {
  id: "qwen",
  name: "Qwen (Alibaba)",
  capabilities: ["image", "llm"],
  isConfigured: () => !!getApiKey(),

  generateImage: async (params: GenerateImageParams): Promise<GenerateResult> => {
    const { data, error } = await supabase.functions.invoke("cloud-render", {
      body: {
        provider: "qwen",
        model: "wanx-v1",
        prompt: params.prompt,
        width: params.width || 1024,
        height: params.height || 1024,
        apiKey: getApiKey(),
      },
    });
    if (error) return { error: error.message };
    if (data?.error) return { error: data.error };
    return { url: data?.imageUrl };
  },

  chat: async (params: LLMChatParams): Promise<LLMResult> => {
    const apiKey = getApiKey();
    if (!apiKey) return { text: "", error: "Brak klucza API Qwen" };
    try {
      const res = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "qwen-max",
          messages: params.messages,
          max_tokens: params.maxTokens || 2048,
        }),
      });
      const json = await res.json();
      if (json.error) return { text: "", error: json.error?.message || json.error };
      return { text: json.choices?.[0]?.message?.content || "" };
    } catch (e: unknown) {
      return { text: "", error: e instanceof Error ? e.message : String(e) };
    }
  },
};
