import type { ControllerJob } from "@/lib/jobQueue";
import type { JobProvider } from "@/lib/runtime/jobProvider";
import { comfyClusterJobProvider } from "@/lib/runtime/providers/comfyClusterJobProvider";
import { hybridBurstJobProvider } from "@/lib/runtime/providers/hybridBurstJobProvider";

const providers = new Map<string, JobProvider>([
  [comfyClusterJobProvider.id, comfyClusterJobProvider],
  [hybridBurstJobProvider.id, hybridBurstJobProvider],
]);

export function registerJobProvider(provider: JobProvider) {
  providers.set(provider.id, provider);
}

export function getJobProviderById(id: string): JobProvider {
  const provider = providers.get(id);
  if (!provider) {
    throw new Error(`Unknown runtime provider: ${id}`);
  }
  return provider;
}

export function getJobProviderForJob(job: ControllerJob): JobProvider {
  const params = (job.params || {}) as Record<string, unknown>;
  const providerId = typeof params.providerId === "string" ? params.providerId : "comfy-cluster";
  return getJobProviderById(providerId);
}
