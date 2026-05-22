import type { ClusterSnapshot } from "@/lib/runtime/types/clusterSnapshot";

const SNAPSHOT_LIST_KEY = "alfa_cluster_snapshots";
const SNAPSHOT_LATEST_KEY = "alfa_cluster_snapshot_latest";
const MAX_SNAPSHOTS = 50;

export function listLocalSnapshots(): ClusterSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOT_LIST_KEY);
    const snapshots = raw ? (JSON.parse(raw) as ClusterSnapshot[]) : [];
    return snapshots.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export function getLatestLocalSnapshot(): ClusterSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_LATEST_KEY);
    return raw ? (JSON.parse(raw) as ClusterSnapshot) : null;
  } catch {
    return null;
  }
}

export function saveLocalSnapshot(snapshot: ClusterSnapshot): void {
  const existing = listLocalSnapshots().filter((item) => item.id !== snapshot.id);
  const next = [snapshot, ...existing]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_SNAPSHOTS);
  localStorage.setItem(SNAPSHOT_LIST_KEY, JSON.stringify(next));
  localStorage.setItem(SNAPSHOT_LATEST_KEY, JSON.stringify(snapshot));
}

export function saveSnapshot(snapshot: ClusterSnapshot): void {
  saveLocalSnapshot(snapshot);
}

export function loadLatestSnapshot(): ClusterSnapshot | null {
  return getLatestLocalSnapshot();
}

export function listSnapshots(): ClusterSnapshot[] {
  return listLocalSnapshots();
}

export type { ClusterSnapshot };
