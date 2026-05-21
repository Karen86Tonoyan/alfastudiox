import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Play, RefreshCw, Beaker, Trash2 } from "lucide-react";
import {
  MIGRATIONS,
  executeMigrations,
  LS_VERSION_KEY,
  type MigrationReport,
} from "@/lib/localStorageMigrations";

type Fixture = {
  id: string;
  label: string;
  description: string;
  entries: Record<string, string>;
  expectKeys: string[];
};

const FIXTURES: Fixture[] = [
  {
    id: "legacy-hud",
    label: "Legacy HUD keys (valid)",
    description: "Stare klucze maskBrushOutlineOnly / maskCursorColor bez prefiksu alfa_.",
    entries: {
      maskBrushOutlineOnly: "true",
      maskCursorColor: "#ff8800",
    },
    expectKeys: ["alfa_maskBrushOutlineOnly", "alfa_maskCursorColor"],
  },
  {
    id: "corrupt-hud",
    label: "Corrupted HUD values",
    description: "Niepoprawne wartości — powinny zostać odrzucone i zastąpione domyślnymi.",
    entries: {
      maskBrushOutlineOnly: "yesplease",
      maskCursorColor: "not-a-color",
    },
    expectKeys: ["alfa_maskBrushOutlineOnly", "alfa_maskCursorColor"],
  },
  {
    id: "legacy-presets",
    label: "Legacy presets (valid JSON arrays)",
    description: "alfa-mask-brush-presets oraz custom_session_presets jako tablice.",
    entries: {
      "alfa-mask-brush-presets": JSON.stringify([
        { id: "p1", size: 24, hardness: 0.5 },
      ]),
      custom_session_presets: JSON.stringify([{ name: "Demo session" }]),
    },
    expectKeys: ["alfa_maskBrushPresets", "alfa_custom_session_presets"],
  },
  {
    id: "broken-presets",
    label: "Broken preset JSON",
    description: "Niepoprawny JSON / błędny typ — migracja powinna odrzucić te klucze.",
    entries: {
      "alfa-mask-brush-presets": "{this is not json",
      custom_session_presets: JSON.stringify({ not: "an array" }),
    },
    expectKeys: [],
  },
  {
    id: "legacy-comfy",
    label: "Legacy ComfyUI URL",
    description: "Pojedynczy comfy_server_url — migracja v2 utworzy z niego master node.",
    entries: {
      comfy_server_url: "192.168.1.50:8188",
    },
    expectKeys: ["alfa_cluster_nodes"],
  },
];

const ALFA_KEYS_TO_CLEAN = [
  "alfa_maskBrushOutlineOnly",
  "alfa_maskCursorColor",
  "alfa_maskBrushPresets",
  "alfa_custom_session_presets",
  "alfa_cluster_nodes",
];

function snapshotKeys(keys: string[]): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const k of keys) out[k] = localStorage.getItem(k);
  return out;
}

