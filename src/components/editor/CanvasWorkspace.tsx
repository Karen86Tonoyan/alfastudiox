import { useRef, useEffect, useCallback, useState } from "react";
import type { EditorLayer, ToolType, BrushSettings } from "@/lib/editorEngine";
import { composeLayers, drawBrushLine, drawBrushStroke } from "@/lib/editorEngine";

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

    // Mask overlay: red tint where mask hides content
    if (maskMode && activeLayer?.maskCanvas) {
      const ctx = display.getContext("2d")!;
      const mask = activeLayer.maskCanvas;
      const mCtx = mask.getContext("2d")!;
      const mData = mCtx.getImageData(0, 0, mask.width, mask.height);
      const overlay = ctx.createImageData(mask.width, mask.height);
      for (let i = 0; i < mData.data.length; i += 4) {
        const brightness = mData.data[i];
        if (brightness < 255) {
          overlay.data[i] = 255;
          overlay.data[i + 1] = 0;
          overlay.data[i + 2] = 0;
          overlay.data[i + 3] = Math.round((255 - brightness) * 0.5);
        }
      }
      const tmp = document.createElement("canvas");
      tmp.width = mask.width;
      tmp.height = mask.height;
      const tmpCtx = tmp.getContext("2d")!;
      tmpCtx.putImageData(overlay, 0, 0);
      ctx.drawImage(tmp, activeLayer.x, activeLayer.y);
    }
  }, [layers, canvasWidth, canvasHeight, maskMode, activeLayer]);

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

  const isBrushTool = activeTool === "brush" || activeTool === "eraser";

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || activeTool === "hand" || (e.button === 0 && e.altKey)) {
      panning.current = true;
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (!activeLayer || activeLayer.locked || !isBrushTool) return;

    drawing.current = true;
    const pos = toCanvasCoords(e.clientX, e.clientY);
    const ctx = activeLayer.canvas.getContext("2d")!;
    drawBrushStroke(ctx, pos.x - activeLayer.x, pos.y - activeLayer.y, brush, activeTool === "eraser");
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
    const ctx = activeLayer.canvas.getContext("2d")!;
    drawBrushLine(
      ctx,
      lastPos.current.x - activeLayer.x, lastPos.current.y - activeLayer.y,
      pos.x - activeLayer.x, pos.y - activeLayer.y,
      brush,
      activeTool === "eraser"
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
    </div>
  );
}