/**
 * Snapshot + JSON export of migrated HUD and session preset data.
 */

export interface MigratedSnapshot {
  exportedAt: string;
  schemaVersion: number;
  hud: {
    brushOutlineOnly: boolean | null;
    cursorColor: string | null;
  };
  presets: {
    maskBrushPresets: unknown[];
    customSessionPresets: unknown[];
  };
}

const safeParseArray = (raw: string | null): unknown[] => {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

export function collectMigratedSnapshot(): MigratedSnapshot {
  const versionRaw = localStorage.getItem("alfa_ls_version");
  const outline = localStorage.getItem("alfa_maskBrushOutlineOnly");
  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: versionRaw ? parseInt(versionRaw, 10) || 0 : 0,
    hud: {
      brushOutlineOnly: outline === null ? null : outline === "true",
      cursorColor: localStorage.getItem("alfa_maskCursorColor"),
    },
    presets: {
      maskBrushPresets: safeParseArray(localStorage.getItem("alfa_maskBrushPresets")),
      customSessionPresets: safeParseArray(localStorage.getItem("alfa_custom_session_presets")),
    },
  };
}

export function downloadMigratedSnapshot() {
  const snapshot = collectMigratedSnapshot();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `alfa-migrated-presets-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return snapshot;
}