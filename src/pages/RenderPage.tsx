import { useState } from "react";
import { RenderControlPanel, type RenderSettings } from "@/components/render/RenderControlPanel";
import { RenderHistoryPanel } from "@/components/render/RenderHistoryPanel";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Monitor, Cpu, Thermometer, HardDrive, Zap } from "lucide-react";

function StatusBar() {
  return (
    <div className="flex items-center gap-4 border-b border-border bg-card px-4 py-2">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-status-ok animate-pulse" />
        <span className="text-[11px] text-foreground font-medium">System Online</span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Thermometer className="h-3 w-3" />
        <span className="font-mono">62°C</span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Cpu className="h-3 w-3" />
        <span className="font-mono">8.2 / 16 GB VRAM</span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <HardDrive className="h-3 w-3" />
        <span className="font-mono">GPU 78%</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
          <Zap className="h-2.5 w-2.5 mr-1" /> Queue: 0
        </Badge>
      </div>
    </div>
  );
}

function RenderPreview({ isRendering, progress }: { isRendering: boolean; progress: number }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background border border-border rounded-lg m-3 overflow-hidden">
      {isRendering ? (
        <div className="flex flex-col items-center gap-4">
          <div className="h-48 w-48 rounded-lg border border-primary/30 bg-card flex items-center justify-center gold-glow">
            <div className="text-center">
              <Monitor className="h-12 w-12 text-primary mx-auto mb-2 animate-pulse" />
              <p className="text-sm font-bold text-primary">Rendering...</p>
              <p className="text-xs text-muted-foreground mt-1 font-mono">{progress}%</p>
            </div>
          </div>
          <Progress value={progress} className="w-48 h-1.5" />
        </div>
      ) : (
        <div className="text-center">
          <div className="h-64 w-64 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
            <div className="text-center">
              <Monitor className="h-16 w-16 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Output Preview</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Configure parameters and hit Generate</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RenderPage() {
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleRender = (settings: RenderSettings) => {
    setIsRendering(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setIsRendering(false);
          return 0;
        }
        return p + 2;
      });
    }, 100);
  };

  return (
    <div className="flex flex-col h-full -m-4">
      <StatusBar />
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Controls */}
        <div className="w-[380px] border-r border-border flex flex-col overflow-hidden">
          <RenderControlPanel className="flex-1 overflow-hidden" onRender={handleRender} />
        </div>

        {/* Center: Preview */}
        <RenderPreview isRendering={isRendering} progress={progress} />

        {/* Right: History */}
        <div className="w-[340px] border-l border-border flex flex-col overflow-hidden">
          <RenderHistoryPanel className="flex-1 overflow-hidden" />
        </div>
      </div>
    </div>
  );
}
