import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Wand2, Eraser, Expand, ZoomIn, Paintbrush, SunMedium, Scissors, Sparkles } from "lucide-react";

interface AIOperation {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  params: { key: string; label: string; type: "text" | "number" | "slider" | "select"; options?: string[]; min?: number; max?: number; default: any }[];
}

const AI_OPS: AIOperation[] = [
  {
    id: "remove_bg",
    name: "Remove Background",
    icon: Eraser,
    description: "Automatyczne usuwanie tła z zachowaniem krawędzi",
    params: [
      { key: "model", label: "Model", type: "select", options: ["auto", "rembg", "sam2", "isnet"], default: "auto" },
      { key: "refine_edge", label: "Wygładź krawędzie", type: "slider", min: 0, max: 100, default: 50 },
      { key: "output_format", label: "Format wyjścia", type: "select", options: ["png", "webp"], default: "png" },
    ],
  },
  {
    id: "remove_object",
    name: "Remove Object",
    icon: Scissors,
    description: "Usuwanie niechcianych obiektów z inteligentnym wypełnieniem",
    params: [
      { key: "prompt", label: "Co usunąć", type: "text", default: "" },
      { key: "mode", label: "Tryb", type: "select", options: ["auto", "inpaint", "lama"], default: "auto" },
      { key: "strength", label: "Siła", type: "slider", min: 0, max: 100, default: 80 },
    ],
  },
  {
    id: "gen_fill",
    name: "Generative Fill",
    icon: Paintbrush,
    description: "AI wypełnianie zaznaczonych obszarów na podstawie promptu",
    params: [
      { key: "prompt", label: "Prompt wypełnienia", type: "text", default: "" },
      { key: "mask_mode", label: "Maska", type: "select", options: ["auto", "draw", "selection"], default: "auto" },
      { key: "strength", label: "Siła generacji", type: "slider", min: 0, max: 100, default: 75 },
      { key: "steps", label: "Kroki", type: "number", min: 10, max: 100, default: 30 },
    ],
  },
  {
    id: "gen_expand",
    name: "Generative Expand",
    icon: Expand,
    description: "Rozszerzanie obrazu poza oryginalne krawędzie",
    params: [
      { key: "direction", label: "Kierunek", type: "select", options: ["all", "left", "right", "up", "down"], default: "all" },
      { key: "pixels", label: "Piksele", type: "number", min: 64, max: 1024, default: 256 },
      { key: "prompt", label: "Prompt kontekstowy", type: "text", default: "" },
    ],
  },
  {
    id: "upscale",
    name: "AI Upscale",
    icon: ZoomIn,
    description: "Zwiększanie rozdzielczości z zachowaniem detali",
    params: [
      { key: "scale", label: "Skala", type: "select", options: ["2", "4", "8"], default: "2" },
      { key: "model", label: "Model", type: "select", options: ["real-esrgan", "swinir", "ultramix"], default: "real-esrgan" },
      { key: "denoise", label: "Denoise", type: "slider", min: 0, max: 100, default: 30 },
    ],
  },
  {
    id: "harmonize",
    name: "Harmonize",
    icon: SunMedium,
    description: "Dopasowanie światła i koloru obiektu do sceny",
    params: [
      { key: "strength", label: "Siła", type: "slider", min: 0, max: 100, default: 70 },
      { key: "match_lighting", label: "Dopasuj oświetlenie", type: "select", options: ["auto", "warm", "cool", "neutral"], default: "auto" },
      { key: "match_color", label: "Dopasuj kolor", type: "slider", min: 0, max: 100, default: 60 },
    ],
  },
];

