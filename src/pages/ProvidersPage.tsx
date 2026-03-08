import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bot, Cloud, Loader2, RefreshCw, Check, X,
  Cpu, Globe, Zap, Shield, ExternalLink, Settings,
  Wifi, WifiOff, Server, Activity, Film, ImageIcon
} from "lucide-react";
import { useComfyUI } from "@/hooks/useComfyUI";
import { ComfyModelManager } from "@/components/providers/ComfyModelManager";
import {
  loadProviders,
  saveProviders,
  testProviderConnection,
  getProviderModels,
  type ProviderConfig,
  type ProviderType,
} from "@/lib/cloudProviders";
import {
  getOllamaConfig,
  saveOllamaConfig,
  pingOllama,
  listModels,
  type OllamaConfig,
  type OllamaModel,
} from "@/lib/ollamaApi";

export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderConfig[]>(loadProviders);
  const [ollamaConfig, setOllamaConfig] = useState<OllamaConfig>(getOllamaConfig);
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [checking, setChecking] = useState<string | null>(null);
  const [comfyUrl, setComfyUrl] = useState("localhost:8188");

  const comfy = useComfyUI();

  useEffect(() => {
    pingOllama().then((ok) => {
      setOllamaConnected(ok);
      if (ok) listModels().then(setOllamaModels).catch(() => {});
    });
  }, []);

  const handleUpdateProvider = (id: ProviderType, update: Partial<ProviderConfig>) => {
    setProviders((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...update } : p));
      saveProviders(next);
      return next;
    });
  };

  const handleTestProvider = async (provider: ProviderConfig) => {
    setChecking(provider.id);
    const ok = await testProviderConnection(provider);
    handleUpdateProvider(provider.id, { status: ok ? "connected" : "error" });
    setChecking(null);
  };

  const handleTestOllama = async () => {
    setChecking("ollama");
    const ok = await pingOllama();
    setOllamaConnected(ok);
    if (ok) {
      const m = await listModels().catch(() => []);
      setOllamaModels(m);
    }
    setChecking(null);
  };

  const handleSaveOllamaConfig = (update: Partial<OllamaConfig>) => {
    const next = { ...ollamaConfig, ...update };
    setOllamaConfig(next);
    saveOllamaConfig(next);
  };

  const formatSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  return (
    <div className="h-full flex flex-col -m-4">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-bold gold-text flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Providers & Integrations
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Połącz się z lokalnymi i chmurowymi usługami AI do renderowania
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6 max-w-3xl">
          {/* OLLAMA SECTION */}
          <section className="rounded-lg border border-primary/20 bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border-b border-primary/10">
              <Bot className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <h2 className="text-sm font-bold text-foreground">Ollama</h2>
                <p className="text-[10px] text-muted-foreground">Lokalne modele AI — bez tokena, bez limitu</p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] px-2",
                  ollamaConnected
                    ? "border-status-ok/30 text-status-ok"
                    : "border-destructive/30 text-destructive"
                )}
              >
                {ollamaConnected ? "Połączony" : "Rozłączony"}
              </Badge>
            </div>

            <div className="p-4 space-y-3">
              {/* ngrok hint */}
              {ollamaConfig.baseUrl.includes("localhost") && (
                <div className="rounded bg-primary/5 border border-primary/20 p-2.5 text-[10px] text-muted-foreground space-y-1">
                  <p className="font-semibold text-primary flex items-center gap-1.5">
                    <Globe className="h-3 w-3" /> Tryb tunelu (ngrok)
                  </p>
                  <p>Aby testować z preview Lovable bez klonowania repo:</p>
                  <p>1. Zainstaluj ngrok: <span className="font-mono text-primary">brew install ngrok</span> lub pobierz z ngrok.com</p>
                  <p>2. Uruchom tunel: <span className="font-mono text-primary">ngrok http 11434</span></p>
                  <p>3. Wklej publiczny URL (np. <span className="font-mono text-primary">https://abc123.ngrok-free.app</span>) poniżej</p>
                  <p className="text-[9px] text-muted-foreground/70">Uwaga: Ollama wymaga ustawienia <span className="font-mono">OLLAMA_ORIGINS=*</span> aby akceptować żądania z zewnątrz</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase">Adres serwera</label>
                  <Input
                    value={ollamaConfig.baseUrl}
                    onChange={(e) => handleSaveOllamaConfig({ baseUrl: e.target.value })}
                    className="h-8 text-xs bg-background border-border font-mono"
                    placeholder="https://abc123.ngrok-free.app"
                  />
                  {ollamaConfig.baseUrl.includes("ngrok") && (
                    <span className="text-[9px] text-status-ok flex items-center gap-1">
                      <Globe className="h-2.5 w-2.5" /> Tryb tunelu aktywny
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase">Domyślny model</label>
                  {ollamaModels.length > 0 ? (
                    <Select
                      value={ollamaConfig.defaultModel}
                      onValueChange={(v) => handleSaveOllamaConfig({ defaultModel: v })}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ollamaModels.map((m) => (
                          <SelectItem key={m.name} value={m.name} className="text-xs">
                            {m.name}
                            <span className="text-muted-foreground ml-2">({formatSize(m.size)})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={ollamaConfig.defaultModel}
                      onChange={(e) => handleSaveOllamaConfig({ defaultModel: e.target.value })}
                      className="h-8 text-xs bg-background border-border"
                      placeholder="llama3.2"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={ollamaConfig.enabled}
                  onCheckedChange={(v) => handleSaveOllamaConfig({ enabled: v })}
                />
                <span className="text-xs text-muted-foreground">Włącz integrację</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto h-7 gap-1.5 text-[10px] border-primary/30 text-primary"
                  onClick={handleTestOllama}
                  disabled={checking === "ollama"}
                >
                  {checking === "ollama" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Test połączenia
                </Button>
              </div>

              {/* Installed models */}
              {ollamaModels.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Zainstalowane modele ({ollamaModels.length})
                  </span>
                  <div className="grid grid-cols-2 gap-1">
                    {ollamaModels.map((m) => (
                      <div
                        key={m.name}
                        className="flex items-center gap-2 rounded bg-secondary/50 px-2 py-1.5 text-[10px]"
                      >
                        <Cpu className="h-3 w-3 text-primary shrink-0" />
                        <span className="truncate font-medium text-foreground">{m.name}</span>
                        <span className="ml-auto text-muted-foreground font-mono">{formatSize(m.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded bg-secondary/30 p-2.5 text-[10px] text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">💡 Jak zainstalować Ollama:</p>
                <p>1. Pobierz z <span className="text-primary font-mono">ollama.com</span></p>
                <p>2. Zainstaluj i uruchom <span className="font-mono text-primary">ollama serve</span></p>
                <p>3. Pobierz model: <span className="font-mono text-primary">ollama pull llama3.2</span></p>
                <p>4. Dla analizy obrazów: <span className="font-mono text-primary">ollama pull llava</span></p>
              </div>
            </div>
          </section>

          {/* COMFYUI SECTION */}
          <section className="rounded-lg border border-primary/20 bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border-b border-primary/10">
              <Server className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <h2 className="text-sm font-bold text-foreground">ComfyUI</h2>
                <p className="text-[10px] text-muted-foreground">Lokalny silnik renderowania — WebSocket API</p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] px-2",
                  comfy.isConnected
                    ? "border-status-ok/30 text-status-ok"
                    : comfy.status === "connecting"
                    ? "border-status-warn/30 text-status-warn"
                    : comfy.status === "error"
                    ? "border-destructive/30 text-destructive"
                    : "border-border text-muted-foreground"
                )}
              >
                {comfy.isConnected ? "Połączony" : comfy.status === "connecting" ? "Łączenie..." : comfy.status === "error" ? "Błąd" : "Rozłączony"}
              </Badge>
            </div>

            <div className="p-4 space-y-3">
              {/* ngrok hint for ComfyUI */}
              {comfyUrl.includes("localhost") && (
                <div className="rounded bg-primary/5 border border-primary/20 p-2.5 text-[10px] text-muted-foreground space-y-1">
                  <p className="font-semibold text-primary flex items-center gap-1.5">
                    <Globe className="h-3 w-3" /> Tryb tunelu (ngrok)
                  </p>
                  <p>Aby połączyć ComfyUI z preview Lovable:</p>
                  <p>1. Uruchom tunel: <span className="font-mono text-primary">ngrok http 8188</span></p>
                  <p>2. Wklej publiczny URL poniżej (bez <span className="font-mono">https://</span>), np. <span className="font-mono text-primary">abc123.ngrok-free.app</span></p>
                  <p className="text-[9px] text-muted-foreground/70">ComfyUI musi nasłuchiwać na 0.0.0.0: <span className="font-mono">python main.py --listen 0.0.0.0</span></p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase">Adres serwera</label>
                  <Input
                    value={comfyUrl}
                    onChange={(e) => setComfyUrl(e.target.value)}
                    className="h-8 text-xs bg-background border-border font-mono"
                    placeholder="abc123.ngrok-free.app"
                    disabled={comfy.isConnected}
                  />
                  {comfyUrl.includes("ngrok") && (
                    <span className="text-[9px] text-status-ok flex items-center gap-1">
                      <Globe className="h-2.5 w-2.5" /> Tryb tunelu aktywny
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase">Protokół</label>
                  <Input
                    value={comfyUrl.includes("ngrok") ? "WebSocket (wss://)" : "WebSocket (ws://)"}
                    className="h-8 text-xs bg-background border-border font-mono text-muted-foreground"
                    disabled
                  />
                </div>
              </div>

              {/* GPU Info */}
              {comfy.isConnected && comfy.gpu && (
                <div className="rounded bg-secondary/50 p-2.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Activity className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-semibold text-foreground">{comfy.gpu.name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div>
                      <span className="text-muted-foreground">VRAM: </span>
                      <span className="font-mono text-foreground">
                        {comfy.gpu.vramUsed.toFixed(1)}/{comfy.gpu.vramTotal.toFixed(1)} GB
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Temp: </span>
                      <span className={cn("font-mono", comfy.gpu.temp > 80 ? "text-destructive" : "text-foreground")}>
                        {Math.round(comfy.gpu.temp)}°C
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">CUDA: </span>
                      <span className={cn("font-mono", comfy.gpu.cudaAvailable ? "text-status-ok" : "text-destructive")}>
                        {comfy.gpu.cudaAvailable ? "Tak" : "Nie"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Queue info */}
              {comfy.isConnected && comfy.queueSize > 0 && (
                <div className="flex items-center gap-2 text-[10px]">
                  <Badge variant="outline" className="border-primary/30 text-primary font-mono">
                    Kolejka: {comfy.queueSize}
                  </Badge>
                  {comfy.currentNode && (
                    <span className="text-muted-foreground font-mono truncate">▸ {comfy.currentNode}</span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                {comfy.isConnected ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-[10px] border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={comfy.disconnect}
                  >
                    <WifiOff className="h-3 w-3" />
                    Rozłącz
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-[10px] border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => comfy.connect(comfyUrl)}
                    disabled={comfy.status === "connecting"}
                  >
                    {comfy.status === "connecting" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Wifi className="h-3 w-3" />
                    )}
                    Połącz
                  </Button>
                )}
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-1">
                {["WebSocket Live", "GPU Monitor", "Queue Manager", "Workflow API", "Auto-reconnect", "CUDA"].map((f) => (
                  <Badge key={f} variant="outline" className="text-[8px] px-1.5 py-0 border-border text-muted-foreground">
                    {f}
                  </Badge>
                ))}
              </div>

              <div className="rounded bg-secondary/30 p-2.5 text-[10px] text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">💡 Jak uruchomić ComfyUI:</p>
                <p>1. Zainstaluj z <span className="text-primary font-mono">github.com/comfyanonymous/ComfyUI</span></p>
                <p>2. Uruchom: <span className="font-mono text-primary">python main.py --listen 0.0.0.0</span></p>
                <p>3. Domyślny port: <span className="font-mono text-primary">8188</span> (WebSocket + REST)</p>
                <p>4. Sprawdź w przeglądarce: <span className="font-mono text-primary">http://localhost:8188</span></p>
              </div>

              {/* Model Manager */}
              <ComfyModelManager isConnected={comfy.isConnected} />
            </div>
          </section>

          {/* CLOUD PROVIDERS */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Cloud Providers</h2>
              <Badge variant="outline" className="text-[9px] border-status-warn/30 text-status-warn ml-2">
                Wymaga API Key
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Klucze API są przechowywane lokalnie w przeglądarce. Do bezpiecznego zarządzania kluczami
              aktywuj Lovable Cloud.
            </p>

            <div className="space-y-2">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="rounded-lg border border-border bg-card overflow-hidden"
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="text-lg">{provider.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-foreground">{provider.name}</h3>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[8px] px-1.5",
                            provider.status === "connected"
                              ? "border-status-ok/30 text-status-ok"
                              : provider.status === "error"
                              ? "border-destructive/30 text-destructive"
                              : "border-border text-muted-foreground"
                          )}
                        >
                          {provider.status === "connected" ? "OK" : provider.status === "error" ? "Błąd" : "—"}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{provider.description}</p>
                    </div>
                    <Switch
                      checked={provider.enabled}
                      onCheckedChange={(v) => handleUpdateProvider(provider.id, { enabled: v })}
                    />
                  </div>

                  {provider.enabled && (
                    <div className="border-t border-border px-4 py-3 space-y-2.5 bg-secondary/20">
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground uppercase">API Key</label>
                        <div className="flex gap-1.5">
                          <Input
                            type="password"
                            value={provider.apiKey}
                            onChange={(e) => handleUpdateProvider(provider.id, { apiKey: e.target.value })}
                            className="h-7 text-xs bg-background border-border font-mono flex-1"
                            placeholder={`${provider.name} API Key...`}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] gap-1 border-primary/30 text-primary"
                            onClick={() => handleTestProvider(provider)}
                            disabled={checking === provider.id}
                          >
                            {checking === provider.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Zap className="h-3 w-3" />
                            )}
                            Test
                          </Button>
                        </div>
                      </div>


                      {/* Features */}
                      <div className="flex flex-wrap gap-1">
                        {provider.features.map((f) => (
                          <Badge key={f} variant="outline" className="text-[8px] px-1.5 py-0 border-border text-muted-foreground">
                            {f}
                          </Badge>
                        ))}
                      </div>

                      {/* Available models — image */}
                      {(() => {
                        const allModels = getProviderModels(provider.id);
                        const videoKeywords = ["video", "svd", "animate", "veo", "liveportrait"];
                        const imageModels = allModels.filter((m) => !videoKeywords.some((k) => m.id.toLowerCase().includes(k) || m.name.toLowerCase().includes(k)));
                        const videoModels = allModels.filter((m) => videoKeywords.some((k) => m.id.toLowerCase().includes(k) || m.name.toLowerCase().includes(k)));
                        return (
                          <>
                            {imageModels.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                                  <ImageIcon className="h-3 w-3" /> Modele Image
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {imageModels.map((m) => (
                                    <Badge key={m.id} variant="outline" className="text-[8px] px-1.5 py-0 border-primary/20 text-primary">
                                      {m.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {videoModels.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                                  <Film className="h-3 w-3 text-status-warn" /> Modele Video
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {videoModels.map((m) => (
                                    <Badge key={m.id} variant="outline" className="text-[8px] px-1.5 py-0 border-status-warn/30 text-status-warn">
                                      {m.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* VIDEO MODELS OVERVIEW */}
          <section className="rounded-lg border border-status-warn/20 bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-status-warn/5 border-b border-status-warn/10">
              <Film className="h-5 w-5 text-status-warn" />
              <div className="flex-1">
                <h2 className="text-sm font-bold text-foreground">Modele Video — Przegląd</h2>
                <p className="text-[10px] text-muted-foreground">Wszystkie dostępne modele do generowania wideo</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {/* Local models */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1">
                  <Server className="h-3 w-3" /> Lokalne (ComfyUI / GPU)
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { name: "AnimateDiff", vram: "7 GB", desc: "Krótkie animacje z SD 1.5" },
                    { name: "WanVideo", vram: "8 GB", desc: "Chińskie modele text-to-video" },
                    { name: "Stable Video Diffusion", vram: "10 GB", desc: "Stabilne generowanie wideo" },
                    { name: "SVD-XT (img2vid)", vram: "12 GB", desc: "Obraz → wideo, 25 klatek" },
                    { name: "LivePortrait", vram: "4 GB", desc: "Animacja portretów" },
                  ].map((m) => (
                    <div key={m.name} className="flex items-center gap-2 rounded bg-secondary/50 px-2.5 py-2 text-[10px]">
                      <Film className="h-3 w-3 text-status-warn shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-foreground block truncate">{m.name}</span>
                        <span className="text-muted-foreground">{m.desc}</span>
                      </div>
                      <Badge variant="outline" className="text-[8px] px-1 py-0 border-primary/30 text-primary shrink-0">
                        {m.vram}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cloud video models */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1">
                  <Cloud className="h-3 w-3" /> Cloud Providers
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { name: "SVD (Replicate)", provider: "Replicate", desc: "Stable Video Diffusion" },
                    { name: "AnimateDiff (Replicate)", provider: "Replicate", desc: "SD 1.5 animacje" },
                    { name: "Veo 2 (Google)", provider: "Google", desc: "Google video gen" },
                    { name: "Kimi Video", provider: "Kimi", desc: "Moonshot video gen" },
                    { name: "Wanx Video (Qwen)", provider: "Qwen", desc: "Alibaba video gen" },
                  ].map((m) => (
                    <div key={m.name} className="flex items-center gap-2 rounded bg-secondary/50 px-2.5 py-2 text-[10px]">
                      <Film className="h-3 w-3 text-status-warn shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-foreground block truncate">{m.name}</span>
                        <span className="text-muted-foreground">{m.desc}</span>
                      </div>
                      <Badge variant="outline" className="text-[8px] px-1 py-0 border-status-warn/30 text-status-warn shrink-0">
                        {m.provider}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded bg-secondary/30 p-2.5 text-[10px] text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">💡 Jak korzystać z video:</p>
                <p>1. W <span className="text-primary font-mono">Render Studio</span> przełącz na tryb <span className="text-status-warn font-semibold">Video</span></p>
                <p>2. Wybierz model wideo (AnimateDiff, WanVideo, SVD...)</p>
                <p>3. Ustaw liczbę klatek (Frames) i FPS</p>
                <p>4. Lokalne modele wymagają <span className="text-primary font-mono">ComfyUI</span> na Twoim GPU</p>
                <p>5. Cloud modele wymagają klucza API odpowiedniego providera</p>
              </div>
            </div>
          </section>

          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-foreground">Bezpieczeństwo</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Klucze API są przechowywane w localStorage przeglądarki. Dla bezpieczniejszego rozwiązania
              zalecamy aktywację Lovable Cloud, który szyfruje sekrety i udostępnia je przez Edge Functions.
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Ollama działa całkowicie lokalnie i nie wymaga żadnych kluczy ani tokenów —
              Twoje dane nigdy nie opuszczają Twojego komputera.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
