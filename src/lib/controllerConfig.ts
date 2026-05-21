/**
 * ComfyUI Controller configuration — single source of truth.
 * Lives in localStorage under `alfa_controller_config`. Importable/exportable
 * as a single JSON document (see ControllerConfigPage).
 *
 * Web-app context: filesystem paths (workflow_dir, output_dir, shared_*) are
 * stored as reference strings used by render hosts / shared SMB targets — the
 * browser does not access them directly.
 */

export type RoutingStrategy =
  | "least_busy"
  | "round_robin"
  | "priority_order"
  | "by_tag";

export type QueueMode = "fifo" | "priority";
export type LogLevel = "debug" | "info" | "warn" | "error";
export type NetLink = "ethernet" | "thunderbolt" | "wifi" | "auto";

export interface NodeConfig {
  id: string;
  name: string;
  api_url: string;
  /** Optional dedicated link for bulk data transfer (e.g. Thunderbolt host).
   *  Empty / unset → use api_url for both control and data. */
  data_url?: string;
  enabled: boolean;
  role: "master" | "worker";
  priority: number;            // 1 = highest
  max_parallel_jobs: number;
  tags: string[];
  /** Per-node override for which physical link carries control vs data.
   *  If unset, controller-level network section defaults apply. */
  control_link?: NetLink;
  data_link?: NetLink;
}

export interface ControllerSection {
  host: string;
  port: number;
  poll_interval_ms: number;
  request_timeout_sec: number;
  retry_count: number;
  log_level: LogLevel;
}

export interface QueueSection {
  mode: QueueMode;
  default_priority: number;
  max_queue_size: number;
  retry_failed_jobs: boolean;
  max_retries: number;
}

export interface RoutingSection {
  strategy: RoutingStrategy;
  fallback_enabled: boolean;
  respect_tags: boolean;
  avoid_offline_nodes: boolean;
}

export interface StorageSection {
  workflow_dir: string;
  output_dir: string;
  temp_dir: string;
  log_dir: string;
}

export interface NetworkSection {
  control_network: NetLink;
  data_network: NetLink;
  prefer_data_transfer_link: boolean;
  shared_input_path: string;
  shared_output_path: string;
}

export interface ExecutionSection {
  send_workflow_api: boolean;
  upload_inputs_before_run: boolean;
  download_outputs_after_run: boolean;
  cleanup_temp_after_success: boolean;
  cancel_on_timeout: boolean;
  job_timeout_sec: number;
}

export interface HealthSection {
  enabled: boolean;
  ping_interval_sec: number;
  mark_offline_after_failures: number;
  auto_recover: boolean;
}

export interface ControllerConfig {
  schemaVersion: 1;
  nodes: NodeConfig[];
  controller: ControllerSection;
  queue: QueueSection;
  routing: RoutingSection;
  storage: StorageSection;
  network: NetworkSection;
  execution: ExecutionSection;
  health: HealthSection;
}

export const CONFIG_KEY = "alfa_controller_config";

export const DEFAULT_CONFIG: ControllerConfig = {
  schemaVersion: 1,
  nodes: [
    {
      id: "node1",
      name: "main-gpu",
      api_url: "http://192.168.1.10:8188",
      enabled: true,
      role: "master",
      priority: 1,
      max_parallel_jobs: 1,
      tags: ["sdxl", "fast"],
    },
  ],
  controller: {
    host: "0.0.0.0",
    port: 9000,
    poll_interval_ms: 2000,
    request_timeout_sec: 30,
    retry_count: 2,
    log_level: "info",
  },
  queue: {
    mode: "priority",
    default_priority: 5,
    max_queue_size: 500,
    retry_failed_jobs: true,
    max_retries: 2,
  },
  routing: {
    strategy: "least_busy",
    fallback_enabled: true,
    respect_tags: true,
    avoid_offline_nodes: true,
  },
  storage: {
    workflow_dir: "C:\\Users\\PC\\ALFA_WORKSPACE\\comfy-control\\workflows",
    output_dir: "C:\\Users\\PC\\ALFA_WORKSPACE\\comfy-control\\outputs",
    temp_dir: "C:\\Users\\PC\\ALFA_WORKSPACE\\comfy-control\\temp",
    log_dir: "C:\\Users\\PC\\ALFA_WORKSPACE\\comfy-control\\logs",
  },
  network: {
    control_network: "ethernet",
    data_network: "thunderbolt",
    prefer_data_transfer_link: true,
    shared_input_path: "\\\\NODE-STORAGE\\comfy-input",
    shared_output_path: "\\\\NODE-STORAGE\\comfy-output",
  },
  execution: {
    send_workflow_api: true,
    upload_inputs_before_run: true,
    download_outputs_after_run: true,
    cleanup_temp_after_success: false,
    cancel_on_timeout: true,
    job_timeout_sec: 7200,
  },
  health: {
    enabled: true,
    ping_interval_sec: 10,
    mark_offline_after_failures: 3,
    auto_recover: true,
  },
};

// ---- validation / merge ----

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function num(v: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : fallback;
}