export default function MigrationDebugPage() {
  const [reports, setReports] = useState<MigrationReport[]>([]);
  const [before, setBefore] = useState<Record<string, string | null> | null>(null);
  const [after, setAfter] = useState<Record<string, string | null> | null>(null);
  const [activeFixture, setActiveFixture] = useState<string | null>(null);
  const [versionBefore, setVersionBefore] = useState<string | null>(null);
  const [versionAfter, setVersionAfter] = useState<string | null>(null);

  const allWatchedKeys = useMemo(() => {
    const set = new Set<string>(ALFA_KEYS_TO_CLEAN);
    for (const f of FIXTURES) {
      Object.keys(f.entries).forEach((k) => set.add(k));
      f.expectKeys.forEach((k) => set.add(k));
    }
    return Array.from(set).sort();
  }, []);

  function cleanupAll() {
    allWatchedKeys.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(LS_VERSION_KEY);
  }

  function loadFixture(fx: Fixture) {
    cleanupAll();
    Object.entries(fx.entries).forEach(([k, v]) => localStorage.setItem(k, v));
    setActiveFixture(fx.id);
    setBefore(snapshotKeys(allWatchedKeys));
    setAfter(null);
    setReports([]);
    setVersionBefore(localStorage.getItem(LS_VERSION_KEY));
    setVersionAfter(null);
    toast.success(`Załadowano fixture: ${fx.label}`);
  }

  function runMigrations() {
    setBefore(snapshotKeys(allWatchedKeys));
    setVersionBefore(localStorage.getItem(LS_VERSION_KEY));
    const result = executeMigrations(MIGRATIONS);
    setReports(result);
    setAfter(snapshotKeys(allWatchedKeys));
    setVersionAfter(localStorage.getItem(LS_VERSION_KEY));

    const failed = result.filter((r) => r.status === "failed").length;
    if (failed > 0) toast.error(`${failed} migracji zakończyło się błędem`);
    else toast.success(`Wykonano ${result.length} migracji`);
  }

  function verifyFixture() {
    if (!activeFixture || !after) return;
    const fx = FIXTURES.find((f) => f.id === activeFixture);
    if (!fx) return;
    const missingExpected = fx.expectKeys.filter((k) => after[k] == null);
    const leftoverLegacy = Object.keys(fx.entries).filter((k) => after[k] != null);
    if (missingExpected.length === 0 && leftoverLegacy.length === 0) {
      toast.success("Weryfikacja OK — oczekiwane klucze istnieją, stare zostały usunięte.");
    } else {
      toast.error(
        `Weryfikacja nieudana. Brakuje: ${missingExpected.join(", ") || "—"}; pozostały stare: ${leftoverLegacy.join(", ") || "—"}`
      );
    }
  }

  function resetEverything() {
    cleanupAll();
    setBefore(null);
    setAfter(null);
    setReports([]);
    setActiveFixture(null);
    setVersionBefore(null);
    setVersionAfter(null);
    toast.success("Wyczyszczono klucze testowe i alfa_ls_version.");
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Beaker className="h-7 w-7 text-primary" />
          Migration Debug
        </h1>
        <p className="text-muted-foreground">
          Załaduj przykładowe stare klucze, uruchom migracje localStorage i zweryfikuj rezultat.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dostępne migracje</CardTitle>
          <CardDescription>
            Aktualna wersja w localStorage:{" "}
            <Badge variant="outline">{localStorage.getItem(LS_VERSION_KEY) ?? "—"}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {MIGRATIONS.map((m) => (
            <div key={m.version} className="flex items-center gap-3 text-sm">
              <Badge>v{m.version}</Badge>
              <span>{m.description}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sample fixtures</CardTitle>
          <CardDescription>Klika fixture → załaduj klucze → uruchom migracje.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {FIXTURES.map((fx) => (
            <Card
              key={fx.id}
              className={`cursor-pointer transition ${
                activeFixture === fx.id ? "border-primary" : ""
              }`}
              onClick={() => loadFixture(fx)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{fx.label}</CardTitle>
                <CardDescription>{fx.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="overflow-auto rounded bg-muted p-2 text-xs">
{JSON.stringify(fx.entries, null, 2)}
                </pre>
                <div className="mt-2 text-xs text-muted-foreground">
                  Oczekiwane klucze po migracji: {fx.expectKeys.join(", ") || "—"}
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={runMigrations} className="gap-2">
          <Play className="h-4 w-4" /> Uruchom migracje
        </Button>
        <Button onClick={verifyFixture} variant="secondary" className="gap-2" disabled={!activeFixture || !after}>
          <RefreshCw className="h-4 w-4" /> Zweryfikuj fixture
        </Button>
        <Button onClick={resetEverything} variant="destructive" className="gap-2">
          <Trash2 className="h-4 w-4" /> Wyczyść klucze testowe
        </Button>
      </div>

      {reports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Raporty migracji</CardTitle>
            <CardDescription>
              alfa_ls_version: {versionBefore ?? "—"} → {versionAfter ?? "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {reports.map((r, i) => (
              <div key={i} className="rounded border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "ok" ? "default" : "destructive"}>
                    v{r.version} · {r.status}
                  </Badge>
                  <span className="font-medium">{r.description}</span>
                </div>
                {r.discarded.length > 0 && (
                  <div className="mt-1 text-xs text-yellow-600">
                    Odrzucone klucze: {r.discarded.join(", ")}
                  </div>
                )}
                {r.error && (
                  <div className="mt-1 text-xs text-destructive">Błąd: {r.error}</div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {(before || after) && (
        <Card>
          <CardHeader>
            <CardTitle>Snapshot kluczy</CardTitle>
            <CardDescription>Stan localStorage przed i po uruchomieniu migracji.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-semibold">Przed</div>
              <pre className="max-h-96 overflow-auto rounded bg-muted p-2 text-xs">
{JSON.stringify(before ?? {}, null, 2)}
              </pre>
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold">Po</div>
              <pre className="max-h-96 overflow-auto rounded bg-muted p-2 text-xs">
{JSON.stringify(after ?? {}, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />
      <p className="text-xs text-muted-foreground">
        Uwaga: ta strona operuje na rzeczywistym localStorage przeglądarki. Użyj „Wyczyść klucze testowe" po zakończeniu.
      </p>
    </div>
  );
}