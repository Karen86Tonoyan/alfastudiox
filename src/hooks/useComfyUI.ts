import { useState, useEffect, useCallback, useRef } from "react";
import { comfyApi, type ComfyStatus, type RenderProgress, type GpuInfo, type ErrorLogEntry } from "@/lib/comfyApi";

interface ComfyUIState {
  status: ComfyStatus;
  progress: RenderProgress | null;
  gpu: GpuInfo | null;
  queueSize: number;
  currentNode: string | null;
  errors: ErrorLogEntry[];
  lastImage: string | null;
}

export function useComfyUI(serverUrl?: string) {
  const [state, setState] = useState<ComfyUIState>({
    status: comfyApi.status,
    progress: comfyApi.progress,
    gpu: comfyApi.gpu,
    queueSize: 0,
    currentNode: null,
    errors: comfyApi.errors,
    lastImage: null,
  });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Connect and listen to events
  useEffect(() => {
    const unsubStatus = comfyApi.on("status", (status: ComfyStatus) => {
      setState((s) => ({ ...s, status }));
    });

    const unsubProgress = comfyApi.on("progress", (progress: RenderProgress) => {
      setState((s) => ({ ...s, progress }));
    });

    const unsubNode = comfyApi.on("executing_node", (node: string) => {
      setState((s) => ({ ...s, currentNode: node }));
    });

    const unsubDone = comfyApi.on("execution_done", (promptId: string) => {
      setState((s) => ({ ...s, progress: null, currentNode: null }));
      // Try to fetch the output image
      fetchLastImage(promptId);
    });

    const unsubQueueSize = comfyApi.on("queue_size", (size: number) => {
      setState((s) => ({ ...s, queueSize: size }));
    });

    const unsubGpu = comfyApi.on("gpu", (gpu: GpuInfo) => {
      setState((s) => ({ ...s, gpu }));
    });

    const unsubError = comfyApi.on("error_logged", (entry: ErrorLogEntry) => {
      setState((s) => ({ ...s, errors: [entry, ...s.errors].slice(0, 100) }));
    });

    const unsubGpuWarn = comfyApi.on("gpu_warning", () => {
      // GPU warning — could show toast
    });

    return () => {
      unsubStatus();
      unsubProgress();
      unsubNode();
      unsubDone();
      unsubQueueSize();
      unsubGpu();
      unsubError();
      unsubGpuWarn();
    };
  }, []);

  // Poll GPU stats while connected
  useEffect(() => {
    if (state.status === "connected") {
      comfyApi.getSystemStats();
      pollRef.current = setInterval(() => {
        comfyApi.getSystemStats();
      }, 5000);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [state.status]);

  const connect = useCallback((url?: string) => {
    void comfyApi.connect(url);
  }, []);

  const disconnect = useCallback(() => {
    comfyApi.disconnect();
  }, []);

  const queuePrompt = useCallback(async (workflow: object): Promise<string | null> => {
    // GPU safety check first
    const safe = await comfyApi.checkGpuSafety();
    if (!safe) {
      return null;
    }
    return comfyApi.queuePrompt(workflow);
  }, []);

  const cancelRender = useCallback(async () => {
    await comfyApi.cancelCurrent();
    setState((s) => ({ ...s, progress: null, currentNode: null }));
  }, []);

  const clearQueue = useCallback(async () => {
    await comfyApi.clearQueue();
  }, []);

  const fetchLastImage = useCallback(async (promptId: string) => {
    try {
      const res = await fetch(`${comfyApi.httpUrl}/history/${promptId}`);
      const data = await res.json();
      const outputs = data[promptId]?.outputs;
      if (outputs) {
        for (const nodeId of Object.keys(outputs)) {
          const images = outputs[nodeId]?.images;
          if (images?.length > 0) {
            const img = images[0];
            const imageUrl = `${comfyApi.httpUrl}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || "")}&type=${img.type || "output"}`;
            setState((s) => ({ ...s, lastImage: imageUrl }));
            return;
          }
        }
      }
    } catch {
      // Failed to fetch image — ignore
    }
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    queuePrompt,
    cancelRender,
    clearQueue,
    isConnected: state.status === "connected",
    isRendering: state.progress !== null,
  };
}
