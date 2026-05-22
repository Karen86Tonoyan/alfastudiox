import { supabase } from "@/integrations/supabase/client";
import { loadControllerConfig } from "@/lib/controllerConfig";
import { LOCAL_OPERATOR_MODE } from "@/lib/runtimeMode";
import { getJobProviderForJob } from "@/lib/runtime/providerRegistry";

export type JobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "paused";

export interface ControllerJob {
  id: string;
  user_id: string;
  name: string;
  prompt: string | null;
  status: JobStatus;
  priority: number;
  node_id: string | null;
  node_name: string | null;
  comfy_prompt_id: string | null;
  workflow: unknown;
  params: Record<string, unknown> | null;
  result_urls: string[] | null;
  error: string | null;
  progress: number;
  required_vram_gb: number | null;
  tags: string[] | null;
  queued_at: string;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  attempts: number;
  created_at: string;
  updated_at: string;
}

export interface EnqueueInput {
  name: string;
  prompt?: string;
  workflow: object;
  priority?: number;
  requiredVramGB?: number;
  tags?: string[];
  forceNodeId?: string;
  params?: Record<string, unknown>;
}

const TABLE = "controller_jobs";
const LOCAL_KEY = "alfa_local_controller_jobs";
const LOCAL_USER_ID = "local-operator";

type JobEvent = "INSERT" | "UPDATE" | "DELETE";

const localListeners = new Set<(job: ControllerJob, event: JobEvent) => void>();

function emitLocal(job: ControllerJob, event: JobEvent) {
  for (const listener of localListeners) listener(job, event);
}

function readLocalJobs(): ControllerJob[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as ControllerJob[]) : [];
  } catch {
    return [];
  }
}

function writeLocalJobs(jobs: ControllerJob[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(jobs));
}

function makeLocalJob(input: EnqueueInput, userId: string): ControllerJob {
  const now = new Date().toISOString();
  const providerId = input.params?.providerId ?? (loadControllerConfig().hybrid_burst.enabled ? "hybrid-burst" : "comfy-cluster");
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    name: input.name,
    prompt: input.prompt ?? null,
    status: "queued",
    priority: input.priority ?? 5,
    node_id: null,
    node_name: null,
    comfy_prompt_id: null,
    workflow: input.workflow,
    params: { forceNodeId: input.forceNodeId, providerId, ...(input.params || {}) },
    result_urls: null,
    error: null,
    progress: 0,
    required_vram_gb: input.requiredVramGB ?? null,
    tags: input.tags ?? null,
    queued_at: now,
    started_at: null,
    finished_at: null,
    duration_ms: null,
    attempts: 0,
    created_at: now,
    updated_at: now,
  };
}

async function getUserId(): Promise<string> {
  if (LOCAL_OPERATOR_MODE) return LOCAL_USER_ID;
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("You must be signed in to queue jobs");
  return data.user.id;
}

