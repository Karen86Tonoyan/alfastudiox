import type { AIProvider, LLMChatParams, LLMResult } from "./types";

/**
 * Exo — distributed AI cluster (https://github.com/exo-explore/exo).
 * Runs LLMs across multiple devices (Mac, Linux, iPhone, Android, Pi).
 * Exposes an OpenAI-compatible API on each node (default: http://localhost:52415).
 */

export interface ExoConfig {
  endpoint: string;   // e.g. http://192.168.1.10:52415
  defaultModel: string;
  apiKey?: string;    // optional, exo usually no-auth on LAN
}

const STORAGE_KEY = "alfa-exo-config";

export function getExoConfig(): ExoConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { endpoint: "http://localhost:52415", defaultModel: "llama-3.2-3b", ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { endpoint: "http://localhost:52415", defaultModel: "llama-3.2-3b" };
}

export function saveExoConfig(cfg: ExoConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export interface ExoNode {
  id: string;
  model: string;
  chip: string;
  memory: number;       // GB
  flops: { fp32: number; fp16: number; int8: number };
}

export async function fetchExoTopology(endpoint?: string): Promise<{ nodes: ExoNode[]; raw: unknown } | { error: string }> {
  const url = (endpoint || getExoConfig().endpoint).replace(/\/$/, "");
  try {
    const res = await fetch(`${url}/topology`);
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const raw = await res.json();
    const nodes: ExoNode[] = Object.entries(raw?.nodes || {}).map(([id, n]: [string, any]) => ({
      id,
      model: n?.model || "unknown",
      chip: n?.chip || "—",
      memory: Math.round((n?.memory || 0) / 1024),
      flops: n?.flops || { fp32: 0, fp16: 0, int8: 0 },
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
    const json = await res.json();
    return (json?.data || []).map((m: { id: string }) => m.id);
  } catch { return []; }
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
      const json = await res.json();
      if (json.error) return { text: "", error: json.error?.message || JSON.stringify(json.error) };
      return { text: json.choices?.[0]?.message?.content || "" };
    } catch (e) {
      return { text: "", error: e instanceof Error ? e.message : String(e) };
    }
  },
};