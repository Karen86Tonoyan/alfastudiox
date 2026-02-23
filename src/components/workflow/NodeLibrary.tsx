import { useState } from "react";
import { Search, Filter, ChevronRight, ChevronDown, Folder, Video, Layers, ImageUp, ScanEye, Paintbrush, Eye, Music, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NodeChild {
  name: string;
  count?: number;
  children?: { name: string }[];
}

interface NodeCategory {
  name: string;
  count: number;
  icon?: string;
  tag?: string;
  description?: string;
  children: NodeChild[];
}

const nodeCategories: NodeCategory[] = [
  // ── Subgraph Blueprints ──
  {
    name: "Subgraph Blueprints",
    count: 19,
    icon: "⚡",
    tag: "Pipelines",
    description: "Gotowe pipeline'y end-to-end — Text/Image/Pose → Image/Video. Turbo, Flux, LTX.",
    children: [
      { name: "Canny to Image (Z-Image-Turbo)" },
      { name: "First-Last-Frame to Video" },
      { name: "Text to Image (Flux.2 Dev)" },
      { name: "Pose to Video (LTX 2.0)" },
      { name: "Image Edit (Flux.2 Klein 4B)" },
      { name: "Image to Video" },
      { name: "ControlNet (Z-Image-Turbo)" },
      { name: "Text to Video" },
      { name: "Text to Image (Z-Image-Turbo)" },
      { name: "Text to Image" },
      { name: "Canny to Video (LTX 2.0)" },
      { name: "Pose to Image" },
      { name: "Image Edit (Flux.2 Dev)" },
      { name: "Depth to Image (Z-Image-Turbo)" },
    ],
  },

  // ── Video & Animation ──
  {
    name: "WanVideoWrapper",
    count: 137,
    icon: "🎥",
    tag: "Video",
    description: "Wan 2.1/2.2 (Alibaba) — Image-to-Video, Text-to-Video, Character Animation, Motion Transfer, Pose Control, Lip-sync, Reference Image.",
    children: [
      { name: "WanVideo_I2V" },
      { name: "WanVideo_T2V" },
      { name: "WanVideo_CharacterAnimate" },
      { name: "WanVideo_MotionTransfer" },
      { name: "WanVideo_PoseControl" },
      { name: "WanVideo_LipSync" },
      { name: "WanVideo_ReferenceImage" },
    ],
  },
  {
    name: "WanAnimatePreprocess",
    count: 6,
    icon: "🦴",
    tag: "Video",
    description: "Preprocessing pod WanAnimate — ViTPose, face crops, keypoint detection + SAM2 segmentation.",
    children: [
      { name: "WanAnimate_ViTPose" },
      { name: "WanAnimate_FaceCrop" },
      { name: "WanAnimate_KeypointDetect" },
      { name: "WanAnimate_SAM2Segment" },
      { name: "WanAnimate_PoseEstimate" },
      { name: "WanAnimate_Preprocessor" },
    ],
  },
  {
    name: "LivePortrait",
    count: 1,
    icon: "🗣️",
    tag: "Video",
    description: "Ożywianie statycznych portretów — realistyczna animacja twarzy, głowy, ekspresji z driving video lub audio. Talking-heads i character swap.",
    children: [
      { name: "LivePortrait_Animate" },
    ],
  },
  {
    name: "Animate Diff",
    count: 114,
    icon: "🐉",
    tag: "Video",
    description: "Klasyczny motion module — tworzenie wideo z obrazów. Stabilna, sprawdzona technologia z context windowing.",
    children: [
      { name: "ADE_AnimateDiffLoaderWithContext" },
      { name: "ADE_AnimateDiffLoader" },
      { name: "ADE_AnimateDiffCombine" },
      { name: "ADE_MultivalDynamic" },
      { name: "ADE_MotionModelSettings" },
    ],
  },
  {
    name: "FL Path Animator",
    count: 1,
    icon: "🌺",
    tag: "Video",
    description: "Interaktywny edytor ścieżek — rysujesz trajektorię, obiekty poruszają się po niej. Łączy się z WanVideo.",
    children: [
      { name: "FL_PathAnimator" },
    ],
  },
  {
    name: "Video Helper Suite",
    count: 33,
    icon: "🎬",
    tag: "Video",
    description: "Must-have do pracy z wideo: load/save, dzielenie na klatki, łączenie, batch processing, audio handling, preview, konwersje formatów.",
    children: [
      { name: "VHS_LoadVideo" },
      { name: "VHS_SaveVideo" },
      { name: "VHS_SplitFrames" },
      { name: "VHS_MergeFrames" },
      { name: "VHS_AudioExtract" },
      { name: "VHS_BatchProcess" },
      { name: "VHS_Preview" },
    ],
  },

  // ── Depth & Geometry ──
  {
    name: "DepthAnythingV2",
    count: 2,
    icon: "🌊",
    tag: "Depth",
    description: "Najpopularniejszy model do estymacji mapy głębi z pojedynczego obrazu/wideo.",
    children: [
      { name: "DepthAnythingV2_Image" },
      { name: "DepthAnythingV2_Video" },
    ],
  },
  {
    name: "NormalCrafter",
    count: 2,
    icon: "🔮",
    tag: "Depth",
    description: "Temporally consistent normal maps z wideo — realistyczny relighting i kontrola oświetlenia (szczególnie Wan 2.2).",
    children: [
      { name: "NormalCrafter_Generate" },
      { name: "NormalCrafter_Preview" },
    ],
  },
  {
    name: "ComfyUI-Lotus",
    count: 2,
    icon: "🪷",
    tag: "Depth",
    description: "Zaawansowany model Lotus — depth + normal prediction (diffusion-based, lepszy w szczegółach niż DepthAnything).",
    children: [
      { name: "Lotus_DepthPredict" },
      { name: "Lotus_NormalPredict" },
    ],
  },

  // ── Image Enhancement & Upscaling ──
  {
    name: "SUPIR",
    count: 10,
    icon: "✨",
    tag: "Upscale",
    description: "Najlepszy upscaler + image restoration w ComfyUI. Naprawia szum, detale, twarze, tekstury — photo-realistic jakość.",
    children: [
      { name: "SUPIR_Upscale" },
      { name: "SUPIR_Restore" },
      { name: "SUPIR_FaceEnhance" },
      { name: "SUPIR_Denoise" },
    ],
  },
  {
    name: "FlashVSR",
    count: 3,
    icon: "⚡",
    tag: "Upscale",
    description: "Real-time Video Super-Resolution (diffusion-based 2×–4×). Najszybszy upscale wideo — 720p→4K w sekundy.",
    children: [
      { name: "FlashVSR_Upscale2x" },
      { name: "FlashVSR_Upscale4x" },
      { name: "FlashVSR_VideoUpscale" },
    ],
  },
  {
    name: "SEEDVR2",
    count: 4,
    icon: "🌱",
    tag: "Upscale",
    description: "Video + image upscaler od ByteDance/Seed — konkurencja SUPIR, szczególnie dobry na wideo.",
    children: [
      { name: "SEEDVR2_ImageUpscale" },
      { name: "SEEDVR2_VideoUpscale" },
      { name: "SEEDVR2_Enhance" },
      { name: "SEEDVR2_Restore" },
    ],
  },

  // ── Control & Reference ──
  {
    name: "Adv-ControlNet",
    count: 33,
    icon: "🎯",
    tag: "Control",
    description: "Zaawansowane ControlNet — Union, więcej trybów, lepsza precyzja. Canny, Depth, Pose, Scribble, itp.",
    children: [
      { name: "AdvCN_Canny" },
      { name: "AdvCN_Depth" },
      { name: "AdvCN_Pose" },
      { name: "AdvCN_Scribble" },
      { name: "AdvCN_Union" },
    ],
  },
  {
    name: "ipadapter",
    count: 29,
    icon: "🖼️",
    tag: "Control",
    description: "IP-Adapter — kontrola generacji na podstawie obrazu referencyjnego (styl, twarz, kompozycja, outfit).",
    children: [
      { name: "IPAdapter_Apply" },
      { name: "IPAdapter_FaceID" },
      { name: "IPAdapter_StyleTransfer" },
      { name: "IPAdapter_Composition" },
      { name: "IPAdapter_UnifiedLoader" },
    ],
  },
  {
    name: "inpaint",
    count: 6,
    icon: "🖌️",
    tag: "Control",
    description: "Narzędzia do inpaintingu — wypełnianie masek, usuwanie obiektów, lokalna edycja.",
    children: [
      { name: "Inpaint_MaskFill" },
      { name: "Inpaint_ObjectRemove" },
      { name: "Inpaint_LocalEdit" },
      { name: "Inpaint_Outpaint" },
    ],
  },

  // ── Multimodal / Vision ──
  {
    name: "Janus-Pro (DeepSeek)",
    count: 4,
    icon: "🧿",
    tag: "Vision",
    description: "DeepSeek Janus-Pro 1B/7B — unified VLM + image generation. Image understanding (2 obrazy naraz), auto-prompting, image-to-prompt, outpainting. Lepszy od Florence2 w opisach twarzy, ubrań i emocji.",
    children: [
      { name: "JanusModelLoader" },
      { name: "JanusImageUnderstanding" },
      { name: "JanusImageGeneration" },
      { name: "JanusVisionChat" },
    ],
  },
  {
    name: "Florence2",
    count: 4,
    icon: "👁️",
    tag: "Vision",
    description: "Microsoft Florence-2 VLM — captioning, dense captioning, object detection, OCR, segmentation, grounding, DocVQA.",
    children: [
      { name: "Florence2_Caption" },
      { name: "Florence2_ObjectDetect" },
      { name: "Florence2_OCR" },
      { name: "Florence2_Segment" },
    ],
  },

  // ── Audio ──
  {
    name: "Lum3on",
    count: 28,
    icon: "🟣",
    tag: "Audio",
    description: "Text-to-Audio, Text-to-Music, Video-to-Audio (StableAudioX), plus HiDream sampler i narzędzia audio.",
    children: [
      { name: "Lum3on_TextToAudio" },
      { name: "Lum3on_TextToMusic" },
      { name: "Lum3on_VideoToAudio" },
      { name: "Lum3on_HiDreamSampler" },
      { name: "Lum3on_AudioMix" },
    ],
  },
];

// Tag color mapping
const tagColors: Record<string, string> = {
  Pipelines: "bg-primary/20 text-primary",
  Video: "bg-blue-500/20 text-blue-400",
  Depth: "bg-cyan-500/20 text-cyan-400",
  Upscale: "bg-emerald-500/20 text-emerald-400",
  Control: "bg-amber-500/20 text-amber-400",
  Vision: "bg-violet-500/20 text-violet-400",
  Audio: "bg-pink-500/20 text-pink-400",
};

interface NodeLibraryProps {
  className?: string;
  onAddNode?: (name: string) => void;
}

export function NodeLibrary({ className, onAddNode }: NodeLibraryProps) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ "Subgraph Blueprints": true });

  const filtered = search
    ? nodeCategories.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.tag?.toLowerCase().includes(search.toLowerCase()) ||
          c.description?.toLowerCase().includes(search.toLowerCase()) ||
          c.children.some((ch) => ch.name.toLowerCase().includes(search.toLowerCase()))
      )
    : nodeCategories;

  const toggle = (name: string) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn("flex flex-col border-r border-border bg-card", className)}>
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <span className="text-sm font-semibold text-foreground">Node Library</span>
          <span className="ml-auto rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {nodeCategories.reduce((s, c) => s + c.count, 0)}
          </span>
        </div>

        {/* Search */}
        <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes, tags..."
            className="h-7 border-0 bg-transparent text-xs focus-visible:ring-0 placeholder:text-muted-foreground"
          />
          <button className="rounded p-1 text-muted-foreground hover:bg-secondary">
            <Filter className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Tree */}
        <ScrollArea className="flex-1">
          <div className="p-1">
            {filtered.map((cat) => (
              <div key={cat.name}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => toggle(cat.name)}
                      className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-xs text-foreground hover:bg-secondary"
                    >
                      {cat.children.length > 0 || cat.count > 0 ? (
                        expanded[cat.name] ? (
                          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                        )
                      ) : (
                        <span className="w-3" />
                      )}
                      <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {cat.icon && <span className="text-xs">{cat.icon}</span>}
                      <span className="truncate">{cat.name}</span>
                      {cat.tag && (
                        <span className={cn("ml-1 shrink-0 rounded px-1 py-0.5 text-[9px] font-medium", tagColors[cat.tag] || "bg-secondary text-muted-foreground")}>
                          {cat.tag}
                        </span>
                      )}
                      <span className="ml-auto shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {cat.count}
                      </span>
                    </button>
                  </TooltipTrigger>
                  {cat.description && (
                    <TooltipContent side="right" className="max-w-xs text-xs">
                      {cat.description}
                    </TooltipContent>
                  )}
                </Tooltip>

                {expanded[cat.name] && cat.children.length > 0 && (
                  <div className="ml-4 border-l border-border pl-2">
                    {cat.children
                      .filter((ch) => !search || ch.name.toLowerCase().includes(search.toLowerCase()))
                      .map((child) => (
                        <button
                          key={child.name}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData("workflow/node", child.name)}
                          onClick={() => onAddNode?.(child.name)}
                          className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground cursor-grab active:cursor-grabbing"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                          <span className="truncate">{child.name}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}