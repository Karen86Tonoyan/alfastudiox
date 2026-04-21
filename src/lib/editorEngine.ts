// ── Canvas Editor Engine ──
// Layer-based compositing with blending modes, masks, undo/redo

export type BlendMode =
  | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten"
  | "color-dodge" | "color-burn" | "hard-light" | "soft-light"
  | "difference" | "exclusion" | "hue" | "saturation" | "color" | "luminosity";

export type AdjustmentType = "brightness-contrast" | "curves" | "hue-saturation";

export interface AdjustmentData {
  type: AdjustmentType;
  brightness?: number;   // -100 to 100
  contrast?: number;     // -100 to 100
  hue?: number;          // -180 to 180
  saturation?: number;   // -100 to 100
  lightness?: number;    // -100 to 100
  curves?: { r: number[]; g: number[]; b: number[]; rgb: number[] }; // 256 LUT each
}

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
  adjustment?: AdjustmentData | null;
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
  adjustment?: AdjustmentData | null;
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
    adjustment: null,
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
    name: name ?? (img.alt || `Obraz ${_counter}`),
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "normal",
    canvas,
    maskCanvas: null,
    x: 0,
    y: 0,
    adjustment: null,
  };
}

export function createAdjustmentLayer(
  type: AdjustmentType,
  w: number,
  h: number,
  name?: string
): EditorLayer {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  // Adjustment layers have a white mask by default (affect everything)
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = w;
  maskCanvas.height = h;
  const mCtx = maskCanvas.getContext("2d")!;
  mCtx.fillStyle = "#ffffff";
  mCtx.fillRect(0, 0, w, h);

  const defaults: AdjustmentData = { type };
  if (type === "brightness-contrast") { defaults.brightness = 0; defaults.contrast = 0; }
  if (type === "hue-saturation") { defaults.hue = 0; defaults.saturation = 0; defaults.lightness = 0; }
  if (type === "curves") { defaults.curves = { r: linearLUT(), g: linearLUT(), b: linearLUT(), rgb: linearLUT() }; }

  const labels: Record<AdjustmentType, string> = {
    "brightness-contrast": "Jasność/Kontrast",
    "curves": "Krzywe",
    "hue-saturation": "Barwa/Nasycenie",
  };

  return {
    id: uid(),
    name: name ?? labels[type],
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "normal",
    canvas,
    maskCanvas,
    x: 0,
    y: 0,
    adjustment: defaults,
  };
}

function linearLUT(): number[] {
  return Array.from({ length: 256 }, (_, i) => i);
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

    if (layer.adjustment) {
      // Non-destructive adjustment: read current composited pixels, adjust, write back masked
      applyAdjustmentLayer(ctx, layer, width, height);
    } else {
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = blendModeToComposite(layer.blendMode);

      if (layer.maskCanvas) {
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
}

function applyAdjustmentLayer(
  ctx: CanvasRenderingContext2D,
  layer: EditorLayer,
  width: number,
  height: number
) {
  const adj = layer.adjustment!;
  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;

  // Build adjusted copy
  const adjusted = new Uint8ClampedArray(d);

  if (adj.type === "brightness-contrast") {
    const b = adj.brightness ?? 0;
    const c = adj.contrast ?? 0;
    const factor = (259 * (c + 255)) / (255 * (259 - c));
    for (let i = 0; i < d.length; i += 4) {
      adjusted[i]     = clamp(factor * (d[i] - 128 + b) + 128);
      adjusted[i + 1] = clamp(factor * (d[i + 1] - 128 + b) + 128);
      adjusted[i + 2] = clamp(factor * (d[i + 2] - 128 + b) + 128);
    }
  } else if (adj.type === "hue-saturation") {
    const hShift = (adj.hue ?? 0) / 360;
    const sFactor = 1 + (adj.saturation ?? 0) / 100;
    const lShift = (adj.lightness ?? 0) / 100;
    for (let i = 0; i < d.length; i += 4) {
      let [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
      h = (h + hShift + 1) % 1;
      s = clamp01(s * sFactor);
      l = clamp01(l + lShift);
      const [r, g, b] = hslToRgb(h, s, l);
      adjusted[i] = r; adjusted[i + 1] = g; adjusted[i + 2] = b;
    }
  } else if (adj.type === "curves") {
    const lut = adj.curves!;
    for (let i = 0; i < d.length; i += 4) {
      adjusted[i]     = lut.r[lut.rgb[d[i]]];
      adjusted[i + 1] = lut.g[lut.rgb[d[i + 1]]];
      adjusted[i + 2] = lut.b[lut.rgb[d[i + 2]]];
    }
  }

  // Apply mask: blend between original (d) and adjusted based on mask
  const maskData = layer.maskCanvas
    ? layer.maskCanvas.getContext("2d")!.getImageData(0, 0, layer.maskCanvas.width, layer.maskCanvas.height).data
    : null;

  const opacity = layer.opacity;
  for (let i = 0; i < d.length; i += 4) {
    const px = (i / 4) % width;
    const py = Math.floor(i / 4 / width);
    let maskAlpha = 1;
    if (maskData && px < layer.maskCanvas!.width && py < layer.maskCanvas!.height) {
      const mi = (py * layer.maskCanvas!.width + px) * 4;
      maskAlpha = maskData[mi] / 255;
    }
    const blend = maskAlpha * opacity;
    imgData.data[i]     = Math.round(d[i] * (1 - blend) + adjusted[i] * blend);
    imgData.data[i + 1] = Math.round(d[i + 1] * (1 - blend) + adjusted[i + 1] * blend);
    imgData.data[i + 2] = Math.round(d[i + 2] * (1 - blend) + adjusted[i + 2] * blend);
  }

  ctx.putImageData(imgData, 0, 0);
}

function clamp(v: number): number { return Math.max(0, Math.min(255, Math.round(v))); }
function clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1/3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1/3) * 255),
  ];
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
    adjustment: layer.adjustment ?? null,
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
    adjustment: s.adjustment ?? null,
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