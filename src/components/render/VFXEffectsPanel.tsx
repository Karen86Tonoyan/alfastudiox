import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles, Film, Eye, Zap, Wind, Flame, Monitor,
  Camera, SunDim, Aperture, Timer, Layers, Box
} from "lucide-react";

export interface VFXEffect {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  intensity: number;
  params?: Record<string, number | string>;
}

export interface VFXPreset {
  id: string;
  name: string;
  icon: string;
  effects: Partial<VFXEffect>[];
}

const VFX_CATEGORIES = [
  {
    id: "color-film",
    name: "Kolorystyczne & Filmowe",
    icon: Film,
    effects: [
      { id: "film-grain", name: "Film Grain", variants: ["35mm", "16mm", "Kodak Vision3", "Fuji Eterna"] },
      { id: "halation", name: "Halation", desc: "Poświata taśmy filmowej" },
      { id: "bloom", name: "Bloom + Glow", variants: ["Subtle", "Medium", "Heavy", "Dreamy"] },
      { id: "light-leaks", name: "Light Leaks", variants: ["Warm", "Cool", "Rainbow", "Vintage"] },
      { id: "vignette", name: "Vignette", variants: ["Natural", "Creative", "Heavy", "Oval"] },
      { id: "chromatic-aberration", name: "Chromatic Aberration" },
      { id: "anamorphic-flare", name: "Anamorphic Flare + Streaks" },
      { id: "edge-glow", name: "Edge Glow / Highlight Glow" },
      { id: "color-bleed", name: "Color Bleed / Fringing" },
    ],
  },
  {
    id: "optical",
    name: "Optyczne & Soczewkowe",
    icon: Aperture,
    effects: [
      { id: "lens-distortion", name: "Lens Distortion + Barrel" },
      { id: "bokeh", name: "Bokeh", variants: ["Circle", "Anamorphic", "Swirly", "Hexagonal"] },
      { id: "lens-flare", name: "Lens Flare", variants: ["Classic", "Anamorphic", "70s", "Modern", "Sci-Fi"] },
      { id: "god-rays", name: "Volumetric Light Rays / God Rays" },
      { id: "dof", name: "Depth of Field (DoF)", variants: ["Shallow", "Medium", "Deep", "Rack Focus"] },
      { id: "tilt-shift", name: "Tilt-Shift" },
    ],
  },
  {
    id: "motion",
    name: "Ruch & Czas",
    icon: Timer,
    effects: [
      { id: "motion-blur", name: "Motion Blur", variants: ["Natural 180°", "Heavy 360°", "Directional", "Radial"] },
      { id: "speed-ramp", name: "Time Remap / Speed Ramping" },
      { id: "slow-motion", name: "Slow Motion", variants: ["2x", "4x", "8x", "1000fps + Frame Blend"] },
      { id: "frame-hold", name: "Frame Hold + Stutter" },
      { id: "optical-flow", name: "Optical Flow Interpolation" },
    ],
  },
  {
    id: "special",
    name: "Efekty Specjalne",
    icon: Sparkles,
    effects: [
      { id: "particles-smoke", name: "Dym / Mgła" },
      { id: "particles-rain", name: "Deszcz" },
      { id: "particles-snow", name: "Śnieg" },
      { id: "particles-sparks", name: "Iskry / Embers" },
      { id: "volumetric-fog", name: "Volumetric Fog / Atmosphere" },
      { id: "fire-smoke", name: "Fire + Smoke", variants: ["Realistic", "Stylized", "Explosion"] },
      { id: "glitch", name: "Glitch + Datamosh" },
      { id: "vhs", name: "VHS / Old TV" },
      { id: "old-film", name: "Old Film", variants: ["Scratches", "Dust", "Jitter", "Gate Weave"] },
      { id: "film-burn", name: "Film Burn" },
      { id: "hologram", name: "Hologram / Sci-Fi Scanlines" },
    ],
  },
  {
    id: "practical",
    name: "Efekty Praktyczne",
    icon: Layers,
    effects: [
      { id: "chroma-key", name: "Chroma Key + Advanced Keying" },
      { id: "motion-tracking", name: "Motion Tracking + Camera Solve" },
      { id: "stabilization", name: "Stabilizacja (Warp + 3D Tracker)" },
      { id: "rotoscoping", name: "Rotoscoping + Mask Tracking" },
      { id: "3d-projection", name: "3D Camera Projection" },
    ],
  },
];

