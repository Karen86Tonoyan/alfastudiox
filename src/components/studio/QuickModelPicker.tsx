import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Zap, ChevronDown, Layers, Paintbrush, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { ComfyModels } from "@/hooks/useComfyModels";
import type { PhotoSessionConfig } from "@/lib/photoSessionWorkflow";

// Popular prebuilt workflow recipes the user can pick from
const WORKFLOW_RECIPES = [
  { id: "standard", label: "Standard", desc: "Checkpoint → Sampler → VAE", sampler: "dpmpp_2m", scheduler: "karras", steps: 25, cfg: 6.5 },
  { id: "fast", label: "Szybki", desc: "Mniej kroków, szybszy wynik", sampler: "dpmpp_sde", scheduler: "normal", steps: 15, cfg: 7.0 },
  { id: "quality", label: "Jakość MAX", desc: "Więcej kroków, lepsza precyzja", sampler: "dpmpp_2m", scheduler: "karras", steps: 40, cfg: 5.5 },
  { id: "creative", label: "Kreatywny", desc: "Wyższe CFG, więcej interpretacji", sampler: "euler_ancestral", scheduler: "normal", steps: 30, cfg: 9.0 },
] as const;

// Well-known LoRA style shortcuts
const LORA_SHORTCUTS = [
  { id: "__none__", label: "Brak LoRA", strength: 0 },
  { id: "detail-tweaker", label: "Detal+", strength: 0.6 },
  { id: "film-grain", label: "Film Grain", strength: 0.5 },
  { id: "cinematic", label: "Cinematic", strength: 0.7 },
  { id: "photorealistic", label: "Fotorealizm", strength: 0.8 },
] as const;

interface QuickModelPickerProps {
  models: ComfyModels;
  config: PhotoSessionConfig;
  onConfigChange: (config: PhotoSessionConfig | ((prev: PhotoSessionConfig) => PhotoSessionConfig)) => void;
}

