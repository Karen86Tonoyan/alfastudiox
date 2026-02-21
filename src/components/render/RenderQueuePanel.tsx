import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  GripVertical,
  Play,
  Pause,
  Trash2,
  ChevronUp,
  ChevronDown,
  Clock,
  Zap,
  Image as ImageIcon,
  Video,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";

type QueueStatus = "rendering" | "queued" | "paused" | "done" | "error";
type Priority = "critical" | "high" | "normal" | "low";

interface QueueItem {
  id: string;
  name: string;
  model: string;
  type: "image" | "video";
  status: QueueStatus;
  priority: Priority;
  progress?: number;
  eta?: string;
  resolution: string;
  steps: number;
  addedAt: string;
  seed: number;
}

const priorityConfig: Record<Priority, { label: string; color: string; order: number }> = {
  critical: { label: "CRITICAL", color: "text-red-400 border-red-500/50 bg-red-500/10", order: 0 },
  high: { label: "HIGH", color: "text-amber-400 border-amber-500/50 bg-amber-500/10", order: 1 },
  normal: { label: "NORMAL", color: "text-primary border-primary/30 bg-primary/10", order: 2 },
  low: { label: "LOW", color: "text-muted-foreground border-border bg-secondary/30", order: 3 },
};

const statusConfig: Record<QueueStatus, { icon: React.ReactNode; label: string }> = {
  rendering: { icon: <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />, label: "Rendering" },
  queued: { icon: <Clock className="h-3.5 w-3.5 text-muted-foreground" />, label: "Queued" },
  paused: { icon: <Pause className="h-3.5 w-3.5 text-orange-400" />, label: "Paused" },
  done: { icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />, label: "Done" },
  error: { icon: <AlertTriangle className="h-3.5 w-3.5 text-red-400" />, label: "Error" },
};

const initialQueue: QueueItem[] = [
  { id: "q1", name: "Cinematic Landscape v3", model: "SDXL 1.0", type: "image", status: "rendering", priority: "high", progress: 67, eta: "0:42", resolution: "1024×1024", steps: 30, addedAt: "2 min ago", seed: 158886208700258 },
  { id: "q2", name: "Fantasy Portrait #12", model: "Flux Dev", type: "image", status: "queued", priority: "critical", eta: "1:15", resolution: "768×1024", steps: 25, addedAt: "5 min ago", seed: 984521036547 },
  { id: "q3", name: "Product Shot — Watch", model: "SDXL 1.0", type: "image", status: "queued", priority: "normal", eta: "2:30", resolution: "1024×1024", steps: 40, addedAt: "8 min ago", seed: 771254896325 },
  { id: "q4", name: "Ocean Waves 5s Loop", model: "AnimateDiff", type: "video", status: "queued", priority: "normal", eta: "4:10", resolution: "512×512", steps: 20, addedAt: "12 min ago", seed: 553218974652 },
  { id: "q5", name: "Character Turnaround", model: "Flux Dev", type: "image", status: "paused", priority: "low", eta: "—", resolution: "1024×1024", steps: 35, addedAt: "20 min ago", seed: 112589634587 },
  { id: "q6", name: "Car Ad — Desert", model: "SDXL 1.0", type: "image", status: "queued", priority: "high", eta: "3:00", resolution: "1920×1080", steps: 30, addedAt: "25 min ago", seed: 665874123698 },
  { id: "q7", name: "LoRA Test Batch #4", model: "SDXL 1.0", type: "image", status: "error", priority: "normal", eta: "—", resolution: "512×512", steps: 15, addedAt: "30 min ago", seed: 998877665544 },
];

interface RenderQueuePanelProps {
  className?: string;
}

