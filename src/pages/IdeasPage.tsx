import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Lightbulb, Film, Camera, Music, Sparkles, Copy, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Idea {
  title: string;
  description: string;
  scenes?: string[];
  style?: string;
  category: string;
}

const CATEGORIES = [
  { id: "video", label: "Filmy", icon: Film, prompt: "cinematic video concepts" },
  { id: "photo", label: "Zdjęcia", icon: Camera, prompt: "photo session concepts" },
  { id: "short", label: "Shorty", icon: Sparkles, prompt: "short-form vertical video ideas for TikTok/Reels" },
  { id: "music", label: "Klipy", icon: Music, prompt: "music video concepts" },
];

export default function IdeasPage() {
  const [topic, setTopic] = useState("");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("video");

  const generateIdeas = async () => {
    if (!topic.trim()) {
      toast.error("Wpisz temat lub styl");
      return;
    }

    setLoading(true);
    try {
      const category = CATEGORIES.find((c) => c.id === activeTab);
      const { data, error } = await supabase.functions.invoke("ai-ideas", {
        body: {
          topic: topic.trim(),
          category: category?.prompt || "creative content",
          count: 5,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setIdeas(
        (data?.ideas || []).map((idea: any) => ({
          ...idea,
          category: activeTab,
        }))
      );
      toast.success(`Wygenerowano ${data?.ideas?.length || 0} pomysłów`);
    } catch (err: any) {
      toast.error(`Błąd: ${err.message}`);
      // Fallback mock ideas
      setIdeas(getMockIdeas(activeTab, topic));
    } finally {
      setLoading(false);
    }
  };

  const copyIdea = (idea: Idea) => {
    const text = `${idea.title}\n\n${idea.description}${idea.scenes ? "\n\nSceny:\n" + idea.scenes.join("\n") : ""}`;
    navigator.clipboard.writeText(text);
    toast.success("Skopiowano do schowka");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Lightbulb className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-bold text-foreground">AI Content Ideas</h1>
          <p className="text-xs text-muted-foreground">Generator pomysłów na filmy, zdjęcia i treści</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Textarea
            placeholder="Opisz temat, styl lub branżę... np. 'cyberpunk fashion', 'fitness influencer', 'luxury watches'"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="min-h-[60px] text-sm"
          />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between gap-2">
              <TabsList className="bg-secondary h-8">
                {CATEGORIES.map((cat) => (
                  <TabsTrigger key={cat.id} value={cat.id} className="text-[10px] gap-1 h-6">
                    <cat.icon className="h-3 w-3" />
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <Button
                size="sm"
                onClick={generateIdeas}
                disabled={loading}
                className="gold-gradient text-primary-foreground font-semibold text-xs h-8"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                Generuj pomysły
              </Button>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {ideas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ideas.map((idea, i) => (
            <Card key={i} className="group hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm leading-tight">{idea.title}</CardTitle>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyIdea(idea)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                {idea.style && (
                  <Badge variant="outline" className="text-[8px] w-fit border-primary/30 text-primary">
                    {idea.style}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <p className="text-xs text-muted-foreground leading-relaxed">{idea.description}</p>
                {idea.scenes && idea.scenes.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-foreground">Sceny:</p>
                    {idea.scenes.map((scene, si) => (
                      <div key={si} className="text-[10px] text-muted-foreground pl-2 border-l border-primary/20">
                        {si + 1}. {scene}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {ideas.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Lightbulb className="h-12 w-12 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">Wpisz temat i kliknij „Generuj pomysły"</p>
          <p className="text-xs text-muted-foreground/60 mt-1">AI stworzy 5 unikalnych konceptów kreatywnych</p>
        </div>
      )}
    </div>
  );
}

function getMockIdeas(category: string, topic: string): Idea[] {
  return [
    {
      title: `Cinematic ${topic} showcase`,
      description: `Dramatyczna prezentacja ${topic} z efektami slow-motion i neonowym oświetleniem.`,
      scenes: ["Establishing shot — panorama miasta", "Close-up — detale produktu", "Model w ruchu", "Final reveal z logo"],
      style: "cinematic",
      category,
    },
    {
      title: `${topic} — behind the scenes`,
      description: `Autentyczny materiał zza kulis pokazujący proces tworzenia.`,
      scenes: ["Przygotowania", "Sesja główna", "Post-produkcja", "Finał"],
      style: "documentary",
      category,
    },
    {
      title: `Futuristic ${topic} ad`,
      description: `Reklama w stylu sci-fi z efektami holograficznymi i cyberpunkowym klimatem.`,
      scenes: ["Intro hologram", "Produkt w akcji", "Transformacja", "CTA"],
      style: "cyberpunk",
      category,
    },
    {
      title: `${topic} lifestyle reel`,
      description: `Krótki, dynamiczny materiał idealny na Instagram Reels i TikTok.`,
      scenes: ["Hook — pierwsze 2s", "Szybki montaż", "Slow-mo moment", "Outro"],
      style: "lifestyle",
      category,
    },
    {
      title: `${topic} editorial`,
      description: `Elegancki, magazynowy styl z profesjonalnym oświetleniem studyjnym.`,
      scenes: ["Studio setup", "Portret", "Detale", "Kompozycja finalna"],
      style: "editorial",
      category,
    },
  ];
}
