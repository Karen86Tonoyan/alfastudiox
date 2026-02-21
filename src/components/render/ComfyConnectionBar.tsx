import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Loader2, Server, X } from "lucide-react";
import type { ComfyStatus } from "@/lib/comfyApi";

interface ComfyConnectionBarProps {
  status: ComfyStatus;
  queueSize: number;
  currentNode: string | null;
  onConnect: (url?: string) => void;
  onDisconnect: () => void;
}

const statusDisplay: Record<ComfyStatus, { label: string; icon: React.ReactNode; className: string }> = {
  connected: {
    label: "Connected",
    icon: <Wifi className="h-3 w-3" />,
    className: "text-emerald-400 border-emerald-500/40",
  },
  connecting: {
    label: "Connecting...",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    className: "text-amber-400 border-amber-500/40",
  },
  disconnected: {
    label: "Disconnected",
    icon: <WifiOff className="h-3 w-3" />,
    className: "text-muted-foreground border-border",
  },
  error: {
    label: "Error",
    icon: <WifiOff className="h-3 w-3" />,
    className: "text-red-400 border-red-500/40",
  },
};

export function ComfyConnectionBar({
  status,
  queueSize,
  currentNode,
  onConnect,
  onDisconnect,
}: ComfyConnectionBarProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [serverUrl, setServerUrl] = useState("localhost:8188");

  const display = statusDisplay[status];

  return (
    <div className="flex items-center gap-3 border-b border-border bg-secondary/20 px-4 py-1.5">
      <Server className="h-3.5 w-3.5 text-primary" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ComfyUI</span>

      <Badge variant="outline" className={cn("text-[10px] gap-1", display.className)}>
        {display.icon} {display.label}
      </Badge>

      {status === "connected" && queueSize > 0 && (
        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary font-mono">
          Queue: {queueSize}
        </Badge>
      )}

      {status === "connected" && currentNode && (
        <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">
          ▸ {currentNode}
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">
        {showSettings && (
          <div className="flex items-center gap-1.5">
            <Input
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="localhost:8188"
              className="h-6 w-44 text-[10px] font-mono bg-card border-border px-2"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px]"
              onClick={() => { setShowSettings(false); }}
            >
              <X className="h-2.5 w-2.5" />
            </Button>
          </div>
        )}

        {status === "connected" ? (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px] gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
            onClick={onDisconnect}
          >
            <WifiOff className="h-2.5 w-2.5" /> Disconnect
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] text-muted-foreground"
              onClick={() => setShowSettings(!showSettings)}
            >
              ⚙
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px] gap-1 border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => onConnect(serverUrl)}
            >
              <Wifi className="h-2.5 w-2.5" /> Connect
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
