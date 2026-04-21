import { useRef, useEffect, useCallback, useState } from "react";
import type { EditorLayer, ToolType, BrushSettings } from "@/lib/editorEngine";
import { composeLayers, drawBrushLine, drawBrushStroke } from "@/lib/editorEngine";
import { Slider } from "@/components/ui/slider";
import { Paintbrush, Eraser, PaintBucket, Save, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export type MaskEditMode = "paint" | "erase" | "fill";
export type MaskBlendMode = "absolute" | "additive" | "subtractive";

interface MaskBrushPreset {
  name: string;
  size: number;
  hardness: number;
  opacity: number;
  flow: number;
}

const DEFAULT_PRESETS: MaskBrushPreset[] = [
  { name: "Soft", size: 40, hardness: 0.1, opacity: 0.5, flow: 0.6 },
  { name: "Hard", size: 12, hardness: 1.0, opacity: 1.0, flow: 1.0 },
  { name: "Stencil", size: 80, hardness: 0.9, opacity: 0.3, flow: 0.4 },
];

const PRESETS_KEY = "alfa-mask-brush-presets";

function loadPresets(): MaskBrushPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [...DEFAULT_PRESETS];
}

function savePresets(presets: MaskBrushPreset[]) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

interface CanvasWorkspaceProps {
  layers: EditorLayer[];
  activeLayer: EditorLayer | null;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  pan: { x: number; y: number };
  activeTool: ToolType;
  brush: BrushSettings;
  onZoomChange: (z: number) => void;
  onPanChange: (p: { x: number; y: number }) => void;
  onStrokeEnd: () => void;
  maskMode?: boolean;
  onBrushChange?: (patch: Partial<BrushSettings>) => void;
  maskEditMode?: MaskEditMode;
  onMaskEditModeChange?: (mode: MaskEditMode) => void;
  maskBlendMode?: MaskBlendMode;
  onMaskBlendModeChange?: (mode: MaskBlendMode) => void;
}

