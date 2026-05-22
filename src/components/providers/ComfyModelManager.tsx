import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Box, Layers, Palette, Search, RefreshCw, Loader2,
  Download, ExternalLink, HardDrive, Sparkles, Filter
} from "lucide-react";
import { comfyApi, type ComfyModelType, type ComfyModelInfo } from "@/lib/comfyApi";

interface ComfyModelManagerProps {
  isConnected: boolean;
}

interface CatalogModel {
  id: string;
  name: string;
  type: ComfyModelType;
  description: string;
  size: string;
  source: "civitai" | "huggingface";
  url: string;
  tags: string[];
  vramRequired?: string;
}

const MODEL_CATALOG: CatalogModel[] = [
  // Checkpoints
  { id: "sdxl-base", name: "SDXL 1.0 Base", type: "checkpoints", description: "Stabilne, wszechstronne — baza do większości zadań", size: "6.9 GB", source: "huggingface", url: "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0", tags: ["SDXL", "Base", "1024px"], vramRequired: "8 GB" },
  { id: "flux-dev", name: "Flux.1 Dev", type: "checkpoints", description: "Najnowszy model Black Forest Labs — jakość DALL-E 3", size: "23.8 GB", source: "huggingface", url: "https://huggingface.co/black-forest-labs/FLUX.1-dev", tags: ["Flux", "High Quality", "1024px"], vramRequired: "12 GB" },
  { id: "flux-schnell", name: "Flux.1 Schnell", type: "checkpoints", description: "Szybka wersja Flux — 4 stepy wystarczą", size: "23.8 GB", source: "huggingface", url: "https://huggingface.co/black-forest-labs/FLUX.1-schnell", tags: ["Flux", "Fast", "1024px"], vramRequired: "12 GB" },
  { id: "sd3-medium", name: "SD 3 Medium", type: "checkpoints", description: "Stable Diffusion 3 — MMDiT architecture", size: "4.0 GB", source: "huggingface", url: "https://huggingface.co/stabilityai/stable-diffusion-3-medium", tags: ["SD3", "MMDiT", "1024px"], vramRequired: "8 GB" },
  { id: "realvisxl", name: "RealVisXL V5.0", type: "checkpoints", description: "Fotorealizm — portrety, krajobraz, product shots", size: "6.9 GB", source: "civitai", url: "https://civitai.com/models/139562", tags: ["Photorealistic", "SDXL", "Portrait"], vramRequired: "8 GB" },
  { id: "dreamshaper-xl", name: "DreamShaper XL", type: "checkpoints", description: "Kreatywny art — ilustracje, concept art, fantasy", size: "6.9 GB", source: "civitai", url: "https://civitai.com/models/112902", tags: ["Art", "SDXL", "Creative"], vramRequired: "8 GB" },
  { id: "juggernaut-xl", name: "Juggernaut XL", type: "checkpoints", description: "All-rounder SDXL z doskonałą jakością detali", size: "6.9 GB", source: "civitai", url: "https://civitai.com/models/133005", tags: ["Universal", "SDXL", "Detail"], vramRequired: "8 GB" },

  // LoRAs
  { id: "lcm-lora", name: "LCM LoRA", type: "loras", description: "Latent Consistency — przyspiesza generowanie do 4-8 stepów", size: "135 MB", source: "huggingface", url: "https://huggingface.co/latent-consistency/lcm-lora-sdxl", tags: ["Speed", "LCM", "SDXL"], vramRequired: "+0.5 GB" },
  { id: "detail-tweaker", name: "Detail Tweaker XL", type: "loras", description: "Kontrola poziomu detali — od smooth do ultra-sharp", size: "24 MB", source: "civitai", url: "https://civitai.com/models/122359", tags: ["Detail", "SDXL", "Quality"] },
  { id: "add-more-details", name: "Add More Details", type: "loras", description: "Dodaje drobne detale i tekstury do generacji", size: "24 MB", source: "civitai", url: "https://civitai.com/models/82098", tags: ["Detail", "Texture", "SDXL"] },
  { id: "film-grain-lora", name: "Film Grain Style", type: "loras", description: "Filmowe ziarno i tekstura taśmy 35mm", size: "18 MB", source: "civitai", url: "https://civitai.com/models/198246", tags: ["Film", "Grain", "Cinematic"] },
  { id: "cinematic-lora", name: "Cinematic Look", type: "loras", description: "Filmowa kolorystyka i oświetlenie kinowe", size: "24 MB", source: "civitai", url: "https://civitai.com/models/155821", tags: ["Cinematic", "Color", "Lighting"] },

  // VAE
  { id: "sdxl-vae", name: "SDXL VAE (fp16)", type: "vae", description: "Domyślny VAE dla SDXL — lepsza jakość kolorów", size: "335 MB", source: "huggingface", url: "https://huggingface.co/stabilityai/sdxl-vae", tags: ["SDXL", "Colors", "Default"], vramRequired: "+0.5 GB" },
  { id: "sd-vae-ft-mse", name: "SD VAE ft-mse", type: "vae", description: "Ulepszony VAE dla SD 1.5 — mniej artefaktów", size: "335 MB", source: "huggingface", url: "https://huggingface.co/stabilityai/sd-vae-ft-mse-original", tags: ["SD1.5", "Quality"] },

  // ControlNet
  { id: "controlnet-canny", name: "ControlNet Canny XL", type: "controlnet", description: "Kontrola krawędzi — precyzyjne odwzorowanie konturów", size: "2.5 GB", source: "huggingface", url: "https://huggingface.co/diffusers/controlnet-canny-sdxl-1.0", tags: ["Canny", "Edges", "SDXL"], vramRequired: "+3 GB" },
  { id: "controlnet-depth", name: "ControlNet Depth XL", type: "controlnet", description: "Kontrola głębi — zachowuje perspektywę sceny", size: "2.5 GB", source: "huggingface", url: "https://huggingface.co/diffusers/controlnet-depth-sdxl-1.0", tags: ["Depth", "Perspective", "SDXL"], vramRequired: "+3 GB" },
  { id: "controlnet-openpose", name: "ControlNet OpenPose XL", type: "controlnet", description: "Kontrola pozy postaci — ruch i pozycja ciała", size: "2.5 GB", source: "civitai", url: "https://civitai.com/models/136901", tags: ["Pose", "Character", "SDXL"], vramRequired: "+3 GB" },

  // Upscale
  { id: "4x-ultrasharp", name: "4x UltraSharp", type: "upscale_models", description: "Najostrzejszy upscaler — doskonały do zdjęć i renderów", size: "67 MB", source: "civitai", url: "https://civitai.com/models/116225", tags: ["4x", "Sharp", "Photo"] },
  { id: "4x-nmkd-superscale", name: "4x NMKD Superscale", type: "upscale_models", description: "Realistyczny upscale — naturalny look bez artefaktów", size: "67 MB", source: "civitai", url: "https://civitai.com/models/36600", tags: ["4x", "Natural", "Realistic"] },
];

