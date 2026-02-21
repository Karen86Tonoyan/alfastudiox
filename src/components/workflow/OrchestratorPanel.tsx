import { useState } from "react";
import { Layers, Cpu, Zap, ChevronDown, ChevronRight, ArrowRight, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MODEL_STRATEGIES, type ModelStrategy } from "@/lib/comfyApi";

const categoryConfig: Record<ModelStrategy["category"], { label: string; color: string; icon: React.ReactNode }> = {
  movement: { label: "Ruch / Video", color: "text-blue-400 border-blue-500/50", icon: <Zap className="h-3 w-3" /> },
  details: { label: "Szczegóły / Upscale", color: "text-emerald-400 border-emerald-500/50", icon: <Zap className="h-3 w-3" /> },
  character: { label: "Postacie", color: "text-purple-400 border-purple-500/50", icon: <Zap className="h-3 w-3" /> },
  background: { label: "Tło / Generowanie", color: "text-amber-400 border-amber-500/50", icon: <Zap className="h-3 w-3" /> },
  compositing: { label: "Kompozycja", color: "text-cyan-400 border-cyan-500/50", icon: <Layers className="h-3 w-3" /> },
};

interface RenderLayer {
  id: string;
  name: string;
  strategy: string;
  status: "pending" | "rendering" | "done";
  progress?: number;
  vramNeeded: number;
}

const mockLayers: RenderLayer[] = [
  { id: "l1", name: "Tło — krajobraz galaktyki", strategy: "flux", status: "done", vramNeeded: 10 },
  { id: "l2", name: "Postać — portret fantasy", strategy: "liveportrait", status: "rendering", progress: 45, vramNeeded: 4 },
  { id: "l3", name: "Animacja — ruch wody", strategy: "wan", status: "pending", vramNeeded: 8 },
  { id: "l4", name: "Upscale — SUPIR 2x", strategy: "supir", status: "pending", vramNeeded: 6 },
  { id: "l5", name: "Kompozycja finalna", strategy: "controlnet", status: "pending", vramNeeded: 3 },
];

const TOTAL_VRAM = 16;

interface OrchestratorPanelProps {
  className?: string;
}

export function OrchestratorPanel({ className }: OrchestratorPanelProps) {
  const [layersOpen, setLayersOpen] = useState(true);
  const [modelsOpen, setModelsOpen] = useState(true);

  const currentVram = mockLayers
    .filter((l) => l.status === "rendering")
    .reduce((sum, l) => sum + l.vramNeeded, 0);
  const vramRatio = currentVram / TOTAL_VRAM;

  const categories = Object.entries(categoryConfig);

  return (
    <div className={cn("flex flex-col border-l border-border bg-card", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Layers className="h-4 w-4 text-cyan-400" />
        <span className="text-sm font-semibold text-foreground">The Orchestrator</span>
      </div>

      {/* VRAM budget */}
      <div className="border-b border-border px-3 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Cpu className="h-3 w-3" /> Budżet VRAM
          </span>
          <span className={cn("text-[11px] font-mono", vramRatio > 0.9 ? "text-red-400" : "text-foreground")}>
            {currentVram}GB / {TOTAL_VRAM}GB
          </span>
        </div>
        <Progress value={vramRatio * 100} className="h-1.5" />
        <p className="text-[10px] text-muted-foreground">
          {vramRatio > 0.9
            ? "⚠ Blisko limitu — sekwencyjne ładowanie"
            : vramRatio > 0.7
            ? "Optymalnie — jeden model na raz"
            : "Luźno — możliwe równoległe ładowanie"}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Merger — render layers */}
          <div>
            <button
              onClick={() => setLayersOpen(!layersOpen)}
              className="flex w-full items-center gap-1.5 text-xs font-medium text-foreground"
            >
              {layersOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              The Merger — Warstwy renderowania
              <Badge variant="outline" className="ml-auto text-[10px]">
                {mockLayers.filter((l) => l.status === "done").length}/{mockLayers.length}
              </Badge>
            </button>

            {layersOpen && (
              <div className="mt-2 space-y-1.5">
                {mockLayers.map((layer, i) => {
                  const strategy = MODEL_STRATEGIES.find((s) => s.id === layer.strategy);
                  const catConfig = strategy ? categoryConfig[strategy.category] : null;
                  return (
                    <div
                      key={layer.id}
                      className={cn(
                        "rounded-md border px-2.5 py-2 text-[11px]",
                        layer.status === "rendering"
                          ? "border-blue-500/40 bg-blue-500/10"
                          : layer.status === "done"
                          ? "border-border bg-secondary/20"
                          : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground w-3">{i + 1}</span>
                        {layer.status === "done" ? (
                          <Lock className="h-3 w-3 text-emerald-400" />
                        ) : layer.status === "rendering" ? (
                          <Unlock className="h-3 w-3 text-blue-400 animate-pulse" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border border-muted-foreground/40" />
                        )}
                        <span className={cn("flex-1 truncate", layer.status === "done" ? "text-muted-foreground" : "text-foreground")}>
                          {layer.name}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-mono">{layer.vramNeeded}GB</span>
                      </div>
                      {layer.progress !== undefined && (
                        <div className="mt-1 flex items-center gap-2">
                          <Progress value={layer.progress} className="h-1 flex-1" />
                          <span className="text-[10px] text-blue-400">{layer.progress}%</span>
                        </div>
                      )}
                      {strategy && (
                        <div className="mt-1 flex items-center gap-1">
                          <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                          <Badge variant="outline" className={cn("text-[9px] px-1 py-0", catConfig?.color)}>
                            {strategy.name}
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Model strategies */}
          <div>
            <button
              onClick={() => setModelsOpen(!modelsOpen)}
              className="flex w-full items-center gap-1.5 text-xs font-medium text-foreground"
            >
              {modelsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Strategie modeli
            </button>

            {modelsOpen && (
              <div className="mt-2 space-y-3">
                {categories.map(([cat, config]) => {
                  const models = MODEL_STRATEGIES.filter((m) => m.category === cat);
                  if (models.length === 0) return null;
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-1.5 mb-1">
                        {config.icon}
                        <span className={cn("text-[10px] font-medium", config.color.split(" ")[0])}>
                          {config.label}
                        </span>
                      </div>
                      {models.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-2 rounded border border-border px-2 py-1 mb-1 text-[10px]"
                        >
                          <span className="flex-1 text-foreground">{m.name}</span>
                          <span className="text-muted-foreground font-mono">{m.vramRequired}GB</span>
                          <Badge variant="outline" className="text-[8px] px-1 py-0">
                            P{m.priority}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border px-3 py-2">
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="h-6 gap-1 px-2 text-[10px] flex-1">
            <Zap className="h-2.5 w-2.5" /> Auto-sekwencja
          </Button>
          <Button size="sm" variant="outline" className="h-6 gap-1 px-2 text-[10px] flex-1">
            <Layers className="h-2.5 w-2.5" /> Nowa warstwa
          </Button>
        </div>
      </div>
    </div>
  );
}
