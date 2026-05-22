import { useState, useCallback } from "react";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export type ChatMessage = { role: "user" | "assistant"; content: string };
type AIMode = "chat" | "enhance" | "analyze" | "advisor";

export function useAIChat() {
  const [isStreaming, setIsStreaming] = useState(false);

  const streamChat = useCallback(async ({
    messages,
    mode = "chat",
    onDelta,
    onDone,
    onError,
  }: {
    messages: ChatMessage[];
    mode?: AIMode;
    onDelta: (text: string) => void;
    onDone: () => void;
    onError?: (err: string) => void;
  }) => {
    setIsStreaming(true);
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages, mode }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        onError?.(err.error || `Błąd: ${resp.status}`);
        setIsStreaming(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) onDelta(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) onDelta(content);
          } catch { /* ignore */ }
        }
      }

      onDone();
    } catch (e: unknown) {
      onError?.(e instanceof Error ? e.message : String(e));
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const enhancePrompt = useCallback(async (prompt: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      let result = "";
      streamChat({
        messages: [{ role: "user", content: prompt }],
        mode: "enhance",
        onDelta: (chunk) => { result += chunk; },
        onDone: () => resolve(result),
        onError: (err) => reject(new Error(err)),
      });
    });
  }, [streamChat]);

  return { streamChat, enhancePrompt, isStreaming };
}