function str(v: unknown, fallback: string, maxLen = 1024): string {
  return typeof v === "string" && v.length <= maxLen ? v : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function sanitizeNode(raw: unknown, idx: number): NodeConfig {
  const r = isObj(raw) ? raw : {};
  const tags = Array.isArray(r.tags)
    ? r.tags.filter((t): t is string => typeof t === "string").slice(0, 32)
    : [];
  const linkAllowed = ["ethernet", "thunderbolt", "wifi", "auto"] as const;
  const node: NodeConfig = {
    id: str(r.id, `node${idx + 1}`, 64),
    name: str(r.name, `node-${idx + 1}`, 120),
    api_url: str(r.api_url, "http://localhost:8188", 512),
    enabled: bool(r.enabled, true),
    role: oneOf(r.role, ["master", "worker"] as const, "worker"),
    priority: num(r.priority, 5, 1, 100),
    max_parallel_jobs: num(r.max_parallel_jobs, 1, 1, 32),
    tags,
  };
  if (typeof r.data_url === "string" && r.data_url.trim().length > 0) {
    node.data_url = str(r.data_url, "", 512);
  }
  if (typeof r.control_link === "string") {
    node.control_link = oneOf(r.control_link, linkAllowed, "auto");
  }
  if (typeof r.data_link === "string") {
    node.data_link = oneOf(r.data_link, linkAllowed, "auto");
  }
  return node;
}

export function sanitizeConfig(raw: unknown): ControllerConfig {
  const r = isObj(raw) ? raw : {};
  const d = DEFAULT_CONFIG;

  const nodesArr = Array.isArray(r.nodes) ? r.nodes : d.nodes;
  const nodes = nodesArr.map(sanitizeNode);
  // Enforce single master
  let masterSeen = false;
  for (const n of nodes) {
    if (n.role === "master") {
      if (masterSeen) n.role = "worker";
      masterSeen = true;
    }
  }

  const c = isObj(r.controller) ? r.controller : {};
  const q = isObj(r.queue) ? r.queue : {};
  const ro = isObj(r.routing) ? r.routing : {};
  const s = isObj(r.storage) ? r.storage : {};
  const nw = isObj(r.network) ? r.network : {};
  const ex = isObj(r.execution) ? r.execution : {};
  const h = isObj(r.health) ? r.health : {};

  return {
    schemaVersion: 1,
    nodes,
    controller: {
      host: str(c.host, d.controller.host, 256),
      port: num(c.port, d.controller.port, 1, 65535),
      poll_interval_ms: num(c.poll_interval_ms, d.controller.poll_interval_ms, 100, 600000),
      request_timeout_sec: num(c.request_timeout_sec, d.controller.request_timeout_sec, 1, 3600),
      retry_count: num(c.retry_count, d.controller.retry_count, 0, 20),
      log_level: oneOf(c.log_level, ["debug", "info", "warn", "error"] as const, d.controller.log_level),
    },
    queue: {
      mode: oneOf(q.mode, ["fifo", "priority"] as const, d.queue.mode),
      default_priority: num(q.default_priority, d.queue.default_priority, 1, 100),
      max_queue_size: num(q.max_queue_size, d.queue.max_queue_size, 1, 100000),
      retry_failed_jobs: bool(q.retry_failed_jobs, d.queue.retry_failed_jobs),
      max_retries: num(q.max_retries, d.queue.max_retries, 0, 20),
    },
    routing: {
      strategy: oneOf(
        ro.strategy,
        ["least_busy", "round_robin", "priority_order", "by_tag"] as const,
        d.routing.strategy
      ),
      fallback_enabled: bool(ro.fallback_enabled, d.routing.fallback_enabled),
      respect_tags: bool(ro.respect_tags, d.routing.respect_tags),
      avoid_offline_nodes: bool(ro.avoid_offline_nodes, d.routing.avoid_offline_nodes),
    },
    storage: {
      workflow_dir: str(s.workflow_dir, d.storage.workflow_dir),
      output_dir: str(s.output_dir, d.storage.output_dir),
      temp_dir: str(s.temp_dir, d.storage.temp_dir),
      log_dir: str(s.log_dir, d.storage.log_dir),
    },
    network: {
      control_network: oneOf(
        nw.control_network,
        ["ethernet", "thunderbolt", "wifi", "auto"] as const,
        d.network.control_network
      ),
      data_network: oneOf(
        nw.data_network,
        ["ethernet", "thunderbolt", "wifi", "auto"] as const,
        d.network.data_network
      ),
      prefer_data_transfer_link: bool(nw.prefer_data_transfer_link, d.network.prefer_data_transfer_link),
      shared_input_path: str(nw.shared_input_path, d.network.shared_input_path),
      shared_output_path: str(nw.shared_output_path, d.network.shared_output_path),
    },
    execution: {
      send_workflow_api: bool(ex.send_workflow_api, d.execution.send_workflow_api),
      upload_inputs_before_run: bool(ex.upload_inputs_before_run, d.execution.upload_inputs_before_run),
      download_outputs_after_run: bool(ex.download_outputs_after_run, d.execution.download_outputs_after_run),
      cleanup_temp_after_success: bool(ex.cleanup_temp_after_success, d.execution.cleanup_temp_after_success),
      cancel_on_timeout: bool(ex.cancel_on_timeout, d.execution.cancel_on_timeout),
      job_timeout_sec: num(ex.job_timeout_sec, d.execution.job_timeout_sec, 1, 86400),
    },
    health: {
      enabled: bool(h.enabled, d.health.enabled),
      ping_interval_sec: num(h.ping_interval_sec, d.health.ping_interval_sec, 1, 3600),
      mark_offline_after_failures: num(h.mark_offline_after_failures, d.health.mark_offline_after_failures, 1, 100),
      auto_recover: bool(h.auto_recover, d.health.auto_recover),
    },
  };
}

export function loadControllerConfig(): ControllerConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return sanitizeConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveControllerConfig(cfg: ControllerConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

export function exportControllerConfig(cfg: ControllerConfig): void {
  const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  a.href = url;
  a.download = `comfy-controller-config-${ts}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}