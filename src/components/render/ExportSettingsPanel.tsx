import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Download, Film, Monitor, Settings, Clapperboard, Gauge, Palette, Layers
} from "lucide-react";

export interface CinematicSettings {
  frameRate: string;
  shutterAngle: number;
  aspectRatio: string;
  resolution: string;
  colorSpace: string;
  dynamicRange: string;
  bitDepth: string;
  gamma: string;
}

export interface ExportSettings {
  format: string;
  codec: string;
  bitrate: number;
  audioCodec: string;
  audioSample: string;
  antiAliasing: number;
  motionBlurSamples: number;
  denoiser: string;
  renderPasses: string[];
}

export interface ExportPreset {
  id: string;
  name: string;
  icon: string;
  cinematic: Partial<CinematicSettings>;
  export: Partial<ExportSettings>;
}

const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: "cinematic-prores",
    name: "Cinematic 24fps ProRes",
    icon: "🎬",
    cinematic: {
      frameRate: "23.976", aspectRatio: "2.39:1", colorSpace: "log-slog3",
      bitDepth: "10-bit", gamma: "log",
    },
    export: {
      format: "prores", codec: "ProRes 422 HQ", bitrate: 150,
      audioCodec: "pcm", audioSample: "48kHz-24bit",
    },
  },
  {
    id: "youtube-hdr",
    name: "YouTube Cinematic HDR",
    icon: "📺",
    cinematic: {
      frameRate: "23.976", aspectRatio: "16:9", colorSpace: "rec2020",
      dynamicRange: "hdr10", bitDepth: "10-bit", gamma: "pq",
    },
    export: {
      format: "h265", codec: "HEVC 10-bit", bitrate: 80,
      audioCodec: "aac", audioSample: "48kHz-24bit",
    },
  },
  {
    id: "film-35mm",
    name: "Film Look 35mm Full",
    icon: "🎞️",
    cinematic: {
      frameRate: "24", shutterAngle: 180, aspectRatio: "2.39:1",
      colorSpace: "log-arri", bitDepth: "12-bit",
    },
    export: {
      format: "prores", codec: "ProRes 4444", bitrate: 200,
      motionBlurSamples: 32, antiAliasing: 16,
    },
  },
  {
    id: "vfx-exr",
    name: "VFX / Compositing EXR",
    icon: "🎨",
    cinematic: {
      frameRate: "24", colorSpace: "acescg", bitDepth: "16-bit-float",
    },
    export: {
      format: "exr", codec: "EXR 16-bit", bitrate: 0,
      renderPasses: ["beauty", "depth", "cryptomatte", "reflection", "shadow", "ao"],
    },
  },
  {
    id: "social-fast",
    name: "Social Media Fast",
    icon: "📱",
    cinematic: {
      frameRate: "30", aspectRatio: "9:16", resolution: "1080x1920",
    },
    export: {
      format: "h264", codec: "H.264", bitrate: 20,
      audioCodec: "aac", audioSample: "44.1kHz-16bit",
    },
  },
  {
    id: "davinci-grade",
    name: "DaVinci Grade Ready",
    icon: "🎯",
    cinematic: {
      frameRate: "23.976", colorSpace: "davinci-wide", bitDepth: "12-bit",
      gamma: "log",
    },
    export: {
      format: "dnxhr", codec: "DNxHR HQX", bitrate: 120,
    },
  },
];

