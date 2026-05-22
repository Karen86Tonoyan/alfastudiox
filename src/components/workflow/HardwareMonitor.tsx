import { useState, useEffect } from "react";
import { Cpu, Thermometer, HardDrive, Activity, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface GpuMetrics {
  name: string;
  temp: number;
  tempMax: number;
  vramUsed: number;
  vramTotal: number;
  utilization: number;
  fanSpeed: number;
  power: number;
  powerMax: number;
}

function useMockMetrics(): GpuMetrics {
  const [metrics, setMetrics] = useState<GpuMetrics>({
    name: "NVIDIA RTX 4070 Ti",
    temp: 62,
    tempMax: 90,
    vramUsed: 6.2,
    vramTotal: 12,
    utilization: 74,
    fanSpeed: 55,
    power: 185,
    powerMax: 285,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        temp: Math.min(prev.tempMax, Math.max(40, prev.temp + (Math.random() - 0.45) * 3)),
        vramUsed: Math.min(prev.vramTotal, Math.max(1, prev.vramUsed + (Math.random() - 0.4) * 0.4)),
        utilization: Math.min(100, Math.max(0, prev.utilization + (Math.random() - 0.45) * 8)),
        fanSpeed: Math.min(100, Math.max(20, prev.fanSpeed + (Math.random() - 0.5) * 4)),
        power: Math.min(prev.powerMax, Math.max(50, prev.power + (Math.random() - 0.45) * 15)),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return metrics;
}

function getTempColor(temp: number, max: number): string {
  const ratio = temp / max;
  if (ratio > 0.9) return "text-red-400";
  if (ratio > 0.75) return "text-amber-400";
  return "text-emerald-400";
}

function getBarColor(ratio: number): string {
  if (ratio > 0.9) return "bg-red-500";
  if (ratio > 0.75) return "bg-amber-500";
  return "bg-emerald-500";
}

interface MetricRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  ratio: number;
  warning?: boolean;
}

function MetricRow({ icon, label, value, ratio, warning }: MetricRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {icon}
          {label}
        </div>
        <span className={cn("text-[11px] font-mono font-medium", warning ? "text-amber-400" : "text-foreground")}>
          {value}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", getBarColor(ratio))}
          style={{ width: `${Math.min(100, ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}

interface HardwareMonitorProps {
  className?: string;
}

export function HardwareMonitor({ className }: HardwareMonitorProps) {
  const gpu = useMockMetrics();
  const vramRatio = gpu.vramUsed / gpu.vramTotal;
  const tempRatio = gpu.temp / gpu.tempMax;
  const isOverheating = gpu.temp > gpu.tempMax * 0.9;

  return (
    <div className={cn("border-b border-border px-3 py-3 space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-xs font-semibold text-foreground">Hardware Monitor</span>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] px-1.5",
            isOverheating
              ? "border-red-500/50 text-red-400"
              : "border-emerald-500/50 text-emerald-400"
          )}
        >
          {isOverheating ? "HOT" : "OK"}
        </Badge>
      </div>

      {/* GPU name */}
      <p className="text-[10px] text-muted-foreground truncate">{gpu.name}</p>

      {/* Alert */}
      {isOverheating && (
        <div className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-400">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Temperatura krytyczna — throttling aktywny
        </div>
      )}

      {/* Temperature */}
      <MetricRow
        icon={<Thermometer className="h-3 w-3" />}
        label="Temperatura"
        value={`${Math.round(gpu.temp)}°C / ${gpu.tempMax}°C`}
        ratio={tempRatio}
        warning={tempRatio > 0.75}
      />

      {/* VRAM */}
      <MetricRow
        icon={<HardDrive className="h-3 w-3" />}
        label="VRAM"
        value={`${gpu.vramUsed.toFixed(1)} / ${gpu.vramTotal} GB`}
        ratio={vramRatio}
        warning={vramRatio > 0.85}
      />

      {/* GPU utilization */}
      <MetricRow
        icon={<Activity className="h-3 w-3" />}
        label="Wykorzystanie GPU"
        value={`${Math.round(gpu.utilization)}%`}
        ratio={gpu.utilization / 100}
      />

      {/* Secondary stats */}
      <div className="flex justify-between text-[10px] text-muted-foreground pt-1 border-t border-border">
        <span>Fan: {Math.round(gpu.fanSpeed)}%</span>
        <span>Power: {Math.round(gpu.power)}W / {gpu.powerMax}W</span>
      </div>
    </div>
  );
}
