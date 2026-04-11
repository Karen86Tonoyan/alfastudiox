import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Clapperboard, Play, Loader2, Film, Image, Type, Sparkles, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Scene {
  index: number;
  description: string;
  imagePrompt: string;
  duration: number;
  transition: string;
  subtitle?: string;
}

interface Storyboard {
  title: string;
  style: string;
  scenes: Scene[];
}

const STYLES = [
  { id: "cinematic", label: "Cinematic" },
  { id: "cyberpunk", label: "Cyberpunk" },
  { id: "anime", label: "Anime" },
  { id: "documentary", label: "Dokument" },
  { id: "fashion", label: "Fashion" },
  { id: "music-video", label: "Klip muzyczny" },
  { id: "product-ad", label: "Reklama" },
];

const PIPELINE_STEPS = [
  { id: "script", label: "Scenariusz", icon: Type },
  { id: "storyboard", label: "Storyboard", icon: Clapperboard },
  { id: "images", label: "Obrazy", icon: Image },
  { id: "video", label: "Animacja", icon: Film },
  { id: "effects", label: "Efekty + napisy", icon: Sparkles },
  { id: "final", label: "Render finalny", icon: CheckCircle },
];

export default function MoviePipelinePage() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [currentStep, setCurrentStep] = useState(-1);
  const [loading, setLoading] = useState(false);

  const generateStoryboard = async () => {
    if (!prompt.trim()) { toast.error("Wpisz prompt"); return; }
    setLoading(true);
    setCurrentStep(0);

    try {
      // Step 1: Generate storyboard via AI
      const { data, error } = await supabase.functions.invoke("ai-storyboard", {
        body: { prompt: prompt.trim(), style, sceneCount: 5 },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (data?.storyboard) {
        setStoryboard(data.storyboard);
        setCurrentStep(1);
        toast.success("Storyboard wygenerowany!");
      } else {
        // Fallback mock
        setStoryboard(getMockStoryboard(prompt, style));
        setCurrentStep(1);
        toast.success("Storyboard wygenerowany (demo)");
      }

      // Save to DB
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("storyboard_projects").insert({
          user_id: user.id,
          title: data?.storyboard?.title || `Film: ${prompt.substring(0, 50)}`,
          original_prompt: prompt,
          script: data?.storyboard || getMockStoryboard(prompt, style),
          scenes: (data?.storyboard?.scenes || getMockStoryboard(prompt, style).scenes),
          style,
          status: "storyboard",
        });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
      // Show mock anyway
      setStoryboard(getMockStoryboard(prompt, style));
      setCurrentStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Clapperboard className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-bold text-foreground">One Prompt → Full Movie</h1>
          <p className="text-xs text-muted-foreground">Wpisz 1 prompt — AI stworzy cały film</p>
        </div>
      </div>

      {/* Pipeline progress */}
      <div className="flex items-center gap-1">
        {PIPELINE_STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center gap-1 flex-1">
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium transition-colors w-full justify-center ${
              i < currentStep ? "bg-primary/20 text-primary" :
              i === currentStep ? "bg-primary text-primary-foreground" :
              "bg-secondary text-muted-foreground"
            }`}>
              <step.icon className="h-3 w-3" />
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {i < PIPELINE_STEPS.length - 1 && <div className={`h-px w-2 ${i < currentStep ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      {/* Input */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Textarea
            placeholder="Opisz swój film w jednym zdaniu... np. 'Cyberpunk influencer promoting futuristic sneakers in Tokyo at night'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[80px] text-sm"
          />
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-xs">Styl wizualny</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STYLES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={generateStoryboard}
              disabled={loading}
              className="gold-gradient text-primary-foreground font-semibold h-8 text-xs"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}
              Generuj film
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Storyboard result */}
      {storyboard && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold">{storyboard.title}</h2>
            <Badge variant="outline" className="text-[8px]">{storyboard.style}</Badge>
            <Badge variant="outline" className="text-[8px]">{storyboard.scenes.length} scen</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {storyboard.scenes.map((scene) => (
              <Card key={scene.index} className="border-l-2 border-l-primary/50">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="text-[8px] bg-primary/10 text-primary border-primary/20">
                      Scena {scene.index}
                    </Badge>
                    <span className="text-[9px] text-muted-foreground font-mono">{scene.duration}s</span>
                  </div>
                  <p className="text-xs text-foreground">{scene.description}</p>
                  <div className="bg-secondary/50 rounded p-2">
                    <p className="text-[9px] text-muted-foreground font-mono">{scene.imagePrompt}</p>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                    <span>Przejście: {scene.transition}</span>
                    {scene.subtitle && <span className="italic">„{scene.subtitle}"</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium">Następny krok: Generowanie obrazów scen</p>
                <p className="text-[10px] text-muted-foreground">Wymaga skonfigurowanego providera obrazów (OpenAI, Replicate, Google)</p>
              </div>
              <Button size="sm" className="text-xs h-7" disabled>
                <Image className="h-3 w-3 mr-1" /> Generuj obrazy (wkrótce)
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function getMockStoryboard(prompt: string, style: string): Storyboard {
  return {
    title: `Film: ${prompt.substring(0, 60)}`,
    style,
    scenes: [
      { index: 1, description: "Establishing shot — panorama lokacji", imagePrompt: `wide shot ${style} ${prompt}, establishing shot, dramatic lighting`, duration: 5, transition: "fade", subtitle: "" },
      { index: 2, description: "Wprowadzenie postaci głównej", imagePrompt: `medium shot protagonist in ${style} style, ${prompt}, character introduction`, duration: 5, transition: "slide", subtitle: "" },
      { index: 3, description: "Akcja główna — dynamiczna scena", imagePrompt: `dynamic action shot ${style}, ${prompt}, intense moment, motion blur`, duration: 5, transition: "zoom", subtitle: "" },
      { index: 4, description: "Moment dramatyczny — zbliżenie", imagePrompt: `close-up emotional shot ${style}, ${prompt}, dramatic lighting, shallow depth of field`, duration: 5, transition: "fade", subtitle: "" },
      { index: 5, description: "Finałowe ujęcie z logo", imagePrompt: `epic final shot ${style}, ${prompt}, wide angle, golden hour, cinematic`, duration: 5, transition: "fade", subtitle: "ALFA STUDIOX" },
    ],
  };
}
