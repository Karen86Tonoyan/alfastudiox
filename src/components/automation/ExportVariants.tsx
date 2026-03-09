import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, Plus, Trash2, Copy, Play, FolderOpen } from "lucide-react";

interface ExportVariant {
  id: string;
  name: string;
  width: number;
  height: number;
  format: string;
  quality: number;
  suffix: string;
  enabled: boolean;
}

const PLATFORM_PRESETS: Record<string, ExportVariant[]> = {
  "Social Media Pack": [
    { id: "ig-feed", name: "Instagram Feed", width: 1080, height: 1080, format: "jpg", quality: 90, suffix: "_ig_feed", enabled: true },
    { id: "ig-story", name: "Instagram Story", width: 1080, height: 1920, format: "jpg", quality: 90, suffix: "_ig_story", enabled: true },
    { id: "fb-post", name: "Facebook Post", width: 1200, height: 628, format: "jpg", quality: 85, suffix: "_fb", enabled: true },
    { id: "twitter", name: "Twitter/X", width: 1600, height: 900, format: "jpg", quality: 85, suffix: "_tw", enabled: true },
    { id: "linkedin", name: "LinkedIn", width: 1200, height: 627, format: "jpg", quality: 85, suffix: "_li", enabled: true },
    { id: "pinterest", name: "Pinterest", width: 1000, height: 1500, format: "jpg", quality: 90, suffix: "_pin", enabled: true },
  ],
  "Web Pack": [
    { id: "hero", name: "Hero (2x)", width: 2560, height: 1440, format: "webp", quality: 90, suffix: "_hero@2x", enabled: true },
    { id: "hero-1x", name: "Hero (1x)", width: 1280, height: 720, format: "webp", quality: 85, suffix: "_hero", enabled: true },
    { id: "thumb", name: "Thumbnail", width: 400, height: 300, format: "webp", quality: 80, suffix: "_thumb", enabled: true },
    { id: "og", name: "OG Image", width: 1200, height: 630, format: "jpg", quality: 85, suffix: "_og", enabled: true },
    { id: "favicon", name: "Favicon", width: 512, height: 512, format: "png", quality: 100, suffix: "_icon", enabled: true },
  ],
  "E-commerce": [
    { id: "main", name: "Main Image", width: 2000, height: 2000, format: "jpg", quality: 95, suffix: "_main", enabled: true },
    { id: "zoom", name: "Zoom", width: 4000, height: 4000, format: "jpg", quality: 95, suffix: "_zoom", enabled: true },
    { id: "gallery", name: "Gallery", width: 800, height: 800, format: "jpg", quality: 85, suffix: "_gallery", enabled: true },
    { id: "cart", name: "Cart Thumb", width: 200, height: 200, format: "jpg", quality: 80, suffix: "_cart", enabled: true },
  ],
  "Video Pack": [
    { id: "4k", name: "4K Frame", width: 3840, height: 2160, format: "png", quality: 100, suffix: "_4k", enabled: true },
    { id: "1080", name: "1080p Frame", width: 1920, height: 1080, format: "png", quality: 100, suffix: "_1080", enabled: true },
    { id: "720", name: "720p Frame", width: 1280, height: 720, format: "jpg", quality: 90, suffix: "_720", enabled: true },
    { id: "poster", name: "Poster", width: 1920, height: 2880, format: "jpg", quality: 95, suffix: "_poster", enabled: true },
  ],
};

