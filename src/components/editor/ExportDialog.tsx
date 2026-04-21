import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, FileImage, Layers, CircleDot } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { exportToBlob, exportMaskBlobs, exportLayerBlobs, type EditorLayer } from "@/lib/editorEngine";
import { exportPSD } from "@/lib/psdIO";
import { toast } from "sonner";

interface ExportDialogProps {
  layers: EditorLayer[];
  canvasWidth: number;
  canvasHeight: number;
}

export function ExportDialog({ layers, canvasWidth, canvasHeight }: ExportDialogProps) {
  const [format, setFormat] = useState<"png" | "jpeg" | "webp" | "psd">("png");
  const [quality, setQuality] = useState(92);
  const [filename, setFilename] = useState("export");
  const [exporting, setExporting] = useState(false);
  const [exportMasks, setExportMasks] = useState(false);
  const [exportFrames, setExportFrames] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      let blob: Blob;
      if (format === "psd") {
        const buffer = exportPSD(layers, canvasWidth, canvasHeight);
        blob = new Blob([buffer], { type: "application/octet-stream" });
      } else {
        blob = await exportToBlob(layers, canvasWidth, canvasHeight, format, quality / 100);
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.${format === "jpeg" ? "jpg" : format}`;
      a.click();
      URL.revokeObjectURL(url);

      // Export masks
      if (exportMasks && format !== "psd") {
        const masks = await exportMaskBlobs(layers, "png");
        for (const m of masks) {
          const mUrl = URL.createObjectURL(m.blob);
          const mA = document.createElement("a");
          mA.href = mUrl;
          mA.download = `${filename}_${m.name}.png`;
          mA.click();
          URL.revokeObjectURL(mUrl);
        }
        if (masks.length > 0) toast.success(`Wyeksportowano ${masks.length} masek`);
      }

      // Export frames (per-layer composites)
      if (exportFrames && format !== "psd") {
        const frames = await exportLayerBlobs(layers, canvasWidth, canvasHeight, format, quality / 100);
        for (const f of frames) {
          const fUrl = URL.createObjectURL(f.blob);
          const fA = document.createElement("a");
          fA.href = fUrl;
          fA.download = `${filename}_${f.name}.${format === "jpeg" ? "jpg" : format}`;
          fA.click();
          URL.revokeObjectURL(fUrl);
        }
        if (frames.length > 0) toast.success(`Wyeksportowano ${frames.length} klatek warstw`);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[10px]">
          <Download className="h-3 w-3" /> Eksport
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <FileImage className="h-4 w-4 text-primary" />
            Eksportuj obraz
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase">Nazwa pliku</label>
            <Input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase">Format</label>
            <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png" className="text-xs">PNG (bezstratny, przezroczystość)</SelectItem>
                <SelectItem value="jpeg" className="text-xs">JPEG (zdjęcia, mały plik)</SelectItem>
                <SelectItem value="webp" className="text-xs">WebP (nowoczesny, web)</SelectItem>
                <SelectItem value="psd" className="text-xs">PSD (Photoshop, warstwy + maski)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {format !== "png" && format !== "psd" && (
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] text-muted-foreground uppercase">Jakość</label>
                <span className="text-[10px] font-mono text-primary">{quality}%</span>
              </div>
              <Slider
                value={[quality]}
                onValueChange={([v]) => setQuality(v)}
                min={10}
                max={100}
                step={1}
              />
            </div>
          )}
          {format !== "psd" && (
            <div className="space-y-2 border border-border rounded-md p-2.5">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Dodatkowe pliki</span>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="export-masks"
                  checked={exportMasks}
                  onCheckedChange={(v) => setExportMasks(!!v)}
                />
                <label htmlFor="export-masks" className="text-[10px] text-foreground flex items-center gap-1 cursor-pointer">
                  <CircleDot className="h-3 w-3 text-muted-foreground" />
                  Eksportuj maski warstw (PNG)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="export-frames"
                  checked={exportFrames}
                  onCheckedChange={(v) => setExportFrames(!!v)}
                />
                <label htmlFor="export-frames" className="text-[10px] text-foreground flex items-center gap-1 cursor-pointer">
                  <Layers className="h-3 w-3 text-muted-foreground" />
                  Eksportuj klatki warstw (z dopasowaniami)
                </label>
              </div>
            </div>
          )}
          <div className="text-[10px] text-muted-foreground">
            Rozmiar: {canvasWidth}×{canvasHeight}px · {layers.filter((l) => l.visible).length} widocznych warstw
          </div>
          <Button onClick={handleExport} disabled={exporting} className="w-full gap-2 gold-gradient text-primary-foreground">
            <Download className="h-4 w-4" />
            {exporting ? "Eksportowanie..." : "Pobierz"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}