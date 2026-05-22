import type { AIProvider, LLMChatParams, LLMResult } from "./types";

/**
 * Exo - distributed AI cluster (https://github.com/exo-explore/exo).
 * Runs LLMs across multiple devices and exposes an OpenAI-compatible API.
 */

export interface ExoConfig {
  endpoint: string;
  defaultModel: string;
  apiKey?: string;
}

export interface ExoNode {
  id: string;
  model: string;
  chip: string;
  memory: number;
  flops: { fp32: number; fp16: number; int8: number };
}

interface ExoTopologyNode {
  model?: string;
  chip?: string;
  memory?: number;
  flops?: Partial<ExoNode["flops"]>;
}

interface ExoTopologyResponse {
  nodes?: Record<string, ExoTopologyNode>;
}

interface ExoModelListResponse {
  data?: Array<{ id: string }>;
}

interface ExoChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string } | string;
}

const STORAGE_KEY = "alfa-exo-config";

export function getExoConfig(): ExoConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return {
        endpoint: "http://localhost:52415",
        defaultModel: "llama-3.2-3b",
        ...JSON.parse(raw),
      };
    }
  } catch {
    // Ignore invalid config and fall back to defaults.
  }

  return { endpoint: "http://localhost:52415", defaultModel: "llama-3.2-3b" };
}

export function saveExoConfig(cfg: ExoConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export async function fetchExoTopology(
  endpoint?: string,
): Promise<{ nodes: ExoNode[]; raw: unknown } | { error: string }> {
  const url = (endpoint || getExoConfig().endpoint).replace(/\/$/, "");

  try {
    const res = await fetch(`${url}/topology`);
    if (!res.ok) return { error: `HTTP ${res.status}` };

    const raw: ExoTopologyResponse = await res.json();
    const nodes: ExoNode[] = Object.entries(raw.nodes || {}).map(([id, node]) => ({
      id,
      model: node.model || "unknown",
      chip: node.chip || "-",
      memory: Math.round((node.memory || 0) / 1024),
      flops: {
        fp32: node.flops?.fp32 || 0,
        fp16: node.flops?.fp16 || 0,
        int8: node.flops?.int8 || 0,
      },
    }));

    return { nodes, raw };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function fetchExoModels(endpoint?: string): Promise<string[]> {
  const url = (endpoint || getExoConfig().endpoint).replace(/\/$/, "");

  try {
    const res = await fetch(`${url}/v1/models`);
    if (!res.ok) return [];

    const json: ExoModelListResponse = await res.json();
    return (json.data || []).map((model) => model.id);
  } catch {
    return [];
  }
}

export const exoProvider: AIProvider = {
  id: "exo",
  name: "Exo (Distributed Cluster)",
  capabilities: ["llm"],
  isConfigured: () => !!getExoConfig().endpoint,

  chat: async (params: LLMChatParams): Promise<LLMResult> => {
    const cfg = getExoConfig();
    if (!cfg.endpoint) return { text: "", error: "Brak skonfigurowanego endpointu Exo" };

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;

      const res = await fetch(`${cfg.endpoint.replace(/\/$/, "")}/v1/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: cfg.defaultModel,
          messages: params.messages,
          max_tokens: params.maxTokens || 2048,
          temperature: params.temperature ?? 0.7,
          stream: false,
        }),
      });

      const json: ExoChatResponse = await res.json();
      if (json.error) {
        return {
          text: "",
          error: typeof json.error === "string" ? json.error : json.error.message || JSON.stringify(json.error),
        };
      }

      return { text: json.choices?.[0]?.message?.content || "" };
    } catch (e) {
      return { text: "", error: e instanceof Error ? e.message : String(e) };
    }
  },
};
