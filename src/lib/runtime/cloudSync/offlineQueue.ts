import type { ClusterSnapshot } from "@/lib/runtime/types/clusterSnapshot";
import type { CloudSyncAdapter } from "@/lib/runtime/cloudSync/cloudSnapshotSync";

const OFFLINE_QUEUE_KEY = "alfa_cluster_snapshot_offline_queue";

function readQueue(): ClusterSnapshot[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? (JSON.parse(raw) as ClusterSnapshot[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: ClusterSnapshot[]) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export class OfflineSnapshotQueue {
  enqueue(snapshot: ClusterSnapshot): void {
    const queue = readQueue().filter((entry) => entry.id !== snapshot.id);
    queue.push(snapshot);
    writeQueue(queue);
  }

  async flush(adapter: CloudSyncAdapter): Promise<void> {
    const queue = readQueue();
    if (queue.length === 0) return;

    const pending: ClusterSnapshot[] = [];
    for (const snapshot of queue) {
      try {
        await adapter.pushSnapshot(snapshot);
      } catch {
        pending.push(snapshot);
      }
    }
    writeQueue(pending);
  }
}
