import type { ControllerJob } from "@/lib/jobQueue";

export type ProviderJobState =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface JobHandle {
  providerId: string;
  externalId: string | null;
  nodeId?: string | null;
  nodeName?: string | null;
  acceptedAt: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderHealth {
  ok: boolean;
  message?: string;
  details?: Record<string, unknown>;
}

export interface JobStatusSnapshot {
  state: ProviderJobState;
  progress?: number;
  error?: string | null;
  nodeId?: string | null;
  nodeName?: string | null;
}

export interface JobProvider {
  id: string;
  label: string;
  submit(job: ControllerJob): Promise<JobHandle>;
  cancel(handle: JobHandle, job: ControllerJob): Promise<void>;
  status(handle: JobHandle, job: ControllerJob): Promise<JobStatusSnapshot>;
  health(): Promise<ProviderHealth>;
}