export function CanvasWorkspace({
  layers,
  activeLayer,
  canvasWidth,
  canvasHeight,
  zoom,
  pan,
  activeTool,
  brush,
  onZoomChange,
  onPanChange,
  onStrokeEnd,
  maskMode = false,
  onBrushChange,
  maskEditMode = "paint",
  onMaskEditModeChange,
  maskBlendMode = "absolute",
  onMaskBlendModeChange,
}: CanvasWorkspaceProps) {
  const displayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const panning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const [maskPresets, setMaskPresets] = useState<MaskBrushPreset[]>(loadPresets);
  const [newPresetName, setNewPresetName] = useState("");
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Compose & render
  const render = useCallback(() => {
    const display = displayRef.current;
    if (!display) return;
    composeLayers(layers, display, canvasWidth, canvasHeight);

    // Mask overlay: adjustment layers get green/red heat-map, regular layers get red tint
    if (maskMode && activeLayer?.maskCanvas) {
      const ctx = display.getContext("2d")!;
      const mask = activeLayer.maskCanvas;
      const mCtx = mask.getContext("2d")!;
      const mData = mCtx.getImageData(0, 0, mask.width, mask.height);
      const overlay = ctx.createImageData(mask.width, mask.height);
      const isAdj = !!activeLayer.adjustment;

      if (isAdj) {
        // Heat-map: green = active (white mask), red = masked-out (black mask)
        for (let i = 0; i < mData.data.length; i += 4) {
          const v = mData.data[i]; // 0 = fully masked, 255 = fully active
          // Green channel proportional to active area, red to masked area
          overlay.data[i]     = Math.round(255 - v);       // R — strong where masked
          overlay.data[i + 1] = Math.round(v);             // G — strong where active
          overlay.data[i + 2] = 0;
          overlay.data[i + 3] = 100;                       // constant semi-transparent
        }
      } else {
        // Regular layer: red tint where mask hides content
        for (let i = 0; i < mData.data.length; i += 4) {
          const brightness = mData.data[i];
          if (brightness < 255) {
            overlay.data[i] = 255;
            overlay.data[i + 1] = 0;
            overlay.data[i + 2] = 0;
            overlay.data[i + 3] = Math.round((255 - brightness) * 0.5);
          }
        }
      }

      const tmp = document.createElement("canvas");
      tmp.width = mask.width;
      tmp.height = mask.height;
      const tmpCtx = tmp.getContext("2d")!;
      tmpCtx.putImageData(overlay, 0, 0);
      ctx.drawImage(tmp, activeLayer.x, activeLayer.y);
    }

    // Adjustment layer effect preview (even outside mask mode)
    if (!maskMode && activeLayer?.adjustment && activeLayer?.maskCanvas) {
      const ctx = display.getContext("2d")!;
      const mask = activeLayer.maskCanvas;
      const mCtx = mask.getContext("2d")!;
      const mData = mCtx.getImageData(0, 0, mask.width, mask.height);
      // Subtle border glow around active regions
      const overlay = ctx.createImageData(mask.width, mask.height);
      for (let i = 0; i < mData.data.length; i += 4) {
        const v = mData.data[i];
        if (v > 10 && v < 245) {
          // Transition zones — show cyan edge
          overlay.data[i]     = 0;
          overlay.data[i + 1] = 200;
          overlay.data[i + 2] = 255;
          overlay.data[i + 3] = 40;
        }
      }
      const tmp = document.createElement("canvas");
      tmp.width = mask.width;
      tmp.height = mask.height;
      const tmpCtx = tmp.getContext("2d")!;
      tmpCtx.putImageData(overlay, 0, 0);
      ctx.drawImage(tmp, activeLayer.x, activeLayer.y);
    }
  }, [layers, canvasWidth, canvasHeight, maskMode, activeLayer, activeLayer?.adjustment]);

  useEffect(() => {
    const display = displayRef.current;
    if (!display) return;
    display.width = canvasWidth;
    display.height = canvasHeight;
    render();
  }, [canvasWidth, canvasHeight, render]);

  // Re-render when layers change
  useEffect(() => {
    render();
  }, [render, layers]);

  // Periodic render for live brush feedback
  useEffect(() => {
    let raf: number;
    const loop = () => {
      if (drawing.current) render();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [render]);

  const toCanvasCoords = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const cx = (clientX - rect.left - rect.width / 2 - pan.x) / zoom + canvasWidth / 2;
    const cy = (clientY - rect.top - rect.height / 2 - pan.y) / zoom + canvasHeight / 2;
    return { x: cx, y: cy };
  };

  const isBrushTool = activeTool === "brush" || activeTool === "eraser" || maskMode;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || activeTool === "hand" || (e.button === 0 && e.altKey)) {
      panning.current = true;
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (!activeLayer || activeLayer.locked || !isBrushTool) return;

    // Fill entire mask on click when in fill mode
    if (maskMode && activeLayer.maskCanvas && maskEditMode === "fill") {
      const mCtx = activeLayer.maskCanvas.getContext("2d")!;
      mCtx.fillStyle = maskEditMode === "fill" ? "#ffffff" : "#000000";
      mCtx.fillRect(0, 0, activeLayer.maskCanvas.width, activeLayer.maskCanvas.height);
      onStrokeEnd();
      return;
    }

    drawing.current = true;
    const pos = toCanvasCoords(e.clientX, e.clientY);
    const targetCanvas = maskMode && activeLayer.maskCanvas ? activeLayer.maskCanvas : activeLayer.canvas;
    const ctx = targetCanvas.getContext("2d")!;
    const maskColor = maskEditMode === "erase" ? "#000000" : "#ffffff";
    const useBrush = maskMode ? { ...brush, color: activeTool === "eraser" ? "#ffffff" : maskColor } : brush;
    if (maskMode && maskBlendMode !== "absolute") {
      ctx.save();
      ctx.globalCompositeOperation = maskBlendMode === "additive" ? "lighter" : "multiply";
    }
    drawBrushStroke(ctx, pos.x - activeLayer.x, pos.y - activeLayer.y, useBrush, !maskMode && activeTool === "eraser");
    if (maskMode && maskBlendMode !== "absolute") {
      ctx.restore();
    }
    lastPos.current = pos;
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (panning.current) {
      onPanChange({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
      return;
    }

    if (!drawing.current || !activeLayer || !lastPos.current) return;

    const pos = toCanvasCoords(e.clientX, e.clientY);
    const targetCanvas = maskMode && activeLayer.maskCanvas ? activeLayer.maskCanvas : activeLayer.canvas;
    const ctx = targetCanvas.getContext("2d")!;
    const maskColor = maskEditMode === "erase" ? "#000000" : "#ffffff";
    const useBrush = maskMode ? { ...brush, color: activeTool === "eraser" ? "#ffffff" : maskColor } : brush;
    if (maskMode && maskBlendMode !== "absolute") {
      ctx.save();
      ctx.globalCompositeOperation = maskBlendMode === "additive" ? "lighter" : "multiply";
    }
    drawBrushLine(
      ctx,
      lastPos.current.x - activeLayer.x, lastPos.current.y - activeLayer.y,
      pos.x - activeLayer.x, pos.y - activeLayer.y,
      useBrush,
      !maskMode && activeTool === "eraser"
    );
    if (maskMode && maskBlendMode !== "absolute") {
      ctx.restore();
    }
    lastPos.current = pos;
  };

  const handlePointerUp = () => {
    if (panning.current) {
      panning.current = false;
      return;
    }
    if (drawing.current) {
      drawing.current = false;
      lastPos.current = null;
      onStrokeEnd();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      onZoomChange(Math.max(0.1, Math.min(10, zoom * delta)));
    } else {
      onPanChange({
        x: pan.x - e.deltaX,
        y: pan.y - e.deltaY,
      });
    }
  };

  const cursorStyle = (): string => {
    if (activeTool === "hand") return "grab";
    if (maskMode && isBrushTool) return "none";
    if (isBrushTool) return "crosshair";
    if (activeTool === "eyedropper") return "crosshair";
    if (activeTool === "zoom") return "zoom-in";
    if (activeTool === "move") return "move";
    return "default";
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (maskMode && isBrushTool) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    }
  };

  const handleMouseLeave = () => {
    setCursorPos(null);
  };

  // Brush cursor size in screen pixels
  const brushScreenSize = brush.size * zoom;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden bg-[#1a1a1a] relative"
      style={{ cursor: cursorStyle() }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="absolute"
        style={{
          left: "50%",
          top: "50%",
          transform: `translate(${pan.x}px, ${pan.y}px) translate(-50%, -50%) scale(${zoom})`,
          transformOrigin: "center",
        }}
      >
        <canvas
          ref={displayRef}
          className="shadow-2xl"
          style={{ imageRendering: zoom > 3 ? "pixelated" : "auto" }}
        />
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-3 right-3 bg-card/80 border border-border rounded px-2 py-1 text-[10px] font-mono text-muted-foreground backdrop-blur-sm">
        {Math.round(zoom * 100)}% · {canvasWidth}×{canvasHeight}
      </div>

      {/* Brush cursor preview */}
      {maskMode && isBrushTool && cursorPos && (
        <div
          className="pointer-events-none absolute z-20"
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          {/* Outer circle — full brush size */}
          <div
            className="rounded-full border border-white/60 absolute"
            style={{
              width: Math.max(4, brushScreenSize),
              height: Math.max(4, brushScreenSize),
              left: -Math.max(4, brushScreenSize) / 2,
              top: -Math.max(4, brushScreenSize) / 2,
              boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
            }}
          />
          {/* Inner circle — hardness core */}
          {brush.hardness < 0.95 && brushScreenSize > 8 && (
            <div
              className="rounded-full border border-white/30 absolute"
              style={{
                width: Math.max(2, brushScreenSize * brush.hardness),
                height: Math.max(2, brushScreenSize * brush.hardness),
                left: -Math.max(2, brushScreenSize * brush.hardness) / 2,
                top: -Math.max(2, brushScreenSize * brush.hardness) / 2,
                boxShadow: "0 0 0 1px rgba(0,0,0,0.2)",
              }}
            />
          )}
          {/* Center dot */}
          <div
            className="rounded-full absolute"
            style={{
              width: 3,
              height: 3,
              left: -1.5,
              top: -1.5,
              background: maskEditMode === "erase" ? "#000" : "#fff",
              boxShadow: maskEditMode === "erase" ? "0 0 0 1px rgba(255,255,255,0.5)" : "0 0 0 1px rgba(0,0,0,0.5)",
            }}
          />
          {/* Blend mode label */}
          <div
            className="absolute whitespace-nowrap text-[9px] font-mono leading-none select-none"
            style={{
              left: Math.max(4, brushScreenSize) / 2 + 6,
              top: -5,
              color: maskBlendMode === "subtractive" ? "#f87171" : maskBlendMode === "additive" ? "#4ade80" : "#e2e8f0",
              textShadow: "0 0 3px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.6)",
            }}
          >
            {maskBlendMode === "absolute" ? "ABS" : maskBlendMode === "additive" ? "ADD" : "SUB"}
          </div>
        </div>
      )}

      {/* Mask mode HUD */}
      {maskMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-card/90 border border-primary/40 rounded-lg px-4 py-3 backdrop-blur-sm flex items-center gap-4 text-xs text-foreground shadow-lg z-10">
          <span className="font-semibold text-primary uppercase tracking-wider text-[10px] shrink-0">Maska</span>

          {/* Active color + mode indicator */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div
              className="w-4 h-4 rounded-sm border border-border"
              style={{ background: maskEditMode === "erase" ? "#000000" : "#ffffff" }}
              title={maskEditMode === "erase" ? "Czarny (ukrywa)" : "Biały (odkrywa)"}
            />
            <span className="text-[9px] text-muted-foreground font-mono">
              {maskEditMode === "erase" ? "Czarny" : maskEditMode === "fill" ? "Biały" : "Biały"}
            </span>
            <kbd className="text-[8px] font-mono bg-secondary/60 border border-border rounded px-1 py-0.5 text-muted-foreground">Q</kbd>
          </div>

          {/* Blend mode toggle */}
          <div className="flex items-center gap-0.5 border border-border rounded-md p-0.5 shrink-0">
            {([
              { mode: "absolute" as MaskBlendMode, label: "Zastąp", shortcut: "4" },
              { mode: "additive" as MaskBlendMode, label: "Dodaj", shortcut: "5" },
              { mode: "subtractive" as MaskBlendMode, label: "Odejmij", shortcut: "6" },
            ] as const).map(({ mode, label, shortcut }) => (
              <button
                key={mode}
                onClick={() => onMaskBlendModeChange?.(mode)}
                className={`px-1.5 py-0.5 rounded text-[9px] transition-all ${
                  maskBlendMode === mode
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
                title={`${label} (${shortcut})`}
              >
                {label} <kbd className="text-[7px] opacity-50 font-mono">{shortcut}</kbd>
              </button>
            ))}
          </div>

          {/* Mode buttons */}
          <div className="flex items-center gap-0.5 border border-border rounded-md p-0.5 shrink-0">
            {([
              { mode: "paint" as MaskEditMode, icon: Paintbrush, label: "Maluj", shortcut: "1" },
              { mode: "erase" as MaskEditMode, icon: Eraser, label: "Wyczyść", shortcut: "2" },
              { mode: "fill" as MaskEditMode, icon: PaintBucket, label: "Wypełnij", shortcut: "3" },
            ] as const).map(({ mode, icon: Icon, label, shortcut }) => (
              <button
                key={mode}
                onClick={() => onMaskEditModeChange?.(mode)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all ${
                  maskEditMode === mode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
                title={`${label} (${shortcut})`}
              >
                <Icon className="h-3 w-3" />
                <span>{label}</span>
                <kbd className="ml-0.5 text-[8px] opacity-60 font-mono">{shortcut}</kbd>
              </button>
            ))}
          </div>

          {/* Presets */}
          <div className="flex items-center gap-1 shrink-0">
            {maskPresets.map((p, i) => (
              <button
                key={i}
                onClick={() => onBrushChange?.({ size: p.size, hardness: p.hardness, opacity: p.opacity, flow: p.flow })}
                className="px-1.5 py-0.5 rounded text-[9px] border border-border hover:border-primary/40 hover:bg-primary/10 transition-all text-muted-foreground hover:text-foreground"
                title={`${p.name}: ${p.size}px, twardość ${Math.round(p.hardness * 100)}%, krycie ${Math.round(p.opacity * 100)}%, przepływ ${Math.round(p.flow * 100)}%`}
              >
                {p.name}
              </button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <button className="px-1 py-0.5 rounded text-[9px] border border-dashed border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all" title="Zarządzaj presetami">
                  <Star className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3 space-y-2" align="start">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">Zapisz aktualny preset</span>
                <div className="flex gap-1">
                  <Input
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="Nazwa presetu"
                    className="h-6 text-[10px]"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[9px] shrink-0"
                    onClick={() => {
                      const name = newPresetName.trim() || `Preset ${maskPresets.length + 1}`;
                      const preset: MaskBrushPreset = {
                        name,
                        size: brush.size,
                        hardness: brush.hardness,
                        opacity: brush.opacity,
                        flow: brush.flow,
                      };
                      const next = [...maskPresets, preset];
                      setMaskPresets(next);
                      savePresets(next);
                      setNewPresetName("");
                      toast.success(`Preset „${name}" zapisany`);
                    }}
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                </div>
                {maskPresets.length > 0 && (
                  <div className="space-y-0.5 pt-1 border-t border-border">
                    <span className="text-[9px] text-muted-foreground">Kliknij × aby usunąć</span>
                    {maskPresets.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px]">
                        <span className="text-foreground">{p.name}</span>
                        <span className="text-muted-foreground font-mono text-[8px]">
                          {p.size}px H{Math.round(p.hardness * 100)} O{Math.round(p.opacity * 100)} F{Math.round(p.flow * 100)}
                        </span>
                        <button
                          className="text-destructive hover:text-destructive/80 text-[10px] ml-1"
                          onClick={() => {
                            const next = maskPresets.filter((_, j) => j !== i);
                            setMaskPresets(next);
                            savePresets(next);
                          }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full h-5 text-[8px] text-muted-foreground"
                  onClick={() => {
                    setMaskPresets([...DEFAULT_PRESETS]);
                    savePresets([...DEFAULT_PRESETS]);
                    toast.info("Przywrócono domyślne presety");
                  }}
                >
                  Przywróć domyślne
                </Button>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-2 min-w-[140px]">
            <span className="text-muted-foreground w-16">Rozmiar <kbd className="text-[7px] opacity-50 font-mono">[ ]</kbd></span>
            <Slider
              min={1} max={200} step={1}
              value={[brush.size]}
              onValueChange={([v]) => onBrushChange?.({ size: v })}
              className="w-24"
            />
            <span className="font-mono w-8 text-right">{brush.size}</span>
          </div>
          <div className="flex items-center gap-2 min-w-[140px]">
            <span className="text-muted-foreground w-16">Twardość <kbd className="text-[7px] opacity-50 font-mono">⇧[]</kbd></span>
            <Slider
              min={0} max={100} step={1}
              value={[Math.round(brush.hardness * 100)]}
              onValueChange={([v]) => onBrushChange?.({ hardness: v / 100 })}
              className="w-24"
            />
            <span className="font-mono w-8 text-right">{Math.round(brush.hardness * 100)}%</span>
          </div>
          <div className="flex items-center gap-2 min-w-[140px]">
            <span className="text-muted-foreground w-16">Krycie <kbd className="text-[7px] opacity-50 font-mono">⌥[]</kbd></span>
            <Slider
              min={1} max={100} step={1}
              value={[Math.round(brush.opacity * 100)]}
              onValueChange={([v]) => onBrushChange?.({ opacity: v / 100 })}
              className="w-24"
            />
            <span className="font-mono w-8 text-right">{Math.round(brush.opacity * 100)}%</span>
          </div>
          <div className="flex items-center gap-2 min-w-[140px]">
            <span className="text-muted-foreground w-16">Przepływ <kbd className="text-[7px] opacity-50 font-mono">⌥⇧[]</kbd></span>
            <Slider
              min={1} max={100} step={1}
              value={[Math.round(brush.flow * 100)]}
              onValueChange={([v]) => onBrushChange?.({ flow: v / 100 })}
              className="w-24"
            />
            <span className="font-mono w-8 text-right">{Math.round(brush.flow * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}