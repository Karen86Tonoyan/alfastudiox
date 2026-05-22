import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ListChecks, Play, Trash2, RotateCw, RefreshCw, Pause, AlertCircle,
  CheckCircle2, Clock, XCircle, Loader2, Cpu, Database,
} from "lucide-react";
import {
  listJobs, deleteJob, updateJob, clearFinishedJobs, recoverStaleJobs,
  startQueueProcessor, stopQueueProcessor, isProcessorRunning,
  subscribeJobs, runJob, enqueueJob, type ControllerJob, type JobStatus,
} from "@/lib/jobQueue";

const STATUS_META: Record<JobStatus, { color: string; Icon: typeof Clock; label: string }> = {
  queued: { color: "bg-blue-500/10 text-blue-500 border-blue-500/30", Icon: Clock, label: "W kolejce" },
  running: { color: "bg-amber-500/10 text-amber-500 border-amber-500/30", Icon: Loader2, label: "Wykonywany" },
  completed: { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30", Icon: CheckCircle2, label: "Zakończony" },
  failed: { color: "bg-destructive/10 text-destructive border-destructive/30", Icon: AlertCircle, label: "Błąd" },
  cancelled: { color: "bg-muted text-muted-foreground border-border", Icon: XCircle, label: "Anulowany" },
  paused: { color: "bg-purple-500/10 text-purple-500 border-purple-500/30", Icon: Pause, label: "Wstrzymany" },
};

export default function JobQueuePage() {
  const [jobs, setJobs] = useState<ControllerJob[]>([]);
  const [filter, setFilter] = useState<JobStatus | "all">("all");
  const [loading, setLoading] = useState(false);
  const [processorOn, setProcessorOn] = useState(isProcessorRunning());

  const refresh = async () => {
    setLoading(true);
    try {
      setJobs(await listJobs({ limit: 200 }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nie udało się pobrać jobów");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // recovery on mount — joby utknięte w 'running' wracają do 'queued'
    recoverStaleJobs().then((n) => {
      if (n > 0) toast.info(`Przywrócono ${n} jobów po restarcie`);
    }).catch(() => { /* ignore */ });
    // realtime
    const unsub = subscribeJobs((job, ev) => {
      setJobs((prev) => {
        if (ev === "DELETE") return prev.filter((j) => j.id !== job.id);
        const idx = prev.findIndex((j) => j.id === job.id);
        if (idx < 0) return [job, ...prev];
        const next = [...prev]; next[idx] = job; return next;
      });
    });
    return () => { unsub(); };
  }, []);

  const toggleProcessor = (on: boolean) => {
    if (on) { startQueueProcessor(); toast.success("Procesor kolejki włączony"); }
    else { stopQueueProcessor(); toast.info("Procesor kolejki wstrzymany"); }
    setProcessorOn(on);
  };

  const handleRetry = async (j: ControllerJob) => {
    await updateJob(j.id, { status: "queued", error: null, finished_at: null, progress: 0 });
    toast.success("Job dodany ponownie do kolejki");
  };

  const handleCancel = async (j: ControllerJob) => {
    await updateJob(j.id, { status: "cancelled", finished_at: new Date().toISOString() });
  };

  const handleRunNow = async (j: ControllerJob) => {
    toast.info(`Uruchamiam ${j.name}...`);
    await runJob(j);
  };

  const handleDelete = async (j: ControllerJob) => {
    await deleteJob(j.id);
    toast.success("Usunięto job");
  };

  const handleClearFinished = async () => {
    const n = await clearFinishedJobs();
    toast.success(`Usunięto ${n} zakończonych jobów`);
  };

  const handleAddDemo = async () => {
    try {
      await enqueueJob({
        name: `Test job ${new Date().toLocaleTimeString()}`,
        prompt: "Demo job — pusty workflow",
        workflow: { prompt: {} },
        priority: 5,
      });
      toast.success("Dodano testowy job");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd");
    }
  };

  const filtered = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);
  const counts: Record<JobStatus | "all", number> = {
    all: jobs.length,
    queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0, paused: 0,
  };
  jobs.forEach((j) => { counts[j.status] = (counts[j.status] || 0) + 1; });

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" /> Trwała Kolejka Zadań
          </h1>
          <p className="text-sm text-muted-foreground">
            Joby i statusy przeżywają restart kontrolera. Przechowywane w bazie z realtime sync.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card">
            <Cpu className="h-3.5 w-3.5 text-primary" />
            <Label htmlFor="proc" className="text-xs cursor-pointer">Procesor kolejki</Label>
            <Switch id="proc" checked={processorOn} onCheckedChange={toggleProcessor} />
          </div>
          <Button size="sm" variant="outline" onClick={refresh} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Odśwież
          </Button>
          <Button size="sm" variant="outline" onClick={handleAddDemo}>+ Test job</Button>
          <Button size="sm" variant="outline" onClick={handleClearFinished} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Wyczyść zakończone
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {(Object.keys(STATUS_META) as JobStatus[]).map((s) => {
          const meta = STATUS_META[s];
          return (
            <Card key={s} className="p-3">
              <div className="text-[10px] uppercase text-muted-foreground">{meta.label}</div>
              <div className="text-xl font-bold">{counts[s] || 0}</div>
            </Card>
          );
        })}
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as JobStatus | "all")}>
        <TabsList>
          <TabsTrigger value="all" className="text-xs">Wszystkie ({counts.all})</TabsTrigger>
          {(Object.keys(STATUS_META) as JobStatus[]).map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs">
              {STATUS_META[s].label} ({counts[s] || 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex-1 overflow-y-auto space-y-2">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Database className="h-8 w-8 opacity-40" />
            Brak jobów w tej kategorii.
          </Card>
        ) : filtered.map((j) => {
          const meta = STATUS_META[j.status];
          const Icon = meta.Icon;
          return (
            <Card key={j.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <Badge variant="outline" className={`${meta.color} gap-1 shrink-0`}>
                    <Icon className={`h-3 w-3 ${j.status === "running" ? "animate-spin" : ""}`} />
                    {meta.label}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{j.name}</div>
                    <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 mt-0.5">
                      <span>Priorytet: {j.priority}</span>
                      {j.node_name && <span>Node: {j.node_name}</span>}
                      {j.comfy_prompt_id && <span className="font-mono">PID: {j.comfy_prompt_id.slice(0, 8)}</span>}
                      <span>Próby: {j.attempts}</span>
                      {j.duration_ms && <span>{(j.duration_ms / 1000).toFixed(1)}s</span>}
                      <span>{new Date(j.queued_at).toLocaleString()}</span>
                    </div>
                    {j.prompt && <div className="text-xs text-muted-foreground mt-1 truncate">{j.prompt}</div>}
                    {j.error && <div className="text-xs text-destructive mt-1">⚠ {j.error}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {j.status === "queued" && (
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => handleRunNow(j)}>
                      <Play className="h-3 w-3" /> Uruchom
                    </Button>
                  )}
                  {(j.status === "failed" || j.status === "cancelled") && (
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => handleRetry(j)}>
                      <RotateCw className="h-3 w-3" /> Ponów
                    </Button>
                  )}
                  {(j.status === "queued" || j.status === "running") && (
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => handleCancel(j)}>
                      <XCircle className="h-3 w-3" /> Anuluj
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => handleDelete(j)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}