import type { CloudArtifact, CloudBridgeHealth, CloudBridgeProvider } from "@/lib/cloudBridge/types";
import type { ClusterSnapshot } from "@/lib/runtime/types/clusterSnapshot";
import { getLatestLocalSnapshot, saveLocalSnapshot } from "@/lib/runtime/nodeSnapshots";

const ARTIFACT_KEY = "alfa_local_cloud_bridge_artifacts";

type LocalArtifactRecord = CloudArtifact & {
  blobBase64?: string;
};

function readArtifacts(): LocalArtifactRecord[] {
  try {
    const raw = localStorage.getItem(ARTIFACT_KEY);
    return raw ? (JSON.parse(raw) as LocalArtifactRecord[]) : [];
  } catch {
    return [];
  }
}

function writeArtifacts(artifacts: LocalArtifactRecord[]) {
  localStorage.setItem(ARTIFACT_KEY, JSON.stringify(artifacts));
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });
}

export class LocalCloudBridgeProvider implements CloudBridgeProvider {
  id = "local";
  name = "Local Cloud Bridge";

  async health(): Promise<CloudBridgeHealth> {
    return {
      ok: true,
      configured: true,
      providerId: this.id,
      providerName: this.name,
      status: "healthy",
      capabilities: ["snapshotSync", "artifactStorage", "backupRestore"],
      message: "Local snapshot and artifact bridge ready",
    };
  }

  async uploadSnapshot(snapshot: ClusterSnapshot): Promise<void> {
    saveLocalSnapshot(snapshot);
  }

  async downloadLatestSnapshot(): Promise<ClusterSnapshot | null> {
    return getLatestLocalSnapshot();
  }

  async uploadArtifact(path: string, data: Blob): Promise<string> {
    const artifacts = readArtifacts().filter((artifact) => artifact.path !== path);
    const url = await blobToDataUrl(data);
    artifacts.push({
      path,
      url,
      size: data.size,
      contentType: data.type,
      updatedAt: new Date().toISOString(),
      blobBase64: url,
    });
    writeArtifacts(artifacts);
    return url;
  }

  async listArtifacts(prefix?: string): Promise<CloudArtifact[]> {
    const artifacts = readArtifacts();
    return artifacts.filter((artifact) => !prefix || artifact.path.startsWith(prefix));
  }
}
