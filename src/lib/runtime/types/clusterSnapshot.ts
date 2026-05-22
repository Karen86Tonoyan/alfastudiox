import type { JobSnapshot } from "@/lib/runtime/types/jobSnapshot";
import type { NodeHealth } from "@/lib/runtime/types/nodeHealth";

export type ClusterSnapshot = {
  id: string;
  createdAt: string;
  nodes: NodeHealth[];
  jobs: JobSnapshot[];
  source: "local" | "cloud";
  schemaVersion: 1;
};