const VFX_PRESETS: VFXPreset[] = [
  {
    id: "cinematic-35mm",
    name: "Film Look 35mm",
    icon: "🎞️",
    effects: [
      { id: "film-grain", enabled: true, intensity: 0.6 },
      { id: "halation", enabled: true, intensity: 0.4 },
      { id: "anamorphic-flare", enabled: true, intensity: 0.5 },
      { id: "vignette", enabled: true, intensity: 0.3 },
      { id: "motion-blur", enabled: true, intensity: 0.7 },
    ],
  },
  {
    id: "dreamy-glow",
    name: "Dreamy Glow",
    icon: "✨",
    effects: [
      { id: "bloom", enabled: true, intensity: 0.7 },
      { id: "light-leaks", enabled: true, intensity: 0.4 },
      { id: "dof", enabled: true, intensity: 0.6 },
      { id: "halation", enabled: true, intensity: 0.5 },
    ],
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Neon",
    icon: "🌆",
    effects: [
      { id: "chromatic-aberration", enabled: true, intensity: 0.6 },
      { id: "bloom", enabled: true, intensity: 0.8 },
      { id: "edge-glow", enabled: true, intensity: 0.7 },
      { id: "glitch", enabled: true, intensity: 0.3 },
      { id: "anamorphic-flare", enabled: true, intensity: 0.5 },
    ],
  },
  {
    id: "vintage-vhs",
    name: "Vintage VHS",
    icon: "📼",
    effects: [
      { id: "vhs", enabled: true, intensity: 0.8 },
      { id: "film-grain", enabled: true, intensity: 0.9 },
      { id: "chromatic-aberration", enabled: true, intensity: 0.5 },
      { id: "vignette", enabled: true, intensity: 0.6 },
      { id: "color-bleed", enabled: true, intensity: 0.4 },
    ],
  },
  {
    id: "atmospheric",
    name: "Atmospheric",
    icon: "🌫️",
    effects: [
      { id: "volumetric-fog", enabled: true, intensity: 0.7 },
      { id: "god-rays", enabled: true, intensity: 0.6 },
      { id: "bloom", enabled: true, intensity: 0.4 },
      { id: "dof", enabled: true, intensity: 0.5 },
    ],
  },
  {
    id: "action-movie",
    name: "Action Movie",
    icon: "💥",
    effects: [
      { id: "motion-blur", enabled: true, intensity: 0.8 },
      { id: "speed-ramp", enabled: true, intensity: 0.6 },
      { id: "lens-flare", enabled: true, intensity: 0.5 },
      { id: "particles-sparks", enabled: true, intensity: 0.7 },
      { id: "fire-smoke", enabled: true, intensity: 0.4 },
    ],
  },
];

interface VFXEffectsPanelProps {
  className?: string;
  effects: VFXEffect[];
  onEffectsChange: (effects: VFXEffect[]) => void;
}

