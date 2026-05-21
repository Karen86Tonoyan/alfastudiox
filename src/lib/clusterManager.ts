/**
 * Cluster Manager — multi-ComfyUI orchestration.
 * Allows the master node to delegate render jobs to worker nodes when local
 * resources are saturated.
 */
import { ComfyApiClient, type GpuInfo } from "@/lib/comfyApi";

export type NodeRole = "master" | "worker";
export type NodeStatus = "connected" | "offline" | "busy" | "error" | "connecting";
export type Strategy = "least-loaded" | "priority" | "tag-match" | "round-robin";

export interface ClusterNode {
  id: string;
  name: string;
  url: string;
  role: NodeRole;
  priority: number;        // 1 (high) – 10 (low)
  maxVramGB: number;
  tags: string[];
  enabled: boolean;
}

export interface ClusterNodeRuntime extends ClusterNode {
  status: NodeStatus;
  vramUsed: number;
  vramTotal: number;
  gpuTemp: number;
  queueSize: number;
  gpuName: string;
  lastError?: string;
  lastSeen?: number;
}

export interface ClusterPolicy {
  autoDelegate: boolean;
  thresholds: {
    vramPct: number;       // 0..100
    tempC: number;
    queueLen: number;
    waitSec: number;
  };
  strategy: Strategy;
  mirrorOutputs: boolean;
}

export interface DispatchResult {
  nodeId: string;
  nodeName: string;
  promptId: string | null;
  delegated: boolean;
  reason?: string;
}

const NODES_KEY = "alfa_cluster_nodes";
const POLICY_KEY = "alfa_cluster_policy";

const defaultPolicy: ClusterPolicy = {
  autoDelegate: true,
  thresholds: { vramPct: 90, tempC: 82, queueLen: 3, waitSec: 30 },
  strategy: "least-loaded",
  mirrorOutputs: false,
};

type Listener = () => void;

class ClusterManager {
  private nodes: ClusterNode[] = [];
  private clients = new Map<string, ComfyApiClient>();
  private runtime = new Map<string, Partial<ClusterNodeRuntime>>();
  private policy: ClusterPolicy = defaultPolicy;
  private listeners = new Set<Listener>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private rrCursor = 0;

  constructor() {
    this.load();
  }

  // ---- persistence ----
  private load() {
    try {
      const raw = localStorage.getItem(NODES_KEY);
      this.nodes = raw ? (JSON.parse(raw) as ClusterNode[]) : [];
    } catch {
      this.nodes = [];
    }
    try {
      const raw = localStorage.getItem(POLICY_KEY);
      this.policy = raw ? { ...defaultPolicy, ...JSON.parse(raw) } : defaultPolicy;
    } catch {
      this.policy = defaultPolicy;
    }
    // Spin up clients
    for (const n of this.nodes) this.ensureClient(n);
  }

  private save() {
    localStorage.setItem(NODES_KEY, JSON.stringify(this.nodes));
  }

  private savePolicy() {
    localStorage.setItem(POLICY_KEY, JSON.stringify(this.policy));
  }

  // ---- subscriptions ----
  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // ---- clients ----
  private ensureClient(node: ClusterNode) {
    if (!node.enabled) return;
    let client = this.clients.get(node.id);
    if (!client) {
      client = new ComfyApiClient(node.url);
      this.clients.set(node.id, client);
      client.on("status", (s) => {
        this.runtime.set(node.id, {
          ...this.runtime.get(node.id),
          status: s as NodeStatus,
          lastSeen: Date.now(),
        });
        this.notify();
      });
      client.on("gpu", (gpu) => {
        const g = gpu as GpuInfo;
        this.runtime.set(node.id, {
          ...this.runtime.get(node.id),
          vramUsed: g.vramUsed,
          vramTotal: g.vramTotal,
          gpuTemp: g.temp,
          gpuName: g.name,
          lastSeen: Date.now(),
        });
        this.notify();
      });
      client.on("queue_size", (size) => {
        this.runtime.set(node.id, {
          ...this.runtime.get(node.id),
          queueSize: size as number,
        });
        this.notify();
      });
      client.connect();
    } else if (client.baseUrl !== node.url) {
      client.disconnect();
      client.baseUrl = node.url;
      client.connect();
    }
  }

  // ---- public API ----
  getNodes(): ClusterNodeRuntime[] {
    return this.nodes.map((n) => ({
      ...n,
      status: "offline",
      vramUsed: 0,
      vramTotal: 0,
      gpuTemp: 0,
      queueSize: 0,
      gpuName: "",
      ...this.runtime.get(n.id),
    }) as ClusterNodeRuntime);
  }

  getPolicy(): ClusterPolicy {
    return this.policy;
  }

  getMaster(): ClusterNodeRuntime | null {
    const m = this.getNodes().find((n) => n.role === "master" && n.enabled);
    return m || null;
  }

  setPolicy(p: Partial<ClusterPolicy>) {
    this.policy = { ...this.policy, ...p, thresholds: { ...this.policy.thresholds, ...(p.thresholds || {}) } };
    this.savePolicy();
    this.notify();
  }

  addNode(node: Omit<ClusterNode, "id">) {
    const id = crypto.randomUUID();
    const newNode: ClusterNode = { ...node, id };
    // Enforce single master
    if (newNode.role === "master") {
      this.nodes = this.nodes.map((n) => ({ ...n, role: "worker" as NodeRole }));
    }
    this.nodes.push(newNode);
    this.save();
    this.ensureClient(newNode);
    this.notify();
    return newNode;
  }

