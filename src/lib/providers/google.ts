import type { AIProvider, GenerateImageParams, GenerateResult, LLMChatParams, LLMResult } from "./types";
import { supabase } from "@/integrations/supabase/client";

function getApiKey(): string | null {
  try {
    const providers = JSON.parse(localStorage.getItem("alfa-cloud-providers") || "[]");
    return providers.find((p: any) => p.id === "google")?.apiKey || null;
  } catch { return null; }
}

export const googleProvider: AIProvider = {
  id: "google",
  name: "Google AI",
  capabilities: ["image", "llm"],
  isConfigured: () => !!getApiKey(),

  generateImage: async (params: GenerateImageParams): Promise<GenerateResult> => {
    const { data, error } = await supabase.functions.invoke("cloud-render", {
      body: {
        provider: "google",
        model: "imagen-3",
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
    if (!apiKey) return { text: "", error: "Brak klucza API Google" };
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: params.messages.map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
          }),
        }
      );
      const json = await res.json();
      if (json.error) return { text: "", error: json.error.message };
      return { text: json.candidates?.[0]?.content?.parts?.[0]?.text || "" };
    } catch (e: any) {
      return { text: "", error: e.message };
    }
  },
};