export function VFXEffectsPanel({ className, effects, onEffectsChange }: VFXEffectsPanelProps) {
  const [expandedCat, setExpandedCat] = useState<string | null>("color-film");
  const [filterActive, setFilterActive] = useState(false);

  const activeCount = effects.filter((e) => e.enabled).length;

  const toggleEffect = (effectId: string, categoryId: string) => {
    const existing = effects.find((e) => e.id === effectId);
    if (existing) {
      onEffectsChange(
        effects.map((e) => (e.id === effectId ? { ...e, enabled: !e.enabled } : e))
      );
    } else {
      onEffectsChange([
        ...effects,
        { id: effectId, name: effectId, category: categoryId, enabled: true, intensity: 0.5 },
      ]);
    }
  };

  const updateIntensity = (effectId: string, intensity: number) => {
    onEffectsChange(
      effects.map((e) => (e.id === effectId ? { ...e, intensity } : e))
    );
  };

  const applyPreset = (preset: VFXPreset) => {
    const newEffects = preset.effects.map((pe) => ({
      id: pe.id!,
      name: pe.id!,
      category: "",
      enabled: pe.enabled ?? true,
      intensity: pe.intensity ?? 0.5,
    }));
    onEffectsChange(newEffects);
  };

  const clearAll = () => onEffectsChange([]);

  return (
    <div className={cn("flex flex-col bg-background", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wider text-primary">VFX Effects</span>
        {activeCount > 0 && (
          <Badge variant="outline" className="ml-1 text-[8px] px-1.5 py-0 border-primary/30 text-primary">
            {activeCount} active
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setFilterActive(!filterActive)}
            className={cn(
              "text-[10px] px-2 py-0.5 rounded transition-colors",
              filterActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {filterActive ? "Aktywne" : "Wszystkie"}
          </button>
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="text-[10px] text-destructive hover:text-destructive/80 transition-colors"
            >
              Wyczyść
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* VFX Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Presets
            </span>
            <div className="grid grid-cols-3 gap-1">
              {VFX_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className="flex flex-col items-center gap-0.5 rounded-md border border-border bg-card px-1.5 py-1.5 hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  <span className="text-sm">{preset.icon}</span>
                  <span className="text-[8px] font-medium text-foreground truncate w-full text-center">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          {VFX_CATEGORIES.map((cat) => {
            const catEffects = filterActive
              ? cat.effects.filter((e) => effects.find((ae) => ae.id === e.id && ae.enabled))
              : cat.effects;

            if (filterActive && catEffects.length === 0) return null;

            const CatIcon = cat.icon;
            const isExpanded = expandedCat === cat.id;

            return (
              <div key={cat.id} className="rounded-md border border-border overflow-hidden">
                <button
                  onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                  className="flex items-center gap-2 w-full px-3 py-2 bg-card hover:bg-secondary/30 transition-colors"
                >
                  <CatIcon className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] font-semibold text-foreground flex-1 text-left">
                    {cat.name}
                  </span>
                  <Badge variant="outline" className="text-[8px] px-1 py-0 border-border text-muted-foreground">
                    {cat.effects.filter((e) => effects.find((ae) => ae.id === e.id && ae.enabled)).length}/{cat.effects.length}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{isExpanded ? "▼" : "►"}</span>
                </button>

                {isExpanded && (
                  <div className="border-t border-border bg-secondary/10 p-2 space-y-1">
                    {catEffects.map((effect) => {
                      const active = effects.find((e) => e.id === effect.id);
                      const isEnabled = active?.enabled ?? false;
                      const intensity = active?.intensity ?? 0.5;

                      return (
                        <div key={effect.id} className="space-y-1">
                          <div className="flex items-center gap-2 px-1">
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={() => toggleEffect(effect.id, cat.id)}
                              className="scale-75"
                            />
                            <span
                              className={cn(
                                "text-[10px] flex-1",
                                isEnabled ? "text-foreground font-medium" : "text-muted-foreground"
                              )}
                            >
                              {effect.name}
                            </span>
                            {isEnabled && (
                              <span className="text-[9px] font-mono text-primary w-8 text-right">
                                {Math.round(intensity * 100)}%
                              </span>
                            )}
                          </div>
                          {isEnabled && (
                            <div className="px-7">
                              <Slider
                                value={[intensity]}
                                onValueChange={([v]) => updateIntensity(effect.id, v)}
                                min={0}
                                max={1}
                                step={0.05}
                                className="py-0.5"
                              />
                              {"variants" in effect && effect.variants && (
                                <div className="flex flex-wrap gap-0.5 mt-1">
                                  {effect.variants.map((v) => (
                                    <Badge
                                      key={v}
                                      variant="outline"
                                      className="text-[7px] px-1 py-0 border-primary/20 text-primary cursor-pointer hover:bg-primary/10"
                                    >
                                      {v}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
