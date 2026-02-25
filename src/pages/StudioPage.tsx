import { useState, useCallback, useRef, useEffect } from "react";
import { useComfyUI } from "@/hooks/useComfyUI";
import { useComfyModels } from "@/hooks/useComfyModels";
import { useComfySamplers } from "@/hooks/useComfySamplers";
import { buildPhotoSessionWorkflow, DEFAULT_SESSION_CONFIG, type PhotoSessionConfig } from "@/lib/photoSessionWorkflow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Camera, MapPin, User, ShoppingBag, Play, Square,
  Upload, X, Cpu, Thermometer, HardDrive, Sparkles,
  Eye, Scan, Layers, Wand2, Maximize, Brain, RefreshCw, Box
} from "lucide-react";
import { ImageUploadZone } from "@/components/studio/ImageUploadZone";
import { PoseSelector } from "@/components/studio/PoseSelector";
import { LayerToggles } from "@/components/studio/LayerToggles";
import { ModelSelectors } from "@/components/studio/ModelSelectors";
import { SessionPresets, type SessionPreset } from "@/components/studio/SessionPresets";

export default function StudioPage() {
  const comfy = useComfyUI();
  const { models, loading: modelsLoading, refetch: refetchModels } = useComfyModels();
  const { options: samplerOptions } = useComfySamplers();
  const [config, setConfig] = useState<PhotoSessionConfig>(DEFAULT_SESSION_CONFIG);

  const [locationFile, setLocationFile] = useState<File | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const handlePresetSelect = useCallback((preset: SessionPreset) => {
    setConfig((prev) => ({
      ...prev,
      ...preset.config,
      // keep model selections from ComfyUI
      checkpoint: prev.checkpoint,
      vae: prev.vae,
      lora: prev.lora,
      controlnet: prev.controlnet,
      upscaler: prev.upscaler,
    }));
    setActivePreset(preset.id);
    toast.success(`Preset: ${preset.name}`);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (!comfy.isConnected) {
      comfy.connect();
    }
  }, []);

  const updateLayer = useCallback((key: keyof PhotoSessionConfig["layers"], val: boolean) => {
    setConfig((prev) => ({ ...prev, layers: { ...prev.layers, [key]: val } }));
  }, []);

  const uploadToComfy = async (file: File): Promise<string | null> => {
    try {
      const form = new FormData();
      form.append("image", file);
      const { comfyApi } = await import("@/lib/comfyApi");
      const res = await fetch(`http://${comfyApi.baseUrl}/upload/image`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      return data.name || null;
    } catch {
      return null;
    }
  };

  const handleGenerate = async () => {
    if (!comfy.isConnected) {
      toast.error("ComfyUI nie jest połączony");
      return;
    }

    toast.info("Przesyłanie obrazów...");

    const [locName, modName, prodName] = await Promise.all([
      locationFile ? uploadToComfy(locationFile) : null,
      modelFile ? uploadToComfy(modelFile) : null,
      productFile ? uploadToComfy(productFile) : null,
    ]);

    const finalConfig: PhotoSessionConfig = {
      ...config,
      locationImage: locName,
      modelImage: modName,
      productImage: prodName,
      seed: config.seed === -1 ? Math.floor(Math.random() * 2147483647) : config.seed,
    };

    const workflow = buildPhotoSessionWorkflow(finalConfig);

    toast.info("Wysyłanie do ComfyUI...");
    const promptId = await comfy.queuePrompt(workflow);

    if (promptId) {
      toast.success("Sesja w kolejce!");
    } else {
      toast.error("Nie udało się dodać do kolejki");
    }
  };

  const handleCancel = () => {
    comfy.cancelRender();
    toast.info("Anulowano render");
  };

  const hasAnyImage = locationFile || modelFile || productFile;
  const activeLayers = Object.values(config.layers).filter(Boolean).length;

  return (
    <div className="flex h-full">
      {/* ── Left: Controls ── */}
      <div className="w-[420px] flex flex-col border-r border-border bg-background overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Camera className="h-5 w-5 text-primary" />
          <h1 className="text-sm font-bold tracking-wider text-primary uppercase">Photo Studio</h1>
          <Badge variant="outline" className="ml-auto text-[9px] border-primary/30 text-primary">
            {activeLayers} warstw
          </Badge>
        </div>

        <div className="flex-1 space-y-6 p-5">
          {/* ── Uploads ── */}
          <div className="grid grid-cols-3 gap-3">
            <ImageUploadZone label="Miejsce" icon={MapPin} file={locationFile} onUpload={setLocationFile} onClear={() => setLocationFile(null)} />
            <ImageUploadZone label="Modelka" icon={User} file={modelFile} onUpload={setModelFile} onClear={() => setModelFile(null)} />
            <ImageUploadZone label="Produkt" icon={ShoppingBag} file={productFile} onUpload={setProductFile} onClear={() => setProductFile(null)} />
          </div>

          <div className="h-px bg-border" />

          {/* ── Presets ── */}
          <SessionPresets activePreset={activePreset} gpu={comfy.gpu} onSelect={handlePresetSelect} />

          <div className="h-px bg-border" />

          {/* ── Model Selectors (from ComfyUI) ── */}
          <ModelSelectors
            models={models}
            loading={modelsLoading}
            config={config}
            onConfigChange={setConfig}
            onRefetch={refetchModels}
          />

          <div className="h-px bg-border" />

          {/* ── Pose ── */}
          <PoseSelector value={config.pose} onChange={(pose) => setConfig((prev) => ({ ...prev, pose }))} />

          <div className="h-px bg-border" />

          {/* ── Layers ── */}
          <LayerToggles layers={config.layers} onToggle={updateLayer} />

          <div className="h-px bg-border" />

          {/* ── Resolution + Steps ── */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Parametry
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground">Rozdzielczość</span>
                <Select
                  value={`${config.width}x${config.height}`}
                  onValueChange={(v) => {
                    const [w, h] = v.split("x").map(Number);
                    setConfig((prev) => ({ ...prev, width: w, height: h }));
                  }}
                >
                  <SelectTrigger className="h-8 bg-card border-border text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1024x1536" className="text-xs font-mono">1024×1536 (2:3)</SelectItem>
                    <SelectItem value="1344x768" className="text-xs font-mono">1344×768 (16:9)</SelectItem>
                    <SelectItem value="1024x1024" className="text-xs font-mono">1024×1024 (1:1)</SelectItem>
                    <SelectItem value="768x1344" className="text-xs font-mono">768×1344 (9:16)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[10px] text-muted-foreground">Steps</span>
                  <span className="text-[10px] font-mono text-primary">{config.steps}</span>
                </div>
                <Slider
                  value={[config.steps]}
                  onValueChange={([v]) => setConfig((prev) => ({ ...prev, steps: v }))}
                  min={10} max={50} step={1}
                  className="py-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground">Sampler</span>
                <Select
                  value={config.sampler || "dpmpp_2m"}
                  onValueChange={(v) => setConfig((prev) => ({ ...prev, sampler: v }))}
                >
                  <SelectTrigger className="h-8 bg-card border-border text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(samplerOptions.samplers.length > 0
                      ? samplerOptions.samplers
                      : ["euler", "euler_ancestral", "dpmpp_2m", "dpmpp_2m_sde", "dpmpp_3m_sde", "ddim", "uni_pc"]
                    ).map((s) => (
                      <SelectItem key={s} value={s} className="text-xs font-mono">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground">Scheduler</span>
                <Select
                  value={config.scheduler || "normal"}
                  onValueChange={(v) => setConfig((prev) => ({ ...prev, scheduler: v }))}
                >
                  <SelectTrigger className="h-8 bg-card border-border text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(samplerOptions.schedulers.length > 0
                      ? samplerOptions.schedulers
                      : ["normal", "karras", "exponential", "sgm_uniform", "simple", "ddim_uniform", "beta"]
                    ).map((s) => (
                      <SelectItem key={s} value={s} className="text-xs font-mono">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[10px] text-muted-foreground">CFG Scale</span>
                <span className="text-[10px] font-mono text-primary">{config.cfg}</span>
              </div>
              <Slider
                value={[config.cfg]}
                onValueChange={([v]) => setConfig((prev) => ({ ...prev, cfg: v }))}
                min={1} max={10} step={0.5}
                className="py-1"
              />
            </div>
          </div>
        </div>

        {/* ── GPU Status + Generate ── */}
        <div className="border-t border-border p-4 space-y-3">
          {comfy.gpu && (
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <Cpu className="h-3 w-3" />
              <span className="font-mono">{comfy.gpu.name.slice(0, 20)}</span>
              <span className="ml-auto flex items-center gap-1">
                <Thermometer className="h-3 w-3" />
                {comfy.gpu.temp}°C
              </span>
              <span className="flex items-center gap-1">
                <HardDrive className="h-3 w-3" />
                {comfy.gpu.vramUsed.toFixed(1)}/{comfy.gpu.vramTotal.toFixed(1)}GB
              </span>
            </div>
          )}

          {comfy.isRendering && comfy.progress && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Rendering...</span>
                <span className="font-mono text-primary">{comfy.progress.percentage}%</span>
              </div>
              <Progress value={comfy.progress.percentage} className="h-1.5" />
            </div>
          )}

          <div className="flex items-center gap-2 text-[10px]">
            <div className={cn(
              "h-2 w-2 rounded-full",
              comfy.isConnected ? "bg-[hsl(var(--status-ok))]" : "bg-destructive"
            )} />
            <span className="text-muted-foreground">
              {comfy.isConnected ? "ComfyUI połączony" : "ComfyUI rozłączony"}
            </span>
            {!comfy.isConnected && (
              <button onClick={() => comfy.connect()} className="ml-auto text-primary text-[10px] hover:underline">
                Połącz
              </button>
            )}
          </div>

          <Button
            onClick={comfy.isRendering ? handleCancel : handleGenerate}
            disabled={!comfy.isRendering && !hasAnyImage}
            className={cn(
              "w-full h-12 gap-2 text-sm font-bold uppercase tracking-wider transition-all",
              comfy.isRendering
                ? "bg-destructive text-destructive-foreground"
                : "gold-gradient text-primary-foreground hover:opacity-90 gold-glow"
            )}
          >
            {comfy.isRendering ? (
              <><Square className="h-4 w-4" /> Anuluj</>
            ) : (
              <><Play className="h-4 w-4" /> Generuj Sesję</>
            )}
          </Button>
        </div>
      </div>

      {/* ── Right: Preview ── */}
      <div className="flex-1 flex items-center justify-center bg-card/30 p-8">
        {comfy.lastImage ? (
          <div className="relative max-w-full max-h-full">
            <img
              src={comfy.lastImage}
              alt="Result"
              className="max-w-full max-h-[calc(100vh-8rem)] object-contain rounded-lg border border-border shadow-2xl"
            />
            <Badge className="absolute top-3 right-3 bg-black/60 text-white border-0 text-[10px]">
              {config.width}×{config.height}
            </Badge>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-muted p-6">
              <Sparkles className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Photo Studio</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Dodaj zdjęcia, wybierz pozę, kliknij „Generuj Sesję"
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              {["Miejsce", "Modelka", "Produkt"].map((label, i) => (
                <Badge
                  key={label}
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    [locationFile, modelFile, productFile][i]
                      ? "border-primary/40 text-primary"
                      : "border-border text-muted-foreground"
                  )}
                >
                  {[locationFile, modelFile, productFile][i] ? "✓" : "○"} {label}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
