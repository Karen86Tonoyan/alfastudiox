import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Eye, FileText, Droplets } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

export interface AITransparencyConfig {
  watermarkEnabled: boolean;
  metadataEnabled: boolean;
  badgeVisible: boolean;
}

interface AITransparencyBadgeProps {
  provider?: string;
  model?: string;
  className?: string;
}

export function AITransparencyBadge({ provider, model, className }: AITransparencyBadgeProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant="outline" className="text-[9px] border-yellow-500/40 text-yellow-500 bg-yellow-500/10 gap-1">
        <AlertTriangle className="h-2.5 w-2.5" />
        AI Generated
      </Badge>
      {provider && (
        <span className="text-[9px] text-muted-foreground font-mono">
          {provider}{model ? ` / ${model}` : ""}
        </span>
      )}
    </div>
  );
}

interface AITransparencyPanelProps {
  config: AITransparencyConfig;
  onChange: (config: AITransparencyConfig) => void;
  className?: string;
}

export function AITransparencyPanel({ config, onChange, className }: AITransparencyPanelProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          Transparent AI Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="watermark" className="text-xs flex items-center gap-2">
            <Droplets className="h-3.5 w-3.5 text-muted-foreground" />
            Watermark „AI GENERATED"
          </Label>
          <Switch
            id="watermark"
            checked={config.watermarkEnabled}
            onCheckedChange={(v) => onChange({ ...config, watermarkEnabled: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="metadata" className="text-xs flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            Metadane AI w pliku
          </Label>
          <Switch
            id="metadata"
            checked={config.metadataEnabled}
            onCheckedChange={(v) => onChange({ ...config, metadataEnabled: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="badge" className="text-xs flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
            Badge w galerii
          </Label>
          <Switch
            id="badge"
            checked={config.badgeVisible}
            onCheckedChange={(v) => onChange({ ...config, badgeVisible: v })}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 border-t border-border pt-2">
          Tryb Transparent AI automatycznie oznacza materiały wygenerowane przez AI.
          Zgodne z regulacjami EU AI Act.
        </p>
      </CardContent>
    </Card>
  );
}

/** Generate metadata object for AI-rendered content */
export function buildAIMetadata(params: {
  provider: string;
  model: string;
  prompt: string;
  resolution?: string;
  duration?: string;
}) {
  return {
    generator: "ALFA STUDIOX",
    type: "synthetic_media",
    ai_generated: true,
    provider: params.provider,
    model: params.model,
    prompt: params.prompt,
    resolution: params.resolution,
    duration: params.duration,
    created_at: new Date().toISOString(),
    disclaimer: "This content was generated using AI tools and may not represent real events or people.",
  };
}
