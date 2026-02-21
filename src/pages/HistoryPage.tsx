import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, RotateCcw } from "lucide-react";

interface HistoryEntry {
  id: number;
  date: string;
  workflow: string;
  model: string;
  seed: number;
  steps: number;
  cfg: number;
  time: string;
  status: "success" | "failed" | "running";
}

const mockHistory: HistoryEntry[] = [
  { id: 47, date: "2026-02-21 14:32", workflow: "txt2img_xl", model: "SDXL Base 1.0", seed: 42, steps: 20, cfg: 7, time: "12.3s", status: "success" },
  { id: 46, date: "2026-02-21 13:58", workflow: "txt2img_xl", model: "SDXL Base 1.0", seed: 1337, steps: 30, cfg: 7.5, time: "15.1s", status: "success" },
  { id: 45, date: "2026-02-21 13:40", workflow: "img2img_lora", model: "DreamShaper 8", seed: 999, steps: 25, cfg: 8, time: "18.2s", status: "failed" },
  { id: 44, date: "2026-02-21 12:15", workflow: "txt2img_xl", model: "SDXL Base 1.0", seed: 7777, steps: 20, cfg: 7, time: "11.8s", status: "success" },
  { id: 43, date: "2026-02-21 11:50", workflow: "controlnet_canny", model: "RealisticVision 5.1", seed: 256, steps: 35, cfg: 9, time: "22.4s", status: "success" },
  { id: 42, date: "2026-02-21 11:20", workflow: "txt2img_xl", model: "SDXL Base 1.0", seed: 123, steps: 20, cfg: 7, time: "—", status: "running" },
];

const statusBadge = {
  success: "bg-status-ok/20 text-status-ok border-status-ok/30",
  failed: "bg-status-danger/20 text-status-danger border-status-danger/30",
  running: "bg-node-model/20 text-node-model border-node-model/30 animate-pulse-glow",
};

const statusLabel = { success: "Ukończono", failed: "Błąd", running: "W trakcie" };

export default function HistoryPage() {
  const [search, setSearch] = useState("");

  const filtered = mockHistory.filter(
    (h) =>
      h.workflow.toLowerCase().includes(search.toLowerCase()) ||
      h.model.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Szukaj w historii..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Seed</TableHead>
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
                  <TableCell className="font-mono text-xs text-muted-foreground">{h.id}</TableCell>
                  <TableCell className="text-xs">{h.date}</TableCell>
                  <TableCell className="font-mono text-xs">{h.workflow}</TableCell>
                  <TableCell className="text-xs">{h.model}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{h.seed}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{h.steps}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{h.cfg}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{h.time}</TableCell>
                  <TableCell>
                    <Badge className={statusBadge[h.status]}>{statusLabel[h.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Załaduj ponownie">
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
