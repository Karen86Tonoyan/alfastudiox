import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Trash2, X, Star, RefreshCw, Loader2, ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GalleryItem {
  id: string;
  prompt: string | null;
  model: string | null;
  status: "success" | "failed" | "running" | "queued";
  favorite: boolean;
  imageUrl: string | null;
  createdAt: string;
  jobName: string;
}

const statusBadge: Record<string, string> = {
  success: "bg-status-ok/20 text-status-ok",
  failed: "bg-status-danger/20 text-status-danger",
  running: "bg-node-model/20 text-node-model animate-pulse-glow",
  queued: "bg-status-warn/20 text-status-warn",
  completed: "bg-status-ok/20 text-status-ok",
  error: "bg-status-danger/20 text-status-danger",
};

const statusIcon: Record<string, string> = {
  success: "✓",
  completed: "✓",
  failed: "✗",
  error: "✗",
  running: "⋯",
  queued: "⏳",
};

function normalizeStatus(s: string | null): GalleryItem["status"] {
  if (!s) return "queued";
  if (s === "completed" || s === "success") return "success";
  if (s === "failed" || s === "error") return "failed";
  if (s === "running" || s === "processing") return "running";
  return "queued";
}

function extractFirstImageUrl(resultUrls: unknown): string | null {
  if (!resultUrls) return null;
  if (typeof resultUrls === "string") return resultUrls;
  if (Array.isArray(resultUrls) && resultUrls.length > 0) return String(resultUrls[0]);
  if (typeof resultUrls === "object" && resultUrls !== null) {
    const vals = Object.values(resultUrls as Record<string, unknown>);
    if (vals.length > 0) return String(vals[0]);
  }
  return null;
}

const FAVORITES_KEY = "gallery_favorites";

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveFavorites(ids: Set<string>) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(ids)));
}

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("controller_jobs")
        .select("id, name, status, result_urls, params, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(80);

      if (error) throw error;

      const parsed: GalleryItem[] = (data || []).map((row) => {
        const params = row.params as Record<string, unknown> | null;
        const prompt = params?.prompt as string | null ?? null;
        const model = params?.checkpoint as string | null ?? null;
        return {
          id: row.id,
          prompt,
          model,
          status: normalizeStatus(row.status),
          favorite: false,
          imageUrl: extractFirstImageUrl(row.result_urls),
          createdAt: new Date(row.created_at).toLocaleString("pl"),
          jobName: row.name || row.id.slice(0, 8),
        };
      });

      const favSet = loadFavorites();
      setItems(parsed.map((i) => ({ ...i, favorite: favSet.has(i.id) })));
    } catch (err) {
      toast.error("Błąd ładowania galerii");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveFavorites(next);
      return next;
    });
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, favorite: !i.favorite } : i))
    );
  };

  const deleteFailed = () => {
    setItems((prev) => prev.filter((i) => i.status !== "failed" && i.status !== "error"));
    toast.success("Usunięto nieudane z widoku");
  };

  const favCount = items.filter((i) => i.favorite).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="destructive" onClick={deleteFailed}>
          <Trash2 className="mr-1 h-3 w-3" />
          Usuń nieudane
        </Button>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Odśwież
        </Button>
        <span className="text-xs text-muted-foreground ml-2">
          {items.length} elementów • {favCount} ulubionych
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Ładowanie galerii...</span>
        </div>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ImageOff className="h-12 w-12 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">Brak renderów w galerii.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Uruchom render w Studio lub Render, aby zobaczyć wyniki tutaj.
          </p>
        </div>
      )}

      {/* Grid */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer overflow-hidden transition-all hover:ring-1 hover:ring-primary/50"
              onClick={() => setSelected(item)}
            >
              <div className="relative aspect-square bg-secondary/50">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.prompt ?? item.jobName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-muted-foreground/30 font-mono gap-1">
                    <ImageOff className="h-6 w-6" />
                    <span>{item.jobName}</span>
                  </div>
                )}

                {/* Status badge */}
                <div className="absolute top-2 left-2">
                  <Badge className={statusBadge[item.status] ?? statusBadge.queued} variant="outline">
                    {statusIcon[item.status] ?? "?"}
                  </Badge>
                </div>

                {/* Favorite */}
                {item.favorite && (
                  <Star className="absolute top-2 right-2 h-4 w-4 fill-status-warn text-status-warn" />
                )}
              </div>
              <CardContent className="p-2">
                <p className="truncate text-[11px] text-muted-foreground">
                  {item.prompt ?? item.jobName}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <Card className="relative w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-2 top-2 z-10"
              onClick={() => setSelected(null)}
            >
              <X className="h-4 w-4" />
            </Button>

            {selected.imageUrl ? (
              <img
                src={selected.imageUrl}
                alt={selected.prompt ?? selected.jobName}
                className="w-full rounded-t-lg object-contain max-h-96"
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-secondary/50 rounded-t-lg">
                <ImageOff className="h-10 w-10 text-muted-foreground/30" />
              </div>
            )}

            <CardContent className="space-y-2 p-4">
              <p className="text-sm text-foreground line-clamp-3">
                {selected.prompt ?? selected.jobName}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                {selected.model && <Badge variant="outline">Model: {selected.model}</Badge>}
                <Badge className={statusBadge[selected.status] ?? statusBadge.queued}>
                  {selected.status === "success" ? "Udane" : selected.status === "failed" ? "Nieudane" : "W trakcie"}
                </Badge>
                <Badge variant="outline" className="text-[9px]">{selected.createdAt}</Badge>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="ghost" onClick={() => toggleFavorite(selected.id)}>
                  <Heart
                    className={`mr-1 h-3 w-3 ${
                      selected.favorite ? "fill-status-danger text-status-danger" : ""
                    }`}
                  />
                  {selected.favorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                </Button>
                {selected.imageUrl && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={selected.imageUrl} download target="_blank" rel="noreferrer">
                      Pobierz
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
