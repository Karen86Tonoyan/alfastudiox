import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SlidersHorizontal, Sun, Contrast, Palette, TrendingUp, Plus, ClipboardCopy, ClipboardPaste } from "lucide-react";
import type { AdjustmentData, AdjustmentType } from "@/lib/editorEngine";
import type { EditorLayer } from "@/lib/editorEngine";
import { cn } from "@/lib/utils";

interface AdjustmentPanelProps {
  activeLayer: EditorLayer | null;
  onUpdateAdjustment: (id: string, patch: Partial<AdjustmentData>) => void;
  onAddAdjustment: (type: AdjustmentType) => void;
  copiedAdjustment?: AdjustmentData | null;
  onCopyAdjustment?: () => void;
  onPasteAdjustment?: () => void;
}

const ADJ_TYPES: { type: AdjustmentType; label: string; icon: React.ElementType }[] = [
  { type: "brightness-contrast", label: "Jasność / Kontrast", icon: Sun },
  { type: "hue-saturation", label: "Barwa / Nasycenie", icon: Palette },
  { type: "curves", label: "Krzywe", icon: TrendingUp },
];

export function AdjustmentPanel({ activeLayer, onUpdateAdjustment, onAddAdjustment, copiedAdjustment, onCopyAdjustment, onPasteAdjustment }: AdjustmentPanelProps) {
  const adj = activeLayer?.adjustment;
  const isAdj = !!adj;

  return (
    <div className="flex flex-col border-l border-border bg-card w-56">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Dopasowania</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Add adjustment layer buttons */}
          <div className="space-y-1">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Dodaj warstwę dopasowania
            </span>
            <div className="space-y-0.5">
              {ADJ_TYPES.map((a) => (
                <button
                  key={a.type}
                  onClick={() => onAddAdjustment(a.type)}
                  className="flex items-center gap-2 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[10px] hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  <a.icon className="h-3 w-3 text-primary" />
                  <span className="text-foreground font-medium">{a.label}</span>
                  <Plus className="h-3 w-3 ml-auto text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>

          {/* Active adjustment controls */}
          {isAdj && activeLayer && (
            <div className="space-y-2 rounded-md border border-primary/20 bg-primary/5 p-2.5">
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[8px] border-primary/30 text-primary px-1.5 py-0">
                  {adj.type === "brightness-contrast" && "Jasność/Kontrast"}
                  {adj.type === "hue-saturation" && "Barwa/Nasycenie"}
                  {adj.type === "curves" && "Krzywe"}
                </Badge>
                <span className="text-[9px] text-muted-foreground truncate">{activeLayer.name}</span>
              </div>

              {/* Copy / Paste buttons */}
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-5 gap-1 text-[8px] px-1.5"
                  onClick={onCopyAdjustment}
                  title="Kopiuj ustawienia (Ctrl+Shift+C)"
                >
                  <ClipboardCopy className="h-2.5 w-2.5" /> Kopiuj
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-5 gap-1 text-[8px] px-1.5"
                  onClick={onPasteAdjustment}
                  disabled={!copiedAdjustment}
                  title="Wklej ustawienia (Ctrl+Shift+V)"
                >
                  <ClipboardPaste className="h-2.5 w-2.5" /> Wklej
                </Button>
              </div>

              {adj.type === "brightness-contrast" && (
                <BrightnessContrastControls
                  adj={adj}
                  onChange={(patch) => onUpdateAdjustment(activeLayer.id, patch)}
                />
              )}

              {adj.type === "hue-saturation" && (
                <HueSaturationControls
                  adj={adj}
                  onChange={(patch) => onUpdateAdjustment(activeLayer.id, patch)}
                />
              )}

              {adj.type === "curves" && (
                <CurvesControls
                  adj={adj}
                  onChange={(patch) => onUpdateAdjustment(activeLayer.id, patch)}
                />
              )}
            </div>
          )}

          {!isAdj && activeLayer && (
            <div className="text-[10px] text-muted-foreground text-center py-4">
              Zaznacz warstwę dopasowania, aby edytować jej parametry
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between">
        <span className="text-[9px] text-muted-foreground">{label}</span>
        <span className="text-[9px] font-mono text-primary">{value > 0 ? `+${value}` : value}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="py-0.5"
      />
    </div>
  );
}

function BrightnessContrastControls({
  adj,
  onChange,
}: {
  adj: AdjustmentData;
  onChange: (p: Partial<AdjustmentData>) => void;
}) {
  return (
    <div className="space-y-2">
      <SliderRow label="Jasność" value={adj.brightness ?? 0} min={-100} max={100} onChange={(v) => onChange({ brightness: v })} />
      <SliderRow label="Kontrast" value={adj.contrast ?? 0} min={-100} max={100} onChange={(v) => onChange({ contrast: v })} />
      <button
        onClick={() => onChange({ brightness: 0, contrast: 0 })}
        className="text-[8px] text-muted-foreground hover:text-foreground transition-colors"
      >
        Reset
      </button>
    </div>
  );
}

function HueSaturationControls({
  adj,
  onChange,
}: {
  adj: AdjustmentData;
  onChange: (p: Partial<AdjustmentData>) => void;
}) {
  return (
    <div className="space-y-2">
      <SliderRow label="Barwa" value={adj.hue ?? 0} min={-180} max={180} onChange={(v) => onChange({ hue: v })} />
      <SliderRow label="Nasycenie" value={adj.saturation ?? 0} min={-100} max={100} onChange={(v) => onChange({ saturation: v })} />
      <SliderRow label="Jasność" value={adj.lightness ?? 0} min={-100} max={100} onChange={(v) => onChange({ lightness: v })} />
      <button
        onClick={() => onChange({ hue: 0, saturation: 0, lightness: 0 })}
        className="text-[8px] text-muted-foreground hover:text-foreground transition-colors"
      >
        Reset
      </button>
    </div>
  );
}

function CurvesControls({
  adj,
  onChange,
}: {
  adj: AdjustmentData;
  onChange: (p: Partial<AdjustmentData>) => void;
}) {
  const curves = adj.curves ?? { r: lin(), g: lin(), b: lin(), rgb: lin() };

  // Simple 3-point curves: shadows, midtones, highlights
  const getMid = (lut: number[]) => lut[128];
  const setSimpleCurve = (channel: "r" | "g" | "b" | "rgb", mid: number) => {
    const lut = Array.from({ length: 256 }, (_, i) => {
      // Quadratic through (0,0), (128,mid), (255,255)
      const t = i / 255;
      const a = 2 * (255 - 2 * mid + 0);
      const b2 = -3 * 0 + 4 * mid - 255;
      const v = a * t * t + b2 * t;
      return Math.max(0, Math.min(255, Math.round(v)));
    });
    onChange({ curves: { ...curves, [channel]: lut } });
  };

  return (
    <div className="space-y-2">
      <SliderRow
        label="RGB Midtony"
        value={getMid(curves.rgb) - 128}
        min={-128}
        max={127}
        onChange={(v) => setSimpleCurve("rgb", 128 + v)}
      />
      <SliderRow
        label="R Midtony"
        value={getMid(curves.r) - 128}
        min={-128}
        max={127}
        onChange={(v) => setSimpleCurve("r", 128 + v)}
      />
      <SliderRow
        label="G Midtony"
        value={getMid(curves.g) - 128}
        min={-128}
        max={127}
        onChange={(v) => setSimpleCurve("g", 128 + v)}
      />
      <SliderRow
        label="B Midtony"
        value={getMid(curves.b) - 128}
        min={-128}
        max={127}
        onChange={(v) => setSimpleCurve("b", 128 + v)}
      />
      <button
        onClick={() => onChange({ curves: { r: lin(), g: lin(), b: lin(), rgb: lin() } })}
        className="text-[8px] text-muted-foreground hover:text-foreground transition-colors"
      >
        Reset
      </button>
    </div>
  );
}

function lin() { return Array.from({ length: 256 }, (_, i) => i); }