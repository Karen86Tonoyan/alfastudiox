import { useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Play, Square, Save, Upload, Download, RotateCcw,
  Sparkles, ImageIcon, Film, Cpu, Zap
} from "lucide-react";
import { AdvancedParameters } from "./AdvancedParameters";

export interface RenderSettings {
  model: string;
  modelType: "image" | "video";
  prompt: string;
  negativePrompt: string;
  seed: number;
  sampler: string;
  steps: number;
  cfg: number;
  width: number;
  height: number;
  lora: string;
  loraWeight: number;
  // video
  frames: number;
  fps: number;
  // advanced visual
  skinTone: string;
  hairColor: string;
  clothingStyle: string;
  sceneType: string;
  objectSelection: string;
  lighting: string;
  cameraType: string;
}

const MODELS = {
  image: [
    { id: "sdxl", name: "SDXL 1.0", vram: "8GB" },
    { id: "flux-dev", name: "Flux Dev", vram: "10GB" },
    { id: "flux-schnell", name: "Flux Schnell", vram: "8GB" },
    { id: "sd3", name: "Stable Diffusion 3", vram: "8GB" },
    { id: "playground-v2.5", name: "Playground v2.5", vram: "8GB" },
  ],
  video: [
    { id: "animatediff", name: "AnimateDiff", vram: "7GB" },
    { id: "wan-video", name: "WanVideo", vram: "8GB" },
    { id: "svd", name: "Stable Video Diffusion", vram: "10GB" },
    { id: "img2vid", name: "Image-to-Video (SVD-XT)", vram: "12GB" },
    { id: "liveportrait", name: "LivePortrait", vram: "4GB" },
  ],
};

const SAMPLERS = [
  "euler", "euler_ancestral", "dpmpp_2m", "dpmpp_2m_sde",
  "dpmpp_sde", "dpmpp_3m_sde", "ddim", "uni_pc",
  "lms", "heun", "dpm_fast", "dpm_adaptive",
];

const LORAS = [
  { id: "none", name: "None" },
  { id: "detail-tweaker", name: "Detail Tweaker XL" },
  { id: "film-grain", name: "Film Grain" },
  { id: "cinematic", name: "Cinematic Look" },
  { id: "anime", name: "Anime Style" },
  { id: "photorealistic", name: "Photorealistic" },
  { id: "custom", name: "Custom LoRA..." },
];

const defaultSettings: RenderSettings = {
  model: "sdxl",
  modelType: "image",
  prompt: "",
  negativePrompt: "blurry, low quality, deformed, watermark, text, ugly, duplicate, morbid",
  seed: -1,
  sampler: "dpmpp_2m",
  steps: 30,
  cfg: 7,
  width: 1024,
  height: 1024,
  lora: "none",
  loraWeight: 0.8,
  frames: 16,
  fps: 8,
  skinTone: "natural",
  hairColor: "dark-brown",
  clothingStyle: "casual",
  sceneType: "outdoor",
  objectSelection: "none",
  lighting: "natural",
  cameraType: "standard",
};

interface RenderControlPanelProps {
  className?: string;
  onRender?: (settings: RenderSettings) => void;
  onSaveWorkflow?: (settings: RenderSettings) => void;
}

