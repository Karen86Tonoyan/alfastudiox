import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2 } from "lucide-react";
import type { ClusterPolicy } from "@/lib/clusterManager";

interface Props {
  policy: ClusterPolicy;
  onChange: (p: Partial<ClusterPolicy>) => void;
  disabled?: boolean;
}

export function DelegationRules({ policy, onChange, disabled }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Reguły delegacji (Admin)</h3>
      </div>

      <div className="flex items-center justify-between rounded border border-border px-3 py-2">
        <div>
          <Label className="text-xs">Auto-delegacja</Label>
          <p className="text-[10px] text-muted-foreground">Gdy Master nie wyrabia — wyślij do workera</p>
        </div>
        <Switch disabled={disabled} checked={policy.autoDelegate} onCheckedChange={(v) => onChange({ autoDelegate: v })} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label={`VRAM > ${policy.thresholds.vramPct}%`}>
          <Input disabled={disabled} type="number" min={50} max={99}
            value={policy.thresholds.vramPct}
            onChange={(e) => onChange({ thresholds: { ...policy.thresholds, vramPct: parseInt(e.target.value) || 90 } })}
            className="h-7 text-xs" />
        </Field>
        <Field label={`Temp > ${policy.thresholds.tempC}°C`}>
          <Input disabled={disabled} type="number" min={50} max={95}
            value={policy.thresholds.tempC}
            onChange={(e) => onChange({ thresholds: { ...policy.thresholds, tempC: parseInt(e.target.value) || 82 } })}
            className="h-7 text-xs" />
        </Field>
        <Field label={`Kolejka > ${policy.thresholds.queueLen}`}>
          <Input disabled={disabled} type="number" min={1} max={20}
            value={policy.thresholds.queueLen}
            onChange={(e) => onChange({ thresholds: { ...policy.thresholds, queueLen: parseInt(e.target.value) || 3 } })}
            className="h-7 text-xs" />
        </Field>
        <Field label={`Wait > ${policy.thresholds.waitSec}s`}>
          <Input disabled={disabled} type="number" min={5} max={300}
            value={policy.thresholds.waitSec}
            onChange={(e) => onChange({ thresholds: { ...policy.thresholds, waitSec: parseInt(e.target.value) || 30 } })}
            className="h-7 text-xs" />
        </Field>
      </div>

      <Field label="Strategia wyboru workera">
        <Select disabled={disabled} value={policy.strategy} onValueChange={(v) => onChange({ strategy: v as ClusterPolicy["strategy"] })}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="least-loaded">Least loaded (najmniej obciążony)</SelectItem>
            <SelectItem value="priority">Priority (wg priorytetu)</SelectItem>
            <SelectItem value="tag-match">Tag match (dopasowane tagi)</SelectItem>
            <SelectItem value="round-robin">Round-robin</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <div className="flex items-center justify-between rounded border border-border px-3 py-2">
        <div>
          <Label className="text-xs">Mirror outputs to Master</Label>
          <p className="text-[10px] text-muted-foreground">Skopiuj rezultaty z workera na Master</p>
        </div>
        <Switch disabled={disabled} checked={policy.mirrorOutputs} onCheckedChange={(v) => onChange({ mirrorOutputs: v })} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}