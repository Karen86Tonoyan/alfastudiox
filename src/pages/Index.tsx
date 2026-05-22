import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, Cloud, Cpu, GitBranch, ListChecks, Network, Settings2, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { loadControllerConfig } from "@/lib/controllerConfig";
import { getExoConfig } from "@/lib/providers/exo";
import { listJobs, type ControllerJob } from "@/lib/jobQueue";
import { useCluster } from "@/hooks/useCluster";
import { LOCAL_OPERATOR_MODE } from "@/lib/runtimeMode";

const primaryModules = [
  {
    title: "PC Cluster",
    path: "/cluster",
    icon: Network,
    description: "Nodes, VRAM, delegacja zadan i routing ComfyUI miedzy komputerami.",
  },
  {
    title: "Controller Config",
    path: "/controller-config",
    icon: Settings2,
    description: "Jedna konfiguracja dla nodow, storage, queue i Ethernet/Thunderbolt.",
  },
  {
    title: "Workflow Split",
    path: "/workflow-split",
    icon: GitBranch,
    description: "Podzial workflow na etapy i rozdzielenie pracy miedzy maszynami.",
  },
  {
    title: "Exo Cluster",
    path: "/exo-cluster",
    icon: Boxes,
    description: "Adapter do exo jako eksperymentalnego runtime backendu.",
  },
  {
    title: "ALFA Cloud Bridge",
    path: "/providers",
    icon: Cloud,
    description: "Warstwa cloud: sync, backup, storage, remote deploy i przyszle nody zdalne.",
  },
  {
    title: "Job Queue",
    path: "/job-queue",
    icon: ListChecks,
    description: "Trwala kolejka z retry i recovery po restarcie, takze w trybie lokalnym.",
  },
  {
    title: "Studio",
    path: "/studio",
    icon: Sparkles,
    description: "Warstwa operatorska do przygotowania i odpalania workflow.",
  },
  {
    title: "Anti-Malware Gate",
    path: "/tip-auditor",
    icon: ShieldCheck,
    description: "Skanowanie artefaktow, kwarantanna i evidence feed do warstwy Guard.",
  },
];

const Index = () => {
  const { nodes } = useCluster();
  const [jobs, setJobs] = useState<ControllerJob[]>([]);
  const cfg = useMemo(() => loadControllerConfig(), []);
  const exo = useMemo(() => getExoConfig(), []);

  useEffect(() => {
    listJobs({ limit: 200 }).then(setJobs).catch(() => setJobs([]));
  }, []);

  const activeWorkers = nodes.filter((n) => n.enabled && n.role === "worker" && n.status === "connected").length;
  const totalVram = nodes.filter((n) => n.enabled).reduce((sum, n) => sum + (n.vramTotal || n.maxVramGB), 0);
  const queuedJobs = jobs.filter((j) => j.status === "queued" || j.status === "running").length;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-3">
            <Badge variant="outline" className="border-primary/30 text-primary">
              {LOCAL_OPERATOR_MODE ? "Local Operator Mode" : "Cloud Auth Mode"}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight">ALFA Cluster Studio</h1>
            <p className="text-sm text-muted-foreground">
              Jedno centrum dowodzenia dla ComfyUI, workflow orchestration, provider routing
              i distributed runtime.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="gap-2">
              <Link to="/cluster"><Network className="h-4 w-4" />Otworz klaster</Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/controller-config"><Settings2 className="h-4 w-4" />Konfiguracja</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Nody" value={String(nodes.length)} subtext={`${activeWorkers} workerow online`} icon={<Network className="h-4 w-4" />} />
        <MetricCard label="Laczny VRAM" value={`${Math.round(totalVram)} GB`} subtext="Aktywne komputery" icon={<Cpu className="h-4 w-4" />} />
        <MetricCard label="Joby w ruchu" value={String(queuedJobs)} subtext="queued + running" icon={<ListChecks className="h-4 w-4" />} />
        <MetricCard label="Exo endpoint" value={exo.endpoint.replace(/^https?:\/\//, "")} subtext={exo.defaultModel} icon={<Boxes className="h-4 w-4" />} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Workflow className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">Glowne moduly</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {primaryModules.map((module) => (
              <Link key={module.path} to={module.path} className="rounded-xl border border-border bg-card/60 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5">
                <div className="mb-2 flex items-center gap-2">
                  <module.icon className="h-4 w-4 text-primary" />
                  <span className="font-medium">{module.title}</span>
                </div>
                <p className="text-sm text-muted-foreground">{module.description}</p>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold">Runtime snapshot</h2>
          <div className="mt-4 space-y-4 text-sm text-muted-foreground">
            <div>
              <div className="font-medium text-foreground">Controller</div>
              <div>{cfg.nodes.length} wpisow, master: {cfg.nodes.find((n) => n.role === "master")?.name || "brak"}.</div>
            </div>
            <div>
              <div className="font-medium text-foreground">Network</div>
              <div>Control: {cfg.network.control_network}. Data: {cfg.network.data_network}.</div>
            </div>
            <div>
              <div className="font-medium text-foreground">Queue</div>
              <div>Tryb: {cfg.queue.mode}. Timeout joba: {cfg.execution.job_timeout_sec}s.</div>
            </div>
            <div>
              <div className="font-medium text-foreground">Storage</div>
              <div>{cfg.storage.workflow_dir}</div>
            </div>
            <div>
              <div className="font-medium text-foreground">Security</div>
              <div>Anti-malware gate gotowy jako modul operatorski dla uploadow i artefaktow workflow.</div>
            </div>
            <div>
              <div className="font-medium text-foreground">Cloud boundary</div>
              <div>Exoscale lub inny provider nalezy do Cloud Bridge, nie do lokalnego runtime AI.</div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
};

function MetricCard({ label, value, subtext, icon }: { label: string; value: string; subtext: string; icon: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold break-all">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{subtext}</div>
    </Card>
  );
}

export default Index;
