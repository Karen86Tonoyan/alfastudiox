/**
 * ComfyUI WebSocket API Client
 * Komunikacja z ComfyUI backend przez WebSocket + REST
 */

export type ComfyStatus = "connected" | "disconnected" | "connecting" | "error";
export type QueueItemStatus = "running" | "queued" | "done" | "error" | "cancelled";

export interface GpuInfo {
  name: string;
  temp: number;
  tempMax: number;
  vramUsed: number;
  vramTotal: number;
  utilization: number;
  fanSpeed: number;
  power: number;
  powerMax: number;
  cudaAvailable: boolean;
}

export interface RenderProgress {
  promptId: string;
  node: string;
  step: number;
  totalSteps: number;
  percentage: number;
}

export interface QueueItem {
  id: string;
  name: string;
  status: QueueItemStatus;
  progress?: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  workflow?: string;
  model?: string;
}

export interface ErrorLogEntry {
  id: string;
  timestamp: number;
  type: "crash" | "oom" | "timeout" | "quality_reject" | "cuda_error" | "node_error";
  message: string;
  node?: string;
  workflow?: string;
  model?: string;
  gpuState?: Partial<GpuInfo>;
  stackTrace?: string;
}

export interface ModelStrategy {
  id: string;
  name: string;
  category: "movement" | "details" | "character" | "background" | "compositing";
  node: string;
  vramRequired: number;
  priority: number;
}

export type ComfyModelType = "checkpoints" | "loras" | "vae" | "embeddings" | "controlnet" | "upscale_models" | "hypernetworks";

export interface ComfyModelInfo {
  name: string;
  type: ComfyModelType;
  path: string;
  size?: number;
}

// --- Event system ---

type EventHandler = (...args: unknown[]) => void;

class EventEmitter {
  private handlers: Record<string, EventHandler[]> = {};

  on(event: string, handler: EventHandler) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler) {
    this.handlers[event] = (this.handlers[event] || []).filter((h) => h !== handler);
  }

  emit(event: string, ...args: unknown[]) {
    (this.handlers[event] || []).forEach((h) => h(...args));
  }
}

// --- ComfyUI API Client ---

