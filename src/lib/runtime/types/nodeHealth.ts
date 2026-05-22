export type NodeHealthStatus =
  | "healthy"
  | "degraded"
  | "offline";

export type NodeMode =
  | "ACTIVE"
  | "DRAINING"
  | "OFFLINE"
  | "UPGRADING"
  | "DEGRADED";

export type RuntimeCapability = {
  providerVersion: string;
  supportedFeatures: string[];
  runtimeLevel: number;
};

export type NodeHealth = {
  nodeId: string;
  status: NodeHealthStatus;
  mode: NodeMode;
  lastSeen: string;
  cpuUsage: number;
  memoryUsage: number;
  jobsRunning: number;
  runtimeCapability: RuntimeCapability;
};
