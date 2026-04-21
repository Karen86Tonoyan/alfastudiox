import { readPsd, writePsd, type Psd, type Layer, type BlendMode as PsdBlendMode } from "ag-psd";
import type { EditorLayer, BlendMode } from "./editorEngine";

// ── Blend mode mapping ──
const BLEND_TO_PSD: Record<BlendMode, string> = {
  normal: "normal",
  multiply: "multiply",
  screen: "screen",
  overlay: "overlay",
  darken: "darken",
  lighten: "lighten",
  "color-dodge": "color dodge",
  "color-burn": "color burn",
  "hard-light": "hard light",
  "soft-light": "soft light",
  difference: "difference",
  exclusion: "exclusion",
  hue: "hue",
  saturation: "saturation",
  color: "color",
  luminosity: "luminosity",
};

const PSD_TO_BLEND: Record<string, BlendMode> = {};
for (const [k, v] of Object.entries(BLEND_TO_PSD)) {
  PSD_TO_BLEND[v] = k as BlendMode;
}

let _counter = 0;
const uid = () => `psd_layer_${Date.now()}_${_counter++}`;

// ── Import PSD ──
export async function importPSD(buffer: ArrayBuffer): Promise<{
  layers: EditorLayer[];
  width: number;
  height: number;
}> {
  const psd = readPsd(buffer);
  const width = psd.width;
  const height = psd.height;
  const layers: EditorLayer[] = [];

  function processLayer(child: Layer) {
    // Create canvas from layer
    const canvas = document.createElement("canvas");
    const lw = (child.right ?? width) - (child.left ?? 0);
    const lh = (child.bottom ?? height) - (child.top ?? 0);
    canvas.width = Math.max(1, lw);
    canvas.height = Math.max(1, lh);

    if (child.canvas) {
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(child.canvas as unknown as HTMLCanvasElement, 0, 0);
    }

    // Mask
    let maskCanvas: HTMLCanvasElement | null = null;
    if (child.mask?.canvas) {
      maskCanvas = document.createElement("canvas");
      maskCanvas.width = canvas.width;
      maskCanvas.height = canvas.height;
      const mCtx = maskCanvas.getContext("2d")!;
      const maskLeft = (child.mask.left ?? 0) - (child.left ?? 0);
      const maskTop = (child.mask.top ?? 0) - (child.top ?? 0);
      mCtx.fillStyle = child.mask.defaultColor === 255 ? "#ffffff" : "#000000";
      mCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
      mCtx.drawImage(child.mask.canvas as unknown as HTMLCanvasElement, maskLeft, maskTop);
    }

    const rawBlend = child.blendMode || "normal";
    const blendMode: BlendMode = PSD_TO_BLEND[rawBlend] || "normal";

    layers.push({
      id: uid(),
      name: child.name || `Warstwa ${layers.length + 1}`,
      visible: !child.hidden,
      locked: child.transparencyProtected || false,
      opacity: child.opacity ?? 1,
      blendMode,
      canvas,
      maskCanvas,
      x: child.left ?? 0,
      y: child.top ?? 0,
      adjustment: null,
    });
  }

  if (psd.children && psd.children.length > 0) {
    // Flatten groups — take leaf layers
    function walkLayers(children: Layer[]) {
      for (const child of children) {
        if (child.children && child.children.length > 0) {
          walkLayers(child.children);
        } else {
          processLayer(child);
        }
      }
    }
    walkLayers(psd.children);
  }

  // If no layers found, create one from composite
  if (layers.length === 0 && psd.canvas) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(psd.canvas as unknown as HTMLCanvasElement, 0, 0);
    layers.push({
      id: uid(),
      name: "Tło",
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: "normal",
      canvas,
      maskCanvas: null,
      x: 0,
      y: 0,
      adjustment: null,
    });
  }

  return { layers, width, height };
}

// ── Export PSD ──
export function exportPSD(
  layers: EditorLayer[],
  width: number,
  height: number
): ArrayBuffer {
  const children: Layer[] = layers.map((layer) => {
    const l: Layer = {
      name: layer.name,
      hidden: !layer.visible,
      opacity: layer.opacity,
      blendMode: (BLEND_TO_PSD[layer.blendMode] || "normal") as PsdBlendMode,
      transparencyProtected: layer.locked,
      left: layer.x,
      top: layer.y,
      right: layer.x + layer.canvas.width,
      bottom: layer.y + layer.canvas.height,
      canvas: layer.canvas as unknown as HTMLCanvasElement,
    };

    if (layer.maskCanvas) {
      l.mask = {
        left: layer.x,
        top: layer.y,
        right: layer.x + layer.maskCanvas.width,
        bottom: layer.y + layer.maskCanvas.height,
        canvas: layer.maskCanvas as unknown as HTMLCanvasElement,
        defaultColor: 255,
      };
    }

    return l;
  });

  // Create composite
  const compositeCanvas = document.createElement("canvas");
  compositeCanvas.width = width;
  compositeCanvas.height = height;
  const ctx = compositeCanvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  for (const layer of layers) {
    if (!layer.visible) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.drawImage(layer.canvas, layer.x, layer.y);
    ctx.restore();
  }

  const psd: Psd = {
    width,
    height,
    children,
    canvas: compositeCanvas as unknown as HTMLCanvasElement,
  };

  return writePsd(psd);
}