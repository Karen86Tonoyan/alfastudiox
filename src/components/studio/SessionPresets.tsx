import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, Camera, Wind, Gem, ShoppingBag, Cpu, Plus, Trash2, Save, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PhotoSessionConfig } from "@/lib/photoSessionWorkflow";
import type { GpuInfo } from "@/lib/comfyApi";

export interface SessionPreset {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  vramMin: number;
  isCustom?: boolean;
  config: Partial<PhotoSessionConfig> & { layers: PhotoSessionConfig["layers"] };
}

// GPU tier thresholds
type GpuTier = "low" | "mid" | "high";

function getGpuTier(gpu: GpuInfo | null): GpuTier {
  if (!gpu) return "mid";
  if (gpu.vramTotal >= 16) return "high";
  if (gpu.vramTotal >= 10) return "mid";
  return "low";
}

function scaleForGpu(preset: SessionPreset, tier: GpuTier): SessionPreset["config"] {
  const c = { ...preset.config };
  const layers = { ...c.layers };

  if (tier === "low") {
    c.steps = Math.max(15, (c.steps ?? 25) - 10);
    c.width = Math.min(c.width ?? 1024, 1024);
    c.height = Math.min(c.height ?? 1024, 1024);
    c.supirStrength = 0;
    layers.supir = false;
    layers.openPose = false;
    if (layers.depth && layers.ipAdapter) layers.depth = false;
  } else if (tier === "mid") {
    c.steps = Math.max(20, (c.steps ?? 25) - 5);
    c.supirStrength = Math.min(c.supirStrength ?? 0.4, 0.3);
  }

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
      pose: "closeup", width: 1024, height: 1536, steps: 30, cfg: 6.5,
      sampler: "dpmpp_2m", scheduler: "karras",
      ipWeight: 0.7, pulidWeight: 0.85, supirStrength: 0.4,
      promptBase: "professional beauty photography, soft diffused light, 85mm lens, studio setup, sharp skin texture, flawless makeup, commercial ad quality",
      layers: { janusPrompt: true, pulid: true, ipAdapter: false, depth: false, openPose: false, supir: true },
    },
  },
  {
    id: "fashion-street",
    name: "Fashion Street",
    icon: Wind,
    description: "Urban, dynamika, 35mm, natural light, high contrast",
    vramMin: 10,
    config: {
      pose: "walking", width: 1344, height: 768, steps: 25, cfg: 7.0,
      sampler: "dpmpp_sde", scheduler: "karras",
      ipWeight: 0.6, pulidWeight: 0.8, supirStrength: 0.35,
      promptBase: "street fashion photography, urban background, dynamic pose, 35mm lens, natural light, high contrast, editorial street style",
      layers: { janusPrompt: true, pulid: true, ipAdapter: true, depth: true, openPose: false, supir: true },
    },
  },
  {
    id: "editorial",
    name: "Editorial",
    icon: Camera,
    description: "Vogue vibe, cinematic, medium format, film grain",
    vramMin: 12,
    config: {
      pose: "editorial", width: 1024, height: 1536, steps: 35, cfg: 5.5,
      sampler: "dpmpp_2m", scheduler: "karras",
      ipWeight: 0.65, pulidWeight: 0.9, supirStrength: 0.45,
      promptBase: "high-end editorial photography, dramatic lighting, medium format camera, cinematic tone, film grain, Vogue magazine quality, haute couture",
      layers: { janusPrompt: true, pulid: true, ipAdapter: true, depth: true, openPose: true, supir: true },
    },
  },
  {
    id: "product",
    name: "Product Hero",
    icon: ShoppingBag,
    description: "Produkt dominuje, studio light, depth of field, premium",
    vramMin: 8,
    config: {
      pose: "standing-front", width: 1024, height: 1024, steps: 28, cfg: 6.0,
      sampler: "dpmpp_2m", scheduler: "normal",
      ipWeight: 0.8, pulidWeight: 0.5, supirStrength: 0.4,
      promptBase: "commercial product photography, sharp focus, studio lighting, depth of field, premium advertisement, clean background, hero shot",
      layers: { janusPrompt: false, pulid: false, ipAdapter: true, depth: true, openPose: false, supir: true },
    },
  },
];

