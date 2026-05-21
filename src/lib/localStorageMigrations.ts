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

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: "Namespace HUD keys under alfa_ prefix and validate values",
    migrate: (ctx) => {
      // --- maskBrushOutlineOnly → alfa_maskBrushOutlineOnly ---
      const outline = localStorage.getItem("maskBrushOutlineOnly");
      if (outline !== null) {
        const valid = outline === "true" || outline === "false";
        if (!valid) ctx.discarded.push("maskBrushOutlineOnly");
        localStorage.setItem("alfa_maskBrushOutlineOnly", valid ? outline : "false");
        localStorage.removeItem("maskBrushOutlineOnly");
      }

      // --- maskCursorColor → alfa_maskCursorColor ---
      const cursor = localStorage.getItem("maskCursorColor");
      if (cursor !== null) {
        const isValid =
          cursor === "auto" ||
          cursor === "white" ||
          cursor === "black" ||
          /^#[0-9a-fA-F]{6}$/.test(cursor);
        if (!isValid) ctx.discarded.push("maskCursorColor");
        localStorage.setItem("alfa_maskCursorColor", isValid ? cursor : "auto");
        localStorage.removeItem("maskCursorColor");
      }

      // --- alfa-mask-brush-presets → alfa_maskBrushPresets ---
      const presets = localStorage.getItem("alfa-mask-brush-presets");
      if (presets !== null) {
        try {
          const parsed = JSON.parse(presets);
          if (Array.isArray(parsed)) {
            localStorage.setItem("alfa_maskBrushPresets", JSON.stringify(parsed));
          } else {
            ctx.discarded.push("alfa-mask-brush-presets");
          }
        } catch {
          ctx.discarded.push("alfa-mask-brush-presets");
        }
        localStorage.removeItem("alfa-mask-brush-presets");
      }

      // --- custom_session_presets → alfa_custom_session_presets ---
      const session = localStorage.getItem("custom_session_presets");
      if (session !== null) {
        try {
          const parsed = JSON.parse(session);
          if (Array.isArray(parsed)) {
            localStorage.setItem("alfa_custom_session_presets", JSON.stringify(parsed));
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
    migrate: () => {
      const existing = localStorage.getItem("alfa_cluster_nodes");
      if (existing) return;
      const legacyUrl = localStorage.getItem("comfy_server_url") || "localhost:8188";
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
