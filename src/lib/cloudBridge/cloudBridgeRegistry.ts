import type { CloudBridgeProvider } from "@/lib/cloudBridge/types";
import { ExoscaleCloudBridgeProvider } from "@/lib/cloudBridge/providers/exoscaleCloudBridgeProvider";
import { LocalCloudBridgeProvider } from "@/lib/cloudBridge/providers/localCloudBridgeProvider";
import { OvhCloudBridgeProvider } from "@/lib/cloudBridge/providers/ovhCloudBridgeProvider";

const providers = new Map<string, CloudBridgeProvider>();

function ensureDefaults() {
  if (providers.size > 0) return;
  registerCloudBridgeProvider(new LocalCloudBridgeProvider());
  registerCloudBridgeProvider(new ExoscaleCloudBridgeProvider());
  registerCloudBridgeProvider(new OvhCloudBridgeProvider());
}

export function registerCloudBridgeProvider(provider: CloudBridgeProvider) {
  providers.set(provider.id, provider);
}

export function getCloudBridgeProvider(id = "local"): CloudBridgeProvider {
  ensureDefaults();
  const provider = providers.get(id);
  if (!provider) {
    throw new Error(`Unknown cloud bridge provider: ${id}`);
  }
  return provider;
}

export function listCloudBridgeProviders(): CloudBridgeProvider[] {
  ensureDefaults();
  return [...providers.values()];
}
