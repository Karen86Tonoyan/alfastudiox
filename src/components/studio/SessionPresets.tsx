import { cn } from "@/lib/utils";
import { Sparkles, Camera, Wind, Gem, ShoppingBag, Palette } from "lucide-react";
import type { PhotoSessionConfig } from "@/lib/photoSessionWorkflow";

export interface SessionPreset {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  config: Partial<PhotoSessionConfig> & { layers: PhotoSessionConfig["layers"] };
}

export const SESSION_PRESETS: SessionPreset[] = [
  {
    id: "beauty",
    name: "Beauty Studio",
    icon: Gem,
    description: "Portret beauty, closeup, SUPIR upscale, PuLID twarzy",
    config: {
      pose: "closeup",
      width: 1024,
      height: 1536,
      steps: 30,
      cfg: 3.5,
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
    description: "Dynamiczne ujęcie, depth + IPAdapter, ruch w kadrze",
    config: {
      pose: "walking",
      width: 1344,
      height: 768,
      steps: 25,
      cfg: 4.0,
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
    description: "High-fashion pose, pełen stack warstw, max jakość",
    config: {
      pose: "editorial",
      width: 1024,
      height: 1536,
      steps: 35,
      cfg: 3.0,
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
    name: "Product Shot",
    icon: ShoppingBag,
    description: "Produkt w centrum, IPAdapter ref, brak modela",
    config: {
      pose: "standing-front",
      width: 1024,
      height: 1024,
      steps: 25,
      cfg: 4.5,
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
  {
    id: "casual",
    name: "Lifestyle",
    icon: Palette,
    description: "Naturalny styl, casual pose, lekki stack",
    config: {
      pose: "casual",
      width: 1344,
      height: 768,
      steps: 20,
      cfg: 3.5,
      layers: {
        janusPrompt: true,
        pulid: true,
        ipAdapter: false,
        depth: false,
        openPose: false,
        supir: false,
      },
    },
  },
];

interface SessionPresetsProps {
  activePreset: string | null;
  onSelect: (preset: SessionPreset) => void;
}

export function SessionPresets({ activePreset, onSelect }: SessionPresetsProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <Sparkles className="h-3 w-3 text-primary" /> Preset sesji
      </label>
      <div className="grid grid-cols-2 gap-1.5">
        {SESSION_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-all hover:border-primary/40",
              activePreset === p.id
                ? "border-primary/50 bg-primary/10"
                : "border-border bg-card/50"
            )}
          >
            <p.icon className={cn(
              "h-4 w-4 shrink-0",
              activePreset === p.id ? "text-primary" : "text-muted-foreground"
            )} />
            <div className="min-w-0">
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
          </button>
        ))}
      </div>
    </div>
  );
}
