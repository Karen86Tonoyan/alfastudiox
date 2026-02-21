import { useState } from "react";
import { Brain, ChevronDown, ChevronRight, CheckCircle2, Clock, AlertTriangle, Loader2, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { HardwareMonitor } from "./HardwareMonitor";

type TaskStatus = "done" | "running" | "queued" | "warning" | "paused";

interface RenderTask {
  id: string;
  name: string;
  status: TaskStatus;
  progress?: number;
  duration?: string;
  node?: string;
  detail?: string;
}

interface ScenarioPlan {
  name: string;
  phase: string;
  tasks: RenderTask[];
}

const statusIcon: Record<TaskStatus, React.ReactNode> = {
  done: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
  running: <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />,
  queued: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
  paused: <Clock className="h-3.5 w-3.5 text-orange-400" />,
};

const statusLabel: Record<TaskStatus, string> = {
  done: "Ukończone",
  running: "W trakcie",
  queued: "W kolejce",
  warning: "Ostrzeżenie",
  paused: "Wstrzymane",
};

const mockPlan: ScenarioPlan = {
  name: "Cinematic Landscape v3",
  phase: "Faza 2: Generowanie główne",
  tasks: [
    { id: "1", name: "Analiza promptu", status: "done", duration: "0.3s", node: "Florence2", detail: "Scena: krajobraz, butelka, galaktyka" },
    { id: "2", name: "Generowanie preview (512×512)", status: "done", duration: "2.1s", node: "KSampler", detail: "Seed: 158886208700258, Steps: 8" },
    { id: "3", name: "Ocena jakości preview", status: "done", duration: "0.8s", node: "Florence2", detail: "Score: 0.87 — akceptowalne" },
    { id: "4", name: "Pełny render (1024×1024)", status: "running", progress: 65, node: "KSampler", detail: "Steps: 12/20, cfg: 8.0, euler" },
    { id: "5", name: "Upscale SUPIR (2048×2048)", status: "queued", node: "SUPIR" },
    { id: "6", name: "Korekta kolorów", status: "queued", node: "Color Correct" },
    { id: "7", name: "Zapis końcowy", status: "queued", node: "Save Image" },
  ],
};

const queueItems = [
  { id: "q1", name: "Krajobraz galaktyka v3", status: "running" as TaskStatus, progress: 65 },
  { id: "q2", name: "Portret fantasy #12", status: "queued" as TaskStatus },
  { id: "q3", name: "Animacja woda 5s", status: "queued" as TaskStatus },
  { id: "q4", name: "LoRA test — artefakty", status: "warning" as TaskStatus },
];

interface ScenarioManagerProps {
  className?: string;
}

export function ScenarioManager({ className }: ScenarioManagerProps) {
  const [planOpen, setPlanOpen] = useState(true);
  const [queueOpen, setQueueOpen] = useState(true);

  const completed = mockPlan.tasks.filter((t) => t.status === "done").length;
  const total = mockPlan.tasks.length;
  const overallProgress = Math.round((completed / total) * 100);

  return (
    <div className={cn("flex flex-col border-l border-border bg-card", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Brain className="h-4 w-4 text-purple-400" />
        <span className="text-sm font-semibold text-foreground">AI Scenario Manager</span>
      </div>

      {/* Hardware Monitor */}
      <HardwareMonitor />

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Current scenario */}
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{mockPlan.name}</span>
              <Badge variant="outline" className="text-[10px] border-purple-500/50 text-purple-400">
                Aktywny
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{mockPlan.phase}</p>
            <div className="mt-2 flex items-center gap-2">
              <Progress value={overallProgress} className="h-1.5 flex-1" />
              <span className="text-[10px] text-muted-foreground">{overallProgress}%</span>
            </div>
            <div className="mt-2 flex gap-1.5">
              <Button size="sm" variant="outline" className="h-6 gap-1 px-2 text-[10px]">
                <Play className="h-2.5 w-2.5" /> Wznów
              </Button>
              <Button size="sm" variant="outline" className="h-6 gap-1 px-2 text-[10px]">
                <RotateCcw className="h-2.5 w-2.5" /> Od nowa
              </Button>
            </div>
          </div>

          {/* Render plan */}
          <div>
            <button
              onClick={() => setPlanOpen(!planOpen)}
              className="flex w-full items-center gap-1.5 text-xs font-medium text-foreground"
            >
              {planOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Plan renderowania
              <span className="ml-auto text-[10px] text-muted-foreground">{completed}/{total}</span>
            </button>

            {planOpen && (
              <div className="mt-2 space-y-1">
                {mockPlan.tasks.map((task, i) => (
                  <div
                    key={task.id}
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 text-[11px]",
                      task.status === "running"
                        ? "border-blue-500/40 bg-blue-500/10"
                        : task.status === "done"
                        ? "border-border bg-secondary/20"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground w-3">{i + 1}</span>
                      {statusIcon[task.status]}
                      <span className={cn(
                        "flex-1 truncate",
                        task.status === "done" ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {task.name}
                      </span>
                      {task.duration && (
                        <span className="text-[10px] text-muted-foreground">{task.duration}</span>
                      )}
                    </div>
                    {task.progress !== undefined && (
                      <div className="mt-1 flex items-center gap-2">
                        <Progress value={task.progress} className="h-1 flex-1" />
                        <span className="text-[10px] text-blue-400">{task.progress}%</span>
                      </div>
                    )}
                    {task.detail && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{task.detail}</p>
                    )}
                    {task.node && (
                      <span className="mt-0.5 inline-block rounded bg-secondary px-1 py-0.5 text-[9px] text-muted-foreground">
                        {task.node}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Queue */}
          <div>
            <button
              onClick={() => setQueueOpen(!queueOpen)}
              className="flex w-full items-center gap-1.5 text-xs font-medium text-foreground"
            >
              {queueOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Kolejka zadań
              <span className="ml-auto rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {queueItems.length}
              </span>
            </button>

            {queueOpen && (
              <div className="mt-2 space-y-1">
                {queueItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-[11px]"
                  >
                    {statusIcon[item.status]}
                    <span className="flex-1 truncate text-foreground">{item.name}</span>
                    <span className="text-[10px] text-muted-foreground">{statusLabel[item.status]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