const TAB_CONFIG: { type: ComfyModelType; label: string; icon: React.ReactNode }[] = [
  { type: "checkpoints", label: "Checkpointy", icon: <Box className="h-3 w-3" /> },
  { type: "loras", label: "LoRA", icon: <Layers className="h-3 w-3" /> },
  { type: "vae", label: "VAE", icon: <Palette className="h-3 w-3" /> },
  { type: "controlnet", label: "ControlNet", icon: <Filter className="h-3 w-3" /> },
  { type: "upscale_models", label: "Upscale", icon: <Sparkles className="h-3 w-3" /> },
];

export function ComfyModelManager({ isConnected }: ComfyModelManagerProps) {
  const [installedModels, setInstalledModels] = useState<Record<string, ComfyModelInfo[]>>({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ComfyModelType>("checkpoints");

  const fetchModels = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const models = await comfyApi.getAllModels();
      setInstalledModels(models);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [isConnected]);

  useEffect(() => {
    if (isConnected) fetchModels();
  }, [isConnected, fetchModels]);

  const installed = installedModels[activeTab] || [];
  const catalog = MODEL_CATALOG.filter((m) => m.type === activeTab);

  const filteredInstalled = installed.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredCatalog = catalog.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isModelInstalled = (catalogModel: CatalogModel) => {
    return installed.some(
      (m) =>
        m.name.toLowerCase().includes(catalogModel.id.replace(/-/g, "").toLowerCase()) ||
        m.name.toLowerCase().includes(catalogModel.name.toLowerCase().replace(/\s+/g, ""))
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <HardDrive className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-bold text-foreground">Manager modeli</h3>
        {isConnected && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px] gap-1 text-muted-foreground ml-auto"
            onClick={fetchModels}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Odśwież
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ComfyModelType)}>
        <TabsList className="w-full h-7 bg-secondary/50">
          {TAB_CONFIG.map((tab) => (
            <TabsTrigger
              key={tab.type}
              value={tab.type}
              className="text-[10px] gap-1 h-5 px-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
            >
              {tab.icon}
              {tab.label}
              {isConnected && installedModels[tab.type]?.length ? (
                <Badge variant="outline" className="text-[8px] px-1 py-0 ml-0.5 border-primary/30 text-primary">
                  {installedModels[tab.type].length}
                </Badge>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj modeli..."
              className="h-7 text-[10px] pl-7 bg-background border-border"
            />
          </div>
        </div>

        {TAB_CONFIG.map((tab) => (
          <TabsContent key={tab.type} value={tab.type} className="mt-2 space-y-3">
            {/* Installed models */}
            {isConnected && filteredInstalled.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1">
                  <HardDrive className="h-3 w-3" />
                  Zainstalowane ({filteredInstalled.length})
                </span>
                <ScrollArea className={cn(filteredInstalled.length > 6 ? "h-[140px]" : "")}>
                  <div className="space-y-1">
                    {filteredInstalled.map((model) => (
                      <div
                        key={model.path}
                        className="flex items-center gap-2 rounded bg-secondary/50 px-2.5 py-1.5 text-[10px]"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-status-ok shrink-0" />
                        <span className="truncate font-medium text-foreground flex-1">{model.name}</span>
                        <span className="text-muted-foreground font-mono text-[9px] truncate max-w-[120px]">
                          {model.path}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {isConnected && filteredInstalled.length === 0 && !loading && (
              <div className="text-[10px] text-muted-foreground italic py-2">
                Brak zainstalowanych {tab.label.toLowerCase()}. Pobierz z katalogu poniżej.
              </div>
            )}

            {!isConnected && (
              <div className="text-[10px] text-muted-foreground italic py-2">
                Połącz z ComfyUI, aby zobaczyć zainstalowane modele.
              </div>
            )}

            {/* Catalog */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1">
                <Download className="h-3 w-3" />
                Katalog popularnych modeli ({filteredCatalog.length})
              </span>
              <div className="space-y-1.5">
                {filteredCatalog.map((model) => {
                  const alreadyInstalled = isConnected && isModelInstalled(model);
                  return (
                    <div
                      key={model.id}
                      className={cn(
                        "rounded-lg border bg-card overflow-hidden",
                        alreadyInstalled ? "border-status-ok/30" : "border-border"
                      )}
                    >
                      <div className="flex items-start gap-2.5 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-foreground">{model.name}</span>
                            {alreadyInstalled && (
                              <Badge variant="outline" className="text-[8px] px-1 py-0 border-status-ok/30 text-status-ok">
                                Zainstalowany
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{model.description}</p>
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            {model.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[8px] px-1 py-0 border-border text-muted-foreground">
                                {tag}
                              </Badge>
                            ))}
                            <span className="text-[9px] text-muted-foreground font-mono ml-1">{model.size}</span>
                            {model.vramRequired && (
                              <span className="text-[9px] text-muted-foreground font-mono">• VRAM: {model.vramRequired}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[8px] px-1.5 py-0",
                              model.source === "huggingface"
                                ? "border-primary/30 text-primary"
                                : "border-status-ok/30 text-status-ok"
                            )}
                          >
                            {model.source === "huggingface" ? "🤗 HF" : "🎨 CivitAI"}
                          </Badge>
                          <a
                            href={model.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[9px] gap-1 border-primary/30 text-primary hover:bg-primary/10"
                            >
                              <ExternalLink className="h-2.5 w-2.5" />
                              Pobierz
                            </Button>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
