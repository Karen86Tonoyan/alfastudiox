import { useState } from "react";
import { AlertTriangle, Trash2, ChevronDown, ChevronRight, Cpu, Zap, Clock, Bug, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ErrorLogEntry } from "@/lib/comfyApi";

const typeConfig: Record<ErrorLogEntry["type"], { icon: React.ReactNode; label: string; color: string }> = {
  crash: { icon: <Zap className="h-3 w-3" />, label: "Crash", color: "text-red-400 border-red-500/40 bg-red-500/10" },
  oom: { icon: <Cpu className="h-3 w-3" />, label: "Out of Memory", color: "text-orange-400 border-orange-500/40 bg-orange-500/10" },
  timeout: { icon: <Clock className="h-3 w-3" />, label: "Timeout", color: "text-amber-400 border-amber-500/40 bg-amber-500/10" },
  quality_reject: { icon: <X className="h-3 w-3" />, label: "Odrzucone", color: "text-purple-400 border-purple-500/40 bg-purple-500/10" },
  cuda_error: { icon: <Cpu className="h-3 w-3" />, label: "CUDA Error", color: "text-red-400 border-red-500/40 bg-red-500/10" },
  node_error: { icon: <Bug className="h-3 w-3" />, label: "Node Error", color: "text-amber-400 border-amber-500/40 bg-amber-500/10" },
};

// Mock errors for demo
const mockErrors: ErrorLogEntry[] = [
  {
    id: "e1", timestamp: Date.now() - 300000, type: "oom",
    message: "GPU protection triggered: VRAM=15.8/16.0GB — rendering paused",
    node: "SUPIR_Upscale", workflow: "Cinematic Landscape v3", model: "SUPIR_v0Q",
    gpuState: { temp: 78, vramUsed: 15.8, vramTotal: 16 },
  },
  {
    id: "e2", timestamp: Date.now() - 600000, type: "quality_reject",
    message: "Florence2 score 0.32 — poniżej progu 0.5, obraz odrzucony",
    node: "Florence2", workflow: "Portrait Fantasy #12",
  },
  {
    id: "e3", timestamp: Date.now() - 900000, type: "cuda_error",
    message: "CUDA error: cudaErrorNotSupported — brak kompatybilnego sterownika",
    stackTrace: "RuntimeError: CUDA not available\n  at torch.cuda.init()\n  at model.load()",
  },
  {
    id: "e4", timestamp: Date.now() - 1200000, type: "node_error",
    message: "KSampler: Invalid denoise value 1.5 (max 1.0)",
    node: "KSampler", workflow: "Animacja woda 5s",
  },
  {
    id: "e5", timestamp: Date.now() - 1800000, type: "timeout",
    message: "Render timeout po 300s — przerwano automatycznie",
    node: "WanVideoWrapper", workflow: "WanVideo test loop",
  },
];

interface ErrorLogPanelProps {
  className?: string;
}

export function ErrorLogPanel({ className }: ErrorLogPanelProps) {
  const [errors] = useState<ErrorLogEntry[]>(mockErrors);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<ErrorLogEntry["type"] | "all">("all");

  const filtered = filter === "all" ? errors : errors.filter((e) => e.type === filter);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  };

  const formatAgo = (ts: number) => {
    const mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 60) return `${mins}m temu`;
    return `${Math.round(mins / 60)}h temu`;
  };

  return (
    <div className={cn("flex flex-col border-l border-border bg-card", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <span className="text-sm font-semibold text-foreground">Error Log</span>
        <Badge variant="outline" className="ml-auto text-[10px] border-red-500/50 text-red-400">
          {errors.length}
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex gap-1 border-b border-border px-3 py-2 flex-wrap">
        {(["all", "crash", "oom", "cuda_error", "node_error", "quality_reject", "timeout"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded px-2 py-0.5 text-[10px] transition-colors",
              filter === f
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f === "all" ? "Wszystkie" : typeConfig[f]?.label || f}
          </button>
        ))}
      </div>

      {/* Error list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {filtered.length === 0 && (
            <p className="text-center text-[11px] text-muted-foreground py-8">Brak błędów</p>
          )}
          {filtered.map((error) => {
            const config = typeConfig[error.type];
            const isExpanded = expanded === error.id;
            return (
              <div
                key={error.id}
                className={cn(
                  "rounded-md border px-2.5 py-2 text-[11px] cursor-pointer transition-colors",
                  config.color
                )}
                onClick={() => setExpanded(isExpanded ? null : error.id)}
              >
                <div className="flex items-center gap-1.5">
                  {config.icon}
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    {config.label}
                  </Badge>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {formatAgo(error.timestamp)}
                  </span>
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed">{error.message}</p>

                {isExpanded && (
                  <div className="mt-2 space-y-1.5 border-t border-border/50 pt-2">
                    {error.node && (
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Node:</span>
                        <span className="font-mono">{error.node}</span>
                      </div>
                    )}
                    {error.workflow && (
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Workflow:</span>
                        <span>{error.workflow}</span>
                      </div>
                    )}
                    {error.model && (
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Model:</span>
                        <span className="font-mono">{error.model}</span>
                      </div>
                    )}
                    {error.gpuState && (
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">GPU:</span>
                        <span className="font-mono">
                          {error.gpuState.temp}°C, VRAM: {error.gpuState.vramUsed?.toFixed(1)}/{error.gpuState.vramTotal?.toFixed(1)}GB
                        </span>
                      </div>
                    )}
                    {error.stackTrace && (
                      <pre className="mt-1 rounded bg-background/50 p-2 text-[9px] text-muted-foreground overflow-x-auto whitespace-pre-wrap font-mono">
                        {error.stackTrace}
                      </pre>
                    )}
                    <div className="flex gap-1 pt-1">
                      <Button size="sm" variant="outline" className="h-5 px-2 text-[9px]">
                        Powtórz workflow
                      </Button>
                      <Button size="sm" variant="outline" className="h-5 px-2 text-[9px]">
                        Eksportuj do LoRA training
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
      <div className="flex items-center justify-between border-t border-border px-3 py-2">
        <span className="text-[10px] text-muted-foreground">
          {filtered.length} błędów • folder: errors/
        </span>
        <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-[10px] text-muted-foreground">
          <Trash2 className="h-2.5 w-2.5" /> Wyczyść
        </Button>
      </div>
    </div>
  );
}