export function RenderQueuePanel({ className }: RenderQueuePanelProps) {
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragRef = useRef<string | null>(null);

  const activeCount = queue.filter((q) => q.status === "rendering").length;
  const queuedCount = queue.filter((q) => q.status === "queued").length;
  const totalEta = queue
    .filter((q) => q.status === "queued" || q.status === "rendering")
    .reduce((sum, q) => {
      if (!q.eta || q.eta === "—") return sum;
      const [m, s] = q.eta.split(":").map(Number);
      return sum + m * 60 + s;
    }, 0);
  const etaMin = Math.floor(totalEta / 60);
  const etaSec = totalEta % 60;

  const changePriority = useCallback((id: string, dir: "up" | "down") => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const priorities: Priority[] = ["critical", "high", "normal", "low"];
        const idx = priorities.indexOf(item.priority);
        const newIdx = dir === "up" ? Math.max(0, idx - 1) : Math.min(priorities.length - 1, idx + 1);
        return { ...item, priority: priorities[newIdx] };
      })
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const togglePause = useCallback((id: string) => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (item.status === "paused") return { ...item, status: "queued" as QueueStatus };
        if (item.status === "queued") return { ...item, status: "paused" as QueueStatus };
        return item;
      })
    );
  }, []);

  const retryItem = useCallback((id: string) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "queued" as QueueStatus, eta: "~2:00" } : item
      )
    );
  }, []);

  // Drag handlers
  const handleDragStart = (id: string) => {
    dragRef.current = id;
    setDragId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (dragRef.current && dragRef.current !== id) {
      setDragOverId(id);
    }
  };

  const handleDrop = (targetId: string) => {
    const sourceId = dragRef.current;
    if (!sourceId || sourceId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }

    setQueue((prev) => {
      const items = [...prev];
      const srcIdx = items.findIndex((i) => i.id === sourceId);
      const tgtIdx = items.findIndex((i) => i.id === targetId);
      if (srcIdx === -1 || tgtIdx === -1) return prev;
      const [moved] = items.splice(srcIdx, 1);
      items.splice(tgtIdx, 0, moved);
      return items;
    });

    setDragId(null);
    setDragOverId(null);
    dragRef.current = null;
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragOverId(null);
    dragRef.current = null;
  };

  return (
    <div className={cn("flex flex-col bg-card border-t border-border", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2 bg-secondary/30">
        <Zap className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold text-foreground tracking-wide">RENDER QUEUE</span>

        <div className="flex items-center gap-3 ml-4">
          <Badge variant="outline" className="text-[10px] border-blue-500/40 text-blue-400 font-mono">
            <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />
            Active: {activeCount}
          </Badge>
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary font-mono">
            <Clock className="h-2.5 w-2.5 mr-1" />
            Queued: {queuedCount}
          </Badge>
          <Badge variant="outline" className="text-[10px] border-border text-muted-foreground font-mono">
            ETA: {etaMin}:{String(etaSec).padStart(2, "0")}
          </Badge>
        </div>

        <div className="ml-auto flex gap-1.5">
          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] gap-1 border-primary/30 text-primary hover:bg-primary/10">
            <Play className="h-2.5 w-2.5" /> Start All
          </Button>
          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] gap-1 border-orange-500/30 text-orange-400 hover:bg-orange-500/10">
            <Pause className="h-2.5 w-2.5" /> Pause All
          </Button>
          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] gap-1 border-destructive/30 text-destructive hover:bg-destructive/10">
            <Trash2 className="h-2.5 w-2.5" /> Clear Done
          </Button>
        </div>
      </div>

      {/* Queue list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {queue.map((item, idx) => (
            <div
              key={item.id}
              draggable={item.status !== "rendering"}
              onDragStart={() => handleDragStart(item.id)}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDrop={() => handleDrop(item.id)}
              onDragEnd={handleDragEnd}
              className={cn(
                "group flex items-center gap-2 rounded-md border px-2 py-1.5 transition-all",
                item.status === "rendering"
                  ? "border-blue-500/40 bg-blue-500/5"
                  : item.status === "error"
                  ? "border-red-500/30 bg-red-500/5"
                  : item.status === "paused"
                  ? "border-orange-500/20 bg-orange-500/5"
                  : item.status === "done"
                  ? "border-border/50 bg-secondary/10 opacity-60"
                  : "border-border bg-card hover:bg-secondary/20",
                dragId === item.id && "opacity-40 scale-95",
                dragOverId === item.id && "border-primary ring-1 ring-primary/30"
              )}
            >
              {/* Drag handle */}
              <GripVertical
                className={cn(
                  "h-4 w-4 shrink-0 cursor-grab active:cursor-grabbing",
                  item.status === "rendering" ? "text-muted-foreground/30" : "text-muted-foreground/60"
                )}
              />

              {/* Position */}
              <span className="w-4 text-center text-[10px] font-mono text-muted-foreground">{idx + 1}</span>

              {/* Status icon */}
              {statusConfig[item.status].icon}

              {/* Type icon */}
              {item.type === "video" ? (
                <Video className="h-3.5 w-3.5 text-purple-400 shrink-0" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5 text-primary/70 shrink-0" />
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-foreground truncate">{item.name}</span>
                  <span className="text-[9px] text-muted-foreground font-mono">{item.model}</span>
                </div>
                {item.status === "rendering" && item.progress !== undefined && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <Progress value={item.progress} className="h-1 flex-1" />
                    <span className="text-[10px] text-blue-400 font-mono">{item.progress}%</span>
                  </div>
                )}
              </div>

              {/* Resolution & steps */}
              <span className="text-[9px] text-muted-foreground font-mono shrink-0">{item.resolution}</span>
              <span className="text-[9px] text-muted-foreground font-mono shrink-0">{item.steps}st</span>

              {/* Priority badge */}
              <Badge
                variant="outline"
                className={cn("text-[8px] px-1.5 py-0 h-4 font-mono shrink-0", priorityConfig[item.priority].color)}
              >
                {priorityConfig[item.priority].label}
              </Badge>

              {/* ETA */}
              <div className="flex items-center gap-1 shrink-0 w-12 justify-end">
                <Clock className="h-2.5 w-2.5 text-muted-foreground/50" />
                <span className="text-[10px] font-mono text-muted-foreground">{item.eta ?? "—"}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Priority up/down */}
                <button
                  onClick={() => changePriority(item.id, "up")}
                  className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                  title="Increase priority"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  onClick={() => changePriority(item.id, "down")}
                  className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                  title="Decrease priority"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>

                {/* Pause / Resume */}
                {(item.status === "queued" || item.status === "paused") && (
                  <button
                    onClick={() => togglePause(item.id)}
                    className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-orange-400"
                    title={item.status === "paused" ? "Resume" : "Pause"}
                  >
                    {item.status === "paused" ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                  </button>
                )}

                {/* Retry */}
                {item.status === "error" && (
                  <button
                    onClick={() => retryItem(item.id)}
                    className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-blue-400"
                    title="Retry"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                )}

                {/* Remove */}
                {item.status !== "rendering" && (
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-destructive"
                    title="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {queue.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-xs">
              Queue is empty — add renders from the Studio
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
