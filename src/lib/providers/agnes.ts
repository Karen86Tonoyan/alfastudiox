import type { AIProvider, GenerateImageParams, GenerateResult, LLMChatParams, LLMResult } from "./types";

const AGNES_BASE_URL = "https://agnes.cloud/api/v1";

function getApiKey(): string | null {
  try {
    const providers = JSON.parse(localStorage.getItem("alfa-cloud-providers") || "[]");
    return providers.find((p: any) => p.id === "agnes")?.apiKey || null;
  } catch { return null; }
}

export const agnesProvider: AIProvider = {
  id: "agnes",
  name: "Agnes Cloud",
  capabilities: ["image", "llm"],
  isConfigured: () => !!getApiKey(),

  generateImage: async (params: GenerateImageParams): Promise<GenerateResult> => {
    const apiKey = getApiKey();
    if (!apiKey) return { error: "Brak klucza API Agnes Cloud" };

    try {
      const res = await fetch(`${AGNES_BASE_URL}/images/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: params.prompt,
          negative_prompt: params.negativePrompt,
          width: params.width || 1024,
          height: params.height || 1024,
          steps: params.steps || 30,
          seed: params.seed,
        }),
      });

      const json = await res.json();
      if (!res.ok) return { error: json?.error || `Agnes Cloud error: ${res.status}` };

      // Agnes returns url or base64 depending on endpoint
      if (json?.url) return { url: json.url };
      if (json?.image) return { base64: json.image };
      if (json?.data?.[0]?.url) return { url: json.data[0].url };
      if (json?.data?.[0]?.b64_json) return { base64: json.data[0].b64_json };

      return { error: "Brak obrazu w odpowiedzi Agnes Cloud" };
    } catch (e: any) {
      return { error: e.message };
    }
  },

  chat: async (params: LLMChatParams): Promise<LLMResult> => {
    const apiKey = getApiKey();
    if (!apiKey) return { text: "", error: "Brak klucza API Agnes Cloud" };

    try {
      const res = await fetch(`${AGNES_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "agnes-default",
          messages: params.messages,
          max_tokens: params.maxTokens || 2048,
          temperature: params.temperature || 0.7,
        }),
      });

      const json = await res.json();
      if (!res.ok) return { text: "", error: json?.error || `Agnes Cloud error: ${res.status}` };
      return { text: json.choices?.[0]?.message?.content || "" };
    } catch (e: any) {
      return { text: "", error: e.message };
    }
  },
};
