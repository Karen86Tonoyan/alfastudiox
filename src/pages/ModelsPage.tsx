import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Settings, Download } from "lucide-react";

type ModelCategory = "Checkpoint" | "LoRA" | "VAE" | "ControlNet";

interface Model {
  name: string;
  category: ModelCategory;
  size: string;
  loaded: boolean;
}

const mockModels: Model[] = [
  { name: "sd_xl_base_1.0.safetensors", category: "Checkpoint", size: "6.94 GB", loaded: true },
  { name: "dreamshaper_8.safetensors", category: "Checkpoint", size: "2.13 GB", loaded: false },
  { name: "realisticVision_v51.safetensors", category: "Checkpoint", size: "2.13 GB", loaded: false },
  { name: "lcm-lora-sdxl.safetensors", category: "LoRA", size: "393 MB", loaded: true },
  { name: "detail_tweaker_lora.safetensors", category: "LoRA", size: "144 MB", loaded: false },
  { name: "add_detail_lora.safetensors", category: "LoRA", size: "144 MB", loaded: false },
  { name: "sdxl_vae.safetensors", category: "VAE", size: "335 MB", loaded: true },
  { name: "vae-ft-mse-840000.safetensors", category: "VAE", size: "335 MB", loaded: false },
  { name: "control_v11p_sd15_canny.pth", category: "ControlNet", size: "1.45 GB", loaded: false },
  { name: "control_v11p_sd15_openpose.pth", category: "ControlNet", size: "1.45 GB", loaded: false },
];

const categoryColors: Record<ModelCategory, string> = {
  Checkpoint: "bg-node-model/20 text-node-model border-node-model/30",
  LoRA: "bg-node-prompt/20 text-node-prompt border-node-prompt/30",
  VAE: "bg-node-vae/20 text-node-vae border-node-vae/30",
  ControlNet: "bg-node-controlnet/20 text-node-controlnet border-node-controlnet/30",
};

const categories: ModelCategory[] = ["Checkpoint", "LoRA", "VAE", "ControlNet"];

export default function ModelsPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ModelCategory | "all">("all");

  const filtered = mockModels.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "all" || m.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-4">
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
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={activeCategory === "all" ? "default" : "ghost"}
            onClick={() => setActiveCategory("all")}
          >
            Wszystkie
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
      </div>

      {/* Models grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((model) => (
          <Card key={model.name} className="border-l-2" style={{ borderLeftColor: `var(--node-${model.category === "Checkpoint" ? "model" : model.category === "LoRA" ? "prompt" : model.category === "VAE" ? "vae" : "controlnet"})` }}>
            <CardContent className="flex items-start gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-secondary text-xs font-bold text-muted-foreground">
                {model.category.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{model.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className={categoryColors[model.category]}>
                    {model.category}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{model.size}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {model.loaded ? (
                  <Badge className="bg-status-ok/20 text-status-ok border border-status-ok/30">Załadowany</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Dostępny</Badge>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7">
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
