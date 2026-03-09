import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Play, Image, Settings2, Download, FolderOpen } from "lucide-react";

interface ProcessorSettings {
  resize: boolean;
  resizeWidth: number;
  resizeHeight: number;
  resizeMode: string;
  format: string;
  quality: number;
  stripMetadata: boolean;
  convertSrgb: boolean;
  sharpen: boolean;
  sharpenAmount: number;
}

const DEFAULT_SETTINGS: ProcessorSettings = {
  resize: true,
  resizeWidth: 1920,
  resizeHeight: 1080,
  resizeMode: "fit",
  format: "webp",
  quality: 85,
  stripMetadata: true,
  convertSrgb: true,
  sharpen: false,
  sharpenAmount: 30,
};

const PRESETS = [
  { name: "Web (1920 webp q85)", settings: { ...DEFAULT_SETTINGS } },
  { name: "Thumbnail (400x400 jpg)", settings: { ...DEFAULT_SETTINGS, resizeWidth: 400, resizeHeight: 400, resizeMode: "cover", format: "jpg", quality: 80 } },
  { name: "Print (300dpi TIFF)", settings: { ...DEFAULT_SETTINGS, resize: false, format: "tiff", quality: 100, stripMetadata: false } },
  { name: "Email (800 jpg q70)", settings: { ...DEFAULT_SETTINGS, resizeWidth: 800, resizeHeight: 600, format: "jpg", quality: 70 } },
  { name: "Social 1:1 (1080 png)", settings: { ...DEFAULT_SETTINGS, resizeWidth: 1080, resizeHeight: 1080, resizeMode: "cover", format: "png", quality: 95 } },
  { name: "4K (3840 webp q90)", settings: { ...DEFAULT_SETTINGS, resizeWidth: 3840, resizeHeight: 2160, format: "webp", quality: 90 } },
];

export function ImageProcessor() {
  const [settings, setSettings] = useState<ProcessorSettings>(DEFAULT_SETTINGS);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const u = (partial: Partial<ProcessorSettings>) => setSettings({ ...settings, ...partial });

  const handleProcess = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsProcessing(false);
  };

  return (
    <div className="grid grid-cols-[1fr_320px] gap-4 h-full">
      {/* Left: Files + preview */}
      <div className="space-y-4">
        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Dodaj pliki do przetworzenia</p>
          <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, WEBP, TIFF, BMP, RAW</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => { if (e.target.files) setFiles([...files, ...Array.from(e.target.files)]); e.target.value = ""; }}
        />

        {/* File list */}
        {files.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{files.length} plików</Badge>
              <Button size="sm" variant="outline" onClick={() => setFiles([])}>Wyczyść</Button>
            </div>
            <div className="grid grid-cols-4 gap-2 max-h-[400px] overflow-y-auto">
              {files.map((f, i) => (
                <Card key={i} className="p-1 overflow-hidden">
                  <div className="aspect-square rounded overflow-hidden bg-muted">
                    <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[9px] text-muted-foreground truncate mt-1 px-1">{f.name}</p>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-xs">Brak plików</p>
          </div>
        )}

        {/* Run */}
        <div className="flex gap-2">
          <Button onClick={handleProcess} disabled={files.length === 0 || isProcessing} className="flex-1 bg-green-600 hover:bg-green-700">
            <Play className="h-4 w-4 mr-2" />
            {isProcessing ? "Przetwarzanie..." : `Przetwórz ${files.length} plików`}
          </Button>
          <Button variant="outline" disabled={isProcessing}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* Right: Settings */}
      <Card className="p-4 space-y-4 overflow-y-auto">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-bold">Ustawienia procesora</h4>
        </div>

        {/* Presets */}
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Preset</label>
          <Select onValueChange={(v) => { const p = PRESETS.find((pr) => pr.name === v); if (p) setSettings(p.settings); }}>
            <SelectTrigger className="h-8 text-xs mt-1">
              <SelectValue placeholder="Wybierz preset..." />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => (
                <SelectItem key={p.name} value={p.name} className="text-xs">{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Resize */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">Resize</label>
            <Switch checked={settings.resize} onCheckedChange={(v) => u({ resize: v })} />
          </div>
          {settings.resize && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Szerokość</label>
                <Input type="number" value={settings.resizeWidth} onChange={(e) => u({ resizeWidth: Number(e.target.value) })} className="h-7 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Wysokość</label>
                <Input type="number" value={settings.resizeHeight} onChange={(e) => u({ resizeHeight: Number(e.target.value) })} className="h-7 text-xs" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-muted-foreground">Tryb</label>
                <Select value={settings.resizeMode} onValueChange={(v) => u({ resizeMode: v })}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fit" className="text-xs">Fit (zachowaj proporcje)</SelectItem>
                    <SelectItem value="cover" className="text-xs">Cover (wypełnij)</SelectItem>
                    <SelectItem value="stretch" className="text-xs">Stretch (rozciągnij)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Format */}
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Format wyjścia</label>
          <Select value={settings.format} onValueChange={(v) => u({ format: v })}>
            <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["webp", "jpg", "png", "tiff", "avif"].map((f) => (
                <SelectItem key={f} value={f} className="text-xs">{f.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quality */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Jakość</label>
            <span className="text-[10px] text-muted-foreground">{settings.quality}%</span>
          </div>
          <Slider value={[settings.quality]} onValueChange={([v]) => u({ quality: v })} min={10} max={100} step={5} />
        </div>

        {/* Options */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs">Usuń metadane</label>
            <Switch checked={settings.stripMetadata} onCheckedChange={(v) => u({ stripMetadata: v })} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs">Konwertuj do sRGB</label>
            <Switch checked={settings.convertSrgb} onCheckedChange={(v) => u({ convertSrgb: v })} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs">Wyostrzanie</label>
            <Switch checked={settings.sharpen} onCheckedChange={(v) => u({ sharpen: v })} />
          </div>
          {settings.sharpen && (
            <div className="flex items-center gap-2">
              <Slider value={[settings.sharpenAmount]} onValueChange={([v]) => u({ sharpenAmount: v })} min={0} max={100} />
              <span className="text-[10px] text-muted-foreground w-8">{settings.sharpenAmount}</span>
            </div>
          )}
        </div>

        {/* Summary */}
        <Card className="p-2 bg-muted/30">
          <p className="text-[10px] text-muted-foreground">Pipeline: {[
            settings.resize && `Resize ${settings.resizeWidth}×${settings.resizeHeight}`,
            settings.convertSrgb && "sRGB",
            settings.sharpen && `Sharpen ${settings.sharpenAmount}`,
            `${settings.format.toUpperCase()} q${settings.quality}`,
            settings.stripMetadata && "Strip meta",
          ].filter(Boolean).join(" → ")}</p>
        </Card>
      </Card>
    </div>
  );
}