export function RenderControlPanel({ className, onRender, onSaveWorkflow }: RenderControlPanelProps) {
  const [settings, setSettings] = useState<RenderSettings>(defaultSettings);
  const [isRendering, setIsRendering] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(true);

  const update = useCallback(<K extends keyof RenderSettings>(key: K, value: RenderSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleRender = () => {
    setIsRendering(true);
    onRender?.(settings);
    setTimeout(() => setIsRendering(false), 3000);
  };

  const handleRandomSeed = () => {
    update("seed", Math.floor(Math.random() * 2147483647));
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workflow-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target?.result as string);
          setSettings({ ...defaultSettings, ...imported });
        } catch {}
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const currentModels = MODELS[settings.modelType];

  return (
    <div className={cn("flex flex-col bg-background", className)}>
      {/* Header bar */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-bold tracking-wide text-primary uppercase">Render Control</h2>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
            onClick={handleImport}
          >
            <Upload className="h-3 w-3" /> Import
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
            onClick={handleExport}
          >
            <Download className="h-3 w-3" /> Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => onSaveWorkflow?.(settings)}
          >
            <Save className="h-3 w-3" /> Save
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-5 p-4">
          {/* Model Type Toggle */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Generation Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => { update("modelType", "image"); update("model", MODELS.image[0].id); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-xs font-semibold transition-all",
                  settings.modelType === "image"
                    ? "border-primary/50 bg-primary/10 text-primary gold-glow"
                    : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
              >
                <ImageIcon className="h-4 w-4" /> Image
              </button>
              <button
                onClick={() => { update("modelType", "video"); update("model", MODELS.video[0].id); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-xs font-semibold transition-all",
                  settings.modelType === "video"
                    ? "border-primary/50 bg-primary/10 text-primary gold-glow"
                    : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
              >
                <Film className="h-4 w-4" /> Video
              </button>
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Model
            </label>
            <Select value={settings.model} onValueChange={(v) => update("model", v)}>
              <SelectTrigger className="border-border bg-card text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentModels.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="flex items-center gap-2">
                      <Cpu className="h-3 w-3 text-muted-foreground" />
                      {m.name}
                      <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 text-primary border-primary/30">
                        {m.vram}
                      </Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Zap className="h-3 w-3 text-primary" /> Prompt
            </label>
            <Textarea
              value={settings.prompt}
              onChange={(e) => update("prompt", e.target.value)}
              placeholder="masterpiece, best quality, cinematic lighting, detailed face, 8k resolution..."
              className="min-h-[100px] border-border bg-card text-foreground placeholder:text-muted-foreground resize-none text-sm"
            />
          </div>

          {/* Negative Prompt */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Negative Prompt
            </label>
            <Textarea
              value={settings.negativePrompt}
              onChange={(e) => update("negativePrompt", e.target.value)}
              placeholder="blurry, low quality, deformed..."
              className="min-h-[60px] border-border bg-card text-foreground placeholder:text-muted-foreground resize-none text-xs"
            />
          </div>

          {/* Core Parameters Grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Parameters
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Seed */}
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground">Seed</span>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    value={settings.seed}
                    onChange={(e) => update("seed", parseInt(e.target.value) || -1)}
                    className="h-8 bg-card border-border text-xs font-mono"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 border-border"
                    onClick={handleRandomSeed}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Sampler */}
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground">Sampler</span>
                <Select value={settings.sampler} onValueChange={(v) => update("sampler", v)}>
                  <SelectTrigger className="h-8 bg-card border-border text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SAMPLERS.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Steps */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[10px] text-muted-foreground">Steps</span>
                  <span className="text-[10px] font-mono text-primary">{settings.steps}</span>
                </div>
                <Slider
                  value={[settings.steps]}
                  onValueChange={([v]) => update("steps", v)}
                  min={1}
                  max={150}
                  step={1}
                  className="py-1"
                />
              </div>

              {/* CFG */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[10px] text-muted-foreground">CFG Scale</span>
                  <span className="text-[10px] font-mono text-primary">{settings.cfg}</span>
                </div>
                <Slider
                  value={[settings.cfg]}
                  onValueChange={([v]) => update("cfg", v)}
                  min={1}
                  max={30}
                  step={0.5}
                  className="py-1"
                />
              </div>
            </div>
          </div>

          {/* Resolution */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resolution
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground">Width</span>
                <Select value={String(settings.width)} onValueChange={(v) => update("width", parseInt(v))}>
                  <SelectTrigger className="h-8 bg-card border-border text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[512, 640, 768, 832, 896, 1024, 1152, 1280, 1536, 1920].map((v) => (
                      <SelectItem key={v} value={String(v)} className="text-xs font-mono">{v}px</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground">Height</span>
                <Select value={String(settings.height)} onValueChange={(v) => update("height", parseInt(v))}>
                  <SelectTrigger className="h-8 bg-card border-border text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[512, 640, 768, 832, 896, 1024, 1152, 1280, 1536, 1920].map((v) => (
                      <SelectItem key={v} value={String(v)} className="text-xs font-mono">{v}px</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* LoRA */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              LoRA
            </label>
            <Select value={settings.lora} onValueChange={(v) => update("lora", v)}>
              <SelectTrigger className="bg-card border-border text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LORAS.map((l) => (
                  <SelectItem key={l.id} value={l.id} className="text-xs">{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {settings.lora !== "none" && (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[10px] text-muted-foreground">LoRA Weight</span>
                  <span className="text-[10px] font-mono text-primary">{settings.loraWeight}</span>
                </div>
                <Slider
                  value={[settings.loraWeight]}
                  onValueChange={([v]) => update("loraWeight", v)}
                  min={0}
                  max={1.5}
                  step={0.05}
                />
              </div>
            )}
          </div>

          {/* Video-specific */}
          {settings.modelType === "video" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Video Settings
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-muted-foreground">Frames</span>
                    <span className="text-[10px] font-mono text-primary">{settings.frames}</span>
                  </div>
                  <Slider
                    value={[settings.frames]}
                    onValueChange={([v]) => update("frames", v)}
                    min={4}
                    max={128}
                    step={1}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-muted-foreground">FPS</span>
                    <span className="text-[10px] font-mono text-primary">{settings.fps}</span>
                  </div>
                  <Slider
                    value={[settings.fps]}
                    onValueChange={([v]) => update("fps", v)}
                    min={1}
                    max={60}
                    step={1}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Advanced Parameters Toggle */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
            >
              <span className="h-px flex-1 bg-primary/20" />
              {showAdvanced ? "▼" : "►"} Advanced Visual Controls
              <span className="h-px flex-1 bg-primary/20" />
            </button>
          </div>

          {showAdvanced && (
            <AdvancedParameters settings={settings} onUpdate={update} />
          )}
        </div>
      </ScrollArea>

      {/* Render button */}
      <div className="border-t border-border p-4">
        <Button
          onClick={handleRender}
          disabled={isRendering || !settings.prompt.trim()}
          className={cn(
            "w-full h-11 gap-2 text-sm font-bold uppercase tracking-wider transition-all",
            isRendering
              ? "bg-destructive text-destructive-foreground"
              : "gold-gradient text-primary-foreground hover:opacity-90 gold-glow"
          )}
        >
          {isRendering ? (
            <><Square className="h-4 w-4" /> Rendering...</>
          ) : (
            <><Play className="h-4 w-4" /> Generate {settings.modelType === "video" ? "Video" : "Image"}</>
          )}
        </Button>
      </div>
    </div>
  );
}
