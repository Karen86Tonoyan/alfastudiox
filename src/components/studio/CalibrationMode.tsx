import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { FlaskConical, Play, ChevronDown, ChevronUp } from "lucide-react";
import type { PhotoSessionConfig } from "@/lib/photoSessionWorkflow";

export interface CalibrationVariant {
  label: string;
  description: string;
  param: string;
  apply: (config: PhotoSessionConfig) => Partial<PhotoSessionConfig>;
}

const CALIBRATION_VARIANTS: CalibrationVariant[] = [
  {
    label: "CFG +1",
    description: "Więcej adherencji do promptu",
    param: "cfg",
    apply: (c) => ({ cfg: Math.min(10, c.cfg + 1) }),
  },
  {
    label: "CFG −1",
    description: "Więcej kreatywności modelu",
    param: "cfg",
    apply: (c) => ({ cfg: Math.max(1, c.cfg - 1) }),
  },
  {
    label: "Steps +5",
    description: "Wyższa jakość detali",
    param: "steps",
    apply: (c) => ({ steps: Math.min(50, c.steps + 5) }),
  },
  {
    label: "IP +0.1",
    description: "Silniejszy transfer stylu",
    param: "ipWeight",
    apply: (c) => ({ ipWeight: Math.min(1, +(c.ipWeight + 0.1).toFixed(2)) }),
  },
  {
    label: "PuLID off",
    description: "Wyłącz face-lock",
    param: "pulidWeight",
    apply: (c) => ({ layers: { ...c.layers, pulid: false }, pulidWeight: 0 }),
  },
];

interface CalibrationModeProps {
  enabled: boolean;
  onToggle: (val: boolean) => void;
  baseConfig: PhotoSessionConfig;
  onRunCalibration: (variants: PhotoSessionConfig[]) => void;
  isRendering: boolean;
  hasImages: boolean;
}

export function CalibrationMode({
  enabled,
  onToggle,
  baseConfig,
  onRunCalibration,
  isRendering,
  hasImages,
}: CalibrationModeProps) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<boolean[]>(CALIBRATION_VARIANTS.map(() => true));

  const toggleVariant = (i: number) => {
    setSelected((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  const activeCount = selected.filter(Boolean).length;

  const handleRun = () => {
    const baseSeed = baseConfig.seed === -1 ? Math.floor(Math.random() * 2147483647) : baseConfig.seed;

    const variants = CALIBRATION_VARIANTS
      .filter((_, i) => selected[i])
      .map((variant) => ({
        ...baseConfig,
        ...variant.apply(baseConfig),
        seed: baseSeed, // same seed for fair comparison
      }));

    onRunCalibration(variants);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <FlaskConical className="h-3.5 w-3.5" />
          Kalibracja
        </label>
        <div className="flex items-center gap-2">
          {enabled && (
            <Badge variant="outline" className="text-[9px] border-primary/30 text-primary font-mono">
              {activeCount} wariantów
            </Badge>
          )}
          <Switch checked={enabled} onCheckedChange={onToggle} className="scale-75" />
        </div>
      </div>

      {enabled && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">
            Kolejkuje {activeCount} renderów z tym samym seedem, zmieniając jeden parametr na raz.
          </p>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <span>Warianty</span>
          </button>

          {expanded && (
            <div className="space-y-1">
              {CALIBRATION_VARIANTS.map((variant, i) => {
                const applied = variant.apply(baseConfig);
                const currentVal = variant.param === "pulidWeight"
                  ? (baseConfig.layers.pulid ? baseConfig.pulidWeight : "off")
                  : (baseConfig as Record<string, unknown>)[variant.param];
                const newVal = variant.param === "pulidWeight"
                  ? ((applied as Record<string, unknown>).pulidWeight ?? 0)
                  : (applied as Record<string, unknown>)[variant.param] ?? currentVal;

                return (
                  <button
                    key={variant.label}
                    onClick={() => toggleVariant(i)}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-all",
                      selected[i]
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-card/30 opacity-50"
                    )}
                  >
                    <div className={cn(
                      "h-3 w-3 rounded-sm border flex items-center justify-center text-[8px]",
                      selected[i] ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                    )}>
                      {selected[i] && "✓"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-foreground">{variant.label}</span>
                        <span className="text-[9px] text-muted-foreground font-mono">
                          {String(currentVal)} → {String(newVal)}
                        </span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">{variant.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <Button
            onClick={handleRun}
            disabled={isRendering || !hasImages || activeCount === 0}
            size="sm"
            className="w-full gap-1.5 text-xs font-semibold uppercase tracking-wider gold-gradient text-primary-foreground hover:opacity-90"
          >
            <Play className="h-3 w-3" />
            Uruchom kalibrację ({activeCount})
          </Button>
        </div>
      )}
    </div>
  );
}
