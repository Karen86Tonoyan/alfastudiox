import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Clapperboard, Play, Loader2, Film, Image, Type, Sparkles, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useComfyUI } from "@/hooks/useComfyUI";
import { useComfyModels } from "@/hooks/useComfyModels";

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

interface SceneImageJob {
  sceneIndex: number;
  status: "queued" | "error";
  promptId?: string | null;
  error?: string;
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
  const comfy = useComfyUI();
  const { models } = useComfyModels();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [currentStep, setCurrentStep] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imageJobs, setImageJobs] = useState<SceneImageJob[]>([]);

  useEffect(() => {
    if (comfy.status === "disconnected") {
      comfy.connect();
    }
  }, [comfy]);

  const activeCheckpoint = useMemo(() => {
    const [first] = models.checkpoints;
    return first?.path || first?.name || null;
  }, [models.checkpoints]);

  const generateStoryboard = async () => {
    if (!prompt.trim()) {
      toast.error("Wpisz prompt");
      return;
    }

    setLoading(true);
    setCurrentStep(0);

    try {
      const { data, error } = await supabase.functions.invoke("ai-storyboard", {
        body: { prompt: prompt.trim(), style, sceneCount: 5 },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const nextStoryboard = data?.storyboard || getMockStoryboard(prompt, style);
      setStoryboard(nextStoryboard);
      setImageJobs([]);
      setCurrentStep(1);
      toast.success(data?.storyboard ? "Storyboard wygenerowany!" : "Storyboard wygenerowany (demo)");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("storyboard_projects").insert({
          user_id: user.id,
          title: nextStoryboard.title || `Film: ${prompt.substring(0, 50)}`,
          original_prompt: prompt,
          script: nextStoryboard,
          scenes: nextStoryboard.scenes,
          style,
          status: "storyboard",
        });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
      setStoryboard(getMockStoryboard(prompt, style));
      setImageJobs([]);
      setCurrentStep(1);
    } finally {
      setLoading(false);
    }
  };

  const generateSceneImages = async () => {
    if (!storyboard) {
      toast.error("Najpierw wygeneruj storyboard.");
      return;
    }
    if (!comfy.isConnected) {
      toast.error("ComfyUI nie jest podłączony.");
      return;
    }
    if (!activeCheckpoint) {
      toast.error("Brak wykrytego checkpointu w ComfyUI.");
      return;
    }

    setImagesLoading(true);
    setCurrentStep(2);
    const jobs: SceneImageJob[] = [];

    for (const scene of storyboard.scenes) {
      const workflow = buildSceneImageWorkflow(scene, activeCheckpoint, storyboard.style);
      const promptId = await comfy.queuePrompt(workflow);

      if (promptId) {
        jobs.push({
          sceneIndex: scene.index,
          status: "queued",
          promptId,
        });
      } else {
        jobs.push({
          sceneIndex: scene.index,
          status: "error",
          error: "ComfyUI odrzucił workflow lub kolejka jest niedostępna.",
        });
      }
    }

    setImageJobs(jobs);
    const queuedCount = jobs.filter((job) => job.status === "queued").length;
    if (queuedCount > 0) {
      toast.success(`Wysłano ${queuedCount} scen do lokalnego ComfyUI.`);
    } else {
      toast.error("Nie udało się wysłać scen do ComfyUI.");
    }
    setImagesLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Clapperboard className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-bold text-foreground">One Prompt → Full Movie</h1>
          <p className="text-xs text-muted-foreground">Wpisz 1 prompt — AI zbuduje storyboard i wyśle sceny do lokalnego ComfyUI.</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {PIPELINE_STEPS.map((step, i) => (
          <div key={step.id} className="flex flex-1 items-center gap-1">
            <div
              className={`flex w-full items-center justify-center gap-1 rounded px-2 py-1 text-[9px] font-medium transition-colors ${
                i < currentStep
                  ? "bg-primary/20 text-primary"
                  : i === currentStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
              }`}
            >
              <step.icon className="h-3 w-3" />
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {i < PIPELINE_STEPS.length - 1 && <div className={`h-px w-2 ${i < currentStep ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <Textarea
            placeholder="Opisz swój film w jednym zdaniu... np. Cyberpunk influencer promoting futuristic sneakers in Tokyo at night"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[80px] text-sm"
          />
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-xs">Styl wizualny</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STYLES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generateStoryboard} disabled={loading} className="h-8 text-xs font-semibold text-primary-foreground gold-gradient">
              {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
              Generuj film
            </Button>
          </div>
        </CardContent>
      </Card>

      {storyboard && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold">{storyboard.title}</h2>
            <Badge variant="outline" className="text-[8px]">
              {storyboard.style}
            </Badge>
            <Badge variant="outline" className="text-[8px]">
              {storyboard.scenes.length} scen
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {storyboard.scenes.map((scene) => (
              <Card key={scene.index} className="border-l-2 border-l-primary/50">
                <CardContent className="space-y-2 p-3">
                  <div className="flex items-center justify-between">
                    <Badge className="border-primary/20 bg-primary/10 text-[8px] text-primary">Scena {scene.index}</Badge>
                    <span className="font-mono text-[9px] text-muted-foreground">{scene.duration}s</span>
                  </div>
                  <p className="text-xs text-foreground">{scene.description}</p>
                  <div className="rounded bg-secondary/50 p-2">
                    <p className="font-mono text-[9px] text-muted-foreground">{scene.imagePrompt}</p>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                    <span>Przejście: {scene.transition}</span>
                    {scene.subtitle ? <span className="italic">„{scene.subtitle}”</span> : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="space-y-3 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium">Następny krok: Generowanie obrazów scen</p>
                  <p className="text-[10px] text-muted-foreground">Źródło obrazów: lokalne ComfyUI, bez OpenAI/Replicate/Google.</p>
                  <p className="text-[10px] text-muted-foreground">Status ComfyUI: {comfy.isConnected ? "połączony" : "rozłączony"}.</p>
                  <p className="text-[10px] text-muted-foreground">Checkpoint: {activeCheckpoint || "brak wykrytego modelu"}.</p>
                </div>
                <Button size="sm" className="h-7 text-xs" disabled={imagesLoading || !comfy.isConnected || !activeCheckpoint} onClick={generateSceneImages}>
                  {imagesLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Image className="mr-1 h-3 w-3" />}
                  Generuj obrazy
                </Button>
              </div>

              {imageJobs.length > 0 && (
                <div className="space-y-2">
                  {imageJobs.map((job) => (
                    <div key={`${job.sceneIndex}-${job.promptId || job.status}`} className="flex items-center justify-between rounded border border-border/60 bg-background/60 px-2 py-1.5 text-[11px]">
                      <span>Scena {job.sceneIndex}</span>
                      {job.status === "queued" ? (
                        <span className="font-mono text-emerald-400">queued: {job.promptId?.slice(0, 8)}</span>
                      ) : (
                        <span className="text-red-400">{job.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {comfy.lastImage && (
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground">Ostatni wygenerowany kadr z ComfyUI</p>
                  <img
                    src={comfy.lastImage}
                    alt="Ostatni wygenerowany kadr"
                    className="max-h-72 rounded border border-border object-contain"
                  />
                </div>
              )}
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
      {
        index: 1,
        description: "Establishing shot — panorama lokacji",
        imagePrompt: `wide shot ${style} ${prompt}, establishing shot, dramatic lighting`,
        duration: 5,
        transition: "fade",
        subtitle: "",
      },
      {
        index: 2,
        description: "Wprowadzenie postaci głównej",
        imagePrompt: `medium shot protagonist in ${style} style, ${prompt}, character introduction`,
        duration: 5,
        transition: "slide",
        subtitle: "",
      },
      {
        index: 3,
        description: "Akcja główna — dynamiczna scena",
        imagePrompt: `dynamic action shot ${style}, ${prompt}, intense moment, motion blur`,
        duration: 5,
        transition: "zoom",
        subtitle: "",
      },
      {
        index: 4,
        description: "Moment dramatyczny — zbliżenie",
        imagePrompt: `close-up emotional shot ${style}, ${prompt}, dramatic lighting, shallow depth of field`,
        duration: 5,
        transition: "fade",
        subtitle: "",
      },
      {
        index: 5,
        description: "Finałowe ujęcie z logo",
        imagePrompt: `epic final shot ${style}, ${prompt}, wide angle, golden hour, cinematic`,
        duration: 5,
        transition: "fade",
        subtitle: "ALFA STUDIOX",
      },
    ],
  };
}

function buildSceneImageWorkflow(scene: Scene, checkpoint: string, style: string) {
  const seed = Math.floor(Math.random() * 2 ** 31);
  const positivePrompt = `${scene.imagePrompt}, ${style} style, high quality, cinematic lighting, detailed composition`;

  return {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: {
        ckpt_name: checkpoint,
      },
    },
    "2": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: positivePrompt,
        clip: ["1", 1],
      },
    },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: "blurry, low quality, artifacts, bad anatomy, deformed, cropped, watermark, text",
        clip: ["1", 1],
      },
    },
    "4": {
      class_type: "EmptyLatentImage",
      inputs: {
        width: 1024,
        height: 1024,
        batch_size: 1,
      },
    },
    "5": {
      class_type: "KSampler",
      inputs: {
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["3", 0],
        latent_image: ["4", 0],
        seed,
        steps: 20,
        cfg: 7.5,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 1.0,
      },
    },
    "6": {
      class_type: "VAEDecode",
      inputs: {
        samples: ["5", 0],
        vae: ["1", 2],
      },
    },
    "7": {
      class_type: "SaveImage",
      inputs: {
        images: ["6", 0],
        filename_prefix: `movie_scene_${scene.index}_${seed}`,
      },
    },
  };
}
