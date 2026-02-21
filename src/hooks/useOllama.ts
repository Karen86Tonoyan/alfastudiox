import { useState, useEffect, useCallback, useRef } from "react";
import {
  pingOllama,
  listModels,
  getOllamaConfig,
  saveOllamaConfig,
  enhancePrompt,
  suggestParameters,
  streamGenerate,
  chat as ollamaChat,
  type OllamaModel,
  type OllamaConfig,
  type OllamaChatMessage,
} from "@/lib/ollamaApi";

export interface UseOllamaReturn {
  // Connection
  isConnected: boolean;
  isChecking: boolean;
  config: OllamaConfig;
  updateConfig: (config: Partial<OllamaConfig>) => void;
  checkConnection: () => Promise<boolean>;

  // Models
  models: OllamaModel[];
  loadModels: () => Promise<void>;

  // AI Features
  isEnhancing: boolean;
  isSuggesting: boolean;
  isChatting: boolean;
  enhancePrompt: (prompt: string, type: "image" | "video") => Promise<string | null>;
  suggestParams: (description: string) => Promise<Record<string, any> | null>;
  chatStream: (
    messages: OllamaChatMessage[],
    onChunk: (text: string) => void,
    onDone: () => void
  ) => Promise<void>;
  chatSync: (messages: OllamaChatMessage[]) => Promise<string | null>;
  cancelStream: () => void;
}

export function useOllama(): UseOllamaReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [config, setConfig] = useState<OllamaConfig>(getOllamaConfig);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    const ok = await pingOllama();
    setIsConnected(ok);
    setIsChecking(false);
    return ok;
  }, []);

  const updateConfig = useCallback((partial: Partial<OllamaConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      saveOllamaConfig(next);
      return next;
    });
  }, []);

  const loadModels = useCallback(async () => {
    try {
      const m = await listModels();
      setModels(m);
    } catch {
      setModels([]);
    }
  }, []);

  // Check on mount
  useEffect(() => {
    if (config.enabled) {
      checkConnection().then((ok) => {
        if (ok) loadModels();
      });
    }
  }, [config.enabled, checkConnection, loadModels]);

  const handleEnhancePrompt = useCallback(
    async (prompt: string, type: "image" | "video") => {
      if (!isConnected) return null;
      setIsEnhancing(true);
      try {
        return await enhancePrompt(prompt, type);
      } catch (e) {
        console.error("Enhance prompt error:", e);
        return null;
      } finally {
        setIsEnhancing(false);
      }
    },
    [isConnected]
  );

  const handleSuggestParams = useCallback(
    async (description: string) => {
      if (!isConnected) return null;
      setIsSuggesting(true);
      try {
        return await suggestParameters(description);
      } catch (e) {
        console.error("Suggest params error:", e);
        return null;
      } finally {
        setIsSuggesting(false);
      }
    },
    [isConnected]
  );

  const chatStream = useCallback(
    async (
      messages: OllamaChatMessage[],
      onChunk: (text: string) => void,
      onDone: () => void
    ) => {
      if (!isConnected) return;
      setIsChatting(true);
      abortRef.current = new AbortController();

      try {
        const lastMsg = messages[messages.length - 1];
        const systemMsgs = messages.filter((m) => m.role === "system");
        const system = systemMsgs.length > 0 ? systemMsgs[0].content : undefined;

        for await (const chunk of streamGenerate(
          lastMsg.content,
          config.defaultModel,
          system,
          abortRef.current.signal
        )) {
          onChunk(chunk);
        }
        onDone();
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("Chat stream error:", e);
        }
      } finally {
        setIsChatting(false);
        abortRef.current = null;
      }
    },
    [isConnected, config.defaultModel]
  );

  const chatSync = useCallback(
    async (messages: OllamaChatMessage[]) => {
      if (!isConnected) return null;
      setIsChatting(true);
      try {
        const result = await ollamaChat(messages, config.defaultModel);
        return result.content;
      } catch (e) {
        console.error("Chat error:", e);
        return null;
      } finally {
        setIsChatting(false);
      }
    },
    [isConnected, config.defaultModel]
  );

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    isConnected,
    isChecking,
    config,
    updateConfig,
    checkConnection,
    models,
    loadModels,
    isEnhancing,
    isSuggesting,
    isChatting,
    enhancePrompt: handleEnhancePrompt,
    suggestParams: handleSuggestParams,
    chatStream,
    chatSync,
    cancelStream,
  };
}
