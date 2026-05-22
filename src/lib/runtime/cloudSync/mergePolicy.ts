import type { ClusterSnapshot } from "@/lib/runtime/types/clusterSnapshot";

export function pickPreferredSnapshot(
  localSnapshot: ClusterSnapshot | null,
  cloudSnapshot: ClusterSnapshot | null,
): ClusterSnapshot | null {
  if (!localSnapshot) return cloudSnapshot;
  if (!cloudSnapshot) return localSnapshot;
  if (cloudSnapshot.createdAt > localSnapshot.createdAt) return cloudSnapshot;
  return localSnapshot;
}

export function mergeSnapshots(
  localSnapshot: ClusterSnapshot | null,
  cloudSnapshots: ClusterSnapshot[],
): ClusterSnapshot | null {
  const newestCloud = [...cloudSnapshots].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
  return pickPreferredSnapshot(localSnapshot, newestCloud);
}
