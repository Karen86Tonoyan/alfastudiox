import type { AIProvider, LLMChatParams, LLMResult } from "./types";

function getApiKey(): string | null {
  try {
    const providers = JSON.parse(localStorage.getItem("alfa-cloud-providers") || "[]");
    return providers.find((p: any) => p.id === "mistral")?.apiKey || null;
  } catch { return null; }
}

export const mistralProvider: AIProvider = {
  id: "mistral",
  name: "Mistral AI",
  capabilities: ["llm"],
  isConfigured: () => !!getApiKey(),

  chat: async (params: LLMChatParams): Promise<LLMResult> => {
    const apiKey = getApiKey();
    if (!apiKey) return { text: "", error: "Brak klucza API Mistral" };
    try {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "mistral-large-latest",
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
