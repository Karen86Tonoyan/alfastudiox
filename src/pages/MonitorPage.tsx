import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Thermometer, Cpu, HardDrive, MemoryStick, AlertTriangle, CheckCircle, Pause } from "lucide-react";

interface Metric {
  label: string;
  value: number;
  max: number;
  unit: string;
  icon: React.ReactNode;
  status: "ok" | "warn" | "danger";
}

const metrics: Metric[] = [
  { label: "GPU Temp", value: 72, max: 100, unit: "°C", icon: <Thermometer className="h-4 w-4" />, status: "ok" },
  { label: "VRAM", value: 9.2, max: 12, unit: "GB", icon: <MemoryStick className="h-4 w-4" />, status: "warn" },
  { label: "CPU", value: 34, max: 100, unit: "%", icon: <Cpu className="h-4 w-4" />, status: "ok" },
  { label: "RAM", value: 12.4, max: 32, unit: "GB", icon: <HardDrive className="h-4 w-4" />, status: "ok" },
];

const statusConfig = {
  ok: { label: "Normalny", color: "bg-status-ok/20 text-status-ok border-status-ok/30", icon: <CheckCircle className="h-4 w-4" /> },
  warn: { label: "Ostrzeżenie", color: "bg-status-warn/20 text-status-warn border-status-warn/30", icon: <AlertTriangle className="h-4 w-4" /> },
  danger: { label: "Przegrzanie — pauza", color: "bg-status-danger/20 text-status-danger border-status-danger/30", icon: <Pause className="h-4 w-4" /> },
};

const progressColor = {
  ok: "bg-status-ok",
  warn: "bg-status-warn",
  danger: "bg-status-danger",
};

const eventLog = [
  { time: "14:32:10", event: "Generowanie #47 zakończone — 12.3s", type: "ok" as const },
  { time: "14:28:45", event: "GPU temp 78°C — próg ostrzeżenia", type: "warn" as const },
  { time: "14:15:22", event: "Automatyczna pauza — GPU 85°C", type: "danger" as const },
  { time: "14:12:00", event: "Wznowienie pracy po schłodzeniu do 68°C", type: "ok" as const },
  { time: "13:58:33", event: "Generowanie #46 zakończone — 15.1s", type: "ok" as const },
  { time: "13:45:10", event: "Zmiana progu temperatury: 85°C → 82°C", type: "warn" as const },
];

export default function MonitorPage() {
  const systemStatus: "ok" | "warn" | "danger" = "ok";
  const sc = statusConfig[systemStatus];

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <Card className="border-l-4" style={{ borderLeftColor: systemStatus === "ok" ? "hsl(142,60%,50%)" : systemStatus === "warn" ? "hsl(40,90%,55%)" : "hsl(0,72%,50%)" }}>
        <CardContent className="flex items-center gap-3 p-4">
          {sc.icon}
          <span className="text-sm font-medium">Status systemu:</span>
          <Badge className={sc.color}>{sc.label}</Badge>
          <span className="ml-auto text-xs text-muted-foreground">Próg temp: 82°C | Auto-pauza: włączona</span>
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {m.icon}
                  {m.label}
                </div>
                <span className="font-mono text-sm font-bold text-foreground">
                  {m.value}{m.unit}
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full transition-all ${progressColor[m.status]}`}
                  style={{ width: `${(m.value / m.max) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-right text-[10px] text-muted-foreground">
                {m.value} / {m.max} {m.unit}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Event log */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Log wydarzeń</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-64 overflow-auto">
            {eventLog.map((e, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-border px-4 py-2 last:border-0"
              >
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{e.time}</span>
                <div
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      e.type === "ok" ? "hsl(142,60%,50%)" : e.type === "warn" ? "hsl(40,90%,55%)" : "hsl(0,72%,50%)",
                  }}
                />
                <span className="text-xs text-foreground">{e.event}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
