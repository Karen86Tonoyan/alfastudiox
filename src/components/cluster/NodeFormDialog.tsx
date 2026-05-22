import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { ClusterNode } from "@/lib/clusterManager";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: ClusterNode | null;
  onSubmit: (values: Omit<ClusterNode, "id">) => void;
}

const empty: Omit<ClusterNode, "id"> = {
  name: "",
  url: "127.0.0.1:8000",
  role: "worker",
  priority: 5,
  maxVramGB: 16,
  tags: [],
  enabled: true,
};

export function NodeFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [form, setForm] = useState<Omit<ClusterNode, "id">>(empty);
  const [tagsRaw, setTagsRaw] = useState("");

  useEffect(() => {
    if (open) {
      const base = initial ? { ...initial } : { ...empty };
      setForm(base);
      setTagsRaw(base.tags.join(", "));
    }
  }, [open, initial]);

  const submit = () => {
    const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
    if (!form.name.trim() || !form.url.trim()) return;
    onSubmit({ ...form, tags });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edytuj komputer" : "Dodaj komputer do klastra"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nazwa</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="np. Stacja-Render-01" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Adres ComfyUI (host:port lub https://...)</Label>
            <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="127.0.0.1:8000" className="font-mono text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Rola</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as "master" | "worker" })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="master">Master (admin)</SelectItem>
                  <SelectItem value="worker">Worker</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Priorytet (1=top)</Label>
              <Input type="number" min={1} max={10} value={form.priority}
                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 5 })} className="h-8" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max VRAM (GB)</Label>
            <Input type="number" min={2} max={128} value={form.maxVramGB}
              onChange={(e) => setForm({ ...form, maxVramGB: parseInt(e.target.value) || 16 })} className="h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tagi (po przecinku, np. flux, wan, upscale)</Label>
            <Input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="flux, wan, upscale" />
          </div>
          <div className="flex items-center justify-between rounded border border-border px-3 py-2">
            <Label className="text-xs">Aktywny</Label>
            <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Anuluj</Button>
          <Button onClick={submit} className="gold-gradient text-primary-foreground">
            {initial ? "Zapisz" : "Dodaj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