export { BASE_PRESETS as SESSION_PRESETS };

const STORAGE_KEY = "custom_session_presets";

interface StoredPreset {
  id: string;
  name: string;
  description: string;
  config: SessionPreset["config"];
}

function loadCustomPresets(): StoredPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomPresets(presets: StoredPreset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

interface SessionPresetsProps {
  activePreset: string | null;
  gpu: GpuInfo | null;
  currentConfig: PhotoSessionConfig;
  onSelect: (preset: SessionPreset) => void;
}

export function SessionPresets({ activePreset, gpu, currentConfig, onSelect }: SessionPresetsProps) {
  const tier = getGpuTier(gpu);
  const vramTotal = gpu?.vramTotal ?? 0;
  const [customPresets, setCustomPresets] = useState<StoredPreset[]>(loadCustomPresets);
  const [showSave, setShowSave] = useState(false);
  const [newName, setNewName] = useState("");

  const handleSelect = (preset: SessionPreset) => {
    const scaled = scaleForGpu(preset, tier);
    onSelect({ ...preset, config: scaled });
  };

  const handleSaveCustom = () => {
    if (!newName.trim()) return;
    const id = `custom_${Date.now()}`;
    const stored: StoredPreset = {
      id,
      name: newName.trim(),
      description: `${currentConfig.width}×${currentConfig.height}, ${currentConfig.steps}s, CFG ${currentConfig.cfg}`,
      config: {
        pose: currentConfig.pose,
        width: currentConfig.width,
        height: currentConfig.height,
        steps: currentConfig.steps,
        cfg: currentConfig.cfg,
        sampler: currentConfig.sampler,
        scheduler: currentConfig.scheduler,
        ipWeight: currentConfig.ipWeight,
        pulidWeight: currentConfig.pulidWeight,
        supirStrength: currentConfig.supirStrength,
        promptBase: currentConfig.promptBase,
        layers: { ...currentConfig.layers },
      },
    };
    const updated = [...customPresets, stored];
    setCustomPresets(updated);
    saveCustomPresets(updated);
    setNewName("");
    setShowSave(false);
  };

  const handleDeleteCustom = (id: string) => {
    const updated = customPresets.filter((p) => p.id !== id);
    setCustomPresets(updated);
    saveCustomPresets(updated);
  };

  const allPresets: SessionPreset[] = [
    ...BASE_PRESETS,
    ...customPresets.map((cp): SessionPreset => ({
      ...cp,
      icon: Star,
      vramMin: 0,
      isCustom: true,
    })),
  ];

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
        {allPresets.map((p) => {
          const canRun = vramTotal === 0 || vramTotal >= p.vramMin;
          return (
            <div key={p.id} className="relative group">
              <button
                onClick={() => handleSelect(p)}
                disabled={!canRun}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-all w-full",
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
              {p.isCustom && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteCustom(p.id); }}
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Save current as preset */}
      {showSave ? (
        <div className="flex items-center gap-1.5">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveCustom()}
            placeholder="Nazwa presetu..."
            className="h-7 text-[11px] bg-card border-border flex-1"
            autoFocus
          />
          <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={handleSaveCustom}>
            <Save className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setShowSave(false)}>
            ✕
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setShowSave(true)}
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors w-full justify-center py-1 rounded border border-dashed border-border hover:border-primary/30"
        >
          <Plus className="h-3 w-3" /> Zapisz bieżące jako preset
        </button>
      )}

      {tier !== "high" && (
        <p className="text-[9px] text-muted-foreground italic">
          Parametry auto-skalowane do GPU ({tier}). Niektóre warstwy mogą być wyłączone.
        </p>
      )}
    </div>
  );
}
