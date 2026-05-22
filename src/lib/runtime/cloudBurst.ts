import { loadProviders } from "@/lib/cloudProviders";
import { loadControllerConfig } from "@/lib/controllerConfig";

export type CloudBurstProviderSummary = {
  id: string;
  name: string;
  enabled: boolean;
  status: "connected" | "disconnected" | "error";
  features: string[];
};

export function getConfiguredCloudBurstProvider(): CloudBurstProviderSummary | null {
  const config = loadControllerConfig();
  const provider = loadProviders().find((entry) => entry.id === config.hybrid_burst.cloud_provider_id);
  if (!provider) return null;
  return {
    id: provider.id,
    name: provider.name,
    enabled: provider.enabled,
    status: provider.status,
    features: provider.features,
  };
}

export function canUseCloudBurst(): boolean {
  const config = loadControllerConfig();
  if (!config.hybrid_burst.enabled) return false;
  const provider = getConfiguredCloudBurstProvider();
  return !!provider && provider.enabled && provider.status === "connected";
}

export function getCloudBurstStatusMessage(): string {
  const config = loadControllerConfig();
  if (!config.hybrid_burst.enabled) {
    return "Cloud burst is disabled";
  }

  const provider = getConfiguredCloudBurstProvider();
  if (!provider) {
    return `Cloud burst provider ${config.hybrid_burst.cloud_provider_id} is not configured`;
  }

  if (!provider.enabled) {
    return `${provider.name} is selected for burst but disabled`;
  }

  if (provider.status !== "connected") {
    return `${provider.name} is selected for burst but not connected`;
  }

  return `${provider.name} is ready for cloud burst`;
}
