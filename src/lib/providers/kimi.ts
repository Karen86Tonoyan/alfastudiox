import type { AIProvider, GenerateVideoParams, GenerateResult, LLMChatParams, LLMResult } from "./types";
import { supabase } from "@/integrations/supabase/client";

function getApiKey(): string | null {
  try {
    const providers = JSON.parse(localStorage.getItem("alfa-cloud-providers") || "[]");
    return providers.find((p: { id: string; apiKey?: string }) => p.id === "kimi")?.apiKey || null;
  } catch { return null; }
}

export const kimiProvider: AIProvider = {
  id: "kimi",
  name: "Kimi (Moonshot)",
  capabilities: ["video", "llm"],
  isConfigured: () => !!getApiKey(),

  generateVideo: async (params: GenerateVideoParams): Promise<GenerateResult> => {
    const { data, error } = await supabase.functions.invoke("cloud-render", {
      body: {
        provider: "kimi",
        model: "kimi-video",
        prompt: params.prompt,
        apiKey: getApiKey(),
      },
    });
    if (error) return { error: error.message };
    if (data?.error) return { error: data.error };
    return { url: data?.imageUrl };
  },

  chat: async (params: LLMChatParams): Promise<LLMResult> => {
    const apiKey = getApiKey();
    if (!apiKey) return { text: "", error: "Brak klucza API Kimi" };
    try {
      const res = await fetch("https://api.moonshot.cn/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "moonshot-v1-128k",
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
