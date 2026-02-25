import { Wifi, WifiOff, Play, Square, Settings, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useComfyUI } from "@/hooks/useComfyUI";
import { comfyApi } from "@/lib/comfyApi";

export function TopBar() {
  const comfy = useComfyUI();
  const [editing, setEditing] = useState(false);
  const [urlDraft, setUrlDraft] = useState(comfyApi.baseUrl);

  const handleSaveUrl = () => {
    const trimmed = urlDraft.trim();
    if (trimmed && trimmed !== comfyApi.baseUrl) {
      comfy.disconnect();
      comfyApi.baseUrl = trimmed;
      setTimeout(() => comfy.connect(), 200);
    }
    setEditing(false);
  };

  return (
    <header className="flex h-10 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className={comfy.isConnected
            ? "border-status-ok/50 text-status-ok text-[10px]"
            : "border-destructive/50 text-destructive text-[10px]"
          }
        >
          {comfy.isConnected ? (
            <Wifi className="mr-1 h-2.5 w-2.5" />
          ) : (
            <WifiOff className="mr-1 h-2.5 w-2.5" />
          )}
          {comfy.isConnected ? "Connected" : "Disconnected"}
        </Badge>

        {editing ? (
          <div className="flex items-center gap-1">
            <Input
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveUrl()}
              className="h-6 w-48 text-[10px] font-mono bg-background border-border px-2"
              placeholder="host:port"
              autoFocus
            />
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleSaveUrl}>
              <Check className="h-3 w-3 text-primary" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => { setUrlDraft(comfyApi.baseUrl); setEditing(true); }}
            className="text-[10px] text-muted-foreground font-mono hover:text-primary transition-colors"
            title="Kliknij aby zmienić adres serwera"
          >
            {comfyApi.baseUrl}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
          <Settings className="h-3.5 w-3.5" />
        </Button>
        {comfy.isRendering ? (
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-[10px] px-3"
            onClick={comfy.cancelRender}
          >
            <Square className="mr-1 h-3 w-3" /> Stop
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-7 text-[10px] px-3 gold-gradient text-primary-foreground font-semibold"
          >
            <Play className="mr-1 h-3 w-3" /> Run Queue
          </Button>
        )}
      </div>
    </header>
  );
}
