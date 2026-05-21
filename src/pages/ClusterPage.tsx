import { useState } from "react";
import { Plus, Network, ShieldAlert, Zap, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCluster } from "@/hooks/useCluster";
import { useUserRole } from "@/hooks/useUserRole";
import { NodeCard } from "@/components/cluster/NodeCard";
import { NodeFormDialog } from "@/components/cluster/NodeFormDialog";
import { DelegationRules } from "@/components/cluster/DelegationRules";
import { ClusterTopology } from "@/components/cluster/ClusterTopology";
import type { ClusterNode } from "@/lib/clusterManager";
import { toast } from "sonner";

export default function ClusterPage() {
  const { nodes, policy, master, addNode, updateNode, removeNode, setMaster, testNode, setPolicy, dispatch } = useCluster();
  const { isAdmin } = useUserRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClusterNode | null>(null);

  const totalVram = nodes.filter(n => n.enabled).reduce((s, n) => s + (n.vramTotal || n.maxVramGB), 0);
  const activeWorkers = nodes.filter(n => n.role === "worker" && n.enabled && n.status === "connected").length;

  const handleSubmit = (values: Omit<ClusterNode, "id">) => {
    if (editing) {
      updateNode(editing.id, values);
      toast.success("Zaktualizowano komputer");
    } else {
      addNode(values);
      toast.success("Dodano komputer do klastra");
    }
    setEditing(null);
  };

  const testDispatch = async () => {
    // Send a no-op test prompt (empty workflow) to see routing decision
    const result = await dispatch({}, {});
    if (result.promptId) {
      toast.success(`Wysłano do: ${result.nodeName}${result.delegated ? " (delegacja)" : ""}`);
    } else {
      toast.warning(`Routing → ${result.nodeName || "—"}: ${result.reason || "brak odpowiedzi"}`);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Network className="h-5 w-5 text-primary" />
            Cluster — Wiele komputerów
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Łączenie wielu instancji ComfyUI w jeden klaster z automatyczną delegacją zadań
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={testDispatch}>
            <Send className="h-3.5 w-3.5 mr-1" /> Test routingu
          </Button>
          {isAdmin && (
            <Button size="sm" className="gold-gradient text-primary-foreground"
              onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Dodaj komputer
            </Button>
          )}
        </div>
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-2 rounded border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
          <ShieldAlert className="h-3.5 w-3.5" />
          Zarządzanie klastrem dostępne tylko dla administratorów. Możesz przeglądać status.
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <Stat label="Komputery" value={String(nodes.length)} icon={<Network className="h-3.5 w-3.5" />} />
        <Stat label="Aktywne workery" value={String(activeWorkers)} icon={<Zap className="h-3.5 w-3.5" />} />
        <Stat label="Łączny VRAM" value={`${Math.round(totalVram)} GB`} icon={<Zap className="h-3.5 w-3.5" />} />
        <Stat label="Auto-delegacja"
          value={policy.autoDelegate ? "ON" : "OFF"}
          accent={policy.autoDelegate ? "text-emerald-400" : "text-muted-foreground"}
          icon={<Zap className="h-3.5 w-3.5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Nodes list */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Komputery w klastrze</h2>
            {master && (
              <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                Master: {master.name}
              </Badge>
            )}
          </div>
          {nodes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
              <Network className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Brak komputerów w klastrze.</p>
              {isAdmin && (
                <Button size="sm" className="mt-3 gold-gradient text-primary-foreground"
                  onClick={() => setDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Dodaj pierwszy komputer
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {nodes.map((n) => (
                <NodeCard key={n.id} node={n}
                  canManage={isAdmin}
                  onEdit={() => { setEditing(n); setDialogOpen(true); }}
                  onRemove={() => { removeNode(n.id); toast.success("Usunięto komputer"); }}
                  onSetMaster={() => { setMaster(n.id); toast.success(`${n.name} jest teraz Masterem`); }}
                  onToggleEnabled={(next) => updateNode(n.id, { enabled: next })}
                  onTest={() => testNode(n.id)} />
              ))}
            </div>
          )}
        </div>

        {/* Rules + topology */}
        <div className="space-y-4">
          <ClusterTopology nodes={nodes} />
          <DelegationRules policy={policy} onChange={setPolicy} disabled={!isAdmin} />
        </div>
      </div>

      <NodeFormDialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}
        initial={editing} onSubmit={handleSubmit} />
    </div>
  );
}

function Stat({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
        {icon}{label}
      </div>
      <div className={`mt-1 text-xl font-bold ${accent || "text-foreground"}`}>{value}</div>
    </div>
  );
}