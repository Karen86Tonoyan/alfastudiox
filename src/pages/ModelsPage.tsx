import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Settings, RefreshCw, WifiOff } from "lucide-react";
import { useComfyModels } from "@/hooks/useComfyModels";
import { useComfyUI } from "@/hooks/useComfyUI";

type ModelCategory = "Checkpoint" | "LoRA" | "VAE" | "ControlNet" | "Upscaler";

const categoryColors: Record<ModelCategory, string> = {
  Checkpoint: "bg-node-model/20 text-node-model border-node-model/30",
  LoRA: "bg-node-prompt/20 text-node-prompt border-node-prompt/30",
  VAE: "bg-node-vae/20 text-node-vae border-node-vae/30",
  ControlNet: "bg-node-controlnet/20 text-node-controlnet border-node-controlnet/30",
  Upscaler: "bg-status-warn/20 text-status-warn border-status-warn/30",
};

const categoryPrefix: Record<ModelCategory, string> = {
  Checkpoint: "CP",
  LoRA: "LO",
  VAE: "VA",
  ControlNet: "CN",
  Upscaler: "UP",
};

const categories: ModelCategory[] = ["Checkpoint", "LoRA", "VAE", "ControlNet", "Upscaler"];

export default function ModelsPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ModelCategory | "all">("all");
  const { models, loading, refetch } = useComfyModels();
  const comfy = useComfyUI();

  const allModels = [
    ...models.checkpoints.map((m) => ({ name: m.name, category: "Checkpoint" as ModelCategory, loaded: false })),
    ...models.loras.map((m) => ({ name: m.name, category: "LoRA" as ModelCategory, loaded: false })),
    ...models.vae.map((m) => ({ name: m.name, category: "VAE" as ModelCategory, loaded: false })),
    ...models.controlnet.map((m) => ({ name: m.name, category: "ControlNet" as ModelCategory, loaded: false })),
    ...models.upscale_models.map((m) => ({ name: m.name, category: "Upscaler" as ModelCategory, loaded: false })),
  ];

  const filtered = allModels.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "all" || m.category === activeCategory;
    return matchSearch && matchCat;
  });

  const isConnected = comfy.isConnected;
  const totalCount = allModels.length;

  return (
    <div className="space-y-4">
      {/* Status bar */}
      {!isConnected && (
        <div className="flex items-center gap-2 rounded-md border border-status-warn/30 bg-status-warn/10 px-3 py-2 text-xs text-status-warn">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          ComfyUI rozłączony — połącz się przez pasek na górze, aby zobaczyć lokalne modele.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Szukaj modelu..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          <Button
            size="sm"
            variant={activeCategory === "all" ? "default" : "ghost"}
            onClick={() => setActiveCategory("all")}
          >
            Wszystkie {totalCount > 0 && <span className="ml-1 text-[10px] opacity-70">({totalCount})</span>}
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={activeCategory === cat ? "default" : "ghost"}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={refetch}
          disabled={loading || !isConnected}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Odśwież
        </Button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="ml-2 text-sm text-muted-foreground">Pobieranie modeli z ComfyUI...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && isConnected && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {allModels.length === 0 ? "Brak modeli w ComfyUI." : "Brak wyników dla podanego filtru."}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {allModels.length === 0
              ? "Umieść modele w folderze models/ ComfyUI i kliknij Odśwież."
              : "Zmień frazę lub kategorię."}
          </p>
        </div>
      )}

      {/* Models grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((model, idx) => (
            <Card
              key={`${model.category}-${model.name}-${idx}`}
              className="border-l-2"
              style={{
                borderLeftColor: `var(--node-${
                  model.category === "Checkpoint"
                    ? "model"
                    : model.category === "LoRA"
                      ? "prompt"
                      : model.category === "VAE"
                        ? "vae"
                        : model.category === "ControlNet"
                          ? "controlnet"
                          : "controlnet"
                })`,
              }}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-secondary text-xs font-bold text-muted-foreground">
                  {categoryPrefix[model.category]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{model.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className={categoryColors[model.category]}>
                      {model.category}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className="bg-status-ok/20 text-status-ok border border-status-ok/30">
                    Dostępny
                  </Badge>
                  <Button size="icon" variant="ghost" className="h-7 w-7">
                    <Settings className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
