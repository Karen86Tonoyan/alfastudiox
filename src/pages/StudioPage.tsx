import { useState, useCallback, useRef } from "react";
import { useComfyUI } from "@/hooks/useComfyUI";
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
  Eye, Scan, Layers, Wand2, Maximize, Brain
} from "lucide-react";

const POSES = [
  { id: "standing-front", label: "Stojąca – front", icon: "🧍" },
  { id: "standing-side", label: "Stojąca – 3/4", icon: "🧍‍♀️" },
  { id: "sitting", label: "Siedząca", icon: "🪑" },
  { id: "walking", label: "W ruchu", icon: "🚶" },
  { id: "closeup", label: "Close-up", icon: "👤" },
  { id: "action", label: "Dynamiczna", icon: "⚡" },
  { id: "editorial", label: "Editorial", icon: "📸" },
  { id: "casual", label: "Casual", icon: "😊" },
];

const LAYER_CONFIG = [
  { key: "janusPrompt" as const, label: "Janus Prompt", icon: Brain, desc: "Auto-opis z Janus-Pro 7B" },
  { key: "pulid" as const, label: "PuLID", icon: User, desc: "Spójność twarzy" },
  { key: "ipAdapter" as const, label: "IPAdapter", icon: Layers, desc: "Styl + produkt ref" },
  { key: "depth" as const, label: "Depth", icon: Scan, desc: "DepthAnythingV2" },
  { key: "openPose" as const, label: "OpenPose", icon: Eye, desc: "Kontrola pozy" },
  { key: "supir" as const, label: "SUPIR", icon: Maximize, desc: "Upscale + face restore" },
];

function ImageUploadZone({
  label,
  icon: Icon,
  file,
  onUpload,
  onClear,
}: {
  label: string;
  icon: React.ElementType;
  file: File | null;
  onUpload: (f: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = file ? URL.createObjectURL(file) : null;

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div
        onClick={() => !file && inputRef.current?.click()}
        className={cn(
          "relative group flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all cursor-pointer overflow-hidden",
          "w-full aspect-[3/4]",
          file
            ? "border-primary/40 bg-primary/5"
            : "border-border hover:border-primary/30 hover:bg-card"
        )}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="rounded-full bg-destructive p-2 text-destructive-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Badge className="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] border-0">
              {file.name.slice(0, 20)}
            </Badge>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 p-4">
            <div className="rounded-full bg-muted p-3">
              <Icon className="h-6 w-6 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">Kliknij aby dodać</span>
            <Upload className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default function StudioPage() {
  const comfy = useComfyUI();
  const [config, setConfig] = useState<PhotoSessionConfig>(DEFAULT_SESSION_CONFIG);

  const [locationFile, setLocationFile] = useState<File | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);

  const [resultImage, setResultImage] = useState<string | null>(null);

  const updateLayer = useCallback((key: keyof PhotoSessionConfig["layers"], val: boolean) => {
    setConfig((prev) => ({ ...prev, layers: { ...prev.layers, [key]: val } }));
  }, []);

  const uploadToComfy = async (file: File): Promise<string | null> => {
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch(`http://localhost:8188/upload/image`, {
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

    // Upload images to ComfyUI
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
            <ImageUploadZone
              label="Miejsce"
              icon={MapPin}
              file={locationFile}
              onUpload={setLocationFile}
              onClear={() => setLocationFile(null)}
            />
            <ImageUploadZone
              label="Modelka"
              icon={User}
              file={modelFile}
              onUpload={setModelFile}
              onClear={() => setModelFile(null)}
            />
            <ImageUploadZone
              label="Produkt"
              icon={ShoppingBag}
              file={productFile}
              onUpload={setProductFile}
              onClear={() => setProductFile(null)}
            />
          </div>

          <div className="h-px bg-border" />

          {/* ── Pose ── */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Poza
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {POSES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setConfig((prev) => ({ ...prev, pose: p.id }))}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-[10px] font-medium transition-all",
                    config.pose === p.id
                      ? "border-primary/50 bg-primary/10 text-primary gold-glow"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  <span className="text-lg">{p.icon}</span>
                  <span className="leading-tight text-center">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* ── Layers ── */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Wand2 className="h-3 w-3 text-primary" /> Warstwy
            </label>
            <div className="space-y-1">
              {LAYER_CONFIG.map((l) => (
                <div
                  key={l.key}
                  className={cn(
                    "flex items-center gap-3 rounded-md border px-3 py-2 transition-all",
                    config.layers[l.key]
                      ? "border-primary/20 bg-primary/5"
                      : "border-transparent bg-transparent"
                  )}
                >
                  <l.icon className={cn("h-4 w-4 shrink-0", config.layers[l.key] ? "text-primary" : "text-muted-foreground")} />
                  <div className="flex-1 min-w-0">
                    <span className={cn("text-xs font-semibold", config.layers[l.key] ? "text-foreground" : "text-muted-foreground")}>
                      {l.label}
                    </span>
                    <p className="text-[10px] text-muted-foreground truncate">{l.desc}</p>
                  </div>
                  <Switch
                    checked={config.layers[l.key]}
                    onCheckedChange={(v) => updateLayer(l.key, v)}
                    className="scale-75"
                  />
                </div>
              ))}
            </div>
          </div>

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
                  min={10}
                  max={50}
                  step={1}
                  className="py-1"
                />
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
                min={1}
                max={10}
                step={0.5}
                className="py-1"
              />
            </div>
          </div>
        </div>

        {/* ── GPU Status + Generate ── */}
        <div className="border-t border-border p-4 space-y-3">
          {/* GPU bar */}
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

          {/* Progress */}
          {comfy.isRendering && comfy.progress && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Rendering...</span>
                <span className="font-mono text-primary">{comfy.progress.percentage}%</span>
              </div>
              <Progress value={comfy.progress.percentage} className="h-1.5" />
            </div>
          )}

          {/* Connection indicator */}
          <div className="flex items-center gap-2 text-[10px]">
            <div className={cn(
              "h-2 w-2 rounded-full",
              comfy.isConnected ? "bg-[hsl(var(--status-ok))]" : "bg-destructive"
            )} />
            <span className="text-muted-foreground">
              {comfy.isConnected ? "ComfyUI połączony" : "ComfyUI rozłączony"}
            </span>
            {!comfy.isConnected && (
              <button
                onClick={() => comfy.connect()}
                className="ml-auto text-primary text-[10px] hover:underline"
              >
                Połącz
              </button>
            )}
          </div>

          {/* Generate button */}
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