export async function enqueueJob(input: EnqueueInput): Promise<ControllerJob> {
  const userId = await getUserId();
  const providerId = input.params?.providerId ?? (loadControllerConfig().hybrid_burst.enabled ? "hybrid-burst" : "comfy-cluster");

  if (LOCAL_OPERATOR_MODE) {
    const job = makeLocalJob(input, userId);
    const jobs = readLocalJobs();
    jobs.unshift(job);
    writeLocalJobs(jobs);
    emitLocal(job, "INSERT");
    return job;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert([{
      user_id: userId,
      name: input.name,
      prompt: input.prompt ?? null,
      workflow: input.workflow as never,
      priority: input.priority ?? 5,
      required_vram_gb: input.requiredVramGB ?? null,
      tags: input.tags ?? null,
      params: { forceNodeId: input.forceNodeId, providerId, ...(input.params || {}) } as never,
      status: "queued",
    }])
    .select()
    .single();
  if (error) throw error;
  return data as ControllerJob;
}

export async function listJobs(opts: { status?: JobStatus; limit?: number } = {}): Promise<ControllerJob[]> {
  if (LOCAL_OPERATOR_MODE) {
    let jobs = readLocalJobs().sort((a, b) => b.queued_at.localeCompare(a.queued_at));
    if (opts.status) jobs = jobs.filter((job) => job.status === opts.status);
    if (opts.limit) jobs = jobs.slice(0, opts.limit);
    return jobs;
  }

  let q = supabase.from(TABLE).select("*").order("queued_at", { ascending: false });
  if (opts.status) q = q.eq("status", opts.status);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as ControllerJob[];
}

export async function getJob(id: string): Promise<ControllerJob | null> {
  if (LOCAL_OPERATOR_MODE) {
    return readLocalJobs().find((job) => job.id === id) || null;
  }

  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as ControllerJob | null;
}

export async function updateJob(id: string, patch: Partial<ControllerJob>): Promise<void> {
  if (LOCAL_OPERATOR_MODE) {
    const jobs = readLocalJobs();
    const idx = jobs.findIndex((job) => job.id === id);
    if (idx < 0) return;
    jobs[idx] = { ...jobs[idx], ...patch, updated_at: new Date().toISOString() };
    writeLocalJobs(jobs);
    emitLocal(jobs[idx], "UPDATE");
    return;
  }

  const { error } = await supabase.from(TABLE).update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function deleteJob(id: string): Promise<void> {
  if (LOCAL_OPERATOR_MODE) {
    const jobs = readLocalJobs();
    const existing = jobs.find((job) => job.id === id);
    writeLocalJobs(jobs.filter((job) => job.id !== id));
    if (existing) emitLocal(existing, "DELETE");
    return;
  }

  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

export async function clearFinishedJobs(): Promise<number> {
  if (LOCAL_OPERATOR_MODE) {
    const jobs = readLocalJobs();
    const finished = jobs.filter((job) => ["completed", "cancelled", "failed"].includes(job.status));
    writeLocalJobs(jobs.filter((job) => !["completed", "cancelled", "failed"].includes(job.status)));
    for (const job of finished) emitLocal(job, "DELETE");
    return finished.length;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .in("status", ["completed", "cancelled", "failed"])
    .select("id");
  if (error) throw error;
  return (data || []).length;
}

export function subscribeJobs(onChange: (job: ControllerJob, event: JobEvent) => void) {
  if (LOCAL_OPERATOR_MODE) {
    localListeners.add(onChange);
    return () => { localListeners.delete(onChange); };
  }

  const channel = supabase
    .channel("controller_jobs_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE },
      (payload) => {
        const job = (payload.new || payload.old) as ControllerJob;
        onChange(job, payload.eventType as JobEvent);
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export async function runJob(job: ControllerJob): Promise<void> {
  await updateJob(job.id, {
    status: "running",
    started_at: new Date().toISOString(),
    attempts: job.attempts + 1,
    error: null,
  });

  const startedAt = Date.now();

  try {
    const provider = getJobProviderForJob(job);
    const handle = await provider.submit(job);

    await updateJob(job.id, {
      status: "completed",
      node_id: handle.nodeId ?? null,
      node_name: handle.nodeName ?? null,
      comfy_prompt_id: handle.externalId,
      progress: 100,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
    });
  } catch (e) {
    await updateJob(job.id, {
      status: "failed",
      error: e instanceof Error ? e.message : String(e),
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
    });
  }
}

export async function recoverStaleJobs(): Promise<number> {
  const userId = await getUserId();

  if (LOCAL_OPERATOR_MODE) {
    const jobs = readLocalJobs();
    let recovered = 0;
    const next = jobs.map((job) => {
      if (job.user_id === userId && job.status === "running") {
        recovered++;
        return {
          ...job,
          status: "queued" as JobStatus,
          started_at: null,
          updated_at: new Date().toISOString(),
        };
      }
      return job;
    });
    writeLocalJobs(next);
    for (const job of next.filter((entry) => entry.user_id === userId && entry.status === "queued")) {
      emitLocal(job, "UPDATE");
    }
    return recovered;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ status: "queued", started_at: null })
    .eq("user_id", userId)
    .eq("status", "running")
    .select("id");
  if (error) throw error;
  return (data || []).length;
}

let processorTimer: ReturnType<typeof setInterval> | null = null;
let processorBusy = false;

export function startQueueProcessor(intervalMs = 4000, maxParallel = 1) {
  if (processorTimer) return;
  const tick = async () => {
    if (processorBusy) return;
    processorBusy = true;
    try {
      const queued = await listJobs({ status: "queued", limit: maxParallel });
      queued.sort((a, b) => a.priority - b.priority);
      for (const job of queued) await runJob(job);
    } catch (e) {
      console.warn("[jobQueue] processor error:", e);
    } finally {
      processorBusy = false;
    }
  };
  tick();
  processorTimer = setInterval(tick, intervalMs);
}

export function stopQueueProcessor() {
  if (processorTimer) clearInterval(processorTimer);
  processorTimer = null;
}

export function isProcessorRunning() {
  return processorTimer !== null;
}