export function AIEditPack() {
  const [selectedOp, setSelectedOp] = useState<string>("remove_bg");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [params, setParams] = useState<Record<string, any>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const op = AI_OPS.find((o) => o.id === selectedOp)!;

  const handleOpSelect = (id: string) => {
    setSelectedOp(id);
    const op = AI_OPS.find((o) => o.id === id)!;
    const defaults: Record<string, any> = {};
    op.params.forEach((p) => { defaults[p.key] = p.default; });
    setParams(defaults);
  };

  const handleRun = async () => {
    if (!uploadedFile) return;
    setIsProcessing(true);
    // Simulate AI processing
    await new Promise((r) => setTimeout(r, 2000));
    setIsProcessing(false);
  };

  const preview = uploadedFile ? URL.createObjectURL(uploadedFile) : null;

  return (
    <div className="grid grid-cols-[280px_1fr_300px] gap-4 h-full">
      {/* Left: Operations */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Operacje AI</h4>
        {AI_OPS.map((o) => (
          <Card
            key={o.id}
            onClick={() => handleOpSelect(o.id)}
            className={`p-3 cursor-pointer transition-all ${selectedOp === o.id ? "border-primary/50 bg-primary/5" : "hover:border-primary/20"}`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${selectedOp === o.id ? "bg-primary/20" : "bg-muted"}`}>
                <o.icon className={`h-4 w-4 ${selectedOp === o.id ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-sm font-medium">{o.name}</p>
                <p className="text-[10px] text-muted-foreground">{o.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Center: Preview */}
      <div className="flex flex-col gap-4">
        <div className="flex-1 rounded-xl border border-border bg-muted/30 overflow-hidden relative flex items-center justify-center">
          {preview ? (
            <img src={preview} alt="Preview" className="max-w-full max-h-full object-contain" />
          ) : (
            <div
              onClick={() => inputRef.current?.click()}
              className="text-center cursor-pointer p-8"
            >
              <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Wgraj obraz do edycji</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Kliknij lub przeciągnij plik</p>
            </div>
          )}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
              <div className="text-center">
                <Sparkles className="h-8 w-8 text-primary animate-pulse mx-auto mb-2" />
                <p className="text-sm text-white">Przetwarzanie AI...</p>
                <p className="text-xs text-white/60 mt-1">{op.name}</p>
              </div>
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setUploadedFile(f); e.target.value = ""; }}
        />
        {uploadedFile && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">{uploadedFile.name}</Badge>
              <Badge variant="outline" className="text-[10px]">{Math.round(uploadedFile.size / 1024)}KB</Badge>
            </div>
            <Button size="sm" variant="outline" onClick={() => setUploadedFile(null)}>Zmień obraz</Button>
          </div>
        )}
      </div>

      {/* Right: Params */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <op.icon className="h-5 w-5 text-primary" />
          <h4 className="text-sm font-bold">{op.name}</h4>
        </div>
        <p className="text-[11px] text-muted-foreground">{op.description}</p>

        <div className="space-y-3">
          {op.params.map((p) => (
            <div key={p.key} className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">{p.label}</label>
              {p.type === "text" && (
                <Input
                  value={params[p.key] || ""}
                  onChange={(e) => setParams({ ...params, [p.key]: e.target.value })}
                  className="h-8 text-xs"
                  placeholder={`Wpisz ${p.label.toLowerCase()}...`}
                />
              )}
              {p.type === "number" && (
                <Input
                  type="number"
                  value={params[p.key] || p.default}
                  min={p.min}
                  max={p.max}
                  onChange={(e) => setParams({ ...params, [p.key]: Number(e.target.value) })}
                  className="h-8 text-xs"
                />
              )}
              {p.type === "slider" && (
                <div className="flex items-center gap-2">
                  <Slider
                    value={[params[p.key] ?? p.default]}
                    onValueChange={([v]) => setParams({ ...params, [p.key]: v })}
                    min={p.min}
                    max={p.max}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{params[p.key] ?? p.default}</span>
                </div>
              )}
              {p.type === "select" && (
                <Select value={String(params[p.key] || p.default)} onValueChange={(v) => setParams({ ...params, [p.key]: v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {p.options?.map((o) => (
                      <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
        </div>

        <Button
          onClick={handleRun}
          disabled={!uploadedFile || isProcessing}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          <Wand2 className="h-4 w-4 mr-2" />
          {isProcessing ? "Przetwarzanie..." : `Zastosuj ${op.name}`}
        </Button>
      </Card>
    </div>
  );
}
