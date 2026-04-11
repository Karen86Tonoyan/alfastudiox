/**
 * TIP Auditor — typy, parser CSV/JSON, dane demo
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
  source: "demo" | "csv" | "json";
}

export const DEFAULT_CONFIG: TIPConfig = {
  weights: { geometry: 0.50, embedding: 0.30, texture: 0.20 },
  thresholds: { ok: 0.88, minor_drift: 0.72, drift_detected: 0.58, re_anchor: 0.58 },
  smoothing: { alpha: 0.70 },
  tip: { temperature: 3.0 },
  report: { include_charts: true, include_failure_gallery: true, output_dir: "./reports" },
};

function classifyFrame(tipSmoothed: number, config: TIPConfig): TIPFrameResult["status"] {
  if (tipSmoothed >= config.thresholds.ok) return "OK";
  if (tipSmoothed >= config.thresholds.minor_drift) return "MINOR_DRIFT";
  if (tipSmoothed >= config.thresholds.drift_detected) return "DRIFT";
  return "RE_ANCHOR";
}

function buildReport(frames: TIPFrameResult[], character: string, source: TIPReport["source"]): TIPReport {
  const tips = frames.map(f => f.tipSmoothed);
  return {
    id: crypto.randomUUID(),
    character,
    date: new Date().toISOString().split("T")[0],
    totalFrames: frames.length,
    okFrames: frames.filter(f => f.status === "OK").length,
    minorDrift: frames.filter(f => f.status === "MINOR_DRIFT").length,
    driftFrames: frames.filter(f => f.status === "DRIFT").length,
    reAnchor: frames.filter(f => f.status === "RE_ANCHOR").length,
    avgTip: tips.length ? tips.reduce((a, b) => a + b, 0) / tips.length : 0,
    minTip: tips.length ? Math.min(...tips) : 0,
    maxTip: tips.length ? Math.max(...tips) : 0,
    frames,
    source,
  };
}

// ── CSV Parser ──
// Expected columns: frame, tip_score, tip_smoothed, z_embedding, z_geometry, z_texture, status
// Also accepts: frame, tip, tip_smooth, z_e, z_g, z_t, status
export function parseCSV(csvText: string, config: TIPConfig): TIPReport {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("CSV musi mieć nagłówek i min. 1 wiersz danych");

  const header = lines[0].toLowerCase().split(",").map(h => h.trim());

  const col = (names: string[]) => {
    for (const n of names) {
      const idx = header.indexOf(n);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const iFrame = col(["frame", "frame_number", "frame_id"]);
  const iTip = col(["tip_score", "tip", "tip_raw", "score"]);
  const iTipSmooth = col(["tip_smoothed", "tip_smooth", "smoothed"]);
  const iZe = col(["z_embedding", "z_e", "ze", "embedding_z"]);
  const iZg = col(["z_geometry", "z_g", "zg", "geometry_z"]);
  const iZt = col(["z_texture", "z_t", "zt", "texture_z"]);
  const iStatus = col(["status", "classification", "class"]);
  const iChar = col(["character", "name", "char"]);

  if (iTip === -1 && iTipSmooth === -1) {
    throw new Error("CSV musi zawierać kolumnę 'tip_score' lub 'tip_smoothed'");
  }

  let character = "Imported";
  const frames: TIPFrameResult[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",").map(v => v.trim());
    if (vals.length < 2 || vals.every(v => !v)) continue;

    if (i === 1 && iChar !== -1 && vals[iChar]) {
      character = vals[iChar];
    }

    const frame = iFrame !== -1 ? parseInt(vals[iFrame]) || i : i;
    const tipScore = iTip !== -1 ? parseFloat(vals[iTip]) || 0 : 0;
    const tipSmoothed = iTipSmooth !== -1 ? parseFloat(vals[iTipSmooth]) || tipScore : tipScore;
    const zEmbedding = iZe !== -1 ? parseFloat(vals[iZe]) || 0 : 0;
    const zGeometry = iZg !== -1 ? parseFloat(vals[iZg]) || 0 : 0;
    const zTexture = iZt !== -1 ? parseFloat(vals[iZt]) || 0 : 0;

    let status: TIPFrameResult["status"];
    if (iStatus !== -1 && vals[iStatus]) {
      const raw = vals[iStatus].toUpperCase().replace(/ /g, "_");
      status = (["OK", "MINOR_DRIFT", "DRIFT", "RE_ANCHOR"].includes(raw)
        ? raw : classifyFrame(tipSmoothed, config)) as TIPFrameResult["status"];
    } else {
      status = classifyFrame(tipSmoothed, config);
    }

    frames.push({ frame, tipScore, tipSmoothed, zEmbedding, zGeometry, zTexture, status });
  }

  if (frames.length === 0) throw new Error("CSV nie zawiera żadnych poprawnych wierszy danych");
  return buildReport(frames, character, "csv");
}

// ── JSON Parser ──
// Accepts: { character?, frames: [...] } or raw array [...]
// Each frame: { frame, tip_score|tip, tip_smoothed?, z_embedding|z_e, z_geometry|z_g, z_texture|z_t, status? }
export function parseJSON(jsonText: string, config: TIPConfig): TIPReport {
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch {
    throw new Error("Nieprawidłowy format JSON");
  }

  let character = "Imported";
  let rawFrames: Record<string, unknown>[];

  if (Array.isArray(data)) {
    rawFrames = data as Record<string, unknown>[];
  } else if (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).frames)) {
    const obj = data as Record<string, unknown>;
    rawFrames = obj.frames as Record<string, unknown>[];
    if (obj.character) character = String(obj.character);
    if (obj.name) character = String(obj.name);
  } else {
    throw new Error("JSON musi być tablicą klatek lub obiektem z polem 'frames'");
  }

  const frames: TIPFrameResult[] = rawFrames.map((r: Record<string, unknown>, i: number) => {
    const frame = Number(r.frame ?? r.frame_number ?? i + 1);
    const tipScore = Number(r.tip_score ?? r.tip ?? r.score ?? 0);
    const tipSmoothed = Number(r.tip_smoothed ?? r.tip_smooth ?? r.smoothed ?? tipScore);
    const zEmbedding = Number(r.z_embedding ?? r.z_e ?? r.ze ?? 0);
    const zGeometry = Number(r.z_geometry ?? r.z_g ?? r.zg ?? 0);
    const zTexture = Number(r.z_texture ?? r.z_t ?? r.zt ?? 0);

    let status: TIPFrameResult["status"];
    if (r.status) {
      const raw = String(r.status).toUpperCase().replace(/ /g, "_");
      status = (["OK", "MINOR_DRIFT", "DRIFT", "RE_ANCHOR"].includes(raw)
        ? raw : classifyFrame(tipSmoothed, config)) as TIPFrameResult["status"];
    } else {
      status = classifyFrame(tipSmoothed, config);
    }

    return { frame, tipScore, tipSmoothed, zEmbedding, zGeometry, zTexture, status };
  });

  if (frames.length === 0) throw new Error("JSON nie zawiera żadnych klatek");
  return buildReport(frames, character, "json");
}

// Demo data generator
export function generateDemoReport(config: TIPConfig = DEFAULT_CONFIG): TIPReport {
  const totalFrames = 120;
  const frames: TIPFrameResult[] = [];
  let prevSmoothed = 0.95;

  for (let i = 0; i < totalFrames; i++) {
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

    const status = classifyFrame(tipSmoothed, config);
    frames.push({ frame: i + 1, tipScore, tipSmoothed, zEmbedding: zE, zGeometry: zG, zTexture: zT, status });
  }

  return buildReport(frames, "Karen_v1 (demo)", "demo");
}
