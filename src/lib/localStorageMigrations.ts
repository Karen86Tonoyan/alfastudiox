/**
 * localStorage migration system.
 *
 * Each migration runs once (tracked by version number stored under
 * `alfa_ls_version`). Add new entries at the end of MIGRATIONS array.
 */

const VERSION_KEY = "alfa_ls_version";

export interface MigrationReport {
  version: number;
  description: string;
  status: "ok" | "failed";
  discarded: string[]; // keys with corrupted data that was dropped
  error?: string;
}

interface MigrationContext {
  discarded: string[];
}

interface Migration {
  version: number;
  description: string;
  migrate: (ctx: MigrationContext) => void;
}

// ---------- Strict validators ----------

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isFiniteNumberInRange(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
}

function isNonEmptyString(v: unknown, maxLen = 200): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= maxLen;
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/** MaskBrushPreset shape — strict. Unknown fields are dropped. */
export interface MaskBrushPreset {
  id: string;
  name?: string;
  size: number;
  hardness: number;
  opacity?: number;
  color?: string;
}

function sanitizeMaskBrushPreset(raw: unknown): MaskBrushPreset | null {
  if (!isPlainObject(raw)) return null;
  const id = isNonEmptyString(raw.id, 80) ? raw.id : null;
  const size = isFiniteNumberInRange(raw.size, 1, 4096) ? raw.size : null;
  const hardness = isFiniteNumberInRange(raw.hardness, 0, 1) ? raw.hardness : null;
  if (!id || size === null || hardness === null) return null;

  const out: MaskBrushPreset = { id, size, hardness };
  if (isNonEmptyString(raw.name, 120)) out.name = raw.name;
  if (isFiniteNumberInRange(raw.opacity, 0, 1)) out.opacity = raw.opacity;
  if (typeof raw.color === "string" && HEX_COLOR_RE.test(raw.color)) out.color = raw.color;
  return out;
}

/** Custom session preset shape — strict. */
export interface CustomSessionPreset {
  id: string;
  name: string;
  createdAt?: number;
  settings?: Record<string, unknown>;
}

function sanitizeCustomSessionPreset(raw: unknown): CustomSessionPreset | null {
  if (!isPlainObject(raw)) return null;
  const name = isNonEmptyString(raw.name, 120) ? raw.name : null;
  if (!name) return null;
  const id = isNonEmptyString(raw.id, 80)
    ? raw.id
    : typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const out: CustomSessionPreset = { id, name };
  if (isFiniteNumberInRange(raw.createdAt, 0, Number.MAX_SAFE_INTEGER)) {
    out.createdAt = raw.createdAt;
  }
  if (isPlainObject(raw.settings)) out.settings = raw.settings;
  return out;
}

