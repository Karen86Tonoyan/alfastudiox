import { clusterManager } from "@/lib/clusterManager";
import type { ControllerJob } from "@/lib/jobQueue";
import { getCloudBurstStatusMessage, getConfiguredCloudBurstProvider } from "@/lib/runtime/cloudBurst";
import type { JobHandle, JobProvider, JobStatusSnapshot, ProviderHealth } from "@/lib/runtime/jobProvider";
import { loadControllerConfig } from "@/lib/controllerConfig";

function getForceNodeId(job: ControllerJob): string | undefined {
  const params = job.params as { forceNodeId?: string } | null;
  return params?.forceNodeId;
}

export const hybridBurstJobProvider: JobProvider = {
  id: "hybrid-burst",
  label: "Hybrid Cluster + Cloud Burst",

  async submit(job: ControllerJob): Promise<JobHandle> {
    const config = loadControllerConfig();

    const localResult = await clusterManager.dispatch(job.workflow as object, {
      requiredVramGB: job.required_vram_gb ?? 0,
      tags: job.tags ?? [],
      forceNodeId: getForceNodeId(job),
    });

    if (localResult.promptId) {
      return {
        providerId: "hybrid-burst",
        externalId: localResult.promptId,
        nodeId: localResult.nodeId,
        nodeName: localResult.nodeName,
        acceptedAt: new Date().toISOString(),
        metadata: {
          executionPlane: "local",
          delegated: localResult.delegated,
          reason: localResult.reason,
        },
      };
    }

    const burstProvider = getConfiguredCloudBurstProvider();
    const localReason = localResult.reason || "Local cluster could not accept the job";
    const shouldBurst =
      config.hybrid_burst.enabled &&
      ((config.hybrid_burst.burst_on_local_saturation && localReason.toLowerCase().includes("saturated")) ||
        config.hybrid_burst.burst_on_master_drain ||
        !localResult.nodeId);

    if (!shouldBurst || !burstProvider) {
      throw new Error(localReason);
    }

    throw new Error(
      `${localReason}. Cloud burst is configured for ${burstProvider.name}, but the runtime adapter is not implemented yet.`,
    );
  },

  async cancel(_handle: JobHandle, _job: ControllerJob): Promise<void> {
    throw new Error("Cancel is not implemented yet for hybrid burst jobs");
  },

  async status(handle: JobHandle, _job: ControllerJob): Promise<JobStatusSnapshot> {
    return {
      state: "completed",
      progress: 100,
      nodeId: handle.nodeId ?? null,
      nodeName: handle.nodeName ?? null,
    };
  },

  async health(): Promise<ProviderHealth> {
    const master = clusterManager.getMaster();
    const burstProvider = getConfiguredCloudBurstProvider();
    return {
      ok: !!master,
      message: getCloudBurstStatusMessage(),
      details: {
        masterId: master?.id ?? null,
        masterMode: master?.mode ?? null,
        burstProviderId: burstProvider?.id ?? null,
        burstProviderEnabled: burstProvider?.enabled ?? false,
        burstProviderStatus: burstProvider?.status ?? "disconnected",
      },
    };
  },
};
