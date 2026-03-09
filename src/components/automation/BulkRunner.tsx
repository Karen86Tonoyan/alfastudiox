import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FolderOpen, Play, Pause, X, CheckCircle, AlertCircle, Clock, Trash2, Download } from "lucide-react";

interface BulkFile {
  id: string;
  file: File;
  status: "pending" | "processing" | "done" | "error";
  progress: number;
  error?: string;
  outputUrl?: string;
}

const DEMO_RECIPES = [
  { id: "web-optimize", name: "Web Optimize (resize + webp + compress)" },
  { id: "social-ready", name: "Social Media Pack (remove bg + resize + watermark)" },
  { id: "ai-enhance", name: "AI Enhancement (denoise + upscale + sharpen)" },
  { id: "packshot", name: "Packshot Ready (remove bg + shadow + resize)" },
  { id: "thumbnail", name: "Thumbnail Generator (crop + text + compress)" },
];

export function BulkRunner() {
  const [files, setFiles] = useState<BulkFile[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    addFiles(dropped);
  }, []);

  const addFiles = (newFiles: File[]) => {
    const bulkFiles: BulkFile[] = newFiles.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      status: "pending",
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...bulkFiles]);
  };

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));
  const clearDone = () => setFiles((prev) => prev.filter((f) => f.status !== "done"));
  const clearAll = () => { setFiles([]); setIsRunning(false); setOverallProgress(0); };

  const startBatch = async () => {
    if (!selectedRecipe || files.length === 0) return;
    setIsRunning(true);
    const pending = files.filter((f) => f.status === "pending" || f.status === "error");
    for (let i = 0; i < pending.length; i++) {
      const file = pending[i];
      setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, status: "processing", progress: 0 } : f));

      // Simulate processing
      for (let p = 0; p <= 100; p += 10) {
        await new Promise((r) => setTimeout(r, 80));
        setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, progress: p } : f));
      }

      const success = Math.random() > 0.1;
      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id
            ? { ...f, status: success ? "done" : "error", progress: 100, error: success ? undefined : "Processing failed" }
            : f
        )
      );
      setOverallProgress(Math.round(((i + 1) / pending.length) * 100));
    }
    setIsRunning(false);
  };

  const stats = {
    total: files.length,
    pending: files.filter((f) => f.status === "pending").length,
    processing: files.filter((f) => f.status === "processing").length,
    done: files.filter((f) => f.status === "done").length,
    error: files.filter((f) => f.status === "error").length,
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedRecipe} onValueChange={setSelectedRecipe}>
          <SelectTrigger className="h-9 w-80 text-xs">
            <SelectValue placeholder="Wybierz przepis do zastosowania..." />
          </SelectTrigger>
          <SelectContent>
            {DEMO_RECIPES.map((r) => (
              <SelectItem key={r.id} value={r.id} className="text-xs">{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={startBatch} disabled={isRunning || !selectedRecipe || stats.pending === 0} className="bg-green-600 hover:bg-green-700">
          {isRunning ? <><Pause className="h-3 w-3 mr-1" /> Przetwarzanie...</> : <><Play className="h-3 w-3 mr-1" /> Start Batch</>}
        </Button>
        <Button variant="outline" size="sm" onClick={clearDone} disabled={stats.done === 0}>
          <CheckCircle className="h-3 w-3 mr-1" /> Wyczyść gotowe
        </Button>
        <Button variant="outline" size="sm" onClick={clearAll} disabled={files.length === 0}>
          <Trash2 className="h-3 w-3 mr-1" /> Wyczyść wszystko
        </Button>
        {stats.done > 0 && (
          <Button variant="outline" size="sm">
            <Download className="h-3 w-3 mr-1" /> Pobierz wszystkie ({stats.done})
          </Button>
        )}
      </div>

      {/* Stats */}
      {files.length > 0 && (
        <div className="flex items-center gap-4">
          <div className="flex gap-2 text-xs">
            <Badge variant="outline">{stats.total} plików</Badge>
            <Badge variant="secondary" className="text-yellow-400"><Clock className="h-3 w-3 mr-1" /> {stats.pending} oczekuje</Badge>
            {stats.processing > 0 && <Badge className="bg-blue-500/20 text-blue-400">{stats.processing} przetwarzane</Badge>}
            {stats.done > 0 && <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="h-3 w-3 mr-1" /> {stats.done} gotowe</Badge>}
            {stats.error > 0 && <Badge className="bg-destructive/20 text-destructive"><AlertCircle className="h-3 w-3 mr-1" /> {stats.error} błędy</Badge>}
          </div>
          {isRunning && (
            <div className="flex-1 max-w-xs">
              <Progress value={overallProgress} className="h-2" />
            </div>
          )}
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
      >
        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Przeciągnij pliki tutaj lub kliknij aby wybrać</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Obsługiwane: JPG, PNG, WEBP, TIFF • Bez limitu plików</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = ""; }}
      />

      {/* File Grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {files.map((bf) => (
            <Card key={bf.id} className="p-2 relative group overflow-hidden">
              <div className="aspect-square rounded overflow-hidden bg-muted mb-2 relative">
                <img src={URL.createObjectURL(bf.file)} alt={bf.file.name} className="w-full h-full object-cover" />
                {bf.status === "processing" && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                      <span className="text-[10px] text-white mt-1">{bf.progress}%</span>
                    </div>
                  </div>
                )}
                {bf.status === "done" && (
                  <div className="absolute top-1 right-1">
                    <CheckCircle className="h-5 w-5 text-green-400 drop-shadow" />
                  </div>
                )}
                {bf.status === "error" && (
                  <div className="absolute top-1 right-1">
                    <AlertCircle className="h-5 w-5 text-destructive drop-shadow" />
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(bf.id); }}
                  className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-1"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">{bf.file.name}</p>
              {bf.status === "processing" && <Progress value={bf.progress} className="h-1 mt-1" />}
            </Card>
          ))}
        </div>
      )}

      {files.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Brak plików w kolejce</p>
          <p className="text-xs mt-1">Przeciągnij pliki na strefę powyżej lub kliknij aby wybrać</p>
        </div>
      )}
    </div>
  );
}
