import { useState, useCallback } from "react";
import type { PhotoSessionConfig } from "@/lib/photoSessionWorkflow";

const STORAGE_KEY = "render_tracker_log";

export interface RenderLogEntry {
  id: string;
  timestamp: number;
  preset: string | null;
  checkpoint: string | null;
  sampler: string | null;
  scheduler: string | null;
  steps: number;
  cfg: number;
  width: number;
  height: number;
  seed: number;
  pose: string;
  layers: Record<string, boolean>;
  ipWeight: number;
  pulidWeight: number;
  supirStrength: number;
  lora: string | null;
  promptId: string | null;
}

function loadLog(): RenderLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLog(entries: RenderLogEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function useRenderTracker() {
  const [log, setLog] = useState<RenderLogEntry[]>(loadLog);

  const logRender = useCallback((config: PhotoSessionConfig, preset: string | null, promptId: string | null) => {
    const entry: RenderLogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      preset,
      checkpoint: config.checkpoint || null,
      sampler: config.sampler || null,
      scheduler: config.scheduler || null,
      steps: config.steps,
      cfg: config.cfg,
      width: config.width,
      height: config.height,
      seed: config.seed,
      pose: config.pose,
      layers: { ...config.layers },
      ipWeight: config.ipWeight,
      pulidWeight: config.pulidWeight,
      supirStrength: config.supirStrength,
      lora: config.lora || null,
      promptId,
    };
    setLog((prev) => {
      const next = [entry, ...prev];
      saveLog(next);
      return next;
    });
  }, []);

  const clearLog = useCallback(() => {
    setLog([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const budget = 20;
  const used = log.length;
  const remaining = Math.max(0, budget - used);

  return { log, logRender, clearLog, used, remaining, budget };
}
