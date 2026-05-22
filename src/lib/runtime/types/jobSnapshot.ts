export type JobSnapshotStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type JobSnapshot = {
  jobId: string;
  status: JobSnapshotStatus;
  createdAt: string;
  completedAt?: string;
};
