import type { AIProvider, LLMChatParams, LLMResult } from "./types";

function getApiKey(): string | null {
  try {
    const providers = JSON.parse(localStorage.getItem("alfa-cloud-providers") || "[]");
    return providers.find((p: any) => p.id === "deepseek")?.apiKey || null;
  } catch { return null; }
}

export const deepseekProvider: AIProvider = {
  id: "deepseek",
  name: "DeepSeek",
  capabilities: ["llm"],
  isConfigured: () => !!getApiKey(),

  chat: async (params: LLMChatParams): Promise<LLMResult> => {
    const apiKey = getApiKey();
    if (!apiKey) return { text: "", error: "Brak klucza API DeepSeek" };
    try {
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: params.messages,
          max_tokens: params.maxTokens || 2048,
          temperature: params.temperature || 0.7,
        }),
      });
      const json = await res.json();
      if (json.error) return { text: "", error: json.error?.message || json.error };
      return { text: json.choices?.[0]?.message?.content || "" };
    } catch (e: any) {
      return { text: "", error: e.message };
    }
  },
};
