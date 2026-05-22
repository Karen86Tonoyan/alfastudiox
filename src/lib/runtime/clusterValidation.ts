import { listCloudBridgeProviders } from "@/lib/cloudBridge/cloudBridgeRegistry";
import type { ControllerConfig } from "@/lib/controllerConfig";
import { probeAllNodes } from "@/lib/networkLinks";

export interface ClusterValidationReport {
  valid: boolean;
  warnings: string[];
  errors: string[];
  checkedAt: string;
}

export async function validateCluster(cfg: ControllerConfig): Promise<ClusterValidationReport> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checkedAt = new Date().toISOString();

  const enabledNodes = cfg.nodes.filter((node) => node.enabled);
  const masters = enabledNodes.filter((node) => node.role === "master");

  if (enabledNodes.length === 0) {
    errors.push("Brak wlaczonych nodes.");
  }

  if (masters.length === 0) {
    errors.push("Brak master node.");
  }

  if (masters.length > 1) {
    errors.push("Wykryto wiecej niz jeden master node.");
  }

  const ids = new Set<string>();
  for (const node of cfg.nodes) {
    if (ids.has(node.id)) {
      errors.push(`Duplikat node ID: ${node.id}`);
    }
    ids.add(node.id);

    if (!node.api_url.trim()) {
      errors.push(`Node ${node.name || node.id} nie ma API URL.`);
    }
  }

  if (!cfg.storage.workflow_dir.trim()) warnings.push("Workflow dir jest pusty.");
  if (!cfg.storage.output_dir.trim()) warnings.push("Output dir jest pusty.");
  if (!cfg.network.shared_output_path.trim()) warnings.push("Shared output path jest pusty.");

  const bridgeHealth = await Promise.all(
    listCloudBridgeProviders().map(async (provider) => ({
      provider,
      health: await provider.health(),
    })),
  );

  const selectedBridge = bridgeHealth.find(({ provider }) => provider.id === cfg.cloud_bridge.provider_id);
  if (cfg.cloud_bridge.sync_enabled) {
    if (!selectedBridge) {
      errors.push(`Wybrany Cloud Bridge provider nie istnieje: ${cfg.cloud_bridge.provider_id}`);
    } else if (!selectedBridge.health.ok) {
      warnings.push(
        `Wybrany Cloud Bridge ${selectedBridge.health.providerName} ma status ${selectedBridge.health.status}.`,
      );
    }
  }

  if (!bridgeHealth.some(({ health }) => health.ok)) {
    warnings.push("Zaden Cloud Bridge provider nie zglasza stanu OK.");
  }

  const probes = await probeAllNodes(cfg);
  for (const probe of probes) {
    if (probe.control.latencyMs === null) {
      errors.push(`Node ${probe.nodeName} jest nieosiagalny po control link.`);
      continue;
    }

    if (probe.control.latencyMs > 2500) {
      warnings.push(`Node ${probe.nodeName} ma wysoki control latency: ${probe.control.latencyMs} ms.`);
    }

    if (cfg.network.prefer_data_transfer_link && probe.data.latencyMs === null) {
      warnings.push(`Node ${probe.nodeName} nie odpowiada po data link.`);
    }
  }

  if (!cfg.health.enabled) {
    warnings.push("Healthcheck jest wylaczony.");
  }

  if (cfg.health.mark_offline_after_failures <= 1) {
    warnings.push("Offline threshold jest bardzo agresywny (<= 1).");
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
    checkedAt,
  };
}
