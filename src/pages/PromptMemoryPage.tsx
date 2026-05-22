import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Star, Sparkles, Trash2, Copy, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PromptEntry {
  id: string;
  prompt: string;
  improved_prompt: string | null;
  style: string | null;
  model: string | null;
  rating: number | null;
  tags: string[] | null;
  created_at: string;
}

export default function PromptMemoryPage() {
  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [search, setSearch] = useState("");
  const [improving, setImproving] = useState<string | null>(null);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    const { data } = await supabase
      .from("prompt_memory")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setPrompts(data || []);
  };

  const improvePrompt = async (entry: PromptEntry) => {
    setImproving(entry.id);
    try {
      const { data, error } = await supabase.functions.invoke("ai-ideas", {
        body: {
          topic: entry.prompt,
          category: "improve this prompt for AI image/video generation. Return a single improved prompt as the first idea title.",
          count: 1,
        },
      });

      if (error) throw new Error(error.message);
      const improved = data?.ideas?.[0]?.description || data?.ideas?.[0]?.title;
      if (improved) {
        await supabase.from("prompt_memory").update({ improved_prompt: improved }).eq("id", entry.id);
        toast.success("Prompt ulepszony przez AI");
        loadPrompts();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setImproving(null);
    }
  };

  const ratePrompt = async (id: string, rating: number) => {
    await supabase.from("prompt_memory").update({ rating }).eq("id", id);
    setPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, rating } : p)));
  };

  const deletePrompt = async (id: string) => {
    await supabase.from("prompt_memory").delete().eq("id", id);
    setPrompts((prev) => prev.filter((p) => p.id !== id));
    toast.success("Usunięto");
  };

  const copyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Skopiowano");
  };

  const filtered = prompts.filter(
    (p) =>
      !search ||
      p.prompt.toLowerCase().includes(search.toLowerCase()) ||
      p.improved_prompt?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Brain className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-bold text-foreground">Pamięć Promptów</h1>
          <p className="text-xs text-muted-foreground">Historia promptów z AI ulepszaniem</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Szukaj w promptach..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <Brain className="h-12 w-12 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">
            {prompts.length === 0 ? "Brak zapisanych promptów" : "Brak wyników"}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Prompty zapisują się automatycznie podczas renderowania
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <Card key={entry.id} className="group">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground">{entry.prompt}</p>
                    {entry.improved_prompt && (
                      <div className="mt-1 bg-primary/5 border border-primary/20 rounded p-2">
                        <p className="text-[10px] text-primary font-medium mb-0.5">✨ Ulepszona wersja:</p>
                        <p className="text-xs text-foreground">{entry.improved_prompt}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {entry.style && <Badge variant="outline" className="text-[8px]">{entry.style}</Badge>}
                    {entry.model && <Badge variant="outline" className="text-[8px]">{entry.model}</Badge>}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => ratePrompt(entry.id, star)}
                        className="p-0"
                      >
                        <Star
                          className={`h-3 w-3 ${(entry.rating || 0) >= star ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                        />
                      </button>
                    ))}
                    <span className="text-[9px] text-muted-foreground ml-2">
                      {new Date(entry.created_at).toLocaleDateString("pl")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyPrompt(entry.improved_prompt || entry.prompt)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={improving === entry.id}
                      onClick={() => improvePrompt(entry)}
                    >
                      {improving === entry.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deletePrompt(entry.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
