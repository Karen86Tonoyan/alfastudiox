import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Settings, Paintbrush } from "lucide-react";
import type { BrushSettings, ToolType } from "@/lib/editorEngine";

interface PropertiesPanelProps {
  activeTool: ToolType;
  brush: BrushSettings;
  onBrushChange: (patch: Partial<BrushSettings>) => void;
  canvasWidth: number;
  canvasHeight: number;
  onResizeCanvas: (w: number, h: number) => void;
}

export function PropertiesPanel({
  activeTool,
  brush,
  onBrushChange,
  canvasWidth,
  canvasHeight,
  onResizeCanvas,
}: PropertiesPanelProps) {
  const isBrushTool = activeTool === "brush" || activeTool === "eraser";

  return (
    <div className="flex items-center gap-3 h-8 px-3 bg-card border-b border-border text-[10px]">
      {isBrushTool && (
        <>
          <Paintbrush className="h-3 w-3 text-primary" />
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Rozmiar</span>
            <Slider
              value={[brush.size]}
              onValueChange={([v]) => onBrushChange({ size: v })}
              min={1}
              max={200}
              step={1}
              className="w-20"
            />
            <span className="font-mono text-primary w-6">{brush.size}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Twardość</span>
            <Slider
              value={[brush.hardness * 100]}
              onValueChange={([v]) => onBrushChange({ hardness: v / 100 })}
              min={0}
              max={100}
              step={1}
              className="w-16"
            />
            <span className="font-mono text-primary w-6">{Math.round(brush.hardness * 100)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Krycie</span>
            <Slider
              value={[brush.opacity * 100]}
              onValueChange={([v]) => onBrushChange({ opacity: v / 100 })}
              min={1}
              max={100}
              step={1}
              className="w-16"
            />
            <span className="font-mono text-primary w-6">{Math.round(brush.opacity * 100)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Przepływ</span>
            <Slider
              value={[brush.flow * 100]}
              onValueChange={([v]) => onBrushChange({ flow: v / 100 })}
              min={1}
              max={100}
              step={1}
              className="w-16"
            />
            <span className="font-mono text-primary w-6">{Math.round(brush.flow * 100)}</span>
          </div>
        </>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Settings className="h-3 w-3 text-muted-foreground" />
        <span className="text-muted-foreground">Canvas:</span>
        <span className="font-mono text-foreground">{canvasWidth}×{canvasHeight}</span>
      </div>
    </div>
  );
}