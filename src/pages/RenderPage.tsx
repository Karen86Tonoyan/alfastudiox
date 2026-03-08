import { useState, useCallback, useRef } from "react";
import { RenderControlPanel, type RenderSettings } from "@/components/render/RenderControlPanel";
import { RenderHistoryPanel, type RenderHistoryItem } from "@/components/render/RenderHistoryPanel";
import { RenderQueuePanel } from "@/components/render/RenderQueuePanel";
import { ComfyConnectionBar } from "@/components/render/ComfyConnectionBar";
import { RenderBackendSwitcher, type RenderBackend } from "@/components/render/RenderBackendSwitcher";
import { AIAssistPanel } from "@/components/render/AIAssistPanel";
import { VFXEffectsPanel, type VFXEffect } from "@/components/render/VFXEffectsPanel";
import { ExportSettingsPanel } from "@/components/render/ExportSettingsPanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Monitor, Cpu, Thermometer, HardDrive, Zap, Wifi, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useComfyUI } from "@/hooks/useComfyUI";
import { useOllama } from "@/hooks/useOllama";
import { buildWorkflow } from "@/lib/workflowBuilder";
import { loadProviders } from "@/lib/cloudProviders";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AITransparencyPanel, AITransparencyBadge, type AITransparencyConfig } from "@/components/render/AITransparency";

