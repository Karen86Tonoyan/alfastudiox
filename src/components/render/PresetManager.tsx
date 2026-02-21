import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bookmark, Plus, Trash2, Check, X, Star, StarOff,
  Camera, Palette, Film, Package, Sparkles, User, Mountain
} from "lucide-react";
import type { RenderSettings } from "./RenderControlPanel";

export interface Preset {
  id: string;
  name: string;
  icon: string;
  category: "portrait" | "landscape" | "product" | "anime" | "cinematic" | "custom";
  settings: Partial<RenderSettings>;
  starred: boolean;
  builtIn: boolean;
}

const CATEGORY_CONFIG: Record<Preset["category"], { label: string; icon: React.ReactNode; className: string }> = {
  portrait: { label: "Portrait", icon: <User className="h-3 w-3" />, className: "border-blue-500/30 text-blue-400" },
  landscape: { label: "Landscape", icon: <Mountain className="h-3 w-3" />, className: "border-emerald-500/30 text-emerald-400" },
  product: { label: "Product", icon: <Package className="h-3 w-3" />, className: "border-amber-500/30 text-amber-400" },
  anime: { label: "Anime", icon: <Sparkles className="h-3 w-3" />, className: "border-pink-500/30 text-pink-400" },
  cinematic: { label: "Cinematic", icon: <Film className="h-3 w-3" />, className: "border-purple-500/30 text-purple-400" },
  custom: { label: "Custom", icon: <Palette className="h-3 w-3" />, className: "border-primary/30 text-primary" },
};

