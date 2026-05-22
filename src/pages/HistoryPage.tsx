import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, RotateCcw, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HistoryEntry {
  id: string;
  date: string;
  source: "render_log" | "controller_job";
  workflow: string;
  model: string | null;
  seed: number | null;
  steps: number | null;
  cfg: number | null;
  time: string;
  status: "success" | "failed" | "running" | "queued";
  promptId: string | null;
}

const statusBadge: Record<string, string> = {
  success: "bg-status-ok/20 text-status-ok border-status-ok/30",
  failed: "bg-status-danger/20 text-status-danger border-status-danger/30",
  running: "bg-node-model/20 text-node-model border-node-model/30 animate-pulse-glow",
  queued: "bg-status-warn/20 text-status-warn border-status-warn/30",
  completed: "bg-status-ok/20 text-status-ok border-status-ok/30",
  error: "bg-status-danger/20 text-status-danger border-status-danger/30",
};

const statusLabel: Record<string, string> = {
  success: "Ukończono",
  failed: "Błąd",
  running: "W trakcie",
  queued: "Kolejka",
  completed: "Ukończono",
  error: "Błąd",
};

function normalizeStatus(s: string | null): "success" | "failed" | "running" | "queued" {
  if (!s) return "running";
  if (s === "completed" || s === "success") return "success";
  if (s === "failed" || s === "error") return "failed";
  if (s === "running" || s === "processing") return "running";
  return "queued";
}

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [logsRes, jobsRes] = await Promise.all([
        supabase
          .from("render_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("controller_jobs")
          .select("id, name, status, created_at, duration_ms, comfy_prompt_id, params")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const logEntries: HistoryEntry[] = (logsRes.data || []).map((row) => ({
        id: row.id,
        date: new Date(row.created_at).toLocaleString("pl"),
        source: "render_log",
        workflow: row.preset || "studio",
        model: null,
        seed: null,
        steps: row.steps,
        cfg: row.cfg,
        time: formatDuration(row.render_duration_ms),
        status: "success",
        promptId: null,
      }));

      const jobEntries: HistoryEntry[] = (jobsRes.data || []).map((row) => {
        const params = row.params as Record<string, unknown> | null;
        return {
          id: row.id,
          date: new Date(row.created_at).toLocaleString("pl"),
          source: "controller_job",
          workflow: row.name || "job",
          model: params?.checkpoint as string | null ?? null,
          seed: params?.seed as number | null ?? null,
          steps: params?.steps as number | null ?? null,
          cfg: params?.cfg as number | null ?? null,
          time: formatDuration(row.duration_ms),
          status: normalizeStatus(row.status),
          promptId: row.comfy_prompt_id,
        };
      });

      // Merge and sort by date desc
      const merged = [...logEntries, ...jobEntries].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setEntries(merged);
    } catch (err) {
      toast.error("Błąd ładowania historii");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = entries.filter(
    (h) =>
      !search ||
      h.workflow.toLowerCase().includes(search.toLowerCase()) ||
      (h.model ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (h.promptId ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Szukaj w historii..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Odśwież
        </Button>
        {entries.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {filtered.length} z {entries.length} wpisów
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Ładowanie historii...</span>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {entries.length === 0 ? "Brak historii renderów." : "Brak wyników dla podanego filtru."}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {entries.length === 0
              ? "Zacznij renderować w Studio lub Render, aby zobaczyć historię."
              : "Zmień frazę wyszukiwania."}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Workflow / Zadanie</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Steps</TableHead>
                  <TableHead className="text-right">CFG</TableHead>
                  <TableHead className="text-right">Czas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs whitespace-nowrap">{h.date}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {h.workflow}
                      {h.source === "controller_job" && (
                        <Badge variant="outline" className="ml-1.5 text-[8px] py-0 h-3.5">job</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs max-w-[140px] truncate" title={h.model ?? ""}>
                      {h.model ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {h.steps ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {h.cfg ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{h.time}</TableCell>
                    <TableCell>
                      <Badge className={statusBadge[h.status] ?? statusBadge.queued}>
                        {statusLabel[h.status] ?? h.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Załaduj ponownie"
                        disabled
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
