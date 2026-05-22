import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Thermometer, Cpu, HardDrive, MemoryStick, AlertTriangle, CheckCircle, Pause } from "lucide-react";

type StatusType = "ok" | "warn" | "danger";

interface Metric {
  label: string;
  value: number;
  max: number;
  unit: string;
  status: StatusType;
}

interface EventLogItem {
  time: string;
  event: string;
  type: StatusType;
}

const getStatus = (value: number, max: number): StatusType => {
  const ratio = value / max;
  if (ratio > 0.85) return "danger";
  if (ratio > 0.7) return "warn";
  return "ok";
};

export default function MonitorPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [eventLog, setEventLog] = useState<EventLogItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/monitor");
        const data = await res.json();

        const updatedMetrics: Metric[] = [
          {
            label: "GPU Temp",
            value: data.gpuTemp,
            max: 100,
            unit: "°C",
            status: getStatus(data.gpuTemp, 100),
          },
          {
            label: "VRAM",
            value: data.vramUsed,
            max: data.vramMax,
            unit: "GB",
            status: getStatus(data.vramUsed, data.vramMax),
          },
          {
            label: "CPU",
            value: data.cpuUsage,
            max: 100,
            unit: "%",
            status: getStatus(data.cpuUsage, 100),
          },
          {
            label: "RAM",
            value: data.ramUsed,
            max: data.ramMax,
            unit: "GB",
            status: getStatus(data.ramUsed, data.ramMax),
          },
        ];

        setMetrics(updatedMetrics);
        setEventLog(data.events);
      } catch (err) {
        console.error("Monitor fetch error:", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const systemStatus: StatusType = metrics.some((m) => m.status === "danger")
    ? "danger"
    : metrics.some((m) => m.status === "warn")
      ? "warn"
      : "ok";

  const statusConfig = {
    ok: {
      label: "Normalny",
      color: "bg-green-500/20 text-green-500 border-green-500/30",
      icon: <CheckCircle className="h-4 w-4" />,
    },
    warn: {
      label: "Ostrzeżenie",
      color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
      icon: <AlertTriangle className="h-4 w-4" />,
    },
    danger: {
      label: "Przegrzanie — pauza",
      color: "bg-red-500/20 text-red-500 border-red-500/30",
      icon: <Pause className="h-4 w-4" />,
    },
  };

  const progressColor = {
    ok: "bg-green-500",
    warn: "bg-yellow-500",
    danger: "bg-red-500",
  };

  const sc = statusConfig[systemStatus];

  return (
    <div className="space-y-4">
      {/* SYSTEM STATUS */}
      <Card
        className="border-l-4"
        style={{
          borderLeftColor:
            systemStatus === "ok" ? "rgb(34,197,94)" : systemStatus === "warn" ? "rgb(234,179,8)" : "rgb(239,68,68)",
        }}
      >
        <CardContent className="flex items-center gap-3 p-4">
          {sc.icon}
          <span className="text-sm font-medium">Status systemu:</span>
          <Badge className={sc.color}>{sc.label}</Badge>
          <span className="ml-auto text-xs text-muted-foreground">Auto-monitoring aktywny</span>
        </CardContent>
      </Card>

      {/* METRICS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">{m.label}</div>
                <span className="font-mono text-sm font-bold">
                  {m.value}
                  {m.unit}
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

      {/* EVENT LOG */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Log wydarzeń</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-64 overflow-auto">
            {eventLog.map((e, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-2 last:border-0">
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{e.time}</span>
                <div
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      e.type === "ok" ? "rgb(34,197,94)" : e.type === "warn" ? "rgb(234,179,8)" : "rgb(239,68,68)",
                  }}
                />
                <span className="text-xs">{e.event}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
