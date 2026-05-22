import { useEffect, useMemo, useState } from "react";
import { Plus, Play, Trash2, Save, Copy, Cpu, Network, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  loadPlans, savePlans, emptyPlan, emptyStage, runPlan,
  type SplitPlan, type SplitStage, type StageKind, type StageRunResult,
} from "@/lib/workflowSplit";
import { loadControllerConfig, type NodeConfig } from "@/lib/controllerConfig";
import { clusterManager } from "@/lib/clusterManager";

const KINDS: { value: StageKind; label: string }[] = [
  { value: "background", label: "Tło / Image" },
  { value: "character", label: "Postać" },
  { value: "video", label: "Wideo / Animacja" },
  { value: "upscale", label: "Upscale" },
  { value: "compositing", label: "Kompozycja" },
  { value: "custom", label: "Custom" },
];

function useAvailableNodes(): NodeConfig[] {
  const [nodes, setNodes] = useState<NodeConfig[]>([]);
  useEffect(() => {
    // łączymy nody z controllerConfig (źródło prawdy) + clusterManager (runtime)
    const cfg = loadControllerConfig();
    const cluster = clusterManager.getNodes().map<NodeConfig>((n) => ({
      id: n.id, name: n.name, api_url: n.url, enabled: n.enabled,
      role: n.role, priority: n.priority, max_parallel_jobs: 1, tags: n.tags,
    }));
    const map = new Map<string, NodeConfig>();
    for (const n of [...cfg.nodes, ...cluster]) if (n.enabled !== false) map.set(n.id, n);
    setNodes(Array.from(map.values()));
  }, []);
  return nodes;
}

