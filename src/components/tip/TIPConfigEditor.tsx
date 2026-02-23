import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Settings, RotateCcw, Download, Copy } from "lucide-react";
import { type TIPConfig, DEFAULT_CONFIG } from "@/lib/tipAuditor";
import { useToast } from "@/hooks/use-toast";

interface TIPConfigEditorProps {
  config: TIPConfig;
  onChange: (config: TIPConfig) => void;
}

export function TIPConfigEditor({ config, onChange }: TIPConfigEditorProps) {
  const { toast } = useToast();

  const updateWeights = (key: keyof TIPConfig["weights"], val: number) => {
    onChange({ ...config, weights: { ...config.weights, [key]: val } });
  };

  const updateThreshold = (key: keyof TIPConfig["thresholds"], val: number) => {
    onChange({ ...config, thresholds: { ...config.thresholds, [key]: val } });
  };

  const weightsSum = config.weights.geometry + config.weights.embedding + config.weights.texture;
  const weightsValid = Math.abs(weightsSum - 1.0) < 0.01;

  const exportYaml = () => {
    const yaml = `# TIP Auditor v1.1 — Global Configuration
weights:
  geometry: ${config.weights.geometry.toFixed(2)}
  embedding: ${config.weights.embedding.toFixed(2)}
  texture: ${config.weights.texture.toFixed(2)}

thresholds:
  ok: ${config.thresholds.ok.toFixed(2)}
  minor_drift: ${config.thresholds.minor_drift.toFixed(2)}
  drift_detected: ${config.thresholds.drift_detected.toFixed(2)}
  re_anchor: ${config.thresholds.re_anchor.toFixed(2)}

smoothing:
  alpha: ${config.smoothing.alpha.toFixed(2)}

tip:
  temperature: ${config.tip.temperature.toFixed(1)}

report:
  include_charts: ${config.report.include_charts}
  include_failure_gallery: ${config.report.include_failure_gallery}
  output_dir: "${config.report.output_dir}"`;

    navigator.clipboard.writeText(yaml);
    toast({ title: "Skopiowano config.yaml", description: "Wklej do pliku config.yaml w projekcie TIP Auditor." });
  };

  return (
    <div className="space-y-4">
      {/* Weights */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Wagi komponentów
            <Badge variant={weightsValid ? "outline" : "destructive"} className="ml-auto text-[9px]">
              Σ = {weightsSum.toFixed(2)} {weightsValid ? "✓" : "≠ 1.00"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(["geometry", "embedding", "texture"] as const).map((key) => (
            <div key={key} className="space-y-1.5">
              <div className="flex justify-between">
                <Label className="text-xs capitalize">{key}</Label>
                <span className="text-xs font-mono text-muted-foreground">{config.weights[key].toFixed(2)}</span>
              </div>
              <Slider
                value={[config.weights[key]]}
                min={0} max={1} step={0.05}
                onValueChange={([v]) => updateWeights(key, v)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Thresholds */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Progi decyzyjne</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {([
            { key: "ok" as const, label: "OK", color: "text-[hsl(var(--status-ok))]" },
            { key: "minor_drift" as const, label: "Minor Drift", color: "text-[hsl(var(--status-warn))]" },
            { key: "drift_detected" as const, label: "Drift", color: "text-[hsl(var(--status-danger))]" },
          ]).map(({ key, label, color }) => (
            <div key={key} className="space-y-1.5">
              <div className="flex justify-between">
                <Label className={`text-xs ${color}`}>{label}</Label>
                <span className="text-xs font-mono text-muted-foreground">{config.thresholds[key].toFixed(2)}</span>
              </div>
              <Slider
                value={[config.thresholds[key]]}
                min={0} max={1} step={0.01}
                onValueChange={([v]) => updateThreshold(key, v)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Temperature & Smoothing */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Parametry silnika</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-xs">Temperatura (T)</Label>
              <span className="text-xs font-mono text-muted-foreground">{config.tip.temperature.toFixed(1)}</span>
            </div>
            <Slider
              value={[config.tip.temperature]}
              min={0.5} max={10} step={0.1}
              onValueChange={([v]) => onChange({ ...config, tip: { temperature: v } })}
            />
            <p className="text-[10px] text-muted-foreground">TIP = exp(-S/T). Wyższe T → mniej surowy scoring.</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-xs">Smoothing α (EMA)</Label>
              <span className="text-xs font-mono text-muted-foreground">{config.smoothing.alpha.toFixed(2)}</span>
            </div>
            <Slider
              value={[config.smoothing.alpha]}
              min={0} max={1} step={0.05}
              onValueChange={([v]) => onChange({ ...config, smoothing: { alpha: v } })}
            />
            <p className="text-[10px] text-muted-foreground">Wyższe α → więcej wagi na bieżącą klatkę.</p>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Wykresy w raporcie</Label>
            <Switch
              checked={config.report.include_charts}
              onCheckedChange={(v) => onChange({ ...config, report: { ...config.report, include_charts: v } })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Galeria błędów</Label>
            <Switch
              checked={config.report.include_failure_gallery}
              onCheckedChange={(v) => onChange({ ...config, report: { ...config.report, include_failure_gallery: v } })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 text-xs gap-1.5" onClick={exportYaml}>
          <Copy className="h-3 w-3" /> Kopiuj YAML
        </Button>
        <Button size="sm" variant="outline" className="text-xs gap-1.5"
          onClick={() => onChange(DEFAULT_CONFIG)}>
          <RotateCcw className="h-3 w-3" /> Reset
        </Button>
      </div>
    </div>
  );
}
