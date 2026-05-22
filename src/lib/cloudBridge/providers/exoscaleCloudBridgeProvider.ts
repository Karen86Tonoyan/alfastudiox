import type { CloudArtifact, CloudBridgeHealth, CloudBridgeProvider } from "@/lib/cloudBridge/types";
import type { ClusterSnapshot } from "@/lib/runtime/types/clusterSnapshot";

export class ExoscaleCloudBridgeProvider implements CloudBridgeProvider {
  id = "exoscale";
  name = "Exoscale Cloud Bridge";

  async health(): Promise<CloudBridgeHealth> {
    return {
      ok: false,
      configured: false,
      providerId: this.id,
      providerName: this.name,
      status: "not_configured",
      capabilities: ["objectStorage", "privateNetwork", "secrets", "logs", "backupRestore"],
      message: "Exoscale bridge is a scaffold. Configure API/storage adapter before use.",
    };
  }

  async uploadSnapshot(_snapshot: ClusterSnapshot): Promise<void> {
    throw new Error("Exoscale cloud bridge is not configured yet");
  }

  async downloadLatestSnapshot(): Promise<ClusterSnapshot | null> {
    return null;
  }

  async uploadArtifact(_path: string, _data: Blob): Promise<string> {
    throw new Error("Exoscale artifact upload is not configured yet");
  }

  async listArtifacts(_prefix?: string): Promise<CloudArtifact[]> {
    return [];
  }
}