export class ComfyApiClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _status: ComfyStatus = "disconnected";
  private _queue: QueueItem[] = [];
  private _errors: ErrorLogEntry[] = [];
  private _progress: RenderProgress | null = null;
  private _gpu: GpuInfo | null = null;
  private _baseUrl: string;

  constructor(baseUrl?: string) {
    super();
    this._baseUrl = baseUrl || localStorage.getItem("comfy_server_url") || "localhost:8188";
  }

  get baseUrl() { return this._baseUrl; }
  set baseUrl(url: string) {
    this._baseUrl = url;
    localStorage.setItem("comfy_server_url", url);
  }

  /** Returns the full HTTP(S) base URL for REST calls */
  get httpUrl(): string {
    const clean = this._baseUrl.replace(/^https?:\/\//, "").replace(/^wss?:\/\//, "");
    const protocol = clean.includes("ngrok") || clean.includes(".app") ? "https" : "http";
    return `${protocol}://${clean}`;
  }

  get status() { return this._status; }
  get queue() { return this._queue; }
  get errors() { return this._errors; }
  get progress() { return this._progress; }
  get gpu() { return this._gpu; }

  connect() {
    if (this._status === "connected" || this._status === "connecting") return;
    this._status = "connecting";
    this.emit("status", this._status);

    try {
      const wsProtocol = this._baseUrl.includes("ngrok") || this._baseUrl.includes("https") ? "wss" : "ws";
      const cleanUrl = this._baseUrl.replace(/^https?:\/\//, "").replace(/^wss?:\/\//, "");
      this.ws = new WebSocket(`${wsProtocol}://${cleanUrl}/ws`);

      this.ws.onopen = () => {
        this._status = "connected";
        this.emit("status", this._status);
        console.log("[ComfyAPI] Connected");
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch {
          // binary data (previews) — ignore for now
        }
      };

      this.ws.onclose = () => {
        this._status = "disconnected";
        this.emit("status", this._status);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this._status = "error";
        this.emit("status", this._status);
      };
    } catch {
      this._status = "error";
      this.emit("status", this._status);
      this.scheduleReconnect();
    }
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this._status = "disconnected";
    this.emit("status", this._status);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 5000);
  }

  private handleMessage(msg: Record<string, unknown>) {
    const rawData = msg.data;
    const data = rawData !== null && typeof rawData === "object" ? rawData as Record<string, unknown> : undefined;
    switch (msg.type) {
      case "progress": {
        const progressData = data as { prompt_id: string; node?: string; value: number; max: number } | undefined;
        if (progressData) {
          this._progress = {
            promptId: progressData.prompt_id,
            node: progressData.node || "",
            step: progressData.value,
            totalSteps: progressData.max,
            percentage: Math.round((progressData.value / progressData.max) * 100),
          };
          this.emit("progress", this._progress);
        }
        break;
      }

      case "executing":
        if (data?.node === null) {
          // execution done
          this._progress = null;
          this.emit("execution_done", data?.prompt_id);
        } else {
          this.emit("executing_node", data?.node);
        }
        break;

      case "execution_error":
        this.logError({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          type: "node_error",
          message: (data?.exception_message as string) || "Unknown error",
          node: data?.node_type as string | undefined,
          stackTrace: (data?.traceback as string[] | undefined)?.join("\n"),
        });
        break;

      case "status": {
        const statusData = data as { status?: { exec_info?: { queue_remaining?: number } } } | undefined;
        if (statusData?.status?.exec_info) {
          const pending = statusData.status.exec_info.queue_remaining;
          this.emit("queue_size", pending);
        }
        break;
      }
    }
  }

  // --- REST API ---

  async queuePrompt(workflow: object, clientId?: string): Promise<string | null> {
    try {
      const res = await fetch(`${this.httpUrl}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: workflow, client_id: clientId }),
      });
      const data = await res.json();
      return data.prompt_id || null;
    } catch (e) {
      this.logError({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: "crash",
        message: `Failed to queue prompt: ${e}`,
      });
      return null;
    }
  }

  async getQueue(): Promise<unknown> {
    try {
      const res = await fetch(`${this.httpUrl}/queue`);
      return await res.json();
    } catch {
      return null;
    }
  }

  async cancelCurrent(): Promise<void> {
    try {
      await fetch(`${this.httpUrl}/interrupt`, { method: "POST" });
    } catch { /* ignore */ }
  }

  async clearQueue(): Promise<void> {
    try {
      await fetch(`${this.httpUrl}/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear: true }),
      });
    } catch { /* ignore */ }
  }

  async getSystemStats(): Promise<GpuInfo | null> {
    try {
      const res = await fetch(`${this.httpUrl}/system_stats`);
      const data = await res.json();
      const device = data.devices?.[0];
      if (device) {
        this._gpu = {
          name: device.name || "Unknown GPU",
          temp: device.temperature || 0,
          tempMax: 90,
          vramUsed: (device.vram_total - device.vram_free) / (1024 ** 3),
          vramTotal: device.vram_total / (1024 ** 3),
          utilization: 0,
          fanSpeed: 0,
          power: 0,
          powerMax: 0,
          cudaAvailable: device.type === "cuda",
        };
        this.emit("gpu", this._gpu);
        return this._gpu;
      }
      return null;
    } catch {
      return null;
    }
  }

  // --- GPU protection ---

  async checkGpuSafety(): Promise<boolean> {
    const gpu = await this.getSystemStats();
    if (!gpu) return true; // can't check, allow

    if (gpu.temp > 80 || gpu.vramUsed > gpu.vramTotal * 0.94) {
      this.emit("gpu_warning", {
        temp: gpu.temp,
        vramUsed: gpu.vramUsed,
        vramTotal: gpu.vramTotal,
      });

      if (gpu.temp > 85 || gpu.vramUsed > gpu.vramTotal * 0.97) {
        await this.cancelCurrent();
        this.logError({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          type: "oom",
          message: `GPU protection triggered: temp=${Math.round(gpu.temp)}°C, VRAM=${gpu.vramUsed.toFixed(1)}/${gpu.vramTotal.toFixed(1)}GB`,
          gpuState: gpu,
        });
        return false;
      }
    }
    return true;
  }

  // --- Error logging ---

  logError(entry: ErrorLogEntry) {
    this._errors = [entry, ...this._errors].slice(0, 200);
    this.emit("error_logged", entry);
  }

  clearErrors() {
    this._errors = [];
    this.emit("errors_cleared");
  }

  // --- Model management ---

  async getInstalledModels(type: ComfyModelType): Promise<ComfyModelInfo[]> {
    try {
      // ComfyUI object_info endpoint provides model lists through node definitions
      const nodeMap: Record<ComfyModelType, string> = {
        checkpoints: "CheckpointLoaderSimple",
        loras: "LoraLoader",
        vae: "VAELoader",
        embeddings: "CLIPTextEncode",
        controlnet: "ControlNetLoader",
        upscale_models: "UpscaleModelLoader",
        hypernetworks: "HypernetworkLoader",
      };

      const nodeName = nodeMap[type];
      const res = await fetch(`${this.httpUrl}/object_info/${nodeName}`, {
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      const nodeInfo = data[nodeName];
      if (!nodeInfo) return [];

      // Extract model names from node input definition
      const inputKey = type === "checkpoints" ? "ckpt_name"
        : type === "loras" ? "lora_name"
        : type === "vae" ? "vae_name"
        : type === "controlnet" ? "control_net_name"
        : type === "upscale_models" ? "model_name"
        : type === "hypernetworks" ? "hypernetwork_name"
        : null;

      if (!inputKey) return [];

      const required = nodeInfo.input?.required || {};
      const modelList: string[] = required[inputKey]?.[0] || [];

      return modelList.map((name) => ({
        name: name.replace(/\\/g, "/").split("/").pop() || name,
        type,
        path: name,
      }));
    } catch {
      return [];
    }
  }

  async getAllModels(): Promise<Record<ComfyModelType, ComfyModelInfo[]>> {
    const types: ComfyModelType[] = ["checkpoints", "loras", "vae", "controlnet", "upscale_models"];
    const results = await Promise.all(types.map((t) => this.getInstalledModels(t)));
    const map: Record<string, ComfyModelInfo[]> = {};
    types.forEach((t, i) => { map[t] = results[i]; });
    return map as Record<ComfyModelType, ComfyModelInfo[]>;
  }
}

// --- Model strategies ---

export const MODEL_STRATEGIES: ModelStrategy[] = [
  { id: "wan", name: "WanVideoWrapper", category: "movement", node: "WanVideoWrapper", vramRequired: 8, priority: 1 },
  { id: "supir", name: "SUPIR Upscale", category: "details", node: "SUPIR_Upscale", vramRequired: 6, priority: 2 },
  { id: "liveportrait", name: "LivePortrait", category: "character", node: "LivePortrait", vramRequired: 4, priority: 3 },
  { id: "flux", name: "Flux Dev", category: "background", node: "FluxSampler", vramRequired: 10, priority: 1 },
  { id: "animatediff", name: "AnimateDiff", category: "movement", node: "AnimateDiff", vramRequired: 7, priority: 2 },
  { id: "controlnet", name: "ControlNet", category: "compositing", node: "ControlNetApply", vramRequired: 3, priority: 3 },
  { id: "ipadapter", name: "IPAdapter", category: "character", node: "IPAdapter", vramRequired: 5, priority: 2 },
  { id: "florence2", name: "Florence2", category: "details", node: "Florence2", vramRequired: 2, priority: 1 },
];

// --- Singleton ---
export const comfyApi = new ComfyApiClient();
