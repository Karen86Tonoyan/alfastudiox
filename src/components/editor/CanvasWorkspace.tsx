import { useRef, useEffect, useCallback, useState } from "react";
import type { EditorLayer, ToolType, BrushSettings } from "@/lib/editorEngine";
import { composeLayers, drawBrushLine, drawBrushStroke } from "@/lib/editorEngine";
import { Slider } from "@/components/ui/slider";

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
}: CanvasWorkspaceProps) {
  const displayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const panning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

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

    drawing.current = true;
    const pos = toCanvasCoords(e.clientX, e.clientY);
    const targetCanvas = maskMode && activeLayer.maskCanvas ? activeLayer.maskCanvas : activeLayer.canvas;
    const ctx = targetCanvas.getContext("2d")!;
    const useBrush = maskMode ? { ...brush, color: activeTool === "eraser" ? "#ffffff" : "#000000" } : brush;
    drawBrushStroke(ctx, pos.x - activeLayer.x, pos.y - activeLayer.y, useBrush, !maskMode && activeTool === "eraser");
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
    const useBrush = maskMode ? { ...brush, color: activeTool === "eraser" ? "#ffffff" : "#000000" } : brush;
    drawBrushLine(
      ctx,
      lastPos.current.x - activeLayer.x, lastPos.current.y - activeLayer.y,
      pos.x - activeLayer.x, pos.y - activeLayer.y,
      useBrush,
      !maskMode && activeTool === "eraser"
    );
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
    if (isBrushTool) return "crosshair";
    if (activeTool === "eyedropper") return "crosshair";
    if (activeTool === "zoom") return "zoom-in";
    if (activeTool === "move") return "move";
    return "default";
  };

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

      {/* Mask mode HUD */}
      {maskMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-card/90 border border-primary/40 rounded-lg px-4 py-3 backdrop-blur-sm flex items-center gap-6 text-xs text-foreground shadow-lg z-10">
          <span className="font-semibold text-primary uppercase tracking-wider text-[10px]">Maska</span>
          <div className="flex items-center gap-2 min-w-[140px]">
            <span className="text-muted-foreground w-16">Rozmiar</span>
            <Slider
              min={1} max={200} step={1}
              value={[brush.size]}
              onValueChange={([v]) => onBrushChange?.({ size: v })}
              className="w-24"
            />
            <span className="font-mono w-8 text-right">{brush.size}</span>
          </div>
          <div className="flex items-center gap-2 min-w-[140px]">
            <span className="text-muted-foreground w-16">Twardość</span>
            <Slider
              min={0} max={100} step={1}
              value={[Math.round(brush.hardness * 100)]}
              onValueChange={([v]) => onBrushChange?.({ hardness: v / 100 })}
              className="w-24"
            />
            <span className="font-mono w-8 text-right">{Math.round(brush.hardness * 100)}%</span>
          </div>
          <div className="flex items-center gap-2 min-w-[140px]">
            <span className="text-muted-foreground w-16">Krycie</span>
            <Slider
              min={1} max={100} step={1}
              value={[Math.round(brush.opacity * 100)]}
              onValueChange={([v]) => onBrushChange?.({ opacity: v / 100 })}
              className="w-24"
            />
            <span className="font-mono w-8 text-right">{Math.round(brush.opacity * 100)}%</span>
          </div>
          <div className="flex items-center gap-2 min-w-[140px]">
            <span className="text-muted-foreground w-16">Przepływ</span>
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