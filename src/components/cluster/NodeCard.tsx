import { useState } from "react";
import { Server, Crown, Trash2, Wifi, WifiOff, Loader2, Zap, Thermometer, Database, Settings, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ClusterNodeRuntime } from "@/lib/clusterManager";
import { toast } from "sonner";

interface Props {
  node: ClusterNodeRuntime;
  onEdit: () => void;
  onRemove: () => void;
  onSetMaster: () => void;
  onToggleEnabled: (next: boolean) => void;
  onTest: () => Promise<boolean>;
  canManage: boolean;
}

export function NodeCard({ node, onEdit, onRemove, onSetMaster, onToggleEnabled, onTest, canManage }: Props) {
  const [testing, setTesting] = useState(false);
  const vramPct = node.vramTotal > 0 ? (node.vramUsed / node.vramTotal) * 100 : 0;
  const tempHot = node.gpuTemp > 80;
  const statusColor =
    node.status === "connected" ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" :
    node.status === "connecting" ? "text-amber-400 border-amber-500/40 bg-amber-500/10" :
    node.status === "error" ? "text-red-400 border-red-500/40 bg-red-500/10" :
    "text-muted-foreground border-border bg-secondary/40";

  return (
    <div className={cn(
      "rounded-lg border p-3 space-y-2 transition-all",
      node.role === "master"
        ? "border-primary/50 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-[0_0_24px_-12px_hsl(var(--primary))]"
        : "border-border bg-card",
      !node.enabled && "opacity-50"
    )}>
      <div className="flex items-start gap-2">
        <div className={cn(
          "rounded-md p-1.5 border",
          node.role === "master" ? "border-primary/40 bg-primary/10" : "border-border bg-secondary/40"
        )}>
          {node.role === "master"
            ? <Crown className="h-4 w-4 text-primary" />
            : <Server className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground truncate">{node.name}</span>
            <Badge variant="outline" className={cn("text-[9px] gap-1 py-0", statusColor)}>
              {node.status === "connected"
                ? <Wifi className="h-2.5 w-2.5" />
                : <WifiOff className="h-2.5 w-2.5" />}
              {node.status}
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono truncate">{node.url}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
        <Metric icon={<Database className="h-3 w-3" />} label="VRAM" value={`${node.vramUsed.toFixed(1)}/${node.vramTotal.toFixed(0)||node.maxVramGB}GB`} />
        <Metric icon={<Thermometer className="h-3 w-3" />} label="Temp" value={`${Math.round(node.gpuTemp)}°C`} accent={tempHot ? "text-red-400" : undefined} />
        <Metric icon={<Zap className="h-3 w-3" />} label="Kolejka" value={String(node.queueSize)} />
      </div>

      {node.vramTotal > 0 && (
        <Progress value={vramPct} className={cn("h-1", vramPct > 90 && "[&>*]:bg-red-500")} />
      )}

      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[9px] py-0">P{node.priority}</Badge>
        {node.tags.slice(0, 4).map((t) => (
          <Badge key={t} variant="outline" className="text-[9px] py-0 border-cyan-500/30 text-cyan-400">{t}</Badge>
        ))}
      </div>

      {canManage && (
        <div className="flex gap-1 pt-1 border-t border-border/50">
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] flex-1"
            onClick={async () => {
              setTesting(true);
              const ok = await onTest();
              setTesting(false);
              ok ? toast.success(`${node.name}: OK`) : toast.error(`${node.name}: brak odpowiedzi`);
            }}>
            {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Test"}
          </Button>
          {node.role !== "master" && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={onSetMaster}>
              <Crown className="h-3 w-3" />
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => onToggleEnabled(!node.enabled)}>
            <Power className={cn("h-3 w-3", node.enabled ? "text-emerald-400" : "text-muted-foreground")} />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={onEdit}>
            <Settings className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-destructive hover:text-destructive" onClick={onRemove}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="rounded border border-border bg-secondary/30 px-1.5 py-1">
      <div className="flex items-center gap-1 text-muted-foreground">{icon}<span>{label}</span></div>
      <div className={cn("font-mono text-foreground", accent)}>{value}</div>
    </div>
  );
}