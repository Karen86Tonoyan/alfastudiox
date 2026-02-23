/**
 * TIP Auditor — typy i dane demo dla dashboardu
 */

export interface TIPFrameResult {
  frame: number;
  tipScore: number;
  tipSmoothed: number;
  zEmbedding: number;
  zGeometry: number;
  zTexture: number;
  status: "OK" | "MINOR_DRIFT" | "DRIFT" | "RE_ANCHOR";
}

export interface TIPConfig {
  weights: {
    geometry: number;
    embedding: number;
    texture: number;
  };
  thresholds: {
    ok: number;
    minor_drift: number;
    drift_detected: number;
    re_anchor: number;
  };
  smoothing: {
    alpha: number;
  };
  tip: {
    temperature: number;
  };
  report: {
    include_charts: boolean;
    include_failure_gallery: boolean;
    output_dir: string;
  };
}

export interface AlphaID {
  name: string;
  version: string;
  samples: { total: number; used: number; skipped: number };
  embedding: { mean: number[]; std: number };
  geometry: { ipd_mean: number; ipd_std: number; nose_mean: number; nose_std: number };
  texture: { lab_mean: number[]; lab_std: number };
}

export interface TIPReport {
  id: string;
  character: string;
  date: string;
  totalFrames: number;
  okFrames: number;
  minorDrift: number;
  driftFrames: number;
  reAnchor: number;
  avgTip: number;
  minTip: number;
  maxTip: number;
  frames: TIPFrameResult[];
}

export const DEFAULT_CONFIG: TIPConfig = {
  weights: { geometry: 0.50, embedding: 0.30, texture: 0.20 },
  thresholds: { ok: 0.88, minor_drift: 0.72, drift_detected: 0.58, re_anchor: 0.58 },
  smoothing: { alpha: 0.70 },
  tip: { temperature: 3.0 },
  report: { include_charts: true, include_failure_gallery: true, output_dir: "./reports" },
};

// Demo data generator
export function generateDemoReport(config: TIPConfig = DEFAULT_CONFIG): TIPReport {
  const totalFrames = 120;
  const frames: TIPFrameResult[] = [];
  let prevSmoothed = 0.95;

  for (let i = 0; i < totalFrames; i++) {
    // Simulate drift mid-sequence
    const baseTip = i < 40 ? 0.92 + Math.random() * 0.06
      : i < 70 ? 0.78 - (i - 40) * 0.005 + Math.random() * 0.08
      : i < 90 ? 0.55 + Math.random() * 0.15
      : 0.88 + Math.random() * 0.08;

    const tipScore = Math.max(0, Math.min(1, baseTip));
    const tipSmoothed = config.smoothing.alpha * tipScore + (1 - config.smoothing.alpha) * prevSmoothed;
    prevSmoothed = tipSmoothed;

    const zE = Math.max(0, (1 - tipScore) * 2.5 + (Math.random() - 0.5) * 0.5);
    const zG = Math.max(0, (1 - tipScore) * 1.8 + (Math.random() - 0.5) * 0.4);
    const zT = Math.max(0, (1 - tipScore) * 1.2 + (Math.random() - 0.5) * 0.3);

    const status: TIPFrameResult["status"] =
      tipSmoothed >= config.thresholds.ok ? "OK"
      : tipSmoothed >= config.thresholds.minor_drift ? "MINOR_DRIFT"
      : tipSmoothed >= config.thresholds.drift_detected ? "DRIFT"
      : "RE_ANCHOR";

    frames.push({ frame: i + 1, tipScore, tipSmoothed, zEmbedding: zE, zGeometry: zG, zTexture: zT, status });
  }

  const tips = frames.map(f => f.tipSmoothed);
  return {
    id: crypto.randomUUID(),
    character: "Karen_v1",
    date: new Date().toISOString().split("T")[0],
    totalFrames,
    okFrames: frames.filter(f => f.status === "OK").length,
    minorDrift: frames.filter(f => f.status === "MINOR_DRIFT").length,
    driftFrames: frames.filter(f => f.status === "DRIFT").length,
    reAnchor: frames.filter(f => f.status === "RE_ANCHOR").length,
    avgTip: tips.reduce((a, b) => a + b, 0) / tips.length,
    minTip: Math.min(...tips),
    maxTip: Math.max(...tips),
    frames,
  };
}
