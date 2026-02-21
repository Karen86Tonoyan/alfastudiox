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
  Cpu, Globe, Zap, Shield, ExternalLink, Settings
} from "lucide-react";
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase">Adres serwera</label>
                  <Input
                    value={ollamaConfig.baseUrl}
                    onChange={(e) => handleSaveOllamaConfig({ baseUrl: e.target.value })}
                    className="h-8 text-xs bg-background border-border font-mono"
                    placeholder="http://localhost:11434"
                  />
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

                      {provider.id === "comfyui-cloud" && (
                        <div className="space-y-1">
                          <label className="text-[10px] text-muted-foreground uppercase">URL instancji</label>
                          <Input
                            value={provider.baseUrl}
                            onChange={(e) => handleUpdateProvider(provider.id, { baseUrl: e.target.value })}
                            className="h-7 text-xs bg-background border-border font-mono"
                            placeholder="https://your-comfyui-cloud.com"
                          />
                        </div>
                      )}

                      {/* Features */}
                      <div className="flex flex-wrap gap-1">
                        {provider.features.map((f) => (
                          <Badge key={f} variant="outline" className="text-[8px] px-1.5 py-0 border-border text-muted-foreground">
                            {f}
                          </Badge>
                        ))}
                      </div>

                      {/* Available models */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase">Dostępne modele</span>
                        <div className="flex flex-wrap gap-1">
                          {getProviderModels(provider.id).map((m) => (
                            <Badge key={m.id} variant="outline" className="text-[8px] px-1.5 py-0 border-primary/20 text-primary">
                              {m.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Info */}
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
