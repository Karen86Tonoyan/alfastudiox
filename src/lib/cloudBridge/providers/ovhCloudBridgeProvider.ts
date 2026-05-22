import type { CloudArtifact, CloudBridgeHealth, CloudBridgeProvider } from "@/lib/cloudBridge/types";
import type { ClusterSnapshot } from "@/lib/runtime/types/clusterSnapshot";

export class OvhCloudBridgeProvider implements CloudBridgeProvider {
  id = "ovh";
  name = "OVHcloud Bridge";

  async health(): Promise<CloudBridgeHealth> {
    return {
      ok: false,
      configured: false,
      providerId: this.id,
      providerName: this.name,
      status: "not_configured",
      capabilities: ["remoteCompute", "objectStorage", "privateNetwork", "secrets", "logs"],
      message: "OVHcloud bridge is a scaffold. Configure compute, object storage, or backup adapters before use.",
    };
  }

  async uploadSnapshot(_snapshot: ClusterSnapshot): Promise<void> {
    throw new Error("OVHcloud snapshot upload is not configured yet");
  }

  async downloadLatestSnapshot(): Promise<ClusterSnapshot | null> {
    return null;
  }

  async uploadArtifact(_path: string, _data: Blob): Promise<string> {
    throw new Error("OVHcloud artifact upload is not configured yet");
  }

  async listArtifacts(_prefix?: string): Promise<CloudArtifact[]> {
    return [];
  }
}