export function QuickModelPicker({ models, config, onConfigChange }: QuickModelPickerProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const activeRecipe = WORKFLOW_RECIPES.find(
    (r) => r.sampler === config.sampler && r.steps === config.steps
  ) ?? null;

  const handleRecipe = (recipeId: string) => {
    const recipe = WORKFLOW_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return;
    onConfigChange((prev) => ({
      ...prev,
      sampler: recipe.sampler,
      scheduler: recipe.scheduler,
      steps: recipe.steps,
      cfg: recipe.cfg,
    }));
  };

  const handleLoraShortcut = (loraId: string) => {
    if (loraId === "__none__") {
      onConfigChange((prev) => ({ ...prev, lora: "" }));
      return;
    }
    // Try to find matching LoRA from ComfyUI models
    const match = models.loras.find((l) =>
      l.name.toLowerCase().includes(loraId.replace("-", "_")) ||
      l.name.toLowerCase().includes(loraId.replace("-", " "))
    );
    const shortcut = LORA_SHORTCUTS.find((s) => s.id === loraId);
    onConfigChange((prev) => ({
      ...prev,
      lora: match?.path || loraId,
      // could set strength via ipWeight or dedicated field
    }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="h-3 w-3 text-primary" />
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Szybki wybór
        </label>
      </div>

      {/* Row 1: Model bazowy (checkpoint) */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Layers className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Model bazowy</span>
          {config.checkpoint && (
            <Badge variant="outline" className="ml-auto text-[8px] border-primary/20 text-primary font-mono">
              aktywny
            </Badge>
          )}
        </div>
        <Select
          value={config.checkpoint || ""}
          onValueChange={(v) => onConfigChange((prev) => ({ ...prev, checkpoint: v }))}
        >
          <SelectTrigger className="h-8 bg-card border-border text-xs">
            <SelectValue placeholder={models.checkpoints.length ? "Wybierz model..." : "Połącz z ComfyUI"} />
          </SelectTrigger>
          <SelectContent>
            {models.checkpoints.map((m) => (
              <SelectItem key={m.path} value={m.path} className="text-xs">
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Row 2: LoRA shortcuts as pill buttons */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Paintbrush className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Styl / Boost (LoRA)</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {LORA_SHORTCUTS.map((shortcut) => {
            const isActive =
              shortcut.id === "__none__"
                ? !config.lora || config.lora === "" || config.lora === "__none__"
                : config.lora?.includes(shortcut.id.replace("-", "_")) || config.lora === shortcut.id;
            return (
              <button
                key={shortcut.id}
                onClick={() => handleLoraShortcut(shortcut.id)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all",
                  isActive
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border bg-card/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
              >
                {shortcut.label}
              </button>
            );
          })}
          {/* Show installed LoRAs not in shortcuts */}
          {models.loras.length > 0 && (
            <Select
              value=""
              onValueChange={(v) => onConfigChange((prev) => ({ ...prev, lora: v }))}
            >
              <SelectTrigger className="h-6 w-auto px-2.5 border-dashed border-border bg-transparent text-[10px] text-muted-foreground gap-1">
                <span>+ Więcej</span>
              </SelectTrigger>
              <SelectContent>
                {models.loras.map((m) => (
                  <SelectItem key={m.path} value={m.path} className="text-xs">
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Row 3: Workflow recipe */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Workflow className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Przepis renderowania</span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {WORKFLOW_RECIPES.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => handleRecipe(recipe.id)}
              className={cn(
                "flex flex-col items-start rounded-md border px-2.5 py-1.5 transition-all text-left",
                activeRecipe?.id === recipe.id
                  ? "border-primary/50 bg-primary/10"
                  : "border-border bg-card/50 hover:border-primary/30"
              )}
            >
              <span className={cn(
                "text-[10px] font-semibold",
                activeRecipe?.id === recipe.id ? "text-primary" : "text-foreground"
              )}>
                {recipe.label}
              </span>
              <span className="text-[8px] text-muted-foreground">{recipe.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Expandable advanced: VAE, ControlNet, Upscaler */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors w-full justify-center py-1 rounded border border-dashed border-border hover:border-primary/30">
          <ChevronDown className={cn("h-3 w-3 transition-transform", advancedOpen && "rotate-180")} />
          {advancedOpen ? "Ukryj zaawansowane" : "VAE · ControlNet · Upscaler"}
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          {/* VAE */}
          {models.vae.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground">VAE</span>
              <Select
                value={config.vae || ""}
                onValueChange={(v) => onConfigChange((prev) => ({ ...prev, vae: v }))}
              >
                <SelectTrigger className="h-7 bg-card border-border text-xs">
                  <SelectValue placeholder="Baked-in (domyślne)" />
                </SelectTrigger>
                <SelectContent>
                  {models.vae.map((m) => (
                    <SelectItem key={m.path} value={m.path} className="text-xs">{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {/* ControlNet */}
          {models.controlnet.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground">ControlNet</span>
              <Select
                value={config.controlnet || ""}
                onValueChange={(v) => onConfigChange((prev) => ({ ...prev, controlnet: v }))}
              >
                <SelectTrigger className="h-7 bg-card border-border text-xs">
                  <SelectValue placeholder="Domyślny" />
                </SelectTrigger>
                <SelectContent>
                  {models.controlnet.map((m) => (
                    <SelectItem key={m.path} value={m.path} className="text-xs">{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {/* Upscaler */}
          {models.upscale_models.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground">Upscaler</span>
              <Select
                value={config.upscaler || ""}
                onValueChange={(v) => onConfigChange((prev) => ({ ...prev, upscaler: v }))}
              >
                <SelectTrigger className="h-7 bg-card border-border text-xs">
                  <SelectValue placeholder="SUPIR (domyślny)" />
                </SelectTrigger>
                <SelectContent>
                  {models.upscale_models.map((m) => (
                    <SelectItem key={m.path} value={m.path} className="text-xs">{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}