import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Server, Cloud, Wifi, WifiOff, ChevronDown
} from "lucide-react";
import { loadProviders, getProviderModels, type ProviderType, type ProviderConfig } from "@/lib/cloudProviders";

export type RenderBackend =
  | { type: "local" }
  | { type: "cloud"; provider: ProviderType; model: string };

interface RenderBackendSwitcherProps {
  backend: RenderBackend;
  onBackendChange: (backend: RenderBackend) => void;
  isComfyConnected: boolean;
  className?: string;
}

export function RenderBackendSwitcher({
  backend,
  onBackendChange,
  isComfyConnected,
  className,
}: RenderBackendSwitcherProps) {
  const providers = loadProviders().filter((p) => p.enabled && p.status === "connected");
  const allProviders = loadProviders().filter((p) => p.enabled);

  const activeProvider =
    backend.type === "cloud"
      ? allProviders.find((p) => p.id === backend.provider)
      : null;

  const models =
    backend.type === "cloud" ? getProviderModels(backend.provider) : [];

  return (
    <div className={cn("flex items-center gap-2 px-3 py-1.5 border-b border-border bg-secondary/30", className)}>
      <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Backend:</span>

      {/* Local ComfyUI button */}
      <Button
        size="sm"
        variant={backend.type === "local" ? "default" : "outline"}
        className={cn(
          "h-6 px-2 text-[10px] gap-1",
          backend.type === "local"
            ? "bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30"
            : "border-border text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onBackendChange({ type: "local" })}
      >
        <Server className="h-3 w-3" />
        ComfyUI
        {isComfyConnected ? (
          <div className="h-1.5 w-1.5 rounded-full bg-status-ok" />
        ) : (
          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
        )}
      </Button>

      {/* Cloud provider buttons */}
      {allProviders.map((provider) => {
        const isActive = backend.type === "cloud" && backend.provider === provider.id;
        const providerModels = getProviderModels(provider.id);
        return (
          <Button
            key={provider.id}
            size="sm"
            variant={isActive ? "default" : "outline"}
            className={cn(
              "h-6 px-2 text-[10px] gap-1",
              isActive
                ? "bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
            onClick={() =>
              onBackendChange({
                type: "cloud",
                provider: provider.id,
                model: providerModels[0]?.id ?? "",
              })
            }
          >
            <Cloud className="h-3 w-3" />
            {provider.name}
            {provider.status === "connected" ? (
              <div className="h-1.5 w-1.5 rounded-full bg-status-ok" />
            ) : (
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            )}
          </Button>
        );
      })}

      {/* Model selector for cloud backend */}
      {backend.type === "cloud" && models.length > 0 && (
        <Select
          value={backend.model}
          onValueChange={(v) =>
            onBackendChange({ type: "cloud", provider: backend.provider, model: v })
          }
        >
          <SelectTrigger className="h-6 w-[180px] text-[10px] bg-background border-border">
            <SelectValue placeholder="Model..." />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-[10px]">
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Status info */}
      <div className="ml-auto">
        {backend.type === "local" ? (
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] gap-1",
              isComfyConnected
                ? "border-status-ok/30 text-status-ok"
                : "border-border text-muted-foreground"
            )}
          >
            {isComfyConnected ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
            {isComfyConnected ? "WebSocket Live" : "Offline"}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] gap-1",
              activeProvider?.status === "connected"
                ? "border-status-ok/30 text-status-ok"
                : "border-status-warn/30 text-status-warn"
            )}
          >
            <Cloud className="h-2.5 w-2.5" />
            {activeProvider?.status === "connected" ? "API Ready" : "Skonfiguruj klucz API"}
          </Badge>
        )}
      </div>
    </div>
  );
}
