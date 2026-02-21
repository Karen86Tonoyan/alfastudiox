import { Wifi, WifiOff, Play, Square } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function TopBar() {
  const [connected] = useState(true);
  const [running, setRunning] = useState(false);

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className={connected
            ? "border-status-ok text-status-ok"
            : "border-status-danger text-status-danger"
          }
        >
          {connected ? (
            <Wifi className="mr-1 h-3 w-3" />
          ) : (
            <WifiOff className="mr-1 h-3 w-3" />
          )}
          {connected ? "Połączono" : "Rozłączono"}
        </Badge>
        <span className="text-xs text-muted-foreground">localhost:8188</span>
      </div>

      <div className="flex items-center gap-2">
        {running ? (
          <Button size="sm" variant="destructive" onClick={() => setRunning(false)}>
            <Square className="mr-1 h-3 w-3" />
            Zatrzymaj
          </Button>
        ) : (
          <Button size="sm" onClick={() => setRunning(true)}>
            <Play className="mr-1 h-3 w-3" />
            Uruchom
          </Button>
        )}
      </div>
    </header>
  );
}
