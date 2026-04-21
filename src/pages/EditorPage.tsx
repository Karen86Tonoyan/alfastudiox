import { useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Undo2, Redo2, Upload, FilePlus, ZoomIn, ZoomOut,
  Maximize, ImagePlus, CircleDot
} from "lucide-react";
import { FileUp } from "lucide-react";
import { useEditorEngine } from "@/hooks/useEditorEngine";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { CanvasWorkspace } from "@/components/editor/CanvasWorkspace";
import { LayerPanel } from "@/components/editor/LayerPanel";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { ExportDialog } from "@/components/editor/ExportDialog";
import { AdjustmentPanel } from "@/components/editor/AdjustmentPanel";
import { AIGenerateDialog } from "@/components/editor/AIGenerateDialog";
import { importPSD } from "@/lib/psdIO";

export default function EditorPage() {
  const engine = useEditorEngine(1920, 1080);
  const importRef = useRef<HTMLInputElement>(null);
  const psdImportRef = useRef<HTMLInputElement>(null);

  const handleImportImage = useCallback((file: File) => {
    const img = new Image();
    img.onload = () => {
      engine.addImageLayer(img, file.name.replace(/\.[^.]+$/, ""));
      toast.success(`Dodano warstwę: ${file.name}`);
    };
    img.src = URL.createObjectURL(file);
  }, [engine]);

  const handleImportPSD = useCallback(async (file: File) => {
    try {
      toast.info("Importowanie PSD...");
      const buffer = await file.arrayBuffer();
      const { layers, width, height } = await importPSD(buffer);
      engine.resizeCanvas(width, height);
      engine.setLayers((_prev: any) => {
        engine.pushHistory("Import PSD", layers, layers[layers.length - 1]?.id ?? "");
        return layers;
      });
      if (layers.length > 0) {
        engine.setActiveLayerId(layers[layers.length - 1].id);
      }
      toast.success(`PSD zaimportowany: ${layers.length} warstw, ${width}×${height}`);
    } catch (e) {
      console.error("PSD import error:", e);
      toast.error("Błąd importu PSD");
    }
  }, [engine]);

  const handleStrokeEnd = useCallback(() => {
    engine.pushHistory("Pociągnięcie pędzla", engine.layers, engine.activeLayerId);
  }, [engine]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        engine.undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        engine.redo();
      }
      if (e.key === "b" && !e.ctrlKey) engine.setActiveTool("brush");
      if (e.key === "e" && !e.ctrlKey) engine.setActiveTool("eraser");
      if (e.key === "v" && !e.ctrlKey) engine.setActiveTool("select");
      if (e.key === "h" && !e.ctrlKey) engine.setActiveTool("hand");
      if (e.key === "z" && !e.ctrlKey && !e.metaKey) engine.setActiveTool("zoom");
      if (e.key === "t" && !e.ctrlKey) engine.setActiveTool("text");
      if (e.key === "g" && !e.ctrlKey) engine.setActiveTool("fill");
      if (e.key === "i" && !e.ctrlKey) engine.setActiveTool("eyedropper");
      if (e.key === "c" && !e.ctrlKey) engine.setActiveTool("crop");
      if (e.key === "m" && !e.ctrlKey) engine.setActiveTool("move");
      if (e.key === "p" && !e.ctrlKey) engine.setActiveTool("pen");
      if (e.key === "u" && !e.ctrlKey) engine.setActiveTool("shape");

      // Layer shortcuts
      if (e.altKey && e.key === "[") { e.preventDefault(); engine.selectLayerBelow(); }
      if (e.altKey && e.key === "]") { e.preventDefault(); engine.selectLayerAbove(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "[") { e.preventDefault(); engine.moveLayerDown(engine.activeLayerId); }
      if ((e.ctrlKey || e.metaKey) && e.key === "]") { e.preventDefault(); engine.moveLayerUp(engine.activeLayerId); }
      if ((e.ctrlKey || e.metaKey) && e.key === "j") { e.preventDefault(); engine.duplicateLayer(engine.activeLayerId); }
      if (e.key === "Delete" && !e.ctrlKey && !e.altKey) engine.removeLayer(engine.activeLayerId);
      if ((e.ctrlKey || e.metaKey) && e.key === "e") { e.preventDefault(); engine.mergeDown(engine.activeLayerId); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "E") { e.preventDefault(); engine.flattenAll(); }

      // Mask mode
      if (e.key === "q" && !e.ctrlKey && !e.altKey && !e.metaKey) engine.toggleMaskMode();
      if (e.key === "\\" && !e.ctrlKey) engine.toggleMaskMode();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [engine]);

  // Paste from clipboard
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) handleImportImage(blob);
        }
      }
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [handleImportImage]);

  // Drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    for (const f of files) {
      if (f.name.toLowerCase().endsWith(".psd")) {
        handleImportPSD(f);
      } else if (f.type.startsWith("image/")) {
        handleImportImage(f);
      }
    }
  }, [handleImportImage, handleImportPSD]);

  return (
    <div
      className="flex flex-col h-full -m-4"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center gap-2 h-9 px-3 bg-card border-b border-border">
        <Badge className="gold-gradient text-primary-foreground text-[9px] px-2">
          ALFA Editor
        </Badge>

        <div className="flex items-center gap-0.5 ml-2">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={engine.undo} title="Cofnij (Ctrl+Z)">
            <Undo2 className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={engine.redo} title="Ponów (Ctrl+Y)">
            <Redo2 className="h-3 w-3" />
          </Button>
        </div>

        <div className="h-4 w-px bg-border mx-1" />

        <div className="flex items-center gap-0.5">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => engine.setZoom(Math.max(0.1, engine.zoom / 1.25))} title="Oddal">
            <ZoomOut className="h-3 w-3" />
          </Button>
          <span className="text-[9px] font-mono text-muted-foreground w-8 text-center">{Math.round(engine.zoom * 100)}%</span>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => engine.setZoom(Math.min(10, engine.zoom * 1.25))} title="Przybliż">
            <ZoomIn className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { engine.setZoom(1); engine.setPan({ x: 0, y: 0 }); }} title="Dopasuj">
            <Maximize className="h-3 w-3" />
          </Button>
        </div>

        <div className="h-4 w-px bg-border mx-1" />

        <Button
          size="sm"
          variant="ghost"
          className="h-6 gap-1 text-[10px] px-2"
          onClick={() => importRef.current?.click()}
        >
          <ImagePlus className="h-3 w-3" /> Import
        </Button>
        <input
          ref={importRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            Array.from(e.target.files ?? []).forEach(handleImportImage);
            e.target.value = "";
          }}
        />

        <Button
          size="sm"
          variant="ghost"
          className="h-6 gap-1 text-[10px] px-2"
          onClick={() => psdImportRef.current?.click()}
          title="Import pliku PSD"
        >
          <FileUp className="h-3 w-3" /> PSD
        </Button>
        <input
          ref={psdImportRef}
          type="file"
          accept=".psd"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImportPSD(f);
            e.target.value = "";
          }}
        />

        <Button
          size="sm"
          variant="ghost"
          className="h-6 gap-1 text-[10px] px-2"
          onClick={() => engine.addLayer()}
        >
          <FilePlus className="h-3 w-3" /> Nowa warstwa
        </Button>

        <div className="h-4 w-px bg-border mx-1" />

        <AIGenerateDialog
          canvasWidth={engine.canvasWidth}
          canvasHeight={engine.canvasHeight}
          onImageGenerated={(img, name) => {
            engine.addImageLayer(img, name);
          }}
        />

        <Button
          size="sm"
          variant={engine.maskMode ? "default" : "ghost"}
          className={`h-6 gap-1 text-[10px] px-2 ${engine.maskMode ? "bg-destructive/80 hover:bg-destructive text-destructive-foreground" : ""}`}
          onClick={engine.toggleMaskMode}
          title="Tryb maski (Q)"
        >
          <CircleDot className="h-3 w-3" /> {engine.maskMode ? "Maska ON" : "Maska"}
        </Button>

        <div className="ml-auto">
          <ExportDialog
            layers={engine.layers}
            canvasWidth={engine.canvasWidth}
            canvasHeight={engine.canvasHeight}
          />
        </div>
      </div>

      {/* ── Properties bar ── */}
      <PropertiesPanel
        activeTool={engine.activeTool}
        brush={engine.brush}
        onBrushChange={(patch) => engine.setBrush((prev) => ({ ...prev, ...patch }))}
        canvasWidth={engine.canvasWidth}
        canvasHeight={engine.canvasHeight}
        onResizeCanvas={engine.resizeCanvas}
      />

      {/* ── Main area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        <EditorToolbar
          activeTool={engine.activeTool}
          onSelectTool={engine.setActiveTool}
          fgColor={engine.brush.color}
          bgColor="#ffffff"
          onFgColorChange={(c) => engine.setBrush((prev) => ({ ...prev, color: c }))}
          onBgColorChange={() => {}}
        />

        {/* Canvas */}
        <CanvasWorkspace
          layers={engine.layers}
          activeLayer={engine.activeLayer}
          canvasWidth={engine.canvasWidth}
          canvasHeight={engine.canvasHeight}
          zoom={engine.zoom}
          pan={engine.pan}
          activeTool={engine.activeTool}
          brush={engine.brush}
          onZoomChange={engine.setZoom}
          onPanChange={engine.setPan}
          onStrokeEnd={handleStrokeEnd}
          maskMode={engine.maskMode}
          onBrushChange={(patch) => engine.setBrush((prev) => ({ ...prev, ...patch }))}
        />

        {/* Right panels */}
        <div className="flex">
          {/* Adjustment panel */}
          <AdjustmentPanel
            activeLayer={engine.activeLayer}
            onUpdateAdjustment={engine.updateAdjustment}
            onAddAdjustment={engine.addAdjustment}
          />

          {/* Layer panel */}
          <LayerPanel
            layers={engine.layers}
            activeLayerId={engine.activeLayerId}
            onSelectLayer={engine.setActiveLayerId}
            onToggleVisible={(id) => {
              const l = engine.layers.find((x) => x.id === id);
              if (l) engine.updateLayer(id, { visible: !l.visible });
            }}
            onToggleLock={(id) => {
              const l = engine.layers.find((x) => x.id === id);
              if (l) engine.updateLayer(id, { locked: !l.locked });
            }}
            onUpdateOpacity={(id, opacity) => engine.updateLayer(id, { opacity })}
            onUpdateBlend={(id, blendMode) => engine.updateLayer(id, { blendMode })}
            onRename={(id, name) => engine.updateLayer(id, { name })}
            onAdd={() => engine.addLayer()}
            onRemove={engine.removeLayer}
            onDuplicate={engine.duplicateLayer}
            onMergeDown={engine.mergeDown}
            onFlatten={engine.flattenAll}
            maskMode={engine.maskMode}
            onToggleMaskMode={engine.toggleMaskMode}
            onAddMask={engine.addMask}
            onDeleteMask={engine.deleteMask}
          />
        </div>
      </div>
    </div>
  );
}