import { useEffect } from "react";
import { toast } from "sonner";
import { consumeMigrationReports } from "@/lib/localStorageMigrations";
import { downloadMigratedSnapshot, collectMigratedSnapshot } from "@/lib/migrationSnapshot";

/**
 * Mounted once at app start. Surfaces localStorage migration results
 * as toasts (success / discarded data / failures).
 */
export function MigrationToaster() {
  useEffect(() => {
    const reports = consumeMigrationReports();
    if (reports.length === 0) return;

    const snapshot = collectMigratedSnapshot();
    const presetCount =
      snapshot.presets.maskBrushPresets.length +
      snapshot.presets.customSessionPresets.length;
    const exportAction = {
      label: "Eksportuj JSON",
      onClick: () => {
        downloadMigratedSnapshot();
        toast.success("Pobrano kopię ustawień", {
          description: `${presetCount} presetów + ustawienia HUD`,
        });
      },
    };

    for (const r of reports) {
      if (r.status === "failed") {
        toast.error(`Migracja v${r.version} nie powiodła się`, {
          description: r.error || r.description,
        });
        continue;
      }

      if (r.discarded.length > 0) {
        toast.warning(`Migracja v${r.version}: odrzucono uszkodzone dane`, {
          description: `Usunięto klucze: ${r.discarded.join(", ")}`,
          action: exportAction,
          duration: 12000,
        });
      } else {
        toast.success(`Migracja v${r.version} ukończona`, {
          description: r.description,
          action: exportAction,
          duration: 10000,
        });
      }
    }
  }, []);

  return null;
}
