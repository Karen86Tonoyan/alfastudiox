import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Download, Upload, RotateCcw, Save, Plus, Trash2, Settings2, Cable, Zap, Loader2 } from "lucide-react";
import {
  DEFAULT_CONFIG,
  exportControllerConfig,
  loadControllerConfig,
  saveControllerConfig,
  sanitizeConfig,
  type ControllerConfig,
  type NodeConfig,
} from "@/lib/controllerConfig";
import { probeAllNodes, type LinkProbeResult } from "@/lib/networkLinks";

function newNode(idx: number): NodeConfig {
  return {
    id: `node${idx}`,
    name: `node-${idx}`,
    api_url: "http://192.168.1.10:8188",
    enabled: true,
    role: "worker",
    priority: 5,
    max_parallel_jobs: 1,
    tags: [],
  };
}

export default function ControllerConfigPage() {
  const [cfg, setCfg] = useState<ControllerConfig>(() => loadControllerConfig());
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [probing, setProbing] = useState(false);
  const [probeResults, setProbeResults] = useState<LinkProbeResult[] | null>(null);

  function update<K extends keyof ControllerConfig>(key: K, value: ControllerConfig[K]) {
    setCfg((c) => ({ ...c, [key]: value }));
    setDirty(true);
  }

  function patchSection<K extends keyof ControllerConfig>(key: K, patch: Partial<ControllerConfig[K]>) {
    setCfg((c) => ({ ...c, [key]: { ...(c[key] as object), ...patch } as ControllerConfig[K] }));
    setDirty(true);
  }

  function handleSave() {
    const clean = sanitizeConfig(cfg);
    saveControllerConfig(clean);
    setCfg(clean);
    setDirty(false);
    toast.success("Konfiguracja zapisana");
  }

  function handleReset() {
    setCfg(DEFAULT_CONFIG);
    setDirty(true);
    toast.info('Przywrócono domyślne wartości — kliknij "Zapisz", aby utrwalić.');
  }

  function handleExport() {
    exportControllerConfig(cfg);
    toast.success("Pobieram config.json");
  }

  async function handleImport(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const clean = sanitizeConfig(parsed);
      setCfg(clean);
      setDirty(true);
      toast.success('Zaimportowano — przejrzyj i kliknij "Zapisz".');
    } catch (e) {
      toast.error(`Import nieudany: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ---- nodes ----
  function addNode() {
    const n = newNode(cfg.nodes.length + 1);
    update("nodes", [...cfg.nodes, n]);
  }
  function updateNode(idx: number, patch: Partial<NodeConfig>) {
    const next = cfg.nodes.map((n, i) => (i === idx ? { ...n, ...patch } : n));
    update("nodes", next);
  }
  function removeNode(idx: number) {
    update("nodes", cfg.nodes.filter((_, i) => i !== idx));
  }
  function setMaster(idx: number) {
    const next = cfg.nodes.map((n, i) => ({ ...n, role: i === idx ? "master" : "worker" } as NodeConfig));
    update("nodes", next);
  }

  async function runProbe() {
    setProbing(true);
    try {
      const results = await probeAllNodes(sanitizeConfig(cfg));
      setProbeResults(results);
      const failed = results.filter((r) => r.control.latencyMs === null).length;
      if (failed === 0) toast.success(`Test linków OK — ${results.length} nodów`);
      else toast.warning(`${failed}/${results.length} nodów nieosiągalnych po linku kontrolnym`);
    } finally {
      setProbing(false);
    }
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Settings2 className="h-7 w-7 text-primary" />
            ComfyUI Controller — Ustawienia
          </h1>
          <p className="text-muted-foreground">
            Proste, praktyczne ustawienia dla wielo-node'owego sterowania ComfyUI.
            {dirty && <Badge variant="outline" className="ml-2">Niezapisane zmiany</Badge>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} className="gap-2"><Save className="h-4 w-4" />Zapisz</Button>
          <Button onClick={handleExport} variant="secondary" className="gap-2"><Download className="h-4 w-4" />Eksport JSON</Button>
          <Button onClick={() => fileRef.current?.click()} variant="secondary" className="gap-2"><Upload className="h-4 w-4" />Import JSON</Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = "";
            }}
          />
          <Button onClick={handleReset} variant="destructive" className="gap-2"><RotateCcw className="h-4 w-4" />Domyślne</Button>
        </div>
      </div>

      <Tabs defaultValue="nodes" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="nodes">Nodes</TabsTrigger>
          <TabsTrigger value="controller">Controller</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="routing">Routing</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="execution">Execution</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        {/* NODES */}
        <TabsContent value="nodes" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={addNode} size="sm" className="gap-2"><Plus className="h-4 w-4" />Dodaj node</Button>
          </div>
          {cfg.nodes.map((n, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {n.name || `node-${i + 1}`}{" "}
                    <Badge variant={n.role === "master" ? "default" : "outline"} className="ml-2">{n.role}</Badge>
                    {!n.enabled && <Badge variant="destructive" className="ml-2">disabled</Badge>}
                  </CardTitle>
                  <div className="flex gap-2">
                    {n.role !== "master" && (
                      <Button size="sm" variant="outline" onClick={() => setMaster(i)}>Ustaw jako master</Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => removeNode(i)} className="gap-1">
                      <Trash2 className="h-3 w-3" />Usuń
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>ID</Label>
                  <Input value={n.id} onChange={(e) => updateNode(i, { id: e.target.value })} />
                </div>
                <div>
                  <Label>Nazwa</Label>
                  <Input value={n.name} onChange={(e) => updateNode(i, { name: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>API URL</Label>
                  <Input value={n.api_url} onChange={(e) => updateNode(i, { api_url: e.target.value })} placeholder="http://host:8188" />
                  <p className="mt-1 text-xs text-muted-foreground">Link kontrolny (Ethernet) — queue, status, healthcheck.</p>
                </div>
                <div className="md:col-span-2">
                  <Label className="flex items-center gap-2"><Zap className="h-3.5 w-3.5" />Data URL (opcjonalny — Thunderbolt)</Label>
                  <Input
                    value={n.data_url ?? ""}
                    onChange={(e) => updateNode(i, { data_url: e.target.value || undefined })}
                    placeholder="http://thunderbolt-host:8188"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Używany do uploadu inputów i pobierania outputów gdy „Preferuj data link" jest włączony.
                    Puste = ten sam endpoint co API URL.
                  </p>
                </div>
                <div>
                  <Label>Control link override</Label>
                  <Select
                    value={n.control_link ?? "auto"}
                    onValueChange={(v) => updateNode(i, { control_link: v === "auto" ? undefined : (v as NodeConfig["control_link"]) })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["auto","ethernet","thunderbolt","wifi"] as const).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data link override</Label>
                  <Select
                    value={n.data_link ?? "auto"}
                    onValueChange={(v) => updateNode(i, { data_link: v === "auto" ? undefined : (v as NodeConfig["data_link"]) })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["auto","ethernet","thunderbolt","wifi"] as const).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority (1 = najwyższy)</Label>
                  <Input type="number" min={1} max={100} value={n.priority}
                    onChange={(e) => updateNode(i, { priority: Number(e.target.value) || 1 })} />
                </div>
                <div>
                  <Label>Max parallel jobs</Label>
                  <Input type="number" min={1} max={32} value={n.max_parallel_jobs}
                    onChange={(e) => updateNode(i, { max_parallel_jobs: Number(e.target.value) || 1 })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Tagi (oddziel przecinkiem)</Label>
                  <Input
                    value={n.tags.join(", ")}
                    onChange={(e) =>
                      updateNode(i, {
                        tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                      })
                    }
                    placeholder="sdxl, fast, flux"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={n.enabled} onCheckedChange={(v) => updateNode(i, { enabled: v })} />
                  <Label>Enabled</Label>
                </div>
              </CardContent>
            </Card>
          ))}
          {cfg.nodes.length === 0 && (
            <p className="text-sm text-muted-foreground">Brak nodów — dodaj pierwszy.</p>
          )}
        </TabsContent>

        {/* CONTROLLER */}
        <TabsContent value="controller">
          <Card><CardContent className="grid gap-3 p-6 md:grid-cols-2">
            <Field label="Host"><Input value={cfg.controller.host} onChange={(e) => patchSection("controller", { host: e.target.value })} /></Field>
            <Field label="Port"><Input type="number" value={cfg.controller.port} onChange={(e) => patchSection("controller", { port: Number(e.target.value) || 0 })} /></Field>
            <Field label="Poll interval (ms)"><Input type="number" value={cfg.controller.poll_interval_ms} onChange={(e) => patchSection("controller", { poll_interval_ms: Number(e.target.value) || 0 })} /></Field>
            <Field label="Request timeout (s)"><Input type="number" value={cfg.controller.request_timeout_sec} onChange={(e) => patchSection("controller", { request_timeout_sec: Number(e.target.value) || 0 })} /></Field>
            <Field label="Retry count"><Input type="number" value={cfg.controller.retry_count} onChange={(e) => patchSection("controller", { retry_count: Number(e.target.value) || 0 })} /></Field>
            <Field label="Log level">
              <Select value={cfg.controller.log_level} onValueChange={(v) => patchSection("controller", { log_level: v as ControllerConfig["controller"]["log_level"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["debug", "info", "warn", "error"] as const).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </CardContent></Card>
        </TabsContent>

        {/* QUEUE */}
        <TabsContent value="queue">
          <Card><CardContent className="grid gap-3 p-6 md:grid-cols-2">
            <Field label="Mode">
              <Select value={cfg.queue.mode} onValueChange={(v) => patchSection("queue", { mode: v as ControllerConfig["queue"]["mode"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fifo">fifo</SelectItem>
                  <SelectItem value="priority">priority</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Default priority"><Input type="number" value={cfg.queue.default_priority} onChange={(e) => patchSection("queue", { default_priority: Number(e.target.value) || 1 })} /></Field>
            <Field label="Max queue size"><Input type="number" value={cfg.queue.max_queue_size} onChange={(e) => patchSection("queue", { max_queue_size: Number(e.target.value) || 1 })} /></Field>
            <Field label="Max retries"><Input type="number" value={cfg.queue.max_retries} onChange={(e) => patchSection("queue", { max_retries: Number(e.target.value) || 0 })} /></Field>
            <SwitchField label="Retry failed jobs" checked={cfg.queue.retry_failed_jobs} onChange={(v) => patchSection("queue", { retry_failed_jobs: v })} />
          </CardContent></Card>
        </TabsContent>

        {/* ROUTING */}
        <TabsContent value="routing">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Strategia routingu</CardTitle>
              <CardDescription>
                <strong>least_busy</strong> — najlepsze na start ·
                <strong> round_robin</strong> — najprostsze ·
                <strong> priority_order</strong> — jeden komputer ma najlepsze GPU ·
                <strong> by_tag</strong> — różne modele/możliwości na nodach
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <Field label="Strategy">
                <Select value={cfg.routing.strategy} onValueChange={(v) => patchSection("routing", { strategy: v as ControllerConfig["routing"]["strategy"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="least_busy">least_busy</SelectItem>
                    <SelectItem value="round_robin">round_robin</SelectItem>
                    <SelectItem value="priority_order">priority_order</SelectItem>
                    <SelectItem value="by_tag">by_tag</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <SwitchField label="Fallback enabled" checked={cfg.routing.fallback_enabled} onChange={(v) => patchSection("routing", { fallback_enabled: v })} />
              <SwitchField label="Respect tags" checked={cfg.routing.respect_tags} onChange={(v) => patchSection("routing", { respect_tags: v })} />
              <SwitchField label="Avoid offline nodes" checked={cfg.routing.avoid_offline_nodes} onChange={(v) => patchSection("routing", { avoid_offline_nodes: v })} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* STORAGE */}
        <TabsContent value="storage">
          <Card><CardContent className="grid gap-3 p-6">
            <Field label="Workflow dir"><Input value={cfg.storage.workflow_dir} onChange={(e) => patchSection("storage", { workflow_dir: e.target.value })} /></Field>
            <Field label="Output dir"><Input value={cfg.storage.output_dir} onChange={(e) => patchSection("storage", { output_dir: e.target.value })} /></Field>
            <Field label="Temp dir"><Input value={cfg.storage.temp_dir} onChange={(e) => patchSection("storage", { temp_dir: e.target.value })} /></Field>
            <Field label="Log dir"><Input value={cfg.storage.log_dir} onChange={(e) => patchSection("storage", { log_dir: e.target.value })} /></Field>
            <p className="text-xs text-muted-foreground">
              Ścieżki są referencjami dla hostów renderujących — przeglądarka nie zapisuje plików bezpośrednio.
            </p>
          </CardContent></Card>
        </TabsContent>

        {/* NETWORK */}
        <TabsContent value="network">
          <Card><CardContent className="grid gap-3 p-6 md:grid-cols-2">
            <Field label="Control network">
              <Select value={cfg.network.control_network} onValueChange={(v) => patchSection("network", { control_network: v as ControllerConfig["network"]["control_network"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["ethernet","thunderbolt","wifi","auto"] as const).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Data network">
              <Select value={cfg.network.data_network} onValueChange={(v) => patchSection("network", { data_network: v as ControllerConfig["network"]["data_network"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["ethernet","thunderbolt","wifi","auto"] as const).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <SwitchField label="Preferuj data link do transferów" checked={cfg.network.prefer_data_transfer_link} onChange={(v) => patchSection("network", { prefer_data_transfer_link: v })} />
            <div />
            <Field label="Shared input path"><Input value={cfg.network.shared_input_path} onChange={(e) => patchSection("network", { shared_input_path: e.target.value })} /></Field>
            <Field label="Shared output path"><Input value={cfg.network.shared_output_path} onChange={(e) => patchSection("network", { shared_output_path: e.target.value })} /></Field>
          </CardContent></Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Cable className="h-4 w-4" /> Test linków (Ethernet vs Thunderbolt)
              </CardTitle>
              <CardDescription>
                Sprawdza osiągalność każdego node'a osobno po linku kontrolnym (API URL) i danych (Data URL).
                Wymaga, by hosty ComfyUI miały otwarte CORS dla tej domeny.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={runProbe} disabled={probing} className="gap-2">
                {probing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Uruchom test
              </Button>

              {probeResults && probeResults.length === 0 && (
                <p className="text-sm text-muted-foreground">Brak włączonych nodów do przetestowania.</p>
              )}

              {probeResults && probeResults.length > 0 && (
                <div className="space-y-2">
                  {probeResults.map((r) => {
                    const ctrlOk = r.control.latencyMs !== null;
                    const dataOk = r.data.latencyMs !== null;
                    const dataFaster =
                      ctrlOk && dataOk && r.data.url !== r.control.url &&
                      (r.data.latencyMs as number) < (r.control.latencyMs as number);
                    return (
                      <div key={r.nodeId} className="rounded border p-3 text-sm">
                        <div className="font-medium">{r.nodeName}</div>
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          <div className="rounded bg-muted/50 p-2">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Cable className="h-3 w-3" /> Control · {r.control.link}
                              </span>
                              <Badge variant={ctrlOk ? "default" : "destructive"}>
                                {ctrlOk ? `${r.control.latencyMs} ms` : "offline"}
                              </Badge>
                            </div>
                            <div className="mt-1 truncate text-xs text-muted-foreground">{r.control.url}</div>
                          </div>
                          <div className="rounded bg-muted/50 p-2">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Zap className="h-3 w-3" /> Data · {r.data.link}
                                {dataFaster && <Badge variant="outline" className="ml-1">faster</Badge>}
                                {r.data.usedFallback && <Badge variant="outline" className="ml-1">fallback → control</Badge>}
                              </span>
                              <Badge variant={dataOk ? "default" : "destructive"}>
                                {dataOk ? `${r.data.latencyMs} ms` : "offline"}
                              </Badge>
                            </div>
                            <div className="mt-1 truncate text-xs text-muted-foreground">{r.data.url}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXECUTION */}
        <TabsContent value="execution">
          <Card><CardContent className="grid gap-3 p-6 md:grid-cols-2">
            <SwitchField label="Send workflow API" checked={cfg.execution.send_workflow_api} onChange={(v) => patchSection("execution", { send_workflow_api: v })} />
            <SwitchField label="Upload inputs before run" checked={cfg.execution.upload_inputs_before_run} onChange={(v) => patchSection("execution", { upload_inputs_before_run: v })} />
            <SwitchField label="Download outputs after run" checked={cfg.execution.download_outputs_after_run} onChange={(v) => patchSection("execution", { download_outputs_after_run: v })} />
            <SwitchField label="Cleanup temp after success" checked={cfg.execution.cleanup_temp_after_success} onChange={(v) => patchSection("execution", { cleanup_temp_after_success: v })} />
            <SwitchField label="Cancel on timeout" checked={cfg.execution.cancel_on_timeout} onChange={(v) => patchSection("execution", { cancel_on_timeout: v })} />
            <Field label="Job timeout (s)"><Input type="number" value={cfg.execution.job_timeout_sec} onChange={(e) => patchSection("execution", { job_timeout_sec: Number(e.target.value) || 1 })} /></Field>
          </CardContent></Card>
        </TabsContent>

        {/* HEALTH */}
        <TabsContent value="health">
          <Card><CardContent className="grid gap-3 p-6 md:grid-cols-2">
            <SwitchField label="Healthcheck włączony" checked={cfg.health.enabled} onChange={(v) => patchSection("health", { enabled: v })} />
            <Field label="Ping interval (s)"><Input type="number" value={cfg.health.ping_interval_sec} onChange={(e) => patchSection("health", { ping_interval_sec: Number(e.target.value) || 1 })} /></Field>
            <Field label="Mark offline after N failures"><Input type="number" value={cfg.health.mark_offline_after_failures} onChange={(e) => patchSection("health", { mark_offline_after_failures: Number(e.target.value) || 1 })} /></Field>
            <SwitchField label="Auto recover" checked={cfg.health.auto_recover} onChange={(v) => patchSection("health", { auto_recover: v })} />
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader><CardTitle className="text-base">Podgląd JSON</CardTitle></CardHeader>
        <CardContent>
          <pre className="max-h-96 overflow-auto rounded bg-muted p-3 text-xs">
{JSON.stringify(cfg, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SwitchField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onChange} />
      <Label>{label}</Label>
    </div>
  );
}