const BUILT_IN_PRESETS: Preset[] = [
  {
    id: "cinematic-portrait",
    name: "Cinematic Portrait",
    icon: "🎬",
    category: "cinematic",
    starred: true,
    builtIn: true,
    settings: {
      model: "flux-dev", modelType: "image",
      prompt: "cinematic portrait, dramatic lighting, shallow depth of field, film grain, 8k, masterpiece",
      negativePrompt: "blurry, low quality, deformed, cartoon, anime, watermark",
      sampler: "dpmpp_2m_sde", steps: 35, cfg: 7, width: 768, height: 1024,
      lora: "cinematic", loraWeight: 0.7,
      skinTone: "natural", lighting: "dramatic", cameraType: "cinema",
      sceneType: "studio", clothingStyle: "elegant",
    },
  },
  {
    id: "anime-character",
    name: "Anime Character",
    icon: "🎨",
    category: "anime",
    starred: false,
    builtIn: true,
    settings: {
      model: "sdxl", modelType: "image",
      prompt: "anime style, vibrant colors, detailed character design, clean lines, illustration, best quality",
      negativePrompt: "realistic, photo, 3d render, blurry, low quality, deformed",
      sampler: "euler_ancestral", steps: 28, cfg: 8, width: 832, height: 1152,
      lora: "anime", loraWeight: 0.85,
      lighting: "studio", cameraType: "standard",
      hairColor: "blue", clothingStyle: "fantasy-armor",
    },
  },
  {
    id: "product-photo",
    name: "Product Photo",
    icon: "📦",
    category: "product",
    starred: true,
    builtIn: true,
    settings: {
      model: "sdxl", modelType: "image",
      prompt: "professional product photography, clean white background, studio lighting, sharp focus, commercial quality, 8k",
      negativePrompt: "blurry, shadow, dark, low quality, amateur, watermark",
      sampler: "dpmpp_2m", steps: 40, cfg: 6, width: 1024, height: 1024,
      lora: "photorealistic", loraWeight: 0.5,
      lighting: "studio", cameraType: "macro", sceneType: "studio",
    },
  },
  {
    id: "epic-landscape",
    name: "Epic Landscape",
    icon: "🏔️",
    category: "landscape",
    starred: false,
    builtIn: true,
    settings: {
      model: "flux-dev", modelType: "image",
      prompt: "breathtaking landscape, epic vista, golden hour, volumetric lighting, ultra detailed, 8k wallpaper, masterpiece",
      negativePrompt: "people, text, watermark, low quality, blurry, cartoon",
      sampler: "dpmpp_2m_sde", steps: 30, cfg: 7, width: 1920, height: 1080,
      lora: "none", loraWeight: 0.8,
      lighting: "golden-hour", cameraType: "wide-angle", sceneType: "mountain",
    },
  },
  {
    id: "dark-fantasy",
    name: "Dark Fantasy",
    icon: "⚔️",
    category: "cinematic",
    starred: false,
    builtIn: true,
    settings: {
      model: "flux-dev", modelType: "image",
      prompt: "dark fantasy, atmospheric, moody lighting, intricate details, concept art, artstation, dramatic composition",
      negativePrompt: "bright, cheerful, cartoon, low quality, blurry, watermark",
      sampler: "dpmpp_sde", steps: 35, cfg: 8, width: 1024, height: 1024,
      lora: "cinematic", loraWeight: 0.6,
      lighting: "dramatic", cameraType: "cinema", sceneType: "fantasy",
      clothingStyle: "fantasy-armor",
    },
  },
  {
    id: "luxury-car-ad",
    name: "Luxury Car Ad",
    icon: "🏎️",
    category: "product",
    starred: false,
    builtIn: true,
    settings: {
      model: "sdxl", modelType: "image",
      prompt: "luxury sports car, professional automotive photography, reflections, dramatic lighting, showroom quality, 8k",
      negativePrompt: "toy, cartoon, low quality, deformed, blurry, watermark",
      sampler: "dpmpp_2m", steps: 40, cfg: 7, width: 1536, height: 1024,
      lora: "photorealistic", loraWeight: 0.65,
      lighting: "neon", cameraType: "wide-angle", sceneType: "night-city",
      objectSelection: "sports-car",
    },
  },
  {
    id: "video-ocean",
    name: "Ocean Cinematic",
    icon: "🌊",
    category: "cinematic",
    starred: false,
    builtIn: true,
    settings: {
      model: "animatediff", modelType: "video",
      prompt: "cinematic ocean waves crashing, slow motion, golden hour, volumetric light, film quality",
      negativePrompt: "static, low quality, blurry",
      sampler: "euler_ancestral", steps: 20, cfg: 6, width: 768, height: 512,
      lora: "film-grain", loraWeight: 0.4,
      frames: 32, fps: 12,
      lighting: "golden-hour", cameraType: "drone", sceneType: "beach",
    },
  },
  {
    id: "portrait-headshot",
    name: "Professional Headshot",
    icon: "👤",
    category: "portrait",
    starred: true,
    builtIn: true,
    settings: {
      model: "flux-schnell", modelType: "image",
      prompt: "professional headshot portrait, neutral background, soft studio lighting, sharp focus, confident expression, corporate",
      negativePrompt: "blurry, deformed, cartoon, low quality, amateur",
      sampler: "euler", steps: 4, cfg: 1, width: 768, height: 1024,
      lora: "photorealistic", loraWeight: 0.5,
      skinTone: "natural", lighting: "studio", cameraType: "portrait",
      sceneType: "studio", clothingStyle: "business",
    },
  },
];

const STORAGE_KEY = "ai-director-presets";

function loadCustomPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomPresets(presets: Preset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

interface PresetManagerProps {
  currentSettings: RenderSettings;
  onApply: (settings: Partial<RenderSettings>) => void;
}

export function PresetManager({ currentSettings, onApply }: PresetManagerProps) {
  const [customPresets, setCustomPresets] = useState<Preset[]>(loadCustomPresets);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [filterCat, setFilterCat] = useState<Preset["category"] | "all">("all");
  const [starredOnly, setStarredOnly] = useState(false);

  const allPresets = [...BUILT_IN_PRESETS, ...customPresets];

  useEffect(() => {
    saveCustomPresets(customPresets);
  }, [customPresets]);

  const filtered = allPresets
    .filter((p) => filterCat === "all" || p.category === filterCat)
    .filter((p) => !starredOnly || p.starred);

  const handleSavePreset = () => {
    if (!newName.trim()) return;
    const preset: Preset = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      icon: "⚡",
      category: "custom",
      starred: false,
      builtIn: false,
      settings: { ...currentSettings },
    };
    setCustomPresets((prev) => [preset, ...prev]);
    setNewName("");
    setIsCreating(false);
  };

  const handleDelete = (id: string) => {
    setCustomPresets((prev) => prev.filter((p) => p.id !== id));
  };

  const handleToggleStar = (id: string) => {
    // For built-ins, we track starred state in customPresets as overrides
    const builtIn = BUILT_IN_PRESETS.find((p) => p.id === id);
    if (builtIn) {
      builtIn.starred = !builtIn.starred;
      // Force re-render
      setCustomPresets((prev) => [...prev]);
    } else {
      setCustomPresets((prev) =>
        prev.map((p) => (p.id === id ? { ...p, starred: !p.starred } : p))
      );
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Bookmark className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Presets</span>
        <button
          onClick={() => setStarredOnly(!starredOnly)}
          className={cn(
            "ml-auto p-1 rounded transition-colors",
            starredOnly ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
          title="Show starred only"
        >
          {starredOnly ? <Star className="h-3 w-3 fill-primary" /> : <StarOff className="h-3 w-3" />}
        </button>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => setFilterCat("all")}
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-medium transition-all border",
            filterCat === "all"
              ? "bg-primary/10 text-primary border-primary/30"
              : "text-muted-foreground border-transparent hover:text-foreground"
          )}
        >
          All
        </button>
        {(Object.keys(CATEGORY_CONFIG) as Preset["category"][]).map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          return (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-medium transition-all border flex items-center gap-1",
                filterCat === cat
                  ? cn("bg-opacity-10", cfg.className)
                  : "text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              {cfg.icon} {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Preset grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {filtered.map((preset) => {
          const catCfg = CATEGORY_CONFIG[preset.category];
          return (
            <button
              key={preset.id}
              onClick={() => onApply(preset.settings)}
              className={cn(
                "group relative flex flex-col items-start rounded-md border px-2.5 py-2 text-left transition-all",
                "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              <div className="flex w-full items-center gap-1.5">
                <span className="text-sm">{preset.icon}</span>
                <span className="flex-1 truncate text-[11px] font-medium text-foreground">
                  {preset.name}
                </span>
                {/* Star & delete on hover */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span
                    onClick={(e) => { e.stopPropagation(); handleToggleStar(preset.id); }}
                    className="p-0.5 rounded hover:bg-secondary cursor-pointer"
                  >
                    {preset.starred
                      ? <Star className="h-2.5 w-2.5 text-primary fill-primary" />
                      : <Star className="h-2.5 w-2.5 text-muted-foreground" />
                    }
                  </span>
                  {!preset.builtIn && (
                    <span
                      onClick={(e) => { e.stopPropagation(); handleDelete(preset.id); }}
                      className="p-0.5 rounded hover:bg-destructive/20 cursor-pointer"
                    >
                      <Trash2 className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
                    </span>
                  )}
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn("mt-1 text-[8px] px-1 py-0 h-3.5 gap-0.5", catCfg.className)}
              >
                {catCfg.icon} {catCfg.label}
              </Badge>
              {preset.settings.modelType === "video" && (
                <Badge variant="outline" className="mt-0.5 text-[8px] px-1 py-0 h-3.5 border-purple-500/30 text-purple-400">
                  <Film className="h-2 w-2 mr-0.5" /> Video
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Save current as preset */}
      {isCreating ? (
        <div className="flex items-center gap-1.5">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Preset name..."
            className="h-7 text-[11px] bg-card border-border flex-1"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 border-primary/30 text-primary"
            onClick={handleSavePreset}
            disabled={!newName.trim()}
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 border-border"
            onClick={() => { setIsCreating(false); setNewName(""); }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="w-full h-7 gap-1.5 text-[10px] border-primary/20 text-primary hover:bg-primary/10"
          onClick={() => setIsCreating(true)}
        >
          <Plus className="h-3 w-3" /> Save Current as Preset
        </Button>
      )}
    </div>
  );
}
