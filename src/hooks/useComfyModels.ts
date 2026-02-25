import { useState, useEffect, useCallback } from "react";
import { comfyApi, type ComfyModelInfo, type ComfyModelType } from "@/lib/comfyApi";

export interface ComfyModels {
  checkpoints: ComfyModelInfo[];
  loras: ComfyModelInfo[];
  vae: ComfyModelInfo[];
  controlnet: ComfyModelInfo[];
  upscale_models: ComfyModelInfo[];
}

const EMPTY: ComfyModels = {
  checkpoints: [],
  loras: [],
  vae: [],
  controlnet: [],
  upscale_models: [],
};

export function useComfyModels() {
  const [models, setModels] = useState<ComfyModels>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const all = await comfyApi.getAllModels();
      setModels({
        checkpoints: all.checkpoints || [],
        loras: all.loras || [],
        vae: all.vae || [],
        controlnet: all.controlnet || [],
        upscale_models: all.upscale_models || [],
      });
      setFetched(true);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch when ComfyUI connects
  useEffect(() => {
    const unsub = comfyApi.on("status", (status: string) => {
      if (status === "connected" && !fetched) {
        fetchAll();
      }
    });
    // If already connected
    if (comfyApi.status === "connected" && !fetched) {
      fetchAll();
    }
    return unsub;
  }, [fetchAll, fetched]);

  return { models, loading, refetch: fetchAll };
}
