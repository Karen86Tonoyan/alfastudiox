import { getCloudBridgeProvider } from "@/lib/cloudBridge/cloudBridgeRegistry";
import { loadControllerConfig } from "@/lib/controllerConfig";
import type { ClusterSnapshot } from "@/lib/runtime/types/clusterSnapshot";
import { mergeSnapshots } from "@/lib/runtime/cloudSync/mergePolicy";

export type Unsubscribe = () => void;

export type CloudSyncAdapter = {
  pushSnapshot(snapshot: ClusterSnapshot): Promise<void>;
  pullSnapshots(since?: string): Promise<ClusterSnapshot[]>;
  subscribeToUpdates(callback: (snapshot: ClusterSnapshot) => void): Unsubscribe;
};

function resolveCloudBridgeProviderId(explicitProviderId?: string): string {
  if (explicitProviderId) return explicitProviderId;
  const config = loadControllerConfig();
  if (!config.cloud_bridge.sync_enabled) return "local";
  return config.cloud_bridge.provider_id || "local";
}

export class BridgeBackedSnapshotSync implements CloudSyncAdapter {
  constructor(private readonly providerId?: string) {}

  async pushSnapshot(snapshot: ClusterSnapshot): Promise<void> {
    const provider = getCloudBridgeProvider(resolveCloudBridgeProviderId(this.providerId));
    await provider.uploadSnapshot(snapshot);
  }

  async pullSnapshots(_since?: string): Promise<ClusterSnapshot[]> {
    const provider = getCloudBridgeProvider(resolveCloudBridgeProviderId(this.providerId));
    const latest = await provider.downloadLatestSnapshot();
    return latest ? [latest] : [];
  }

  subscribeToUpdates(_callback: (snapshot: ClusterSnapshot) => void): Unsubscribe {
    return () => {};
  }
}

export async function mergeLatestCloudSnapshot(
  localSnapshot: ClusterSnapshot | null,
  providerId?: string,
): Promise<ClusterSnapshot | null> {
  const adapter = new BridgeBackedSnapshotSync(providerId);
  const cloudSnapshots = await adapter.pullSnapshots(localSnapshot?.createdAt);
  return mergeSnapshots(localSnapshot, cloudSnapshots);
}
