/**
 * Job Queue Persistence — trwała kolejka zadań renderowania.
 * Joby i ich statusy są zapisywane w Supabase (controller_jobs), dzięki czemu
 * przeżywają restart kontrolera / przeglądarki. Dispatch idzie przez clusterManager.
 */
import { supabase } from "@/integrations/supabase/client";
import { clusterManager } from "@/lib/clusterManager";

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

async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Musisz być zalogowany, aby kolejkować zadania");
  return data.user.id;
}

/** Wstaw job do trwałej kolejki (status: queued). */
export async function enqueueJob(input: EnqueueInput): Promise<ControllerJob> {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from(TABLE)
    .insert([{
      user_id,
      name: input.name,
      prompt: input.prompt ?? null,
      workflow: input.workflow as never,
      priority: input.priority ?? 5,
      required_vram_gb: input.requiredVramGB ?? null,
      tags: input.tags ?? null,
      params: { forceNodeId: input.forceNodeId, ...(input.params || {}) } as never,
      status: "queued",
    }])
    .select()
    .single();
  if (error) throw error;
  return data as ControllerJob;
}

/** Lista jobów użytkownika (najnowsze pierwsze). */
export async function listJobs(opts: { status?: JobStatus; limit?: number } = {}): Promise<ControllerJob[]> {
  let q = supabase.from(TABLE).select("*").order("queued_at", { ascending: false });
  if (opts.status) q = q.eq("status", opts.status);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as ControllerJob[];
}

export async function getJob(id: string): Promise<ControllerJob | null> {
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as ControllerJob | null;
}

export async function updateJob(id: string, patch: Partial<ControllerJob>): Promise<void> {
  const { error } = await supabase.from(TABLE).update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function deleteJob(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

export async function clearFinishedJobs(): Promise<number> {
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .in("status", ["completed", "cancelled", "failed"])
    .select("id");
  if (error) throw error;
  return (data || []).length;
}

/** Realtime: subskrybuj zmiany jobów bieżącego użytkownika. */
export function subscribeJobs(onChange: (job: ControllerJob, event: "INSERT" | "UPDATE" | "DELETE") => void) {
  const channel = supabase
    .channel("controller_jobs_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE },
      (payload) => {
        const job = (payload.new || payload.old) as ControllerJob;
        onChange(job, payload.eventType as "INSERT" | "UPDATE" | "DELETE");
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

/** Wyślij pojedynczy job do klastra i zaktualizuj jego status w bazie. */
export async function runJob(job: ControllerJob): Promise<void> {
  await updateJob(job.id, {
    status: "running",
    started_at: new Date().toISOString(),
    attempts: job.attempts + 1,
    error: null,
  });
  const startedAt = Date.now();
  try {
    const forceNodeId = (job.params as { forceNodeId?: string } | null)?.forceNodeId;
    const result = await clusterManager.dispatch(job.workflow as object, {
      requiredVramGB: job.required_vram_gb ?? 0,
      tags: job.tags ?? [],
      forceNodeId,
    });
    if (!result.promptId) {
      await updateJob(job.id, {
        status: "failed",
        error: result.reason || "Dispatch nie zwrócił prompt_id",
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
      });
      return;
    }
    await updateJob(job.id, {
      status: "completed",
      node_id: result.nodeId,
      node_name: result.nodeName,
      comfy_prompt_id: result.promptId,
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

/** Loader/recovery: po restarcie kontrolera weź wszystkie joby `running`
 * i oznacz je jako `queued` (z incrementem attempts), żeby zostały podjęte ponownie. */
export async function recoverStaleJobs(): Promise<number> {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status: "queued", started_at: null })
    .eq("user_id", user_id)
    .eq("status", "running")
    .select("id");
  if (error) throw error;
  return (data || []).length;
}

/** Procesor kolejki: cyklicznie podejmuje queued joby (po priorytecie) i je uruchamia.
 *  Prosty in-process worker — można uruchomić z dowolnej zakładki. */
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
      for (const j of queued) await runJob(j);
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