const FRAME_RATES = ["23.976", "24", "25", "29.97", "30", "48", "50", "59.94", "60", "120"];
const ASPECT_RATIOS = ["16:9", "1.85:1", "2.35:1", "2.39:1", "1:1", "9:16", "4:3", "21:9"];
const RESOLUTIONS = ["1920x1080", "2560x1440", "3840x2160", "4096x2160", "5120x2880", "6144x3456", "7680x4320"];
const COLOR_SPACES = [
  { id: "rec709", name: "Rec.709" },
  { id: "rec2020", name: "Rec.2020" },
  { id: "acescg", name: "ACEScg" },
  { id: "davinci-wide", name: "DaVinci Wide Gamut" },
  { id: "log-slog3", name: "S-Log3 (Sony)" },
  { id: "log-vlog", name: "V-Log (Panasonic)" },
  { id: "log-arri", name: "ARRI LogC" },
  { id: "log-red", name: "RED Log3G10" },
];
const DYNAMIC_RANGES = [
  { id: "sdr", name: "SDR" },
  { id: "hdr10", name: "HDR10" },
  { id: "dolby-vision", name: "Dolby Vision (PQ)" },
  { id: "hlg", name: "HLG" },
];
const BIT_DEPTHS = ["8-bit", "10-bit", "12-bit", "16-bit-float", "32-bit-float"];
const FORMATS = [
  { id: "prores", name: "Apple ProRes" },
  { id: "h265", name: "H.265 (HEVC)" },
  { id: "h264", name: "H.264 (AVC)" },
  { id: "exr", name: "OpenEXR" },
  { id: "dnxhr", name: "DNxHR (Avid)" },
  { id: "png-seq", name: "PNG Sequence" },
  { id: "tiff-seq", name: "TIFF Sequence" },
];
const CODECS: Record<string, string[]> = {
  prores: ["ProRes 422 Proxy", "ProRes 422 LT", "ProRes 422", "ProRes 422 HQ", "ProRes 4444", "ProRes 4444 XQ"],
  h265: ["HEVC 8-bit", "HEVC 10-bit", "HEVC 10-bit HDR"],
  h264: ["H.264 Main", "H.264 High", "H.264 High 10"],
  exr: ["EXR 16-bit", "EXR 32-bit", "EXR Multi-layer"],
  dnxhr: ["DNxHR LB", "DNxHR SQ", "DNxHR HQ", "DNxHR HQX", "DNxHR 444"],
  "png-seq": ["PNG 8-bit", "PNG 16-bit"],
  "tiff-seq": ["TIFF 8-bit", "TIFF 16-bit", "TIFF 32-bit"],
};
const DENOISERS = ["none", "Intel Open Image Denoise", "NVIDIA OptiX", "Temporal Denoise"];
const RENDER_PASSES = ["beauty", "depth", "normal", "cryptomatte", "reflection", "shadow", "ao", "emission", "specular", "diffuse", "glossy"];

const defaultCinematic: CinematicSettings = {
  frameRate: "23.976", shutterAngle: 180, aspectRatio: "2.39:1",
  resolution: "3840x2160", colorSpace: "log-slog3",
  dynamicRange: "sdr", bitDepth: "10-bit", gamma: "rec709",
};

const defaultExport: ExportSettings = {
  format: "h265", codec: "HEVC 10-bit", bitrate: 80,
  audioCodec: "aac", audioSample: "48kHz-24bit",
  antiAliasing: 8, motionBlurSamples: 16,
  denoiser: "none", renderPasses: ["beauty"],
};

interface ExportSettingsPanelProps {
  className?: string;
}

