import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Trash2, X, Star } from "lucide-react";

interface GalleryItem {
  id: number;
  prompt: string;
  model: string;
  seed: number;
  status: "success" | "failed" | "running";
  favorite: boolean;
  color: string; // placeholder color
}

const mockGallery: GalleryItem[] = [
  { id: 47, prompt: "A majestic dragon in a cyberpunk city, neon lights", model: "SDXL Base 1.0", seed: 42, status: "success", favorite: true, color: "hsl(265,40%,30%)" },
  { id: 46, prompt: "Portrait of a woman, oil painting style, renaissance", model: "SDXL Base 1.0", seed: 1337, status: "success", favorite: false, color: "hsl(30,40%,25%)" },
  { id: 45, prompt: "Abstract landscape, vibrant colors, digital art", model: "DreamShaper 8", seed: 999, status: "failed", favorite: false, color: "hsl(0,30%,20%)" },
  { id: 44, prompt: "Futuristic spaceship interior, sci-fi concept art", model: "SDXL Base 1.0", seed: 7777, status: "success", favorite: true, color: "hsl(200,40%,25%)" },
  { id: 43, prompt: "Medieval castle on a cliff, dramatic lighting", model: "RealisticVision 5.1", seed: 256, status: "success", favorite: false, color: "hsl(142,30%,20%)" },
  { id: 42, prompt: "Generating...", model: "SDXL Base 1.0", seed: 123, status: "running", favorite: false, color: "hsl(220,30%,20%)" },
  { id: 41, prompt: "Underwater temple ruins, bioluminescent fish", model: "SDXL Base 1.0", seed: 555, status: "success", favorite: false, color: "hsl(190,40%,22%)" },
  { id: 40, prompt: "Steampunk robot portrait, detailed gears", model: "DreamShaper 8", seed: 888, status: "success", favorite: true, color: "hsl(35,35%,22%)" },
];

const statusBadge = {
  success: "bg-status-ok/20 text-status-ok",
  failed: "bg-status-danger/20 text-status-danger",
  running: "bg-node-model/20 text-node-model animate-pulse-glow",
};

export default function GalleryPage() {
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [items, setItems] = useState(mockGallery);

  const toggleFavorite = (id: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, favorite: !i.favorite } : i)));
  };

  const deleteFailed = () => {
    setItems((prev) => prev.filter((i) => i.status !== "failed"));
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="destructive" onClick={deleteFailed}>
          <Trash2 className="mr-1 h-3 w-3" />
          Usuń nieudane
        </Button>
        <span className="text-xs text-muted-foreground ml-2">
          {items.length} elementów • {items.filter((i) => i.favorite).length} ulubionych
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <Card
            key={item.id}
            className="cursor-pointer overflow-hidden transition-all hover:ring-1 hover:ring-primary/50"
            onClick={() => setSelected(item)}
          >
            {/* Placeholder image */}
            <div
              className="relative aspect-square"
              style={{ backgroundColor: item.color }}
            >
              <div className="absolute inset-0 flex items-center justify-center text-xs text-foreground/30 font-mono">
                #{item.id}
              </div>
              {/* Status badge */}
              <div className="absolute top-2 left-2">
                <Badge className={statusBadge[item.status]} variant="outline">
                  {item.status === "success" ? "✓" : item.status === "failed" ? "✗" : "⋯"}
                </Badge>
              </div>
              {/* Favorite */}
              {item.favorite && (
                <Star className="absolute top-2 right-2 h-4 w-4 fill-status-warn text-status-warn" />
              )}
            </div>
            <CardContent className="p-2">
              <p className="truncate text-[11px] text-muted-foreground">{item.prompt}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <Card className="relative w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-2 top-2 z-10"
              onClick={() => setSelected(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="aspect-video w-full" style={{ backgroundColor: selected.color }}>
              <div className="flex h-full items-center justify-center text-2xl text-foreground/20 font-mono">
                #{selected.id}
              </div>
            </div>
            <CardContent className="space-y-2 p-4">
              <p className="text-sm text-foreground">{selected.prompt}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">Model: {selected.model}</Badge>
                <Badge variant="outline">Seed: {selected.seed}</Badge>
                <Badge className={statusBadge[selected.status]}>
                  {selected.status === "success" ? "Udane" : selected.status === "failed" ? "Nieudane" : "W trakcie"}
                </Badge>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="ghost" onClick={() => toggleFavorite(selected.id)}>
                  <Heart className={`mr-1 h-3 w-3 ${selected.favorite ? "fill-status-danger text-status-danger" : ""}`} />
                  {selected.favorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
