import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Play, Save, FolderOpen, Copy } from "lucide-react";

interface RecipeStep {
  id: string;
  type: string;
  label: string;
  params: Record<string, any>;
}

interface Recipe {
  id: string;
  name: string;
  steps: RecipeStep[];
  createdAt: number;
}

const STEP_TYPES = [
  { value: "resize", label: "Resize", icon: "📐" },
  { value: "crop", label: "Crop", icon: "✂️" },
  { value: "format", label: "Convert Format", icon: "🔄" },
  { value: "compress", label: "Compress", icon: "📦" },
  { value: "watermark", label: "Add Watermark", icon: "💧" },
  { value: "remove_bg", label: "Remove Background", icon: "🎭" },
  { value: "upscale", label: "AI Upscale", icon: "🔍" },
  { value: "gen_fill", label: "Generative Fill", icon: "🎨" },
  { value: "gen_expand", label: "Generative Expand", icon: "↔️" },
  { value: "remove_object", label: "Remove Object", icon: "🧹" },
  { value: "color_correct", label: "Color Correction", icon: "🎨" },
  { value: "sharpen", label: "Sharpen", icon: "🔪" },
  { value: "denoise", label: "Denoise", icon: "🤫" },
  { value: "lut", label: "Apply LUT", icon: "🎬" },
  { value: "text_overlay", label: "Text Overlay", icon: "📝" },
  { value: "logo_overlay", label: "Logo Overlay", icon: "🏷️" },
];

const DEFAULT_PARAMS: Record<string, Record<string, any>> = {
  resize: { width: 1920, height: 1080, mode: "fit" },
  crop: { x: 0, y: 0, width: 1000, height: 1000 },
  format: { output: "webp", quality: 90 },
  compress: { quality: 85, strip_metadata: true },
  watermark: { text: "© ALFA Studio", opacity: 0.3, position: "bottom-right" },
  remove_bg: { model: "auto", refine_edge: true },
  upscale: { scale: 2, model: "real-esrgan" },
  gen_fill: { prompt: "", mask_mode: "auto" },
  gen_expand: { direction: "all", pixels: 256, prompt: "" },
  remove_object: { prompt: "remove unwanted objects", mode: "auto" },
  color_correct: { brightness: 0, contrast: 0, saturation: 0, temperature: 0 },
  sharpen: { amount: 50, radius: 1 },
  denoise: { strength: 50 },
  lut: { name: "cinematic_warm", intensity: 1.0 },
  text_overlay: { text: "Title", font_size: 48, color: "#ffffff", position: "center" },
  logo_overlay: { url: "", scale: 0.2, position: "top-left", opacity: 0.8 },
};

const PRESET_RECIPES: Recipe[] = [
  {
    id: "preset-web-optimize",
    name: "Web Optimize",
    steps: [
      { id: "s1", type: "resize", label: "Resize", params: { width: 1920, height: 1080, mode: "fit" } },
      { id: "s2", type: "format", label: "Convert Format", params: { output: "webp", quality: 85 } },
      { id: "s3", type: "compress", label: "Compress", params: { quality: 85, strip_metadata: true } },
    ],
    createdAt: Date.now(),
  },
  {
    id: "preset-social-ready",
    name: "Social Media Pack",
    steps: [
      { id: "s1", type: "remove_bg", label: "Remove Background", params: { model: "auto", refine_edge: true } },
      { id: "s2", type: "resize", label: "Resize", params: { width: 1080, height: 1080, mode: "cover" } },
      { id: "s3", type: "color_correct", label: "Color Correction", params: { brightness: 5, contrast: 10, saturation: 10, temperature: 0 } },
      { id: "s4", type: "watermark", label: "Add Watermark", params: { text: "@brand", opacity: 0.2, position: "bottom-right" } },
    ],
    createdAt: Date.now(),
  },
  {
    id: "preset-ai-enhance",
    name: "AI Enhancement Pipeline",
    steps: [
      { id: "s1", type: "denoise", label: "Denoise", params: { strength: 40 } },
      { id: "s2", type: "upscale", label: "AI Upscale", params: { scale: 2, model: "real-esrgan" } },
      { id: "s3", type: "sharpen", label: "Sharpen", params: { amount: 30, radius: 0.8 } },
      { id: "s4", type: "color_correct", label: "Color Correction", params: { brightness: 0, contrast: 5, saturation: 5, temperature: 0 } },
    ],
    createdAt: Date.now(),
  },
];

