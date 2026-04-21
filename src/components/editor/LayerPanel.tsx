import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Eye, EyeOff, Lock, Unlock, Plus, Trash2, Copy,
  ChevronDown, Layers, Merge, CircleDot, CircleOff, SlidersHorizontal, Scaling
} from "lucide-react";
import type { EditorLayer, BlendMode } from "@/lib/editorEngine";

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: "normal", label: "Normalny" },
  { value: "multiply", label: "Mnożenie" },
  { value: "screen", label: "Ekran" },
  { value: "overlay", label: "Nakładka" },
  { value: "darken", label: "Ściemnianie" },
  { value: "lighten", label: "Rozjaśnianie" },
  { value: "color-dodge", label: "Rozj. liniowe" },
  { value: "color-burn", label: "Ściem. liniowe" },
  { value: "hard-light", label: "Twarde światło" },
  { value: "soft-light", label: "Miękkie światło" },
  { value: "difference", label: "Różnica" },
  { value: "exclusion", label: "Wykluczenie" },
  { value: "hue", label: "Barwa" },
  { value: "saturation", label: "Nasycenie" },
  { value: "color", label: "Kolor" },
  { value: "luminosity", label: "Jasność" },
];

interface LayerPanelProps {
  layers: EditorLayer[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLock: (id: string) => void;
  onUpdateOpacity: (id: string, opacity: number) => void;
  onUpdateBlend: (id: string, mode: BlendMode) => void;
  onRename: (id: string, name: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMergeDown: (id: string) => void;
  onFlatten: () => void;
  maskMode?: boolean;
  onToggleMaskMode?: () => void;
  onAddMask?: (id: string) => void;
  onDeleteMask?: (id: string) => void;
  onFitMask?: (id: string) => void;
}

export function LayerPanel({
  layers,
  activeLayerId,
  onSelectLayer,
  onToggleVisible,
  onToggleLock,
  onUpdateOpacity,
  onUpdateBlend,
  onRename,
  onAdd,
  onRemove,
  onDuplicate,
  onMergeDown,
  onFlatten,
  maskMode,
  onToggleMaskMode,
  onAddMask,
  onDeleteMask,
  onFitMask,
}: LayerPanelProps) {
  const active = layers.find((l) => l.id === activeLayerId);

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
        <Layers className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Warstwy</span>
        <Badge variant="outline" className="ml-auto text-[8px] border-primary/30 text-primary">
          {layers.length}
        </Badge>
      </div>

      {/* Blend mode + opacity for active layer */}
      {active && (
        <div className="px-3 py-2 border-b border-border space-y-2">
          <Select
            value={active.blendMode}
            onValueChange={(v) => onUpdateBlend(active.id, v as BlendMode)}
          >
            <SelectTrigger className="h-7 text-[10px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BLEND_MODES.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-[10px]">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-muted-foreground w-14">Krycie</span>
            <Slider
              value={[active.opacity * 100]}
              onValueChange={([v]) => onUpdateOpacity(active.id, v / 100)}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-[9px] font-mono text-primary w-8 text-right">
              {Math.round(active.opacity * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Layer list — reversed (top = front) */}
      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-0.5">
          {[...layers].reverse().map((layer) => {
            const isActive = layer.id === activeLayerId;
            return (
              <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded px-2 py-1.5 cursor-pointer transition-all group",
                  isActive
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-secondary/50 border border-transparent"
                )}
              >
                {/* Thumbnail */}
                {layer.adjustment ? (
                  <div className="w-8 h-6 rounded-sm border border-primary/30 bg-primary/10 flex items-center justify-center shrink-0">
                    <SlidersHorizontal className="h-3 w-3 text-primary" />
                  </div>
                ) : (
                  <LayerThumb canvas={layer.canvas} />
                )}

                {/* Name */}
                <input
                  value={layer.name}
                  onChange={(e) => onRename(layer.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "flex-1 bg-transparent text-[10px] font-medium border-none outline-none min-w-0",
                    isActive ? "text-primary" : "text-foreground"
                  )}
                />

                {/* Controls */}
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleVisible(layer.id); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {layer.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3 opacity-0 group-hover:opacity-100" />}
                </button>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-t border-border">
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onAdd} title="Nowa warstwa">
          <Plus className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onDuplicate(activeLayerId)} title="Duplikuj">
          <Copy className="h-3 w-3" />
        </Button>
        {active?.maskCanvas ? (
          <>
            <Button
              size="sm"
              variant={maskMode ? "default" : "ghost"}
              className={`h-6 w-6 p-0 ${maskMode ? "bg-destructive/80 text-destructive-foreground" : ""}`}
              onClick={onToggleMaskMode}
              title="Edytuj maskę (Q)"
            >
              <CircleDot className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => onDeleteMask?.(activeLayerId)} title="Usuń maskę">
              <CircleOff className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onFitMask?.(activeLayerId)} title="Dopasuj maskę do transformacji">
              <Scaling className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onAddMask?.(activeLayerId)} title="Dodaj maskę">
            <CircleDot className="h-3 w-3" />
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onMergeDown(activeLayerId)} title="Scal w dół">
          <Merge className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onFlatten} title="Spłaszcz">
          <ChevronDown className="h-3 w-3" />
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => onRemove(activeLayerId)} title="Usuń">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function LayerThumb({ canvas }: { canvas: HTMLCanvasElement }) {
  return (
    <canvas
      className="w-8 h-6 rounded-sm border border-border bg-[#1e1e1e] shrink-0"
      width={32}
      height={24}
      ref={(el) => {
        if (!el) return;
        const ctx = el.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, 32, 24);
        ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 32, 24);
      }}
    />
  );
}