export function ExportVariants() {
  const [variants, setVariants] = useState<ExportVariant[]>(PLATFORM_PRESETS["Social Media Pack"]);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addVariant = () => {
    setVariants([
      ...variants,
      {
        id: crypto.randomUUID(),
        name: "Custom",
        width: 1000,
        height: 1000,
        format: "jpg",
        quality: 85,
        suffix: "_custom",
        enabled: true,
      },
    ]);
  };

  const updateVariant = (id: string, updates: Partial<ExportVariant>) => {
    setVariants(variants.map((v) => (v.id === id ? { ...v, ...updates } : v)));
  };

  const removeVariant = (id: string) => setVariants(variants.filter((v) => v.id !== id));

  const loadPreset = (name: string) => {
    if (PLATFORM_PRESETS[name]) setVariants(PLATFORM_PRESETS[name]);
  };

  const enabledCount = variants.filter((v) => v.enabled).length;
  const preview = sourceFile ? URL.createObjectURL(sourceFile) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Select onValueChange={loadPreset}>
            <SelectTrigger className="h-9 w-56 text-xs">
              <SelectValue placeholder="Załaduj preset platformy..." />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(PLATFORM_PRESETS).map((k) => (
                <SelectItem key={k} value={k} className="text-xs">{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={addVariant}>
            <Plus className="h-3 w-3 mr-1" /> Dodaj wariant
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{enabledCount} aktywnych wariantów</Badge>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            disabled={!sourceFile || enabledCount === 0 || isExporting}
            onClick={async () => { setIsExporting(true); await new Promise((r) => setTimeout(r, 2000)); setIsExporting(false); }}
          >
            <Play className="h-3 w-3 mr-1" /> {isExporting ? "Eksportowanie..." : `Eksportuj ${enabledCount} wariantów`}
          </Button>
          <Button size="sm" variant="outline" disabled={isExporting}>
            <Download className="h-3 w-3 mr-1" /> ZIP
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_240px] gap-4">
        {/* Variants Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-[10px]">On</TableHead>
                  <TableHead className="text-[10px]">Nazwa</TableHead>
                  <TableHead className="text-[10px]">Szerokość</TableHead>
                  <TableHead className="text-[10px]">Wysokość</TableHead>
                  <TableHead className="text-[10px]">Format</TableHead>
                  <TableHead className="text-[10px]">Jakość</TableHead>
                  <TableHead className="text-[10px]">Sufiks</TableHead>
                  <TableHead className="w-16 text-[10px]">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((v) => (
                  <TableRow key={v.id} className={!v.enabled ? "opacity-40" : ""}>
                    <TableCell><Switch checked={v.enabled} onCheckedChange={(c) => updateVariant(v.id, { enabled: c })} /></TableCell>
                    <TableCell><Input value={v.name} onChange={(e) => updateVariant(v.id, { name: e.target.value })} className="h-7 text-xs" /></TableCell>
                    <TableCell><Input type="number" value={v.width} onChange={(e) => updateVariant(v.id, { width: Number(e.target.value) })} className="h-7 text-xs w-20" /></TableCell>
                    <TableCell><Input type="number" value={v.height} onChange={(e) => updateVariant(v.id, { height: Number(e.target.value) })} className="h-7 text-xs w-20" /></TableCell>
                    <TableCell>
                      <Select value={v.format} onValueChange={(f) => updateVariant(v.id, { format: f })}>
                        <SelectTrigger className="h-7 text-xs w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["jpg", "png", "webp", "avif", "tiff"].map((f) => (
                            <SelectItem key={f} value={f} className="text-xs">{f.toUpperCase()}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input type="number" value={v.quality} onChange={(e) => updateVariant(v.id, { quality: Number(e.target.value) })} className="h-7 text-xs w-16" min={10} max={100} /></TableCell>
                    <TableCell><Input value={v.suffix} onChange={(e) => updateVariant(v.id, { suffix: e.target.value })} className="h-7 text-xs w-24" /></TableCell>
                    <TableCell>
                      <button onClick={() => removeVariant(v.id)} className="p-1 rounded hover:bg-destructive/10">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Source Image */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Obraz źródłowy</h4>
          <div
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/40 transition-all overflow-hidden flex items-center justify-center bg-muted/30"
          >
            {preview ? (
              <img src={preview} alt="Source" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center p-4">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">Wgraj źródło</p>
              </div>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setSourceFile(f); e.target.value = ""; }}
          />
          {sourceFile && (
            <div className="text-center">
              <Badge variant="secondary" className="text-[10px]">{sourceFile.name}</Badge>
              <Button size="sm" variant="link" onClick={() => setSourceFile(null)} className="text-[10px]">Zmień</Button>
            </div>
          )}

          {/* Preview variants */}
          {sourceFile && variants.filter((v) => v.enabled).length > 0 && (
            <Card className="p-2 space-y-1">
              <p className="text-[10px] text-muted-foreground font-semibold">Podgląd nazw plików:</p>
              {variants.filter((v) => v.enabled).map((v) => (
                <p key={v.id} className="text-[9px] font-mono text-muted-foreground">
                  {sourceFile.name.replace(/\.[^.]+$/, "")}{v.suffix}.{v.format}
                </p>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