  updateNode(id: string, patch: Partial<ClusterNode>) {
    const idx = this.nodes.findIndex((n) => n.id === id);
    if (idx < 0) return;
    if (patch.role === "master") {
      this.nodes = this.nodes.map((n) => ({ ...n, role: n.id === id ? "master" : "worker" }));
    }
    this.nodes[idx] = { ...this.nodes[idx], ...patch };
    this.save();
    this.ensureClient(this.nodes[idx]);
    // If disabled — disconnect
    if (patch.enabled === false) {
      const c = this.clients.get(id);
      c?.disconnect();
    }
    this.notify();
  }

  removeNode(id: string) {
    const c = this.clients.get(id);
    c?.disconnect();
    this.clients.delete(id);
    this.runtime.delete(id);
    this.nodes = this.nodes.filter((n) => n.id !== id);
    this.save();
    this.notify();
  }

  setMaster(id: string) {
    this.updateNode(id, { role: "master" });
  }

  async testNode(id: string): Promise<boolean> {
    const node = this.nodes.find((n) => n.id === id);
    if (!node) return false;
    const client = this.clients.get(id);
    if (!client) return false;
    const gpu = await client.getSystemStats();
    return gpu !== null;
  }

  // ---- polling ----
  startPolling(intervalMs = 5000) {
    if (this.pollTimer) return;
    const tick = () => {
      for (const node of this.nodes) {
        if (!node.enabled) continue;
        const c = this.clients.get(node.id);
        c?.getSystemStats();
      }
    };
    tick();
    this.pollTimer = setInterval(tick, intervalMs);
  }

  stopPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  // ---- delegation ----
  private isSaturated(rt: ClusterNodeRuntime): boolean {
    const t = this.policy.thresholds;
    const vramPct = rt.vramTotal > 0 ? (rt.vramUsed / rt.vramTotal) * 100 : 0;
    if (vramPct >= t.vramPct) return true;
    if (rt.gpuTemp >= t.tempC) return true;
    if (rt.queueSize >= t.queueLen) return true;
    return false;
  }

  pickWorker(requiredVramGB = 0, tags: string[] = []): ClusterNodeRuntime | null {
    const candidates = this.getNodes().filter(
      (n) =>
        n.enabled &&
        n.role === "worker" &&
        n.status === "connected" &&
        !this.isSaturated(n) &&
        (requiredVramGB === 0 || n.vramTotal - n.vramUsed >= requiredVramGB)
    );
    if (candidates.length === 0) return null;

    let pool = candidates;
    if (tags.length > 0) {
      const matching = candidates.filter((n) => tags.some((t) => n.tags.includes(t)));
      if (matching.length > 0) pool = matching;
    }

    switch (this.policy.strategy) {
      case "priority":
        return [...pool].sort((a, b) => a.priority - b.priority)[0];
      case "tag-match":
        return [...pool].sort((a, b) => {
          const ai = tags.filter((t) => a.tags.includes(t)).length;
          const bi = tags.filter((t) => b.tags.includes(t)).length;
          return bi - ai;
        })[0];
      case "round-robin": {
        const pick = pool[this.rrCursor % pool.length];
        this.rrCursor++;
        return pick;
      }
      case "least-loaded":
      default:
        return [...pool].sort((a, b) => {
          const av = a.vramTotal > 0 ? a.vramUsed / a.vramTotal : 1;
          const bv = b.vramTotal > 0 ? b.vramUsed / b.vramTotal : 1;
          return av + a.queueSize * 0.1 - (bv + b.queueSize * 0.1);
        })[0];
    }
  }

  async dispatch(
    workflow: object,
    opts: { requiredVramGB?: number; tags?: string[]; forceNodeId?: string } = {}
  ): Promise<DispatchResult> {
    // Force a specific node
    if (opts.forceNodeId) {
      const c = this.clients.get(opts.forceNodeId);
      const node = this.nodes.find((n) => n.id === opts.forceNodeId);
      if (!c || !node) return { nodeId: "", nodeName: "", promptId: null, delegated: false, reason: "Node not found" };
      const promptId = await c.queuePrompt(workflow);
      return { nodeId: node.id, nodeName: node.name, promptId, delegated: node.role !== "master" };
    }

    const master = this.getMaster();
    if (!master) {
      // No master — try any worker
      const w = this.pickWorker(opts.requiredVramGB, opts.tags);
      if (!w) return { nodeId: "", nodeName: "", promptId: null, delegated: false, reason: "No nodes available" };
      const c = this.clients.get(w.id)!;
      const promptId = await c.queuePrompt(workflow);
      return { nodeId: w.id, nodeName: w.name, promptId, delegated: true, reason: "No master configured" };
    }

    const shouldDelegate = this.policy.autoDelegate && this.isSaturated(master);
    if (shouldDelegate) {
      const w = this.pickWorker(opts.requiredVramGB, opts.tags);
      if (w) {
        const c = this.clients.get(w.id)!;
        const promptId = await c.queuePrompt(workflow);
        return {
          nodeId: w.id,
          nodeName: w.name,
          promptId,
          delegated: true,
          reason: `Master saturated → delegated to ${w.name}`,
        };
      }
    }

    // Use master
    const mc = this.clients.get(master.id);
    if (!mc) return { nodeId: master.id, nodeName: master.name, promptId: null, delegated: false, reason: "Master client missing" };
    const promptId = await mc.queuePrompt(workflow);
    return { nodeId: master.id, nodeName: master.name, promptId, delegated: false };
  }

  getClient(id: string): ComfyApiClient | undefined {
    return this.clients.get(id);
  }
}

export const clusterManager = new ClusterManager();
clusterManager.startPolling();