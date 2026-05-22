import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Activity, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { RenderLogEntry } from "@/hooks/useRenderTracker";

interface RenderTrackerProps {
  log: RenderLogEntry[];
  used: number;
  remaining: number;
  budget: number;
  onClear: () => void;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
}

export function RenderTracker({ log, used, remaining, budget, onClear }: RenderTrackerProps) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round((used / budget) * 100);

  const phaseLabel = used <= 5 ? "🔥 Faza testowa" : used <= 10 ? "🔧 Faza kalibracji" : "🎯 Faza produkcyjna";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5" />
          Render Tracker
        </label>
        <Badge variant="outline" className={cn(
          "text-[9px] font-mono",
          remaining <= 3 ? "border-destructive/50 text-destructive" : "border-primary/30 text-primary"
        )}>
          {remaining}/{budget}
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              pct <= 25 ? "bg-[hsl(var(--status-ok))]"
                : pct <= 50 ? "bg-primary"
                : pct <= 75 ? "bg-[hsl(var(--status-warning,40_100%_50%))]"
                : "bg-destructive"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{phaseLabel}</span>
          <span className="font-mono">{used} użyte</span>
        </div>
      </div>

      {/* Toggle log */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        <span>Log renderów ({log.length})</span>
        {log.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="ml-auto text-destructive/60 hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </button>

      {expanded && log.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
          {log.map((entry, i) => (
            <div
              key={entry.id}
              className="rounded-md border border-border bg-card/50 px-2.5 py-2 text-[10px] space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  #{used - i}
                </span>
                <span className="text-muted-foreground font-mono">
                  {formatDate(entry.timestamp)} {formatTime(entry.timestamp)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
                <span>Steps: <span className="text-foreground font-mono">{entry.steps}</span></span>
                <span>CFG: <span className="text-foreground font-mono">{entry.cfg}</span></span>
                <span>Sampler: <span className="text-foreground font-mono">{entry.sampler || "—"}</span></span>
                <span>Scheduler: <span className="text-foreground font-mono">{entry.scheduler || "—"}</span></span>
                <span>Res: <span className="text-foreground font-mono">{entry.width}×{entry.height}</span></span>
                <span>Seed: <span className="text-foreground font-mono">{entry.seed}</span></span>
                <span>IP: <span className="text-foreground font-mono">{entry.ipWeight}</span></span>
                <span>PuLID: <span className="text-foreground font-mono">{entry.pulidWeight}</span></span>
              </div>
              {entry.preset && (
                <Badge variant="outline" className="text-[8px] border-primary/20 text-primary">
                  {entry.preset}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}

      {expanded && log.length === 0 && (
        <p className="text-[10px] text-muted-foreground text-center py-2">Brak renderów</p>
      )}
    </div>
  );
}