function sanitizeArray<T>(
  raw: unknown,
  sanitizeItem: (item: unknown) => T | null
): { items: T[]; dropped: number } | null {
  if (!Array.isArray(raw)) return null;
  const items: T[] = [];
  let dropped = 0;
  for (const item of raw) {
    const cleaned = sanitizeItem(item);
    if (cleaned) items.push(cleaned);
    else dropped += 1;
  }
  return { items, dropped };
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: "Namespace HUD keys under alfa_ prefix and validate values",
    migrate: (ctx) => {
      // --- maskBrushOutlineOnly → alfa_maskBrushOutlineOnly (boolean string only) ---
      const outline = localStorage.getItem("maskBrushOutlineOnly");
      if (outline !== null) {
        const valid = outline === "true" || outline === "false";
        if (!valid) ctx.discarded.push("maskBrushOutlineOnly");
        localStorage.setItem("alfa_maskBrushOutlineOnly", valid ? outline : "false");
        localStorage.removeItem("maskBrushOutlineOnly");
      }

      // --- maskCursorColor → alfa_maskCursorColor (strict enum or #RRGGBB) ---
      const cursor = localStorage.getItem("maskCursorColor");
      if (cursor !== null) {
        const isValid =
          typeof cursor === "string" &&
          (cursor === "auto" ||
            cursor === "white" ||
            cursor === "black" ||
            HEX_COLOR_RE.test(cursor));
        if (!isValid) ctx.discarded.push("maskCursorColor");
        localStorage.setItem("alfa_maskCursorColor", isValid ? cursor : "auto");
        localStorage.removeItem("maskCursorColor");
      }

      // --- alfa-mask-brush-presets → alfa_maskBrushPresets (strict shape per item) ---
      const presets = localStorage.getItem("alfa-mask-brush-presets");
      if (presets !== null) {
        try {
          const parsed: unknown = JSON.parse(presets);
          const cleaned = sanitizeArray(parsed, sanitizeMaskBrushPreset);
          if (cleaned && cleaned.items.length > 0) {
            localStorage.setItem("alfa_maskBrushPresets", JSON.stringify(cleaned.items));
            if (cleaned.dropped > 0) {
              ctx.discarded.push(`alfa-mask-brush-presets:${cleaned.dropped}_items`);
            }
          } else {
            ctx.discarded.push("alfa-mask-brush-presets");
          }
        } catch {
          ctx.discarded.push("alfa-mask-brush-presets");
        }
        localStorage.removeItem("alfa-mask-brush-presets");
      }

      // --- custom_session_presets → alfa_custom_session_presets (strict shape per item) ---
      const session = localStorage.getItem("custom_session_presets");
      if (session !== null) {
        try {
          const parsed: unknown = JSON.parse(session);
          const cleaned = sanitizeArray(parsed, sanitizeCustomSessionPreset);
          if (cleaned && cleaned.items.length > 0) {
            localStorage.setItem(
              "alfa_custom_session_presets",
              JSON.stringify(cleaned.items)
            );
            if (cleaned.dropped > 0) {
              ctx.discarded.push(`custom_session_presets:${cleaned.dropped}_items`);
            }
          } else {
            ctx.discarded.push("custom_session_presets");
          }
        } catch {
          ctx.discarded.push("custom_session_presets");
        }
        localStorage.removeItem("custom_session_presets");
      }
    },
  },
  {
    version: 2,
    description: "Seed cluster nodes from legacy single ComfyUI URL",
    migrate: (ctx) => {
      const existing = localStorage.getItem("alfa_cluster_nodes");
      if (existing) return;
      const rawUrl = localStorage.getItem("comfy_server_url");
      let legacyUrl = "localhost:8188";
      if (rawUrl !== null) {
        // Strict: host[:port] or http(s)://host[:port] — no spaces, no quotes.
        const trimmed = rawUrl.trim();
        const ok =
          isNonEmptyString(trimmed, 256) &&
          /^(https?:\/\/)?[A-Za-z0-9.\-_]+(:\d{1,5})?(\/.*)?$/.test(trimmed);
        if (ok) legacyUrl = trimmed;
        else ctx.discarded.push("comfy_server_url");
      }
      const master = {
        id: crypto.randomUUID(),
        name: "Master (local)",
        url: legacyUrl,
        role: "master",
        priority: 1,
        maxVramGB: 16,
        tags: ["flux", "wan", "upscale"],
        enabled: true,
      };
      localStorage.setItem("alfa_cluster_nodes", JSON.stringify([master]));
    },
  },
];

const REPORTS_KEY = "__alfa_migration_reports__";

/** Reports from the most recent run, so React components can toast them after mount. */
export function consumeMigrationReports(): MigrationReport[] {
  const g = window as unknown as Record<string, unknown>;
  const reports = (g[REPORTS_KEY] as MigrationReport[] | undefined) || [];
  delete g[REPORTS_KEY];
  return reports;
}

export function runLocalStorageMigrations() {
  const current = parseInt(localStorage.getItem(VERSION_KEY) || "0", 10);
  const pending = MIGRATIONS.filter((m) => m.version > current);
  if (pending.length === 0) return;
  const reports = executeMigrations(pending);
  // Stash reports on window so a React component can toast them after mount.
  (window as unknown as Record<string, unknown>)[REPORTS_KEY] = reports;
}

/** Run a given set of migrations now and return their reports.
 *  Also bumps the alfa_ls_version key to the latest migration's version. */
export function executeMigrations(migrations: Migration[] = MIGRATIONS): MigrationReport[] {
  const reports: MigrationReport[] = [];
  for (const m of migrations) {
    const ctx: MigrationContext = { discarded: [] };
    try {
      m.migrate(ctx);
      reports.push({
        version: m.version,
        description: m.description,
        status: "ok",
        discarded: ctx.discarded,
      });
      console.info(`[LS Migration] v${m.version}: ${m.description}`);
    } catch (e) {
      reports.push({
        version: m.version,
        description: m.description,
        status: "failed",
        discarded: ctx.discarded,
        error: e instanceof Error ? e.message : String(e),
      });
      console.warn(`[LS Migration] v${m.version} failed:`, e);
    }
  }
  if (migrations.length > 0) {
    const latest = migrations[migrations.length - 1].version;
    localStorage.setItem(VERSION_KEY, String(latest));
  }
  return reports;
}

export const LS_VERSION_KEY = VERSION_KEY;
