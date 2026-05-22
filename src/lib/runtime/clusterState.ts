import { listJobs, subscribeJobs, type ControllerJob } from "@/lib/jobQueue";
import { BridgeBackedSnapshotSync, mergeLatestCloudSnapshot } from "@/lib/runtime/cloudSync/cloudSnapshotSync";
import { collectNodeHealth } from "@/lib/runtime/nodeHealth";
import { getLatestLocalSnapshot, saveLocalSnapshot } from "@/lib/runtime/nodeSnapshots";
import type { ClusterSnapshot } from "@/lib/runtime/types/clusterSnapshot";
import type { JobSnapshot } from "@/lib/runtime/types/jobSnapshot";
import type { NodeHealth } from "@/lib/runtime/types/nodeHealth";
import { clusterManager } from "@/lib/clusterManager";

let stopRuntime: (() => void) | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;

const cloudSync = new BridgeBackedSnapshotSync();

function mapJobSnapshot(job: ControllerJob): JobSnapshot {
  return {
    jobId: job.id,
    status: job.status === "cancelled" || job.status === "paused" ? "failed" : job.status,
    createdAt: job.queued_at,
    completedAt: job.finished_at ?? undefined,
  };
}

export class ClusterStateManager {
  private nodeHealth: Map<string, NodeHealth> = new Map();
  private snapshot: ClusterSnapshot = {
    id: crypto.randomUUID(),
    createdAt: new Date(0).toISOString(),
    nodes: [],
    jobs: [],
    source: "local",
    schemaVersion: 1,
  };

  updateNodeHealth(nodeId: string, health: NodeHealth): void {
    this.nodeHealth.set(nodeId, health);
  }

  takeSnapshot(nodes: NodeHealth[], jobs: JobSnapshot[], source: "local" | "cloud" = "local"): ClusterSnapshot {
    for (const node of nodes) {
      this.nodeHealth.set(node.nodeId, node);
    }
    this.snapshot = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      nodes,
      jobs,
      source,
      schemaVersion: 1,
    };
    return this.snapshot;
  }

  setState(snapshot: ClusterSnapshot): void {
    this.snapshot = snapshot;
    this.nodeHealth.clear();
    for (const node of snapshot.nodes) {
      this.nodeHealth.set(node.nodeId, node);
    }
  }

  getState(): ClusterSnapshot {
    return this.snapshot;
  }
}

const clusterStateManager = new ClusterStateManager();

export async function createClusterSnapshot(source: "local" | "cloud" = "local"): Promise<ClusterSnapshot> {
  const jobs = await listJobs({ limit: 200 });
  return clusterStateManager.takeSnapshot(
    collectNodeHealth(),
    jobs.map(mapJobSnapshot),
    source,
  );
}

async function writeSnapshot() {
  const snapshot = await createClusterSnapshot("local");
  saveLocalSnapshot(snapshot);
  void cloudSync.pushSnapshot(snapshot);
}

function scheduleSnapshotWrite(delayMs = 300) {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    void writeSnapshot();
  }, delayMs);
}

export function startClusterStateRuntime() {
  if (stopRuntime) return stopRuntime;

  const localSnapshot = getLatestLocalSnapshot();
  if (localSnapshot) {
    clusterStateManager.setState(localSnapshot);
  }

  scheduleSnapshotWrite(0);
  void mergeLatestCloudSnapshot(localSnapshot).then((snapshot) => {
    if (snapshot) {
      clusterStateManager.setState(snapshot);
      saveLocalSnapshot(snapshot);
    }
  });

  const unsubCluster = clusterManager.subscribe(() => {
    scheduleSnapshotWrite();
  });

  const unsubJobs = subscribeJobs(() => {
    scheduleSnapshotWrite();
  });

  const unsubCloud = cloudSync.subscribeToUpdates((snapshot) => {
    clusterStateManager.setState(snapshot);
    saveLocalSnapshot(snapshot);
  });

  const onOnline = () => {
    void mergeLatestCloudSnapshot(clusterStateManager.getState()).then((snapshot) => {
      if (snapshot) {
        clusterStateManager.setState(snapshot);
        saveLocalSnapshot(snapshot);
      }
      scheduleSnapshotWrite(0);
    });
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", onOnline);
  }

  stopRuntime = () => {
    unsubCluster();
    unsubJobs();
    unsubCloud();
    if (typeof window !== "undefined") {
      window.removeEventListener("online", onOnline);
    }
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = null;
    stopRuntime = null;
  };

  return stopRuntime;
}
