import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AIGenerateDialogProps {
  canvasWidth: number;
  canvasHeight: number;
  onImageGenerated: (img: HTMLImageElement, name: string) => void;
}

const MODELS = [
  { id: "google/gemini-3.1-flash-image-preview", label: "Nano Banana 2 (szybki)" },
  { id: "google/gemini-3-pro-image-preview", label: "Nano Banana Pro (lepsza jakość)" },
  { id: "google/gemini-2.5-flash-image", label: "Nano Banana (ekonomiczny)" },
];

export function AIGenerateDialog({ canvasWidth, canvasHeight, onImageGenerated }: AIGenerateDialogProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(MODELS[0].id);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-layer", {
        body: { prompt: prompt.trim(), width: canvasWidth, height: canvasHeight, model },
      });

      if (error) {
        toast.error("Błąd generowania: " + error.message);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const imageUrl = data?.imageUrl;
      if (!imageUrl) {
        toast.error("Nie otrzymano obrazu z AI");
        return;
      }

      // Load the base64 image
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const shortName = prompt.trim().slice(0, 30).replace(/\s+/g, "_");
        onImageGenerated(img, `AI: ${shortName}`);
        toast.success("Warstwa AI dodana!");
        setOpen(false);
        setPrompt("");
      };
      img.onerror = () => {
        toast.error("Nie udało się załadować wygenerowanego obrazu");
      };
      img.src = imageUrl;
    } catch (e) {
      toast.error("Błąd połączenia z AI");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-6 gap-1 text-[10px] px-2" title="Generuj warstwę AI">
          <Sparkles className="h-3 w-3" /> AI Warstwa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            Generuj warstwę AI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Prompt
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Opisz co chcesz wygenerować, np. 'Złoty zachód słońca nad morzem, fotorealistyczne, 8k'"
              className="min-h-[80px] text-xs"
              maxLength={2000}
            />
            <div className="flex justify-between">
              <Badge variant="outline" className="text-[8px] border-border">
                {canvasWidth}×{canvasHeight}
              </Badge>
              <span className="text-[9px] text-muted-foreground">{prompt.length}/2000</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Model
            </label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generowanie...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generuj warstwę
              </>
            )}
          </Button>

          {loading && (
            <p className="text-[10px] text-muted-foreground text-center">
              Generowanie może potrwać 10-30 sekund...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}