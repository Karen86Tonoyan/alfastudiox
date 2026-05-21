/**
 * Network link resolver — chooses which URL to use for a given operation
 * (control vs data) based on per-node overrides and global controller config.
 *
 * Strategy:
 *   - Control ops (queue prompt, status, cancel, healthcheck) → api_url
 *   - Data ops (upload inputs, download outputs) → data_url when
 *     prefer_data_transfer_link === true AND data_url is set
 *   - Otherwise fall back to api_url
 */

import type { ControllerConfig, NetLink, NodeConfig } from "./controllerConfig";

export type OpKind = "control" | "data";

export interface ResolvedLink {
  url: string;
  link: NetLink;          // which physical link this URL represents
  fallback: boolean;      // true if we wanted data_url but had to use api_url
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/+$/, "");
  return `http://${trimmed}`.replace(/\/+$/, "");
}

export function resolveLink(
  node: NodeConfig,
  op: OpKind,
  cfg: Pick<ControllerConfig, "network">
): ResolvedLink {
  const controlLink = node.control_link ?? cfg.network.control_network;
  const dataLink = node.data_link ?? cfg.network.data_network;

  if (op === "control") {
    return {
      url: normalizeUrl(node.api_url),
      link: controlLink,
      fallback: false,
    };
  }

  // Data operation
  const wantData = cfg.network.prefer_data_transfer_link && !!node.data_url?.trim();
  if (wantData && node.data_url) {
    return { url: normalizeUrl(node.data_url), link: dataLink, fallback: false };
  }
  return {
    url: normalizeUrl(node.api_url),
    link: controlLink,
    fallback: cfg.network.prefer_data_transfer_link && !node.data_url,
  };
}

/** Quick reachability probe — GET /system_stats (ComfyUI endpoint).
 *  Returns latency in ms or null on failure. */
export async function pingLink(url: string, timeoutMs = 4000): Promise<number | null> {
  const target = `${normalizeUrl(url)}/system_stats`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const t0 = performance.now();
  try {
    const res = await fetch(target, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) return null;
    return Math.round(performance.now() - t0);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface LinkProbeResult {
  nodeId: string;
  nodeName: string;
  control: { url: string; link: NetLink; latencyMs: number | null };
  data: { url: string; link: NetLink; latencyMs: number | null; usedFallback: boolean };
}

/** Probe both links for every enabled node. */
export async function probeAllNodes(cfg: ControllerConfig): Promise<LinkProbeResult[]> {
  const enabled = cfg.nodes.filter((n) => n.enabled);
  const results = await Promise.all(
    enabled.map(async (n): Promise<LinkProbeResult> => {
      const c = resolveLink(n, "control", cfg);
      const d = resolveLink(n, "data", cfg);
      const [controlLatency, dataLatency] = await Promise.all([
        pingLink(c.url),
        // Avoid duplicate probe when both resolve to the same URL.
        c.url === d.url ? Promise.resolve(null) : pingLink(d.url),
      ]);
      return {
        nodeId: n.id,
        nodeName: n.name,
        control: { url: c.url, link: c.link, latencyMs: controlLatency },
        data: {
          url: d.url,
          link: d.link,
          latencyMs: c.url === d.url ? controlLatency : dataLatency,
          usedFallback: d.fallback,
        },
      };
    })
  );
  return results;
}