function StepParamsEditor({ step, onChange }: { step: RecipeStep; onChange: (params: Record<string, any>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      {Object.entries(step.params).map(([key, value]) => (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">{key.replace(/_/g, " ")}</label>
          {typeof value === "boolean" ? (
            <button
              onClick={() => onChange({ ...step.params, [key]: !value })}
              className={`text-xs px-2 py-1 rounded border ${value ? "bg-primary/20 border-primary/40 text-primary" : "bg-muted border-border text-muted-foreground"}`}
            >
              {value ? "ON" : "OFF"}
            </button>
          ) : typeof value === "number" ? (
            <Input
              type="number"
              value={value}
              onChange={(e) => onChange({ ...step.params, [key]: Number(e.target.value) })}
              className="h-7 text-xs"
            />
          ) : (
            <Input
              value={String(value)}
              onChange={(e) => onChange({ ...step.params, [key]: e.target.value })}
              className="h-7 text-xs"
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function RecipeBuilder() {
  const [recipes, setRecipes] = useState<Recipe[]>(PRESET_RECIPES);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [recipeName, setRecipeName] = useState("");
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const createNew = () => {
    const r: Recipe = { id: crypto.randomUUID(), name: recipeName || "Nowy przepis", steps: [], createdAt: Date.now() };
    setRecipes([r, ...recipes]);
    setActiveRecipe(r);
    setRecipeName("");
  };

  const addStep = (type: string) => {
    if (!activeRecipe) return;
    const stepType = STEP_TYPES.find((s) => s.value === type);
    const step: RecipeStep = {
      id: crypto.randomUUID(),
      type,
      label: stepType?.label || type,
      params: { ...(DEFAULT_PARAMS[type] || {}) },
    };
    const updated = { ...activeRecipe, steps: [...activeRecipe.steps, step] };
    setActiveRecipe(updated);
    setRecipes(recipes.map((r) => (r.id === updated.id ? updated : r)));
  };

  const removeStep = (stepId: string) => {
    if (!activeRecipe) return;
    const updated = { ...activeRecipe, steps: activeRecipe.steps.filter((s) => s.id !== stepId) };
    setActiveRecipe(updated);
    setRecipes(recipes.map((r) => (r.id === updated.id ? updated : r)));
  };

  const updateStepParams = (stepId: string, params: Record<string, any>) => {
    if (!activeRecipe) return;
    const updated = {
      ...activeRecipe,
      steps: activeRecipe.steps.map((s) => (s.id === stepId ? { ...s, params } : s)),
    };
    setActiveRecipe(updated);
    setRecipes(recipes.map((r) => (r.id === updated.id ? updated : r)));
  };

  const duplicateRecipe = (recipe: Recipe) => {
    const dup: Recipe = { ...recipe, id: crypto.randomUUID(), name: `${recipe.name} (kopia)`, createdAt: Date.now() };
    setRecipes([dup, ...recipes]);
  };

  return (
    <div className="grid grid-cols-[280px_1fr] gap-4 h-full">
      {/* Left: Recipe List */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="Nazwa przepisu..." value={recipeName} onChange={(e) => setRecipeName(e.target.value)} className="h-8 text-xs" />
          <Button size="sm" onClick={createNew} className="h-8 shrink-0">
            <Plus className="h-3 w-3 mr-1" /> Nowy
          </Button>
        </div>

        <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto">
          {recipes.map((r) => (
            <Card
              key={r.id}
              onClick={() => setActiveRecipe(r)}
              className={`p-3 cursor-pointer transition-all ${activeRecipe?.id === r.id ? "border-primary/50 bg-primary/5" : "hover:border-primary/20"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground">{r.steps.length} kroków</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); duplicateRecipe(r); }} className="p-1 rounded hover:bg-muted">
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {r.steps.map((s) => {
                  const st = STEP_TYPES.find((t) => t.value === s.type);
                  return <Badge key={s.id} variant="secondary" className="text-[9px]">{st?.icon} {s.label}</Badge>;
                })}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Right: Recipe Editor */}
      <div className="space-y-4">
        {activeRecipe ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{activeRecipe.name}</h3>
                <p className="text-xs text-muted-foreground">{activeRecipe.steps.length} kroków w pipeline</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm"><Save className="h-3 w-3 mr-1" /> Zapisz</Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <Play className="h-3 w-3 mr-1" /> Uruchom na pliku
                </Button>
              </div>
            </div>

            {/* Add Step */}
            <div className="flex items-center gap-2">
              <Select onValueChange={addStep}>
                <SelectTrigger className="h-8 w-64 text-xs">
                  <SelectValue placeholder="+ Dodaj krok..." />
                </SelectTrigger>
                <SelectContent>
                  {STEP_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">
                      {s.icon} {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Steps List */}
            <div className="space-y-2">
              {activeRecipe.steps.map((step, i) => {
                const st = STEP_TYPES.find((t) => t.value === step.type);
                return (
                  <Card
                    key={step.id}
                    className={`p-3 transition-all ${expandedStep === step.id ? "border-primary/40" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      <Badge variant="outline" className="text-[10px] shrink-0">#{i + 1}</Badge>
                      <span className="text-sm">{st?.icon}</span>
                      <span className="text-sm font-medium flex-1">{step.label}</span>
                      <button onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)} className="text-xs text-primary hover:underline">
                        {expandedStep === step.id ? "Zwiń" : "Parametry"}
                      </button>
                      <button onClick={() => removeStep(step.id)} className="p-1 rounded hover:bg-destructive/10">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                    {expandedStep === step.id && (
                      <StepParamsEditor step={step} onChange={(params) => updateStepParams(step.id, params)} />
                    )}
                  </Card>
                );
              })}
              {activeRecipe.steps.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">Brak kroków w przepisie</p>
                  <p className="text-xs mt-1">Dodaj krok z listy powyżej</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Wybierz przepis z listy lub stwórz nowy</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
