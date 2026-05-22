import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, AreaChart, BarChart, Bar, Cell
} from "recharts";
import { ShieldCheck, AlertTriangle, XCircle, RefreshCw, TrendingDown } from "lucide-react";
import { type TIPReport, type TIPConfig } from "@/lib/tipAuditor";
import { cn } from "@/lib/utils";

interface TIPDashboardProps {
  report: TIPReport;
  config: TIPConfig;
}

const STATUS_COLORS: Record<string, string> = {
  OK: "hsl(142, 60%, 45%)",
  MINOR_DRIFT: "hsl(40, 90%, 55%)",
  DRIFT: "hsl(0, 72%, 50%)",
  RE_ANCHOR: "hsl(280, 60%, 50%)",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  OK: <ShieldCheck className="h-3.5 w-3.5" />,
  MINOR_DRIFT: <AlertTriangle className="h-3.5 w-3.5" />,
  DRIFT: <XCircle className="h-3.5 w-3.5" />,
  RE_ANCHOR: <RefreshCw className="h-3.5 w-3.5" />,
};

export function TIPDashboard({ report, config }: TIPDashboardProps) {
  const chartData = useMemo(() =>
    report.frames.map(f => ({
      frame: f.frame,
      tip: Number(f.tipSmoothed.toFixed(3)),
      tipRaw: Number(f.tipScore.toFixed(3)),
      zE: Number(f.zEmbedding.toFixed(2)),
      zG: Number(f.zGeometry.toFixed(2)),
      zT: Number(f.zTexture.toFixed(2)),
      status: f.status,
    })),
    [report.frames]
  );

  const worstFrames = useMemo(() =>
    [...report.frames].sort((a, b) => a.tipSmoothed - b.tipSmoothed).slice(0, 8),
    [report.frames]
  );

  const streaks = useMemo(() => {
    let maxStreak = 0, currentStreak = 0;
    for (const f of report.frames) {
      if (f.status === "DRIFT" || f.status === "RE_ANCHOR") {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    return maxStreak;
  }, [report.frames]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Postać" value={report.character} icon={<ShieldCheck className="h-4 w-4 text-primary" />} />
        <SummaryCard label="Klatki" value={`${report.totalFrames}`} sub={`Avg TIP: ${report.avgTip.toFixed(3)}`} />
        <SummaryCard label="Min TIP" value={report.minTip.toFixed(3)}
          variant={report.minTip < config.thresholds.drift_detected ? "danger" : report.minTip < config.thresholds.ok ? "warn" : "ok"} />
        <SummaryCard label="Max Streak" value={`${streaks}`}
          sub="driftów z rzędu"
          variant={streaks >= 3 ? "danger" : streaks >= 2 ? "warn" : "ok"} />
      </div>

      {/* Status distribution */}
      <div className="grid grid-cols-4 gap-2">
        {([
          { key: "OK", count: report.okFrames, color: "bg-[hsl(var(--status-ok))]" },
          { key: "MINOR_DRIFT", count: report.minorDrift, color: "bg-[hsl(var(--status-warn))]" },
          { key: "DRIFT", count: report.driftFrames, color: "bg-[hsl(var(--status-danger))]" },
          { key: "RE_ANCHOR", count: report.reAnchor, color: "bg-purple-500" },
        ] as const).map(({ key, count, color }) => (
          <div key={key} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
            <div className={cn("h-2.5 w-2.5 rounded-full", color)} />
            <div>
              <p className="text-[10px] text-muted-foreground">{key.replace("_", " ")}</p>
              <p className="text-sm font-bold font-mono">{count}</p>
            </div>
            <span className="ml-auto text-[10px] text-muted-foreground font-mono">
              {((count / report.totalFrames) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      {/* TIP Timeline */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-primary" />
            TIP Timeline
            <Badge variant="outline" className="ml-auto text-[9px] font-mono">
              {report.totalFrames} klatek
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="tipGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(43, 90%, 55%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(43, 90%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(40, 8%, 15%)" />
                <XAxis dataKey="frame" tick={{ fontSize: 10, fill: "hsl(40, 5%, 45%)" }} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: "hsl(40, 5%, 45%)" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(0, 0%, 9%)", border: "1px solid hsl(40, 8%, 15%)", borderRadius: 6, fontSize: 11 }}
                  labelStyle={{ color: "hsl(40, 20%, 90%)" }}
                />
                <ReferenceLine y={config.thresholds.ok} stroke="hsl(142, 60%, 45%)" strokeDasharray="4 4" strokeOpacity={0.5} />
                <ReferenceLine y={config.thresholds.minor_drift} stroke="hsl(40, 90%, 55%)" strokeDasharray="4 4" strokeOpacity={0.5} />
                <ReferenceLine y={config.thresholds.drift_detected} stroke="hsl(0, 72%, 50%)" strokeDasharray="4 4" strokeOpacity={0.5} />
                <Area type="monotone" dataKey="tip" stroke="hsl(43, 90%, 55%)" fill="url(#tipGradient)" strokeWidth={2} name="TIP (smoothed)" />
                <Line type="monotone" dataKey="tipRaw" stroke="hsl(40, 5%, 45%)" strokeWidth={1} dot={false} strokeOpacity={0.4} name="TIP (raw)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Z-score breakdown */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Z-score rozkład (Embedding / Geometry / Texture)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(40, 8%, 15%)" />
                <XAxis dataKey="frame" tick={{ fontSize: 10, fill: "hsl(40, 5%, 45%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(40, 5%, 45%)" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(0, 0%, 9%)", border: "1px solid hsl(40, 8%, 15%)", borderRadius: 6, fontSize: 11 }}
                />
                <Line type="monotone" dataKey="zE" stroke="hsl(210, 60%, 50%)" strokeWidth={1.5} dot={false} name="Z_embedding" />
                <Line type="monotone" dataKey="zG" stroke="hsl(142, 60%, 45%)" strokeWidth={1.5} dot={false} name="Z_geometry" />
                <Line type="monotone" dataKey="zT" stroke="hsl(340, 65%, 55%)" strokeWidth={1.5} dot={false} name="Z_texture" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Worst frames table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Najgorsze klatki</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[250px]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Klatka</th>
                  <th className="px-3 py-2 text-left font-medium">TIP</th>
                  <th className="px-3 py-2 text-left font-medium">Z_e</th>
                  <th className="px-3 py-2 text-left font-medium">Z_g</th>
                  <th className="px-3 py-2 text-left font-medium">Z_t</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {worstFrames.map(f => (
                  <tr key={f.frame} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="px-3 py-1.5 font-mono">#{f.frame}</td>
                    <td className="px-3 py-1.5 font-mono font-bold" style={{ color: STATUS_COLORS[f.status] }}>
                      {f.tipSmoothed.toFixed(3)}
                    </td>
                    <td className="px-3 py-1.5 font-mono">{f.zEmbedding.toFixed(2)}</td>
                    <td className="px-3 py-1.5 font-mono">{f.zGeometry.toFixed(2)}</td>
                    <td className="px-3 py-1.5 font-mono">{f.zTexture.toFixed(2)}</td>
                    <td className="px-3 py-1.5">
                      <Badge variant="outline" className="text-[9px] gap-1" style={{ color: STATUS_COLORS[f.status], borderColor: STATUS_COLORS[f.status] + "40" }}>
                        {STATUS_ICONS[f.status]}
                        {f.status.replace("_", " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, sub, icon, variant = "default" }: {
  label: string; value: string; sub?: string; icon?: React.ReactNode;
  variant?: "default" | "ok" | "warn" | "danger";
}) {
  const variantClass = variant === "ok" ? "border-[hsl(var(--status-ok))]/30"
    : variant === "warn" ? "border-[hsl(var(--status-warn))]/30"
    : variant === "danger" ? "border-[hsl(var(--status-danger))]/30"
    : "border-border";

  return (
    <div className={cn("rounded-lg border bg-card p-3", variantClass)}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-bold font-mono">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
