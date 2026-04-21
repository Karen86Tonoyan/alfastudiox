import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, FileImage } from "lucide-react";
import { exportToBlob, type EditorLayer } from "@/lib/editorEngine";
import { exportPSD } from "@/lib/psdIO";

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