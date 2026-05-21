import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Network, Cpu, MemoryStick, Zap, RefreshCw, Send, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  getExoConfig, saveExoConfig, fetchExoTopology, fetchExoModels,
  exoProvider, type ExoConfig, type ExoNode,
} from "@/lib/providers/exo";

export default function ExoClusterPage() {
  const [cfg, setCfg] = useState<ExoConfig>(getExoConfig());
  const [nodes, setNodes] = useState<ExoNode[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const [topo, mdls] = await Promise.all([fetchExoTopology(cfg.endpoint), fetchExoModels(cfg.endpoint)]);
    if ("error" in topo) toast.error(`Exo: ${topo.error}`);
    else setNodes(topo.nodes);
    setModels(mdls);
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  const save = () => { saveExoConfig(cfg); toast.success("Zapisano konfigurację Exo"); refresh(); };

  const send = async () => {
    if (!prompt.trim()) return;
    setSending(true); setReply("");
    const r = await exoProvider.chat!({ messages: [{ role: "user", content: prompt }] });
    setSending(false);
    if (r.error) toast.error(r.error); else setReply(r.text);
  };

  const totalMem = nodes.reduce((s, n) => s + n.memory, 0);
  const totalFlops = nodes.reduce((s, n) => s + (n.flops.fp16 || 0), 0);

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" /> Exo AI — Rozproszony Klaster
          </h1>
          <p className="text-sm text-muted-foreground">
            Uruchamiaj LLM na wielu komputerach jednocześnie (Mac, Linux, iPhone, Pi). Kompatybilne z OpenAI API.
          </p>
        </div>
        <a href="https://github.com/exo-explore/exo" target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm" className="gap-1.5"><ExternalLink className="h-3.5 w-3.5" /> Dokumentacja Exo</Button>
        </a>
      </div>

      <Tabs defaultValue="cluster" className="flex-1 flex flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="cluster">Klaster</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="settings">Ustawienia</TabsTrigger>
        </TabsList>

        <TabsContent value="cluster" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Aktywne nody</div>
              <div className="text-2xl font-bold text-primary">{nodes.length}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Łączna pamięć</div>
              <div className="text-2xl font-bold text-primary">{totalMem} GB</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Łączny FP16 FLOPS</div>
              <div className="text-2xl font-bold text-primary">{totalFlops.toFixed(2)} TF</div>
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Topologia ({cfg.endpoint})</h2>
            <Button size="sm" variant="outline" onClick={refresh} disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Odśwież
            </Button>
          </div>

          {nodes.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Brak widocznych nodów. Uruchom Exo na komputerach (<code className="text-xs bg-muted px-1 rounded">exo</code>) i sprawdź endpoint w Ustawieniach.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {nodes.map((n) => (
                <Card key={n.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-xs truncate">{n.id}</div>
                    <Badge variant="outline">{n.model}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-1"><Cpu className="h-3 w-3" /> {n.chip}</div>
                    <div className="flex items-center gap-1"><MemoryStick className="h-3 w-3" /> {n.memory} GB</div>
                    <div className="flex items-center gap-1"><Zap className="h-3 w-3" /> {n.flops.fp16?.toFixed(2) || 0} TF</div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="chat" className="mt-4 space-y-3">
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Model</Label>
              <Select value={cfg.defaultModel} onValueChange={(v) => { const n = { ...cfg, defaultModel: v }; setCfg(n); saveExoConfig(n); }}>
                <SelectTrigger className="h-8 text-xs w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(models.length ? models : [cfg.defaultModel]).map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Zapytaj klaster Exo..." className="min-h-[100px] text-sm" />
            <Button onClick={send} disabled={sending || !prompt.trim()} className="gap-1.5">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Wyślij do klastra
            </Button>
          </Card>
          {reply && (
            <Card className="p-4">
              <div className="text-[10px] uppercase text-muted-foreground mb-2">Odpowiedź</div>
              <pre className="whitespace-pre-wrap text-sm">{reply}</pre>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card className="p-4 space-y-3 max-w-2xl">
            <div>
              <Label className="text-xs">Endpoint Exo</Label>
              <Input value={cfg.endpoint} onChange={(e) => setCfg({ ...cfg, endpoint: e.target.value })} placeholder="http://192.168.1.10:52415" className="text-xs" />
              <p className="text-[10px] text-muted-foreground mt-1">Dowolny węzeł klastra — Exo automatycznie rozdzieli warstwy modelu na pozostałe maszyny.</p>
            </div>
            <div>
              <Label className="text-xs">Domyślny model</Label>
              <Input value={cfg.defaultModel} onChange={(e) => setCfg({ ...cfg, defaultModel: e.target.value })} placeholder="llama-3.2-3b" className="text-xs" />
            </div>
            <div>
              <Label className="text-xs">API Key (opcjonalnie)</Label>
              <Input type="password" value={cfg.apiKey || ""} onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })} placeholder="Pozostaw puste dla LAN" className="text-xs" />
            </div>
            <Button onClick={save} size="sm">Zapisz i odśwież</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}