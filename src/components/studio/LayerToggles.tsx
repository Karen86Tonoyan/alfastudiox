import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Brain, User, Layers, Scan, Eye, Maximize, Wand2 } from "lucide-react";
import type { PhotoSessionConfig } from "@/lib/photoSessionWorkflow";

const LAYER_CONFIG = [
  { key: "janusPrompt" as const, label: "Janus Prompt", icon: Brain, desc: "Auto-opis z Janus-Pro 7B" },
  { key: "pulid" as const, label: "PuLID", icon: User, desc: "Spójność twarzy" },
  { key: "ipAdapter" as const, label: "IPAdapter", icon: Layers, desc: "Styl + produkt ref" },
  { key: "depth" as const, label: "Depth", icon: Scan, desc: "DepthAnythingV2" },
  { key: "openPose" as const, label: "OpenPose", icon: Eye, desc: "Kontrola pozy" },
  { key: "supir" as const, label: "SUPIR", icon: Maximize, desc: "Upscale + face restore" },
];

interface LayerTogglesProps {
  layers: PhotoSessionConfig["layers"];
  onToggle: (key: keyof PhotoSessionConfig["layers"], val: boolean) => void;
}

export function LayerToggles({ layers, onToggle }: LayerTogglesProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <Wand2 className="h-3 w-3 text-primary" /> Warstwy
      </label>
      <div className="space-y-1">
        {LAYER_CONFIG.map((l) => (
          <div
            key={l.key}
            className={cn(
              "flex items-center gap-3 rounded-md border px-3 py-2 transition-all",
              layers[l.key]
                ? "border-primary/20 bg-primary/5"
                : "border-transparent bg-transparent"
            )}
          >
            <l.icon className={cn("h-4 w-4 shrink-0", layers[l.key] ? "text-primary" : "text-muted-foreground")} />
            <div className="flex-1 min-w-0">
              <span className={cn("text-xs font-semibold", layers[l.key] ? "text-foreground" : "text-muted-foreground")}>
                {l.label}
              </span>
              <p className="text-[10px] text-muted-foreground truncate">{l.desc}</p>
            </div>
            <Switch
              checked={layers[l.key]}
              onCheckedChange={(v) => onToggle(l.key, v)}
              className="scale-75"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
