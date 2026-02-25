import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Box, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComfyModels } from "@/hooks/useComfyModels";
import type { PhotoSessionConfig } from "@/lib/photoSessionWorkflow";

interface ModelSelectorsProps {
  models: ComfyModels;
  loading: boolean;
  config: PhotoSessionConfig;
  onConfigChange: (config: PhotoSessionConfig | ((prev: PhotoSessionConfig) => PhotoSessionConfig)) => void;
  onRefetch: () => void;
}

export function ModelSelectors({ models, loading, config, onConfigChange, onRefetch }: ModelSelectorsProps) {
  const totalModels = models.checkpoints.length + models.loras.length + models.controlnet.length + models.vae.length + models.upscale_models.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Box className="h-3 w-3 text-primary" />
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Modele ComfyUI
        </label>
        <Badge variant="outline" className="ml-auto text-[9px] border-primary/30 text-primary">
          {totalModels} załadowanych
        </Badge>
        <button
          onClick={onRefetch}
          disabled={loading}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
        </button>
      </div>

      {/* Checkpoint */}
      <div className="space-y-1">
        <span className="text-[10px] text-muted-foreground">Checkpoint</span>
        <Select
          value={config.checkpoint || ""}
          onValueChange={(v) => onConfigChange((prev) => ({ ...prev, checkpoint: v }))}
        >
          <SelectTrigger className="h-8 bg-card border-border text-xs font-mono">
            <SelectValue placeholder={models.checkpoints.length ? "Wybierz checkpoint..." : "Brak checkpointów"} />
          </SelectTrigger>
          <SelectContent>
            {models.checkpoints.map((m) => (
              <SelectItem key={m.path} value={m.path} className="text-xs font-mono">
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* VAE */}
      {models.vae.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">VAE</span>
          <Select
            value={config.vae || ""}
            onValueChange={(v) => onConfigChange((prev) => ({ ...prev, vae: v }))}
          >
            <SelectTrigger className="h-8 bg-card border-border text-xs font-mono">
              <SelectValue placeholder="Baked-in (domyślne)" />
            </SelectTrigger>
            <SelectContent>
              {models.vae.map((m) => (
                <SelectItem key={m.path} value={m.path} className="text-xs font-mono">
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* LoRA */}
      {models.loras.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">LoRA (opcjonalnie)</span>
          <Select
            value={config.lora || ""}
            onValueChange={(v) => onConfigChange((prev) => ({ ...prev, lora: v }))}
          >
            <SelectTrigger className="h-8 bg-card border-border text-xs font-mono">
              <SelectValue placeholder="Brak LoRA" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-xs">Brak</SelectItem>
              {models.loras.map((m) => (
                <SelectItem key={m.path} value={m.path} className="text-xs font-mono">
                  {m.name}
                </SelectItem>
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
            <SelectTrigger className="h-8 bg-card border-border text-xs font-mono">
              <SelectValue placeholder="Domyślny" />
            </SelectTrigger>
            <SelectContent>
              {models.controlnet.map((m) => (
                <SelectItem key={m.path} value={m.path} className="text-xs font-mono">
                  {m.name}
                </SelectItem>
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
            <SelectTrigger className="h-8 bg-card border-border text-xs font-mono">
              <SelectValue placeholder="SUPIR (domyślny)" />
            </SelectTrigger>
            <SelectContent>
              {models.upscale_models.map((m) => (
                <SelectItem key={m.path} value={m.path} className="text-xs font-mono">
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
