import type { AIProvider, LLMChatParams, LLMResult } from "./types";

function getApiKey(): string | null {
  try {
    const providers = JSON.parse(localStorage.getItem("alfa-cloud-providers") || "[]");
    return providers.find((p: { id: string; apiKey?: string }) => p.id === "xai")?.apiKey || null;
  } catch { return null; }
}

export const xaiProvider: AIProvider = {
  id: "xai",
  name: "xAI (Grok)",
  capabilities: ["llm"],
  isConfigured: () => !!getApiKey(),

  chat: async (params: LLMChatParams): Promise<LLMResult> => {
    const apiKey = getApiKey();
    if (!apiKey) return { text: "", error: "Brak klucza API xAI" };
    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "grok-2",
          messages: params.messages,
          max_tokens: params.maxTokens || 2048,
          temperature: params.temperature || 0.7,
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