export default function WorkflowSplitPage() {
  const nodes = useAvailableNodes();
  const [plans, setPlans] = useState<SplitPlan[]>(() => loadPlans());
  const [activeId, setActiveId] = useState<string | null>(() => loadPlans()[0]?.id ?? null);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<StageRunResult[]>([]);

  const active = useMemo(() => plans.find((p) => p.id === activeId) ?? null, [plans, activeId]);

  const persist = (next: SplitPlan[]) => {
    setPlans(next);
    savePlans(next);
  };

  const updateActive = (mut: (p: SplitPlan) => SplitPlan) => {
    if (!active) return;
    const next = plans.map((p) => (p.id === active.id ? { ...mut(p), updatedAt: Date.now() } : p));
    persist(next);
  };

  const createPlan = () => {
    const p = emptyPlan(`Plan #${plans.length + 1}`);
    persist([p, ...plans]);
    setActiveId(p.id);
  };

  const deletePlan = (id: string) => {
    const next = plans.filter((p) => p.id !== id);
    persist(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
  };

  const duplicatePlan = (id: string) => {
    const src = plans.find((p) => p.id === id);
    if (!src) return;
    const copy: SplitPlan = {
      ...src,
      id: crypto.randomUUID(),
      name: `${src.name} (kopia)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stages: src.stages.map((s) => ({ ...s, id: crypto.randomUUID() })),
    };
    persist([copy, ...plans]);
    setActiveId(copy.id);
  };

  const addStage = () => {
    updateActive((p) => ({
      ...p,
      stages: [...p.stages, { ...emptyStage(`Etap ${p.stages.length + 1}`) }],
    }));
  };

  const updateStage = (sid: string, patch: Partial<SplitStage>) => {
    updateActive((p) => ({ ...p, stages: p.stages.map((s) => (s.id === sid ? { ...s, ...patch } : s)) }));
  };

  const removeStage = (sid: string) => {
    updateActive((p) => ({
      ...p,
      stages: p.stages.filter((s) => s.id !== sid).map((s) => ({
        ...s,
        dependsOn: s.dependsOn.filter((d) => d !== sid),
      })),
    }));
  };

  const run = async () => {
    if (!active) return;
    const unassigned = active.stages.filter((s) => !s.assignedNodeId);
    if (unassigned.length > 0 && nodes.length > 0) {
      toast.warning(`${unassigned.length} etapów bez przypisanego komputera — pójdą do auto-pickera.`);
    }
    setRunning(true);
    setResults([]);
    try {
      const res = await runPlan(active);
      setResults(res);
      const failed = res.filter((r) => r.error || !r.dispatch.promptId).length;
      if (failed === 0) toast.success(`Wystartowano wszystkie ${res.length} etapów.`);
      else toast.error(`${failed} z ${res.length} etapów nie wystartowało.`);
    } finally {
      setRunning(false);
    }
  };

  // dystrybucja po nodach (preview)
  const distribution = useMemo(() => {
    if (!active) return new Map<string, SplitStage[]>();
    const m = new Map<string, SplitStage[]>();
    for (const s of active.stages) {
      const k = s.assignedNodeId || "__auto__";
      const arr = m.get(k) ?? [];
      arr.push(s);
      m.set(k, arr);
    }
    return m;
  }, [active]);

  return (
    <div className="flex h-full -m-4">
      {/* Lista planów */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="border-b border-border p-3 flex items-center justify-between">
          <span className="text-sm font-semibold">Plany podziału</span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={createPlan} title="Nowy plan">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {plans.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                Brak planów. Utwórz pierwszy podział workflow.
              </p>
            )}
            {plans.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveId(p.id)}
                className={`w-full text-left rounded-md px-2 py-1.5 text-xs border transition-colors ${
                  p.id === activeId
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-transparent hover:bg-secondary/50"
                }`}
              >
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {p.stages.length} etap{p.stages.length === 1 ? "" : "ów"}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Edytor */}
      <main className="flex-1 flex flex-col min-w-0">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Wybierz plan z listy lub utwórz nowy.
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-border p-3 flex items-center gap-2">
              <Input
                value={active.name}
                onChange={(e) => updateActive((p) => ({ ...p, name: e.target.value }))}
                className="h-8 max-w-xs text-sm font-semibold"
              />
              <Badge variant="outline" className="text-[10px]">
                <Network className="h-3 w-3 mr-1" /> {nodes.length} aktywnych nodów
              </Badge>
              <div className="ml-auto flex items-center gap-1">
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => duplicatePlan(active.id)}>
                  <Copy className="h-3.5 w-3.5" /> Duplikuj
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-destructive" onClick={() => deletePlan(active.id)}>
                  <Trash2 className="h-3.5 w-3.5" /> Usuń
                </Button>
                <Button size="sm" className="h-8 gap-1.5" onClick={run} disabled={running || active.stages.length === 0}>
                  <Play className="h-3.5 w-3.5" /> {running ? "Wykonuję…" : "Uruchom plan"}
                </Button>
              </div>
            </div>

            {/* Dystrybucja po komputerach */}
            <div className="border-b border-border p-3 bg-secondary/20">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                Dystrybucja po komputerach
              </div>
              <div className="flex flex-wrap gap-2">
                {nodes.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Brak skonfigurowanych nodów — przejdź do <a href="/controller-config" className="text-primary underline">Controller Config</a>.
                  </p>
                )}
                {Array.from(distribution.entries()).map(([nodeId, list]) => {
                  const node = nodes.find((n) => n.id === nodeId);
                  return (
                    <div key={nodeId} className="rounded-md border border-border bg-card px-3 py-2 min-w-[180px]">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <Cpu className="h-3 w-3 text-primary" />
                        {node ? node.name : nodeId === "__auto__" ? "Auto (cluster)" : `?${nodeId}`}
                        <Badge variant="outline" className="ml-auto text-[9px]">{list.length}</Badge>
                      </div>
                      <ul className="mt-1 space-y-0.5 text-[10px] text-muted-foreground">
                        {list.map((s) => <li key={s.id} className="truncate">• {s.name}</li>)}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Etapy */}
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {active.stages.map((s, idx) => {
                  const result = results.find((r) => r.stageId === s.id);
                  return (
                    <div key={s.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground w-5">#{idx + 1}</span>
                        <Input
                          value={s.name}
                          onChange={(e) => updateStage(s.id, { name: e.target.value })}
                          className="h-7 text-xs font-semibold flex-1"
                        />
                        {result && (
                          result.error || !result.dispatch.promptId ? (
                            <Badge variant="outline" className="text-[10px] border-destructive/50 text-destructive">
                              <AlertCircle className="h-3 w-3 mr-1" /> Błąd
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> {result.dispatch.nodeName}
                            </Badge>
                          )
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeStage(s.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {/* Typ */}
                        <div>
                          <div className="text-[10px] text-muted-foreground mb-1">Typ</div>
                          <Select value={s.kind} onValueChange={(v) => updateStage(s.id, { kind: v as StageKind })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {KINDS.map((k) => <SelectItem key={k.value} value={k.value} className="text-xs">{k.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Komputer */}
                        <div>
                          <div className="text-[10px] text-muted-foreground mb-1">Komputer (node)</div>
                          <Select
                            value={s.assignedNodeId || "__auto__"}
                            onValueChange={(v) => updateStage(s.id, { assignedNodeId: v === "__auto__" ? "" : v })}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__auto__" className="text-xs">Auto (cluster picker)</SelectItem>
                              {nodes.map((n) => (
                                <SelectItem key={n.id} value={n.id} className="text-xs">
                                  {n.name} <span className="text-muted-foreground">— {n.api_url}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {/* VRAM */}
                        <div>
                          <div className="text-[10px] text-muted-foreground mb-1">VRAM (GB)</div>
                          <Input
                            type="number" min={0} max={256}
                            value={s.requiredVramGB}
                            onChange={(e) => updateStage(s.id, { requiredVramGB: Number(e.target.value) || 0 })}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      </div>

                      {/* Zależności */}
                      {active.stages.length > 1 && (
                        <div>
                          <div className="text-[10px] text-muted-foreground mb-1">Zależy od (musi się skończyć wcześniej)</div>
                          <div className="flex flex-wrap gap-1">
                            {active.stages.filter((o) => o.id !== s.id).map((o) => {
                              const on = s.dependsOn.includes(o.id);
                              return (
                                <button
                                  key={o.id}
                                  onClick={() => updateStage(s.id, {
                                    dependsOn: on ? s.dependsOn.filter((d) => d !== o.id) : [...s.dependsOn, o.id],
                                  })}
                                  className={`text-[10px] rounded px-1.5 py-0.5 border transition-colors ${
                                    on ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {o.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Workflow JSON */}
                      <details>
                        <summary className="text-[10px] text-muted-foreground cursor-pointer select-none">
                          Workflow JSON (opcjonalnie) {s.workflowJson ? `— ${s.workflowJson.length} znaków` : ""}
                        </summary>
                        <Textarea
                          value={s.workflowJson ?? ""}
                          onChange={(e) => updateStage(s.id, { workflowJson: e.target.value })}
                          placeholder='{"prompt": {...}}'
                          className="mt-1 min-h-[80px] text-[11px] font-mono"
                        />
                      </details>

                      {result?.dispatch.reason && (
                        <p className="text-[10px] text-muted-foreground">↳ {result.dispatch.reason}</p>
                      )}
                    </div>
                  );
                })}

                <Button variant="outline" className="w-full h-9 gap-2" onClick={addStage}>
                  <Plus className="h-4 w-4" /> Dodaj etap
                </Button>
              </div>
            </ScrollArea>

            <div className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground flex items-center gap-2">
              <Save className="h-3 w-3" /> Auto-zapis w przeglądarce (localStorage: <code>alfa_workflow_splits</code>)
            </div>
          </>
        )}
      </main>
    </div>
  );
}