export function ExportSettingsPanel({ className }: ExportSettingsPanelProps) {
  const [cinematic, setCinematic] = useState<CinematicSettings>(defaultCinematic);
  const [exportSettings, setExportSettings] = useState<ExportSettings>(defaultExport);
  const [showPasses, setShowPasses] = useState(false);

  const updateCinematic = <K extends keyof CinematicSettings>(key: K, value: CinematicSettings[K]) => {
    setCinematic((prev) => ({ ...prev, [key]: value }));
  };

  const updateExport = <K extends keyof ExportSettings>(key: K, value: ExportSettings[K]) => {
    setExportSettings((prev) => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: ExportPreset) => {
    if (preset.cinematic) setCinematic((prev) => ({ ...prev, ...preset.cinematic }));
    if (preset.export) setExportSettings((prev) => ({ ...prev, ...preset.export }));
  };

  const togglePass = (pass: string) => {
    setExportSettings((prev) => ({
      ...prev,
      renderPasses: prev.renderPasses.includes(pass)
        ? prev.renderPasses.filter((p) => p !== pass)
        : [...prev.renderPasses, pass],
    }));
  };

  const codecs = CODECS[exportSettings.format] ?? [];

  return (
    <div className={cn("flex flex-col bg-background", className)}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Clapperboard className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wider text-primary">Export & Cinema</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Export Presets
            </span>
            <div className="grid grid-cols-2 gap-1">
              {EXPORT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5 hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                >
                  <span className="text-sm">{preset.icon}</span>
                  <span className="text-[9px] font-medium text-foreground leading-tight">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Cinematic Settings */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Film className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Ustawienia Filmowe
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <span className="text-[9px] text-muted-foreground">Frame Rate</span>
                <Select value={cinematic.frameRate} onValueChange={(v) => updateCinematic("frameRate", v)}>
                  <SelectTrigger className="h-7 text-[10px] bg-card border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FRAME_RATES.map((fr) => (
                      <SelectItem key={fr} value={fr} className="text-[10px]">{fr} fps</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5">
                <span className="text-[9px] text-muted-foreground">Aspect Ratio</span>
                <Select value={cinematic.aspectRatio} onValueChange={(v) => updateCinematic("aspectRatio", v)}>
                  <SelectTrigger className="h-7 text-[10px] bg-card border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIOS.map((ar) => (
                      <SelectItem key={ar} value={ar} className="text-[10px]">{ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5">
                <span className="text-[9px] text-muted-foreground">Resolution</span>
                <Select value={cinematic.resolution} onValueChange={(v) => updateCinematic("resolution", v)}>
                  <SelectTrigger className="h-7 text-[10px] bg-card border-border font-mono"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RESOLUTIONS.map((r) => (
                      <SelectItem key={r} value={r} className="text-[10px] font-mono">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5">
                <span className="text-[9px] text-muted-foreground">Color Space</span>
                <Select value={cinematic.colorSpace} onValueChange={(v) => updateCinematic("colorSpace", v)}>
                  <SelectTrigger className="h-7 text-[10px] bg-card border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLOR_SPACES.map((cs) => (
                      <SelectItem key={cs.id} value={cs.id} className="text-[10px]">{cs.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5">
                <span className="text-[9px] text-muted-foreground">Dynamic Range</span>
                <Select value={cinematic.dynamicRange} onValueChange={(v) => updateCinematic("dynamicRange", v)}>
                  <SelectTrigger className="h-7 text-[10px] bg-card border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DYNAMIC_RANGES.map((dr) => (
                      <SelectItem key={dr.id} value={dr.id} className="text-[10px]">{dr.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5">
                <span className="text-[9px] text-muted-foreground">Bit Depth</span>
                <Select value={cinematic.bitDepth} onValueChange={(v) => updateCinematic("bitDepth", v)}>
                  <SelectTrigger className="h-7 text-[10px] bg-card border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BIT_DEPTHS.map((bd) => (
                      <SelectItem key={bd} value={bd} className="text-[10px]">{bd}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="flex justify-between">
                <span className="text-[9px] text-muted-foreground">Shutter Angle</span>
                <span className="text-[9px] font-mono text-primary">{cinematic.shutterAngle}°</span>
              </div>
              <Slider
                value={[cinematic.shutterAngle]}
                onValueChange={([v]) => updateCinematic("shutterAngle", v)}
                min={1} max={360} step={1}
              />
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Export Format */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Format Eksportu
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <span className="text-[9px] text-muted-foreground">Format</span>
                <Select value={exportSettings.format} onValueChange={(v) => {
                  updateExport("format", v);
                  const firstCodec = CODECS[v]?.[0];
                  if (firstCodec) updateExport("codec", firstCodec);
                }}>
                  <SelectTrigger className="h-7 text-[10px] bg-card border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((f) => (
                      <SelectItem key={f.id} value={f.id} className="text-[10px]">{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5">
                <span className="text-[9px] text-muted-foreground">Codec</span>
                <Select value={exportSettings.codec} onValueChange={(v) => updateExport("codec", v)}>
                  <SelectTrigger className="h-7 text-[10px] bg-card border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {codecs.map((c) => (
                      <SelectItem key={c} value={c} className="text-[10px]">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="flex justify-between">
                <span className="text-[9px] text-muted-foreground">Bitrate</span>
                <span className="text-[9px] font-mono text-primary">{exportSettings.bitrate} Mbps</span>
              </div>
              <Slider
                value={[exportSettings.bitrate]}
                onValueChange={([v]) => updateExport("bitrate", v)}
                min={5} max={300} step={5}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <span className="text-[9px] text-muted-foreground">Denoiser</span>
                <Select value={exportSettings.denoiser} onValueChange={(v) => updateExport("denoiser", v)}>
                  <SelectTrigger className="h-7 text-[10px] bg-card border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DENOISERS.map((d) => (
                      <SelectItem key={d} value={d} className="text-[10px]">{d === "none" ? "Brak" : d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-[9px] text-muted-foreground">AA Samples</span>
                  <span className="text-[9px] font-mono text-primary">{exportSettings.antiAliasing}</span>
                </div>
                <Slider
                  value={[exportSettings.antiAliasing]}
                  onValueChange={([v]) => updateExport("antiAliasing", v)}
                  min={1} max={32} step={1}
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Render Passes */}
          <div className="space-y-2">
            <button
              onClick={() => setShowPasses(!showPasses)}
              className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
            >
              <Layers className="h-3 w-3" />
              Render Passes ({exportSettings.renderPasses.length})
              <span className="text-muted-foreground ml-1">{showPasses ? "▼" : "►"}</span>
            </button>

            {showPasses && (
              <div className="flex flex-wrap gap-1">
                {RENDER_PASSES.map((pass) => {
                  const active = exportSettings.renderPasses.includes(pass);
                  return (
                    <button
                      key={pass}
                      onClick={() => togglePass(pass)}
                      className={cn(
                        "rounded px-2 py-0.5 text-[9px] font-medium border transition-all capitalize",
                        active
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/20"
                      )}
                    >
                      {pass}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
