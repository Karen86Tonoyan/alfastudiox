import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Clock, Trash2, Copy, ChevronDown, ChevronRight, ImageIcon, Film,
  Download, Eye
} from "lucide-react";
import type { RenderSettings } from "./RenderControlPanel";

export interface RenderHistoryItem {
  id: string;
  timestamp: number;
  settings: RenderSettings;
  status: "success" | "failed" | "cancelled";
  duration: number; // seconds
  outputUrl?: string;
  metadata: {
    actualSeed: number;
    modelVersion: string;
    totalSteps: number;
    peakVram: number;
    nodeExecutionOrder: string[];
  };
}

// Mock render history
const mockHistory: RenderHistoryItem[] = [
  {
    id: "r1",
    timestamp: Date.now() - 180000,
    settings: {
      model: "flux-dev", modelType: "image", prompt: "cinematic portrait of a warrior in golden armor, epic lighting, 8k",
      negativePrompt: "blurry, deformed", seed: 42, sampler: "dpmpp_2m", steps: 30, cfg: 7,
      width: 1024, height: 1024, lora: "cinematic", loraWeight: 0.8, frames: 16, fps: 8,
      skinTone: "tan", hairColor: "black", clothingStyle: "fantasy-armor", sceneType: "studio",
      objectSelection: "none", lighting: "dramatic", cameraType: "cinema",
    },
    status: "success",
    duration: 45,
    metadata: {
      actualSeed: 42, modelVersion: "flux-dev-v1.0", totalSteps: 30,
      peakVram: 9.2, nodeExecutionOrder: ["CLIPLoader", "FluxSampler", "VAEDecode", "SaveImage"],
    },
  },
  {
    id: "r2",
    timestamp: Date.now() - 600000,
    settings: {
      model: "animatediff", modelType: "video", prompt: "ocean waves crashing on rocky coast, slow motion, cinematic",
      negativePrompt: "low quality", seed: 1337, sampler: "euler_ancestral", steps: 20, cfg: 6,
      width: 768, height: 512, lora: "film-grain", loraWeight: 0.5, frames: 32, fps: 12,
      skinTone: "natural", hairColor: "dark-brown", clothingStyle: "casual", sceneType: "beach",
      objectSelection: "none", lighting: "golden-hour", cameraType: "drone",
    },
    status: "success",
    duration: 120,
    metadata: {
      actualSeed: 1337, modelVersion: "animatediff-v3", totalSteps: 20,
      peakVram: 7.8, nodeExecutionOrder: ["CLIPLoader", "AnimateDiff", "KSampler", "SaveAnimatedWEBP"],
    },
  },
  {
    id: "r3",
    timestamp: Date.now() - 1200000,
    settings: {
      model: "sdxl", modelType: "image", prompt: "luxury sports car in neon-lit city street",
      negativePrompt: "blurry", seed: -1, sampler: "dpmpp_2m_sde", steps: 40, cfg: 8,
      width: 1536, height: 1024, lora: "none", loraWeight: 0.8, frames: 16, fps: 8,
      skinTone: "natural", hairColor: "dark-brown", clothingStyle: "casual", sceneType: "night-city",
      objectSelection: "sports-car", lighting: "neon", cameraType: "wide-angle",
    },
    status: "failed",
    duration: 12,
    metadata: {
      actualSeed: 987654, modelVersion: "sdxl-1.0", totalSteps: 12,
      peakVram: 14.8, nodeExecutionOrder: ["CLIPLoader", "KSampler"],
    },
  },
  {
    id: "r4",
    timestamp: Date.now() - 3600000,
    settings: {
      model: "flux-schnell", modelType: "image", prompt: "modern minimalist villa with infinity pool, aerial view",
      negativePrompt: "cartoon, low res", seed: 555, sampler: "euler", steps: 4, cfg: 1,
      width: 1024, height: 1024, lora: "photorealistic", loraWeight: 0.6, frames: 16, fps: 8,
      skinTone: "natural", hairColor: "dark-brown", clothingStyle: "casual", sceneType: "outdoor",
      objectSelection: "villa", lighting: "natural", cameraType: "drone",
    },
    status: "success",
    duration: 8,
    metadata: {
      actualSeed: 555, modelVersion: "flux-schnell-v1", totalSteps: 4,
      peakVram: 8.1, nodeExecutionOrder: ["CLIPLoader", "FluxSampler", "VAEDecode", "SaveImage"],
    },
  },
];

interface RenderHistoryPanelProps {
  className?: string;
  onLoadSettings?: (settings: RenderSettings) => void;
}

