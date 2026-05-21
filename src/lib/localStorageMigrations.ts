/**
 * localStorage migration system.
 *
 * Each migration runs once (tracked by version number stored under
 * `alfa_ls_version`). Add new entries at the end of MIGRATIONS array.
 */

const VERSION_KEY = "alfa_ls_version";

interface Migration {
  version: number;
  description: string;
  migrate: () => void;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: "Namespace HUD keys under alfa_ prefix and validate values",
    migrate: () => {
      // --- maskBrushOutlineOnly → alfa_maskBrushOutlineOnly ---
      const outline = localStorage.getItem("maskBrushOutlineOnly");
      if (outline !== null) {
        const valid = outline === "true" || outline === "false";
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
          }
        } catch {
          // discard corrupted data
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
          }
        } catch {
          // discard corrupted data
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

export function runLocalStorageMigrations() {
  const current = parseInt(localStorage.getItem(VERSION_KEY) || "0", 10);
  const pending = MIGRATIONS.filter((m) => m.version > current);
  if (pending.length === 0) return;

  for (const m of pending) {
    try {
      m.migrate();
      console.info(`[LS Migration] v${m.version}: ${m.description}`);
    } catch (e) {
      console.warn(`[LS Migration] v${m.version} failed:`, e);
    }
  }

  const latest = MIGRATIONS[MIGRATIONS.length - 1].version;
  localStorage.setItem(VERSION_KEY, String(latest));
}