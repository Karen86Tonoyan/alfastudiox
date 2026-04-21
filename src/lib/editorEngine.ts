// ── Canvas Editor Engine ──
// Layer-based compositing with blending modes, masks, undo/redo

export type BlendMode =
  | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten"
  | "color-dodge" | "color-burn" | "hard-light" | "soft-light"
  | "difference" | "exclusion" | "hue" | "saturation" | "color" | "luminosity";

export interface EditorLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0-1
  blendMode: BlendMode;
  canvas: HTMLCanvasElement; // off-screen canvas for this layer
  maskCanvas: HTMLCanvasElement | null;
  x: number;
  y: number;
}

export type ToolType =
  | "select" | "move" | "marquee" | "lasso" | "magic-wand"
  | "brush" | "eraser" | "clone-stamp" | "healing-brush"
  | "dodge" | "burn" | "sponge"
  | "gradient" | "fill" | "eyedropper"
  | "pen" | "text" | "shape"
  | "crop" | "transform" | "hand" | "zoom";

export interface BrushSettings {
  size: number;
  hardness: number; // 0-1
  opacity: number;
  flow: number;
  color: string;
}

export interface HistoryEntry {
  label: string;
  layers: SerializedLayer[];
  activeLayerId: string;
}

interface SerializedLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  imageData: ImageData;
  maskData: ImageData | null;
  x: number;
  y: number;
}

let _counter = 0;
const uid = () => `layer_${Date.now()}_${_counter++}`;

export function createLayer(w: number, h: number, name?: string): EditorLayer {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return {
    id: uid(),
    name: name ?? `Warstwa ${_counter}`,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "normal",
    canvas,
    maskCanvas: null,
    x: 0,
    y: 0,
  };
}

export function createLayerFromImage(img: HTMLImageElement, name?: string): EditorLayer {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  return {
    id: uid(),
    name: name ?? img.alt || `Obraz ${_counter}`,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "normal",
    canvas,
    maskCanvas: null,
    x: 0,
    y: 0,
  };
}

export function composeLayers(
  layers: EditorLayer[],
  target: HTMLCanvasElement,
  width: number,
  height: number
) {
  const ctx = target.getContext("2d")!;
  ctx.clearRect(0, 0, width, height);

  // Checkerboard
  drawCheckerboard(ctx, width, height);

  for (const layer of layers) {
    if (!layer.visible || layer.opacity === 0) continue;

    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = blendModeToComposite(layer.blendMode);

    if (layer.maskCanvas) {
      // Apply mask: create temp canvas
      const tmp = document.createElement("canvas");
      tmp.width = width;
      tmp.height = height;
      const tmpCtx = tmp.getContext("2d")!;
      tmpCtx.drawImage(layer.canvas, layer.x, layer.y);
      tmpCtx.globalCompositeOperation = "destination-in";
      tmpCtx.drawImage(layer.maskCanvas, layer.x, layer.y);
      ctx.drawImage(tmp, 0, 0);
    } else {
      ctx.drawImage(layer.canvas, layer.x, layer.y);
    }

    ctx.restore();
  }
}

function drawCheckerboard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const size = 8;
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      ctx.fillStyle = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0 ? "#2a2a2a" : "#1e1e1e";
      ctx.fillRect(x, y, size, size);
    }
  }
}

function blendModeToComposite(mode: BlendMode): GlobalCompositeOperation {
  const map: Record<BlendMode, GlobalCompositeOperation> = {
    "normal": "source-over",
    "multiply": "multiply",
    "screen": "screen",
    "overlay": "overlay",
    "darken": "darken",
    "lighten": "lighten",
    "color-dodge": "color-dodge",
    "color-burn": "color-burn",
    "hard-light": "hard-light",
    "soft-light": "soft-light",
    "difference": "difference",
    "exclusion": "exclusion",
    "hue": "hue",
    "saturation": "saturation",
    "color": "color",
    "luminosity": "luminosity",
  };
  return map[mode] ?? "source-over";
}

// ── Brush drawing ──
export function drawBrushStroke(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  brush: BrushSettings,
  erase?: boolean
) {
  ctx.save();
  ctx.globalAlpha = brush.opacity * brush.flow;
  if (erase) {
    ctx.globalCompositeOperation = "destination-out";
  }
  ctx.fillStyle = brush.color;
  ctx.beginPath();
  ctx.arc(x, y, brush.size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawBrushLine(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number,
  x1: number, y1: number,
  brush: BrushSettings,
  erase?: boolean
) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const step = Math.max(1, brush.size * (1 - brush.hardness) * 0.3 + 1);
  const steps = Math.ceil(dist / step);
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    drawBrushStroke(ctx, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, brush, erase);
  }
}

// ── Serialization ──
export function serializeLayer(layer: EditorLayer): SerializedLayer {
  const ctx = layer.canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
  let maskData: ImageData | null = null;
  if (layer.maskCanvas) {
    const mCtx = layer.maskCanvas.getContext("2d")!;
    maskData = mCtx.getImageData(0, 0, layer.maskCanvas.width, layer.maskCanvas.height);
  }
  return {
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    locked: layer.locked,
    opacity: layer.opacity,
    blendMode: layer.blendMode,
    imageData,
    maskData,
    x: layer.x,
    y: layer.y,
  };
}

export function deserializeLayer(s: SerializedLayer): EditorLayer {
  const canvas = document.createElement("canvas");
  canvas.width = s.imageData.width;
  canvas.height = s.imageData.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(s.imageData, 0, 0);

  let maskCanvas: HTMLCanvasElement | null = null;
  if (s.maskData) {
    maskCanvas = document.createElement("canvas");
    maskCanvas.width = s.maskData.width;
    maskCanvas.height = s.maskData.height;
    const mCtx = maskCanvas.getContext("2d")!;
    mCtx.putImageData(s.maskData, 0, 0);
  }

  return {
    id: s.id,
    name: s.name,
    visible: s.visible,
    locked: s.locked,
    opacity: s.opacity,
    blendMode: s.blendMode,
    canvas,
    maskCanvas,
    x: s.x,
    y: s.y,
  };
}

// ── Export ──
export function exportToBlob(
  layers: EditorLayer[],
  width: number,
  height: number,
  format: "png" | "jpeg" | "webp",
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    // White bg for jpeg
    if (format === "jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }

    for (const layer of layers) {
      if (!layer.visible || layer.opacity === 0) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = blendModeToComposite(layer.blendMode);
      ctx.drawImage(layer.canvas, layer.x, layer.y);
      ctx.restore();
    }

    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))),
      `image/${format}`,
      quality ?? 0.92
    );
  });
}