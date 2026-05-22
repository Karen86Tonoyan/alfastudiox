/**
 * Workflow Split — podział jednego logicznego workflow na N stage'ów,
 * gdzie każdy stage jest pinnowany do konkretnego node'a (komputera)
 * z `controllerConfig.nodes`. Egzekucja idzie przez `clusterManager.dispatch`
 * z `forceNodeId`.
 *
 * Persistencja w localStorage pod `alfa_workflow_splits`.
 */
import { clusterManager, type DispatchResult } from "@/lib/clusterManager";

export type StageKind =
  | "background"
  | "character"
  | "video"
  | "upscale"
  | "compositing"
  | "custom";

export interface SplitStage {
  id: string;
  name: string;
  kind: StageKind;
  /** Node id z controllerConfig.nodes (lub clusterManager). Puste = auto. */
  assignedNodeId: string;
  requiredVramGB: number;
  /** ID innych stage'ów, które muszą się skończyć przed startem tego. */
  dependsOn: string[];
  /** Opcjonalny prompt/JSON workflow ComfyUI (string). */
  workflowJson?: string;
  notes?: string;
}

export interface SplitPlan {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  stages: SplitStage[];
}

export interface StageRunResult {
  stageId: string;
  stageName: string;
  dispatch: DispatchResult;
  error?: string;
}

const KEY = "alfa_workflow_splits";

function rid(): string {
  return (crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
}

export function emptyStage(name = "Nowy etap"): SplitStage {
  return {
    id: rid(),
    name,
    kind: "custom",
    assignedNodeId: "",
    requiredVramGB: 8,
    dependsOn: [],
  };
}

export function emptyPlan(name = "Nowy podział"): SplitPlan {
  const now = Date.now();
  return {
    id: rid(),
    name,
    createdAt: now,
    updatedAt: now,
    stages: [
      { ...emptyStage("PC #1 — Tło / Image"), kind: "background", requiredVramGB: 10 },
      { ...emptyStage("PC #2 — Wideo / Animacja"), kind: "video", requiredVramGB: 12 },
    ],
  };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function sanitizeStage(raw: unknown): SplitStage {
  const r = isObj(raw) ? raw : {};
  const kinds: StageKind[] = ["background", "character", "video", "upscale", "compositing", "custom"];
  const kind = (typeof r.kind === "string" && (kinds as string[]).includes(r.kind)) ? (r.kind as StageKind) : "custom";
  const deps = Array.isArray(r.dependsOn)
    ? r.dependsOn.filter((d): d is string => typeof d === "string").slice(0, 32)
    : [];
  const vram = typeof r.requiredVramGB === "number" && r.requiredVramGB >= 0 && r.requiredVramGB <= 256 ? r.requiredVramGB : 8;
  return {
    id: typeof r.id === "string" && r.id ? r.id : rid(),
    name: typeof r.name === "string" ? r.name.slice(0, 200) : "Etap",
    kind,
    assignedNodeId: typeof r.assignedNodeId === "string" ? r.assignedNodeId.slice(0, 128) : "",
    requiredVramGB: vram,
    dependsOn: deps,
    workflowJson: typeof r.workflowJson === "string" ? r.workflowJson.slice(0, 1_000_000) : undefined,
    notes: typeof r.notes === "string" ? r.notes.slice(0, 2000) : undefined,
  };
}

function sanitizePlan(raw: unknown): SplitPlan {
  const r = isObj(raw) ? raw : {};
  const stages = Array.isArray(r.stages) ? r.stages.map(sanitizeStage) : [];
  const now = Date.now();
  return {
    id: typeof r.id === "string" && r.id ? r.id : rid(),
    name: typeof r.name === "string" ? r.name.slice(0, 200) : "Plan",
    createdAt: typeof r.createdAt === "number" ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : now,
    stages,
  };
}

export function loadPlans(): SplitPlan[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map(sanitizePlan);
  } catch {
    return [];
  }
}

export function savePlans(plans: SplitPlan[]): void {
  localStorage.setItem(KEY, JSON.stringify(plans));
}

/** Wykonaj plan — stage'y w topologii dependsOn; równoległe, jeśli nie zależą od siebie. */
export async function runPlan(plan: SplitPlan): Promise<StageRunResult[]> {
  const done = new Map<string, StageRunResult>();
  const remaining = new Map(plan.stages.map((s) => [s.id, s] as const));

  // Detekcja cykli – proste zabezpieczenie iteracji.
  let safety = plan.stages.length + 1;
  while (remaining.size > 0 && safety-- > 0) {
    const ready: SplitStage[] = [];
    for (const s of remaining.values()) {
      if (s.dependsOn.every((d) => done.has(d))) ready.push(s);
    }
    if (ready.length === 0) {
      // pozostałe to cykl lub brakujące deps — oznacz jako błąd
      for (const s of remaining.values()) {
        done.set(s.id, {
          stageId: s.id,
          stageName: s.name,
          dispatch: { nodeId: "", nodeName: "", promptId: null, delegated: false, reason: "Zależność nierozwiązana / cykl" },
          error: "Zależność nierozwiązana / cykl",
        });
      }
      break;
    }

    // Równolegle: każdy stage na swój przypięty node
    const results = await Promise.all(
      ready.map(async (s): Promise<StageRunResult> => {
        try {
          let workflow: object = {};
          if (s.workflowJson && s.workflowJson.trim()) {
            try { workflow = JSON.parse(s.workflowJson); } catch { /* zostaw {} */ }
          }
          const dispatch = await clusterManager.dispatch(workflow, {
            requiredVramGB: s.requiredVramGB,
            forceNodeId: s.assignedNodeId || undefined,
          });
          return { stageId: s.id, stageName: s.name, dispatch };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return {
            stageId: s.id,
            stageName: s.name,
            dispatch: { nodeId: "", nodeName: "", promptId: null, delegated: false, reason: msg },
            error: msg,
          };
        }
      })
    );

    for (const r of results) {
      done.set(r.stageId, r);
      remaining.delete(r.stageId);
    }
  }

  return plan.stages.map((s) => done.get(s.id)!).filter(Boolean);
}