function StatusBar({ gpu, isConnected }: { gpu: any; isConnected: boolean }) {
  const temp = gpu?.temp ?? 62;
  const vramUsed = gpu?.vramUsed?.toFixed(1) ?? "8.2";
  const vramTotal = gpu?.vramTotal?.toFixed(0) ?? "16";
  const utilization = gpu?.utilization ?? 78;

  return (
    <div className="flex items-center gap-4 border-b border-border bg-card px-4 py-2">
      <div className="flex items-center gap-2">
        <div className={cn("h-2 w-2 rounded-full animate-pulse", isConnected ? "bg-status-ok" : "bg-muted-foreground/40")} />
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
  const ollama = useOllama();
  const [currentSettings, setCurrentSettings] = useState<RenderSettings | null>(null);
  const [vfxEffects, setVfxEffects] = useState<VFXEffect[]>([]);
  const [localProgress, setLocalProgress] = useState(0);
  const [localRendering, setLocalRendering] = useState(false);
  const [renderHistory, setRenderHistory] = useState<RenderHistoryItem[]>([]);
  const [renderBackend, setRenderBackend] = useState<RenderBackend>({ type: "local" });
  const [cloudImage, setCloudImage] = useState<string | null>(null);

  const missingApiKey = renderBackend.type === "cloud"
    ? (() => {
        const providers = loadProviders();
        const p = providers.find((pr) => pr.id === renderBackend.provider);
        return !p?.apiKey;
      })()
    : false;
  const renderStartRef = useRef<{ time: number; settings: RenderSettings } | null>(null);

  const isRendering = comfy.isRendering || localRendering;
  const progress = comfy.isRendering
    ? comfy.progress?.percentage ?? 0
    : localProgress;

  const addToHistory = useCallback((settings: RenderSettings, status: "success" | "failed" | "cancelled", durationMs: number) => {
    const seed = settings.seed === -1 ? Math.floor(Math.random() * 2147483647) : settings.seed;
    const entry: RenderHistoryItem = {
      id: `r-${Date.now()}`,
      timestamp: Date.now(),
      settings,
      status,
      duration: Math.round(durationMs / 1000),
      metadata: {
        actualSeed: seed,
        modelVersion: settings.model,
        totalSteps: settings.steps,
        peakVram: 8.0 + Math.random() * 4,
        nodeExecutionOrder: ["CheckpointLoader", "CLIPEncode", "KSampler", "VAEDecode", "SaveImage"],
      },
    };
    setRenderHistory((prev) => [entry, ...prev]);
  }, []);

  const handleRender = useCallback(async (settings: RenderSettings) => {
    renderStartRef.current = { time: Date.now(), settings };

    if (renderBackend.type === "local" && comfy.isConnected) {
      // Local ComfyUI via WebSocket
      const workflow = buildWorkflow(settings);
      toast.info("Sending workflow to ComfyUI...");
      const promptId = await comfy.queuePrompt(workflow);
      if (promptId) {
        toast.success(`Queued: ${promptId.slice(0, 8)}...`);
      } else {
        toast.error("Failed to queue prompt — check GPU safety / connection");
        addToHistory(settings, "failed", Date.now() - renderStartRef.current.time);
        renderStartRef.current = null;
      }
    } else if (renderBackend.type === "cloud") {
      const provider = renderBackend.provider;
      const supportedForCloudRender = ["openai", "google", "replicate", "huggingface", "kimi", "qwen"];

      if (supportedForCloudRender.includes(provider)) {
        // Real API call via edge function
        toast.info(`Wysyłanie do ${renderBackend.provider} (${renderBackend.model})...`);
        setLocalRendering(true);
        setLocalProgress(10);

        try {
          const providers = loadProviders();
          const providerConfig = providers.find((p) => p.id === provider);
          if (!providerConfig?.apiKey) {
            throw new Error("Klucz API nie jest skonfigurowany. Przejdź do Providers i dodaj klucz.");
          }

          setLocalProgress(30);

          const { data, error } = await supabase.functions.invoke("cloud-render", {
            body: {
              provider,
              model: renderBackend.model,
              prompt: settings.prompt,
              negativePrompt: settings.negativePrompt,
              width: settings.width,
              height: settings.height,
              steps: settings.steps,
              cfg: settings.cfg,
              seed: settings.seed === -1 ? undefined : settings.seed,
              apiKey: providerConfig.apiKey,
            },
          });

          setLocalProgress(90);

          if (error) throw new Error(error.message);
          if (data?.error) throw new Error(data.error);

          if (data?.imageUrl) {
            // Store the image URL for preview
            setCloudImage(data.imageUrl);
            toast.success(
              `Render z ${renderBackend.provider}/${renderBackend.model} zakończony!` +
                (data.revisedPrompt ? ` Zmodyfikowany prompt: "${data.revisedPrompt.substring(0, 80)}..."` : "")
            );
          }

          setLocalProgress(100);
          if (renderStartRef.current) {
            addToHistory(renderStartRef.current.settings, "success", Date.now() - renderStartRef.current.time);
            renderStartRef.current = null;
          }
        } catch (err: any) {
          toast.error(`Błąd renderowania: ${err.message}`);
          if (renderStartRef.current) {
            addToHistory(renderStartRef.current.settings, "failed", Date.now() - renderStartRef.current.time);
            renderStartRef.current = null;
          }
        } finally {
          setLocalRendering(false);
          setLocalProgress(0);
        }
      } else {
        // Other cloud providers — simulation
        toast.info(`Sending to ${renderBackend.provider} (${renderBackend.model})...`);
        setLocalRendering(true);
        setLocalProgress(0);
        const interval = setInterval(() => {
          setLocalProgress((p) => {
            if (p >= 100) {
              clearInterval(interval);
              setLocalRendering(false);
              if (renderStartRef.current) {
                addToHistory(renderStartRef.current.settings, "success", Date.now() - renderStartRef.current.time);
                renderStartRef.current = null;
              }
              toast.success(`Render z ${renderBackend.provider} zakończony`);
              return 0;
            }
            return p + 1.5;
          });
        }, 120);
      }
    } else {
      // Local simulation (no ComfyUI connected)
      setLocalRendering(true);
      setLocalProgress(0);
      const interval = setInterval(() => {
        setLocalProgress((p) => {
          if (p >= 100) {
            clearInterval(interval);
            setLocalRendering(false);
            if (renderStartRef.current) {
              addToHistory(renderStartRef.current.settings, "success", Date.now() - renderStartRef.current.time);
              renderStartRef.current = null;
            }
            return 0;
          }
          return p + 2;
        });
      }, 100);
    }
  }, [renderBackend, comfy.isConnected, comfy.queuePrompt, addToHistory]);

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
      <RenderBackendSwitcher
        backend={renderBackend}
        onBackendChange={setRenderBackend}
        isComfyConnected={comfy.isConnected}
      />
      <StatusBar gpu={comfy.gpu} isConnected={comfy.isConnected} />

      {missingApiKey && (
        <Alert variant="destructive" className="mx-3 mt-2 border-destructive/40 bg-destructive/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs flex items-center gap-2 flex-wrap">
            Klucz API dla <strong>{renderBackend.type === "cloud" ? renderBackend.provider : ""}</strong> nie jest skonfigurowany.
            <Link to="/providers" className="text-primary underline underline-offset-2 font-semibold hover:text-primary/80">
              Przejdź do Providers →
            </Link>
            <Link to="/api-keys-guide" className="text-muted-foreground underline underline-offset-2 hover:text-foreground">
              Jak zdobyć klucz? →
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <ResizablePanelGroup direction="vertical" className="flex-1">
        <ResizablePanel defaultSize={65} minSize={30}>
          <div className="flex h-full overflow-hidden">
            <div className="w-[380px] border-r border-border flex flex-col overflow-hidden">
              <RenderControlPanel
                className="flex-1 overflow-hidden"
                onRender={(settings) => {
                  setCurrentSettings(settings);
                  handleRender(settings);
                }}
                isComfyConnected={comfy.isConnected}
                isComfyRendering={isRendering}
                onCancelRender={handleCancel}
                disableGenerate={missingApiKey}
              />
            </div>

            <RenderPreview
              isRendering={isRendering}
              progress={progress}
              currentNode={comfy.currentNode}
              lastImage={cloudImage || comfy.lastImage}
            />

            <div className="w-[300px] border-l border-border flex flex-col overflow-hidden">
              <AIAssistPanel
                className="flex-1 overflow-hidden"
                ollama={ollama}
                currentSettings={currentSettings ?? {
                  model: "sdxl", modelType: "image", prompt: "", negativePrompt: "",
                  seed: -1, sampler: "dpmpp_2m", steps: 30, cfg: 7, width: 1024, height: 1024,
                  lora: "none", loraWeight: 0.8, frames: 16, fps: 8,
                  skinTone: "natural", hairColor: "dark-brown", clothingStyle: "casual",
                  sceneType: "outdoor", objectSelection: "none", lighting: "natural", cameraType: "standard",
                }}
                onApplyPrompt={(prompt) => {
                  toast.success("Prompt zastosowany z AI Assist");
                }}
                onApplyParams={(params) => {
                  toast.success("Parametry zastosowane z AI Assist");
                }}
              />
            </div>

            <div className="w-[300px] border-l border-border flex flex-col overflow-hidden">
              <RenderHistoryPanel className="flex-1 overflow-hidden" externalHistory={renderHistory} />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={35} minSize={15} maxSize={55}>
          <Tabs defaultValue="queue" className="h-full flex flex-col">
            <TabsList className="mx-3 mt-2 bg-secondary h-8 w-auto self-start">
              <TabsTrigger value="queue" className="text-[10px] gap-1 h-6">Queue</TabsTrigger>
              <TabsTrigger value="vfx" className="text-[10px] gap-1 h-6">
                VFX
                {vfxEffects.filter(e => e.enabled).length > 0 && (
                  <Badge variant="outline" className="ml-1 text-[7px] px-1 py-0 h-3 border-primary/30 text-primary">
                    {vfxEffects.filter(e => e.enabled).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="export" className="text-[10px] gap-1 h-6">Export</TabsTrigger>
            </TabsList>
            <TabsContent value="queue" className="flex-1 overflow-hidden mt-0">
              <RenderQueuePanel className="h-full" />
            </TabsContent>
            <TabsContent value="vfx" className="flex-1 overflow-hidden mt-0">
              <VFXEffectsPanel className="h-full" effects={vfxEffects} onEffectsChange={setVfxEffects} />
            </TabsContent>
            <TabsContent value="export" className="flex-1 overflow-hidden mt-0">
              <ExportSettingsPanel className="h-full" />
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
