import { clusterManager } from "@/lib/clusterManager";
import type { ControllerJob } from "@/lib/jobQueue";
import type { JobHandle, JobProvider, JobStatusSnapshot, ProviderHealth } from "@/lib/runtime/jobProvider";

function getForceNodeId(job: ControllerJob): string | undefined {
  const params = job.params as { forceNodeId?: string } | null;
  return params?.forceNodeId;
}

export const comfyClusterJobProvider: JobProvider = {
  id: "comfy-cluster",
  label: "ComfyUI Cluster",

  async submit(job: ControllerJob): Promise<JobHandle> {
    const result = await clusterManager.dispatch(job.workflow as object, {
      requiredVramGB: job.required_vram_gb ?? 0,
      tags: job.tags ?? [],
      forceNodeId: getForceNodeId(job),
    });

    if (!result.promptId) {
      throw new Error(result.reason || "Dispatch did not return prompt_id");
    }

    return {
      providerId: "comfy-cluster",
      externalId: result.promptId,
      nodeId: result.nodeId,
      nodeName: result.nodeName,
      acceptedAt: new Date().toISOString(),
      metadata: {
        delegated: result.delegated,
        reason: result.reason,
      },
    };
  },

  async cancel(_handle: JobHandle, _job: ControllerJob): Promise<void> {
    throw new Error("Cancel is not implemented yet for Comfy cluster jobs");
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
    if (!master) {
      return { ok: false, message: "No cluster master is configured" };
    }
    return {
      ok: true,
      message: `Master: ${master.name}`,
      details: {
        nodeId: master.id,
        status: master.status,
      },
    };
  },
};
