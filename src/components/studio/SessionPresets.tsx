import { cn } from "@/lib/utils";
import { Sparkles, Camera, Wind, Gem, ShoppingBag, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PhotoSessionConfig } from "@/lib/photoSessionWorkflow";
import type { GpuInfo } from "@/lib/comfyApi";

export interface SessionPreset {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  vramMin: number; // GB minimum to run this preset
  config: Partial<PhotoSessionConfig> & { layers: PhotoSessionConfig["layers"] };
}

// GPU tier thresholds
type GpuTier = "low" | "mid" | "high";

function getGpuTier(gpu: GpuInfo | null): GpuTier {
  if (!gpu) return "mid"; // assume mid if unknown
  if (gpu.vramTotal >= 16) return "high";  // RTX 4080+, 5070 Ti+
  if (gpu.vramTotal >= 10) return "mid";   // RTX 3080, 4070
  return "low";                             // RTX 3060, 4060
}

function scaleForGpu(preset: SessionPreset, tier: GpuTier): SessionPreset["config"] {
  const c = { ...preset.config };
  const layers = { ...c.layers };

  if (tier === "low") {
    // Reduce VRAM: lower resolution, fewer layers, fewer steps
    c.steps = Math.max(15, (c.steps ?? 25) - 10);
    c.width = Math.min(c.width ?? 1024, 1024);
    c.height = Math.min(c.height ?? 1024, 1024);
    c.supirStrength = 0; // skip SUPIR
    layers.supir = false;
    layers.openPose = false;
    if (layers.depth && layers.ipAdapter) layers.depth = false; // drop one
  } else if (tier === "mid") {
    // Slight reduction
    c.steps = Math.max(20, (c.steps ?? 25) - 5);
    c.supirStrength = Math.min(c.supirStrength ?? 0.4, 0.3);
  }
  // high = use as-is

  return { ...c, layers };
}

const BASE_PRESETS: SessionPreset[] = [
  {
    id: "beauty",
    name: "Beauty Studio",
    icon: Gem,
    description: "Perfekcyjna twarz, skin detail, 85mm, studio light",
    vramMin: 8,
    config: {
      pose: "closeup",
      width: 1024,
      height: 1536,
      steps: 30,
      cfg: 6.5,
      sampler: "dpmpp_2m",
      scheduler: "karras",
      ipWeight: 0.7,
      pulidWeight: 0.85,
      supirStrength: 0.4,
      promptBase: "professional beauty photography, soft diffused light, 85mm lens, studio setup, sharp skin texture, flawless makeup, commercial ad quality",
      layers: {
        janusPrompt: true,
        pulid: true,
        ipAdapter: false,
        depth: false,
        openPose: false,
        supir: true,
      },
    },
  },
  {
    id: "fashion-street",
    name: "Fashion Street",
    icon: Wind,
    description: "Urban, dynamika, 35mm, natural light, high contrast",
    vramMin: 10,
    config: {
      pose: "walking",
      width: 1344,
      height: 768,
      steps: 25,
      cfg: 7.0,
      sampler: "dpmpp_sde",
      scheduler: "karras",
      ipWeight: 0.6,
      pulidWeight: 0.8,
      supirStrength: 0.35,
      promptBase: "street fashion photography, urban background, dynamic pose, 35mm lens, natural light, high contrast, editorial street style",
      layers: {
        janusPrompt: true,
        pulid: true,
        ipAdapter: true,
        depth: true,
        openPose: false,
        supir: true,
      },
    },
  },
  {
    id: "editorial",
    name: "Editorial",
    icon: Camera,
    description: "Vogue vibe, cinematic, medium format, film grain",
    vramMin: 12,
    config: {
      pose: "editorial",
      width: 1024,
      height: 1536,
      steps: 35,
      cfg: 5.5,
      sampler: "dpmpp_2m",
      scheduler: "karras",
      ipWeight: 0.65,
      pulidWeight: 0.9,
      supirStrength: 0.45,
      promptBase: "high-end editorial photography, dramatic lighting, medium format camera, cinematic tone, film grain, Vogue magazine quality, haute couture",
      layers: {
        janusPrompt: true,
        pulid: true,
        ipAdapter: true,
        depth: true,
        openPose: true,
        supir: true,
      },
    },
  },
  {
    id: "product",
    name: "Product Hero",
    icon: ShoppingBag,
    description: "Produkt dominuje, studio light, depth of field, premium",
    vramMin: 8,
    config: {
      pose: "standing-front",
      width: 1024,
      height: 1024,
      steps: 28,
      cfg: 6.0,
      sampler: "dpmpp_2m",
      scheduler: "normal",
      ipWeight: 0.8,
      pulidWeight: 0.5,
      supirStrength: 0.4,
      promptBase: "commercial product photography, sharp focus, studio lighting, depth of field, premium advertisement, clean background, hero shot",
      layers: {
        janusPrompt: false,
        pulid: false,
        ipAdapter: true,
        depth: true,
        openPose: false,
        supir: true,
      },
    },
  },
];

export { BASE_PRESETS as SESSION_PRESETS };

interface SessionPresetsProps {
  activePreset: string | null;
  gpu: GpuInfo | null;
  onSelect: (preset: SessionPreset) => void;
}

export function SessionPresets({ activePreset, gpu, onSelect }: SessionPresetsProps) {
  const tier = getGpuTier(gpu);
  const vramTotal = gpu?.vramTotal ?? 0;

  const handleSelect = (preset: SessionPreset) => {
    const scaled = scaleForGpu(preset, tier);
    onSelect({ ...preset, config: scaled });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3 w-3 text-primary" />
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Preset sesji
        </label>
        {gpu && (
          <Badge variant="outline" className="ml-auto text-[9px] border-primary/30 text-primary gap-1">
            <Cpu className="h-2.5 w-2.5" />
            {tier.toUpperCase()} · {gpu.vramTotal.toFixed(0)}GB
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {BASE_PRESETS.map((p) => {
          const canRun = vramTotal === 0 || vramTotal >= p.vramMin;
          return (
            <button
              key={p.id}
              onClick={() => handleSelect(p)}
              disabled={!canRun}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-all",
                !canRun && "opacity-40 cursor-not-allowed",
                canRun && "hover:border-primary/40",
                activePreset === p.id
                  ? "border-primary/50 bg-primary/10"
                  : "border-border bg-card/50"
              )}
            >
              <p.icon className={cn(
                "h-4 w-4 shrink-0",
                activePreset === p.id ? "text-primary" : "text-muted-foreground"
              )} />
              <div className="min-w-0 flex-1">
                <span className={cn(
                  "text-[11px] font-semibold block",
                  activePreset === p.id ? "text-primary" : "text-foreground"
                )}>
                  {p.name}
                </span>
                <span className="text-[9px] text-muted-foreground block truncate">
                  {p.description}
                </span>
              </div>
              {!canRun && (
                <span className="text-[8px] text-destructive font-mono shrink-0">{p.vramMin}GB+</span>
              )}
            </button>
          );
        })}
      </div>
      {tier !== "high" && (
        <p className="text-[9px] text-muted-foreground italic">
          Parametry auto-skalowane do GPU ({tier}). Niektóre warstwy mogą być wyłączone.
        </p>
      )}
    </div>
  );
}
