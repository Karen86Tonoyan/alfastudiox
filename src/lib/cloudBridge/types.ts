import type { ClusterSnapshot } from "@/lib/runtime/types/clusterSnapshot";

export type CloudBridgeCapability =
  | "artifactStorage"
  | "backupRestore"
  | "logs"
  | "objectStorage"
  | "privateNetwork"
  | "remoteCompute"
  | "secrets"
  | "snapshotSync";

export type CloudBridgeStatus =
  | "healthy"
  | "degraded"
  | "offline"
  | "not_configured";

export type CloudBridgeHealth = {
  ok: boolean;
  configured: boolean;
  providerId: string;
  providerName: string;
  status: CloudBridgeStatus;
  capabilities: CloudBridgeCapability[];
  message?: string;
};

export type CloudArtifact = {
  path: string;
  url: string;
  size?: number;
  contentType?: string;
  updatedAt?: string;
};

export interface CloudBridgeProvider {
  id: string;
  name: string;
  health(): Promise<CloudBridgeHealth>;
  uploadSnapshot(snapshot: ClusterSnapshot): Promise<void>;
  downloadLatestSnapshot(): Promise<ClusterSnapshot | null>;
  uploadArtifact(path: string, data: Blob): Promise<string>;
  listArtifacts(prefix?: string): Promise<CloudArtifact[]>;
}
