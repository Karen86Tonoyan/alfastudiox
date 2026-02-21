import { useState, useCallback } from "react";
import { RenderControlPanel, type RenderSettings } from "@/components/render/RenderControlPanel";
import { RenderHistoryPanel } from "@/components/render/RenderHistoryPanel";
import { RenderQueuePanel } from "@/components/render/RenderQueuePanel";
import { ComfyConnectionBar } from "@/components/render/ComfyConnectionBar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { Monitor, Cpu, Thermometer, HardDrive, Zap, Wifi } from "lucide-react";
import { useComfyUI } from "@/hooks/useComfyUI";
import { buildWorkflow } from "@/lib/workflowBuilder";
import { toast } from "sonner";

function StatusBar({ gpu, isConnected }: { gpu: any; isConnected: boolean }) {
  const temp = gpu?.temp ?? 62;
  const vramUsed = gpu?.vramUsed?.toFixed(1) ?? "8.2";
  const vramTotal = gpu?.vramTotal?.toFixed(0) ?? "16";
  const utilization = gpu?.utilization ?? 78;

  return (
    <div className="flex items-center gap-4 border-b border-border bg-card px-4 py-2">
      <div className="flex items-center gap-2">
        <div className={cn("h-2 w-2 rounded-full animate-pulse", isConnected ? "bg-emerald-400" : "bg-status-ok")} />
        <span className="text-[11px] text-foreground font-medium">
          {isConnected ? "ComfyUI Live" : "System Online"}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Thermometer className="h-3 w-3" />
        <span className="font-mono">{Math.round(temp)}°C</span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Cpu className="h-3 w-3" />
        <span className="font-mono">{vramUsed} / {vramTotal} GB VRAM</span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <HardDrive className="h-3 w-3" />
        <span className="font-mono">GPU {utilization}%</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
          <Zap className="h-2.5 w-2.5 mr-1" /> Queue: 0
        </Badge>
      </div>
    </div>
  );
}

function RenderPreview({
  isRendering,
  progress,
  currentNode,
  lastImage,
}: {
  isRendering: boolean;
  progress: number;
  currentNode: string | null;
  lastImage: string | null;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background border border-border rounded-lg m-3 overflow-hidden">
      {lastImage && !isRendering ? (
        <div className="flex flex-col items-center gap-2 p-4">
          <img
            src={lastImage}
            alt="Render output"
            className="max-h-[400px] max-w-full rounded-lg border border-primary/20 shadow-lg"
          />
          <span className="text-[10px] text-muted-foreground">Last render output</span>
        </div>
      ) : isRendering ? (
        <div className="flex flex-col items-center gap-4">
          <div className="h-48 w-48 rounded-lg border border-primary/30 bg-card flex items-center justify-center gold-glow">
            <div className="text-center">
              <Monitor className="h-12 w-12 text-primary mx-auto mb-2 animate-pulse" />
              <p className="text-sm font-bold text-primary">Rendering...</p>
              <p className="text-xs text-muted-foreground mt-1 font-mono">{progress}%</p>
              {currentNode && (
                <p className="text-[10px] text-primary/60 mt-1 font-mono truncate max-w-[160px]">
                  ▸ {currentNode}
                </p>
              )}
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
  const comfy = useComfyUI();
  const [localProgress, setLocalProgress] = useState(0);
  const [localRendering, setLocalRendering] = useState(false);

  const isRendering = comfy.isRendering || localRendering;
  const progress = comfy.isRendering
    ? comfy.progress?.percentage ?? 0
    : localProgress;

  const handleRender = useCallback(async (settings: RenderSettings) => {
    if (comfy.isConnected) {
      // Real ComfyUI render
      const workflow = buildWorkflow(settings);
      toast.info("Sending workflow to ComfyUI...");
      const promptId = await comfy.queuePrompt(workflow);
      if (promptId) {
        toast.success(`Queued: ${promptId.slice(0, 8)}...`);
      } else {
        toast.error("Failed to queue prompt — check GPU safety / connection");
      }
    } else {
      // Local simulation
      setLocalRendering(true);
      setLocalProgress(0);
      const interval = setInterval(() => {
        setLocalProgress((p) => {
          if (p >= 100) {
            clearInterval(interval);
            setLocalRendering(false);
            return 0;
          }
          return p + 2;
        });
      }, 100);
    }
  }, [comfy.isConnected, comfy.queuePrompt]);

  const handleCancel = useCallback(async () => {
    if (comfy.isConnected) {
      await comfy.cancelRender();
      toast.info("Render cancelled");
    }
  }, [comfy.isConnected, comfy.cancelRender]);

  return (
    <div className="flex flex-col h-full -m-4">
      <ComfyConnectionBar
        status={comfy.status}
        queueSize={comfy.queueSize}
        currentNode={comfy.currentNode}
        onConnect={(url) => comfy.connect(url)}
        onDisconnect={() => comfy.disconnect()}
      />
      <StatusBar gpu={comfy.gpu} isConnected={comfy.isConnected} />

      <ResizablePanelGroup direction="vertical" className="flex-1">
        <ResizablePanel defaultSize={65} minSize={30}>
          <div className="flex h-full overflow-hidden">
            <div className="w-[380px] border-r border-border flex flex-col overflow-hidden">
              <RenderControlPanel
                className="flex-1 overflow-hidden"
                onRender={handleRender}
                isComfyConnected={comfy.isConnected}
                isComfyRendering={isRendering}
                onCancelRender={handleCancel}
              />
            </div>

            <RenderPreview
              isRendering={isRendering}
              progress={progress}
              currentNode={comfy.currentNode}
              lastImage={comfy.lastImage}
            />

            <div className="w-[340px] border-l border-border flex flex-col overflow-hidden">
              <RenderHistoryPanel className="flex-1 overflow-hidden" />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={35} minSize={15} maxSize={55}>
          <RenderQueuePanel className="h-full" />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
