/**
 * Reset all alfa_* localStorage keys and restore factory defaults
 * without reloading the page. Components subscribe via the
 * `alfa:settings-reset` window event to re-read their state.
 */

export const SETTINGS_RESET_EVENT = "alfa:settings-reset";

/** Factory defaults applied after wiping alfa_* keys. */
export function buildFactoryDefaults(): Record<string, string> {
  return {
    alfa_maskBrushOutlineOnly: "false",
    alfa_maskCursorColor: "auto",
    alfa_maskBrushPresets: "[]",
    alfa_custom_session_presets: "[]",
    // Keep migration version pinned so migrations don't re-run unnecessarily.
    alfa_ls_version: localStorage.getItem("alfa_ls_version") || "0",
  };
}

export interface ResetResult {
  cleared: string[];
  defaultsApplied: string[];
}

/**
 * Wipes every key starting with `alfa_`, then writes factory defaults
 * and notifies listeners. Returns a report for the caller to toast.
 */
export function resetAlfaSettings(): ResetResult {
  const cleared: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("alfa_")) cleared.push(key);
  }
  cleared.forEach((k) => localStorage.removeItem(k));

  const defaults = buildFactoryDefaults();
  const defaultsApplied: string[] = [];
  for (const [k, v] of Object.entries(defaults)) {
    localStorage.setItem(k, v);
    defaultsApplied.push(k);
  }

  window.dispatchEvent(
    new CustomEvent(SETTINGS_RESET_EVENT, {
      detail: { cleared, defaultsApplied, at: Date.now() },
    })
  );

  return { cleared, defaultsApplied };
}

/** Subscribe to reset events. Returns unsubscribe fn. */
export function onSettingsReset(handler: () => void): () => void {
  const fn = () => handler();
  window.addEventListener(SETTINGS_RESET_EVENT, fn);
  return () => window.removeEventListener(SETTINGS_RESET_EVENT, fn);
}
