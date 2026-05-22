import { clusterManager, type ClusterNodeRuntime } from "@/lib/clusterManager";
import type { NodeHealth, NodeHealthStatus } from "@/lib/runtime/types/nodeHealth";

function toIsoOrNow(value?: number): string {
  return typeof value === "number" && Number.isFinite(value)
    ? new Date(value).toISOString()
    : new Date().toISOString();
}

export function getNodeHealthStatus(node: ClusterNodeRuntime): NodeHealthStatus {
  if (node.mode === "OFFLINE") return "offline";
  if (!node.enabled || node.status === "offline" || node.status === "error") return "offline";
  if (node.mode === "DRAINING" || node.mode === "UPGRADING" || node.mode === "DEGRADED") return "degraded";

  const vramPct = node.vramTotal > 0 ? (node.vramUsed / node.vramTotal) * 100 : 0;
  if (vramPct >= 85 || node.queueSize >= 2 || node.gpuTemp >= 78 || node.status === "connecting") return "degraded";
  return "healthy";
}

export function toNodeHealth(node: ClusterNodeRuntime): NodeHealth {
  const totalMemory = node.vramTotal || node.maxVramGB || 1;
  return {
    nodeId: node.id,
    status: getNodeHealthStatus(node),
    mode: node.mode,
    lastSeen: toIsoOrNow(node.lastSeen),
    cpuUsage: Number(node.gpuTemp.toFixed(1)),
    memoryUsage: Number(((node.vramUsed / totalMemory) * 100).toFixed(1)),
    jobsRunning: node.queueSize,
    runtimeCapability: node.runtimeCapability,
  };
}

export function collectNodeHealth(): NodeHealth[] {
  return clusterManager.getNodes().map(toNodeHealth);
}

export type { NodeHealth, NodeHealthStatus };
