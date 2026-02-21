import { Wifi, WifiOff, Play, Square, Settings } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function TopBar() {
  const [connected] = useState(true);
  const [running, setRunning] = useState(false);

  return (
    <header className="flex h-10 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className={connected
            ? "border-status-ok/50 text-status-ok text-[10px]"
            : "border-destructive/50 text-destructive text-[10px]"
          }
        >
          {connected ? (
            <Wifi className="mr-1 h-2.5 w-2.5" />
          ) : (
            <WifiOff className="mr-1 h-2.5 w-2.5" />
          )}
          {connected ? "Connected" : "Disconnected"}
        </Badge>
        <span className="text-[10px] text-muted-foreground font-mono">localhost:8188</span>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
          <Settings className="h-3.5 w-3.5" />
        </Button>
        {running ? (
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-[10px] px-3"
            onClick={() => setRunning(false)}
          >
            <Square className="mr-1 h-3 w-3" /> Stop
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-7 text-[10px] px-3 gold-gradient text-primary-foreground font-semibold"
            onClick={() => setRunning(true)}
          >
            <Play className="mr-1 h-3 w-3" /> Run Queue
          </Button>
        )}
      </div>
    </header>
  );
}
