import { useState, useEffect, useCallback } from "react";
import { comfyApi } from "@/lib/comfyApi";

export interface ComfySamplerOptions {
  samplers: string[];
  schedulers: string[];
}

const EMPTY: ComfySamplerOptions = { samplers: [], schedulers: [] };

export function useComfySamplers() {
  const [options, setOptions] = useState<ComfySamplerOptions>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${comfyApi.httpUrl}/object_info/KSampler`, {
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      const info = data.KSampler;
      if (info?.input?.required) {
        const samplers: string[] = info.input.required.sampler_name?.[0] || [];
        const schedulers: string[] = info.input.required.scheduler?.[0] || [];
        setOptions({ samplers, schedulers });
      }
      setFetched(true);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = comfyApi.on("status", (status: string) => {
      if (status === "connected" && !fetched) fetchOptions();
    });
    if (comfyApi.status === "connected" && !fetched) fetchOptions();
    return unsub;
  }, [fetchOptions, fetched]);

  return { options, loading, refetch: fetchOptions };
}
