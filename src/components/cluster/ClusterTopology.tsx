import type { ClusterNodeRuntime } from "@/lib/clusterManager";
import { Crown, Server } from "lucide-react";

interface Props {
  nodes: ClusterNodeRuntime[];
}

export function ClusterTopology({ nodes }: Props) {
  const master = nodes.find((n) => n.role === "master" && n.enabled);
  const workers = nodes.filter((n) => n.role === "worker" && n.enabled);
  const radius = 130;
  const cx = 200, cy = 160;

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <h3 className="text-xs font-semibold text-foreground mb-2">Topologia klastra</h3>
      <svg viewBox="0 0 400 320" className="w-full h-72">
        <defs>
          <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>

        {workers.map((w, i) => {
          const angle = (i / Math.max(workers.length, 1)) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          const active = w.status === "connected";
          return (
            <g key={w.id}>
              <line x1={cx} y1={cy} x2={x} y2={y}
                stroke={active ? "url(#flowGradient)" : "hsl(var(--border))"}
                strokeWidth={active ? 2 : 1}
                strokeDasharray={active ? "4 4" : "2 4"}>
                {active && (
                  <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1s" repeatCount="indefinite" />
                )}
              </line>
              <circle cx={x} cy={y} r={22}
                fill={active ? "hsl(var(--card))" : "hsl(var(--secondary))"}
                stroke={active ? "hsl(var(--primary))" : "hsl(var(--border))"} strokeWidth={1.5} />
              <text x={x} y={y + 4} textAnchor="middle" className="text-[9px] fill-foreground font-mono">
                {w.name.slice(0, 8)}
              </text>
              <text x={x} y={y + 38} textAnchor="middle" className="text-[8px] fill-muted-foreground">
                {Math.round(w.vramTotal > 0 ? (w.vramUsed / w.vramTotal) * 100 : 0)}%
              </text>
            </g>
          );
        })}

        {master ? (
          <g>
            <circle cx={cx} cy={cy} r={36} fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary))" strokeWidth={2}>
              <animate attributeName="r" values="36;40;36" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={cx} cy={cy} r={30} fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth={1.5} />
            <text x={cx} y={cy + 4} textAnchor="middle" className="text-[10px] fill-primary font-bold">
              MASTER
            </text>
            <text x={cx} y={cy + 50} textAnchor="middle" className="text-[9px] fill-foreground font-mono">
              {master.name}
            </text>
          </g>
        ) : (
          <g>
            <circle cx={cx} cy={cy} r={30} fill="hsl(var(--secondary))" stroke="hsl(var(--border))" strokeDasharray="4 4" />
            <text x={cx} y={cy + 4} textAnchor="middle" className="text-[9px] fill-muted-foreground">
              Brak Mastera
            </text>
          </g>
        )}
      </svg>
      <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><Crown className="h-3 w-3 text-primary" /> Master</span>
        <span className="flex items-center gap-1"><Server className="h-3 w-3" /> Workers: {workers.length}</span>
      </div>
    </div>
  );
}