export function RenderHistoryPanel({ className, onLoadSettings }: RenderHistoryPanelProps) {
  const [history] = useState<RenderHistoryItem[]>(mockHistory);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "success" | "failed">("all");

  const filtered = filter === "all" ? history : history.filter((h) => h.status === filter);

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const formatDuration = (s: number) =>
    s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;

  const statusConfig = {
    success: { label: "Success", className: "text-status-ok border-status-ok/30 bg-status-ok/10" },
    failed: { label: "Failed", className: "text-destructive border-destructive/30 bg-destructive/10" },
    cancelled: { label: "Cancelled", className: "text-muted-foreground border-border bg-muted/10" },
  };

  return (
    <div className={cn("flex flex-col bg-background", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Clock className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-bold tracking-wide text-primary uppercase">Render History</h2>
        <Badge variant="outline" className="ml-auto text-[10px] border-primary/30 text-primary">
          {history.length} renders
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex gap-1 border-b border-border px-4 py-2">
        {(["all", "success", "failed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-md px-3 py-1 text-[11px] font-medium transition-all",
              filter === f
                ? "bg-primary/10 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* History list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {filtered.map((item) => {
            const isExpanded = expanded === item.id;
            const sc = statusConfig[item.status];
            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-md border border-border bg-card p-3 cursor-pointer transition-all hover:border-primary/30",
                  isExpanded && "border-primary/40"
                )}
                onClick={() => setExpanded(isExpanded ? null : item.id)}
              >
                {/* Summary row */}
                <div className="flex items-center gap-2">
                  {item.settings.modelType === "video" ? (
                    <Film className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="flex-1 truncate text-xs text-foreground">
                    {item.settings.prompt.slice(0, 50)}...
                  </span>
                  <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", sc.className)}>
                    {sc.label}
                  </Badge>
                  {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                </div>

                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                  <span>{formatTime(item.timestamp)}</span>
                  <span>•</span>
                  <span>{formatDuration(item.duration)}</span>
                  <span>•</span>
                  <span className="font-mono">{item.settings.model}</span>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-3 space-y-3 border-t border-border pt-3">
                    {/* Full prompt */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">Prompt</span>
                      <p className="text-[11px] text-foreground leading-relaxed bg-muted/30 rounded p-2">
                        {item.settings.prompt}
                      </p>
                    </div>

                    {/* Parameters grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ["Seed", item.metadata.actualSeed],
                        ["Sampler", item.settings.sampler],
                        ["Steps", item.metadata.totalSteps],
                        ["CFG", item.settings.cfg],
                        ["Resolution", `${item.settings.width}×${item.settings.height}`],
                        ["LoRA", item.settings.lora],
                        ["Peak VRAM", `${item.metadata.peakVram}GB`],
                        ["Model", item.metadata.modelVersion],
                        ["Duration", formatDuration(item.duration)],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="space-y-0.5">
                          <span className="text-[9px] text-muted-foreground">{String(label)}</span>
                          <p className="text-[10px] font-mono text-foreground">{String(value)}</p>
                        </div>
                      ))}
                    </div>

                    {/* Visual params */}
                    <div className="grid grid-cols-4 gap-2 border-t border-border pt-2">
                      {[
                        ["Skin", item.settings.skinTone],
                        ["Hair", item.settings.hairColor],
                        ["Clothing", item.settings.clothingStyle],
                        ["Scene", item.settings.sceneType],
                        ["Object", item.settings.objectSelection],
                        ["Lighting", item.settings.lighting],
                        ["Camera", item.settings.cameraType],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="space-y-0.5">
                          <span className="text-[9px] text-muted-foreground">{String(label)}</span>
                          <p className="text-[10px] font-mono text-foreground capitalize">{String(value).replace(/-/g, " ")}</p>
                        </div>
                      ))}
                    </div>

                    {/* Node execution */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                        Node Execution Order
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {item.metadata.nodeExecutionOrder.map((node, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0 border-border text-muted-foreground">
                            {i + 1}. {node}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 text-[10px] border-primary/30 text-primary hover:bg-primary/10"
                        onClick={(e) => { e.stopPropagation(); onLoadSettings?.(item.settings); }}
                      >
                        <Copy className="h-3 w-3" /> Reuse Settings
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 text-[10px] border-border text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          const blob = new Blob([JSON.stringify({ ...item.settings, metadata: item.metadata }, null, 2)], { type: "application/json" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `render-${item.id}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        <Download className="h-3 w-3" /> Export JSON
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-4 py-2">
        <span className="text-[10px] text-muted-foreground">
          {filtered.length} of {history.length} renders
        </span>
        <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-[10px] text-muted-foreground">
          <Trash2 className="h-2.5 w-2.5" /> Clear All
        </Button>
      </div>
    </div>
  );
}
