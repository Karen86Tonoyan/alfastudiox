import { useState, useCallback, useRef } from "react";
import {
  type EditorLayer,
  type BlendMode,
  type ToolType,
  type BrushSettings,
  type HistoryEntry,
  createLayer,
  createLayerFromImage,
  serializeLayer,
  deserializeLayer,
} from "@/lib/editorEngine";

const MAX_HISTORY = 50;

export function useEditorEngine(initialW = 1920, initialH = 1080) {
  const [canvasWidth, setCanvasWidth] = useState(initialW);
  const [canvasHeight, setCanvasHeight] = useState(initialH);
  const [layers, setLayers] = useState<EditorLayer[]>(() => {
    const bg = createLayer(initialW, initialH, "Tło");
    const ctx = bg.canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, initialW, initialH);
    return [bg];
  });
  const [activeLayerId, setActiveLayerId] = useState<string>(() => "");
  const [activeTool, setActiveTool] = useState<ToolType>("brush");
  const [brush, setBrush] = useState<BrushSettings>({
    size: 12,
    hardness: 0.8,
    opacity: 1,
    flow: 1,
    color: "#000000",
  });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const historyRef = useRef<HistoryEntry[]>([]);
  const historyIdx = useRef(-1);

  // Ensure activeLayerId is valid
  const effectiveActiveId = layers.find((l) => l.id === activeLayerId)?.id ?? layers[layers.length - 1]?.id ?? "";

  const activeLayer = layers.find((l) => l.id === effectiveActiveId) ?? null;

  const pushHistory = useCallback((label: string, currentLayers: EditorLayer[], currentActiveId: string) => {
    const entry: HistoryEntry = {
      label,
      layers: currentLayers.map(serializeLayer),
      activeLayerId: currentActiveId,
    };
    historyRef.current = historyRef.current.slice(0, historyIdx.current + 1);
    historyRef.current.push(entry);
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    historyIdx.current = historyRef.current.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (historyIdx.current <= 0) return;
    historyIdx.current--;
    const entry = historyRef.current[historyIdx.current];
    const restored = entry.layers.map(deserializeLayer);
    setLayers(restored);
    setActiveLayerId(entry.activeLayerId);
  }, []);

  const redo = useCallback(() => {
    if (historyIdx.current >= historyRef.current.length - 1) return;
    historyIdx.current++;
    const entry = historyRef.current[historyIdx.current];
    const restored = entry.layers.map(deserializeLayer);
    setLayers(restored);
    setActiveLayerId(entry.activeLayerId);
  }, []);

  const addLayer = useCallback((name?: string) => {
    const layer = createLayer(canvasWidth, canvasHeight, name);
    setLayers((prev) => {
      const next = [...prev, layer];
      pushHistory("Nowa warstwa", next, layer.id);
      return next;
    });
    setActiveLayerId(layer.id);
  }, [canvasWidth, canvasHeight, pushHistory]);

  const addImageLayer = useCallback((img: HTMLImageElement, name?: string) => {
    const layer = createLayerFromImage(img, name);
    setLayers((prev) => {
      const next = [...prev, layer];
      pushHistory("Import obrazu", next, layer.id);
      return next;
    });
    setActiveLayerId(layer.id);
    // Resize canvas if image is bigger
    if (img.naturalWidth > canvasWidth || img.naturalHeight > canvasHeight) {
      setCanvasWidth(Math.max(canvasWidth, img.naturalWidth));
      setCanvasHeight(Math.max(canvasHeight, img.naturalHeight));
    }
  }, [canvasWidth, canvasHeight, pushHistory]);

  const removeLayer = useCallback((id: string) => {
    setLayers((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((l) => l.id !== id);
      pushHistory("Usuń warstwę", next, next[next.length - 1]?.id ?? "");
      return next;
    });
  }, [pushHistory]);

  const duplicateLayer = useCallback((id: string) => {
    setLayers((prev) => {
      const src = prev.find((l) => l.id === id);
      if (!src) return prev;
      const dup = createLayer(src.canvas.width, src.canvas.height, `${src.name} kopia`);
      const ctx = dup.canvas.getContext("2d")!;
      ctx.drawImage(src.canvas, 0, 0);
      dup.opacity = src.opacity;
      dup.blendMode = src.blendMode;
      dup.x = src.x;
      dup.y = src.y;
      const idx = prev.findIndex((l) => l.id === id);
      const next = [...prev.slice(0, idx + 1), dup, ...prev.slice(idx + 1)];
      pushHistory("Duplikuj warstwę", next, dup.id);
      return next;
    });
  }, [pushHistory]);

  const mergeDown = useCallback((id: string) => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx <= 0) return prev;
      const top = prev[idx];
      const bottom = prev[idx - 1];
      const ctx = bottom.canvas.getContext("2d")!;
      ctx.globalAlpha = top.opacity;
      ctx.drawImage(top.canvas, top.x - bottom.x, top.y - bottom.y);
      ctx.globalAlpha = 1;
      const next = prev.filter((l) => l.id !== id);
      pushHistory("Scal w dół", next, bottom.id);
      return next;
    });
  }, [pushHistory]);

  const flattenAll = useCallback(() => {
    const flat = createLayer(canvasWidth, canvasHeight, "Spłaszczone");
    const ctx = flat.canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    for (const l of layers) {
      if (!l.visible) continue;
      ctx.globalAlpha = l.opacity;
      ctx.drawImage(l.canvas, l.x, l.y);
    }
    ctx.globalAlpha = 1;
    const next = [flat];
    pushHistory("Spłaszcz wszystko", next, flat.id);
    setLayers(next);
    setActiveLayerId(flat.id);
  }, [canvasWidth, canvasHeight, layers, pushHistory]);

  const updateLayer = useCallback((id: string, patch: Partial<Pick<EditorLayer, "name" | "visible" | "locked" | "opacity" | "blendMode">>) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, []);

  const reorderLayers = useCallback((fromIdx: number, toIdx: number) => {
    setLayers((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  const moveLayerUp = useCallback((id: string) => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  const moveLayerDown = useCallback((id: string) => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
      return next;
    });
  }, []);

  const selectLayerAbove = useCallback(() => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === effectiveActiveId);
      if (idx < prev.length - 1) setActiveLayerId(prev[idx + 1].id);
      return prev;
    });
  }, [effectiveActiveId]);

  const selectLayerBelow = useCallback(() => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === effectiveActiveId);
      if (idx > 0) setActiveLayerId(prev[idx - 1].id);
      return prev;
    });
  }, [effectiveActiveId]);

  const resizeCanvas = useCallback((w: number, h: number) => {
    setCanvasWidth(w);
    setCanvasHeight(h);
  }, []);

  return {
    canvasWidth,
    canvasHeight,
    layers,
    setLayers,
    activeLayerId: effectiveActiveId,
    setActiveLayerId,
    activeLayer,
    activeTool,
    setActiveTool,
    brush,
    setBrush,
    zoom,
    setZoom,
    pan,
    setPan,
    addLayer,
    addImageLayer,
    removeLayer,
    duplicateLayer,
    mergeDown,
    flattenAll,
    updateLayer,
    reorderLayers,
    moveLayerUp,
    moveLayerDown,
    selectLayerAbove,
    selectLayerBelow,
    resizeCanvas,
    undo,
    redo,
    pushHistory,
  };
}