import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ToolType } from "@/lib/editorEngine";
import {
  MousePointer2, Move, Square, Lasso, Wand2,
  Paintbrush, Eraser, Stamp, Heart,
  Sun, Moon, Droplets,
  Blend, PaintBucket, Pipette,
  PenTool, Type, Hexagon,
  Crop, Maximize2, Hand, ZoomIn
} from "lucide-react";

const TOOL_GROUPS: { tools: { id: ToolType; icon: React.ElementType; label: string; shortcut?: string }[] }[] = [
  {
    tools: [
      { id: "select", icon: MousePointer2, label: "Zaznaczenie", shortcut: "V" },
      { id: "move", icon: Move, label: "Przesuwanie", shortcut: "M" },
    ],
  },
  {
    tools: [
      { id: "marquee", icon: Square, label: "Zaznaczenie prostokątne" },
      { id: "lasso", icon: Lasso, label: "Lasso" },
      { id: "magic-wand", icon: Wand2, label: "Różdżka" },
    ],
  },
  {
    tools: [
      { id: "brush", icon: Paintbrush, label: "Pędzel", shortcut: "B" },
      { id: "eraser", icon: Eraser, label: "Gumka", shortcut: "E" },
      { id: "clone-stamp", icon: Stamp, label: "Stempel" },
      { id: "healing-brush", icon: Heart, label: "Łatka" },
    ],
  },
  {
    tools: [
      { id: "dodge", icon: Sun, label: "Rozjaśnianie" },
      { id: "burn", icon: Moon, label: "Ściemnianie" },
      { id: "sponge", icon: Droplets, label: "Gąbka" },
    ],
  },
  {
    tools: [
      { id: "gradient", icon: Blend, label: "Gradient" },
      { id: "fill", icon: PaintBucket, label: "Wypełnienie", shortcut: "G" },
      { id: "eyedropper", icon: Pipette, label: "Próbnik", shortcut: "I" },
    ],
  },
  {
    tools: [
      { id: "pen", icon: PenTool, label: "Pióro", shortcut: "P" },
      { id: "text", icon: Type, label: "Tekst", shortcut: "T" },
      { id: "shape", icon: Hexagon, label: "Kształt", shortcut: "U" },
    ],
  },
  {
    tools: [
      { id: "crop", icon: Crop, label: "Kadrowanie", shortcut: "C" },
      { id: "transform", icon: Maximize2, label: "Transformacja" },
    ],
  },
  {
    tools: [
      { id: "hand", icon: Hand, label: "Rączka", shortcut: "H" },
      { id: "zoom", icon: ZoomIn, label: "Lupa", shortcut: "Z" },
    ],
  },
];

interface EditorToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  fgColor: string;
  bgColor: string;
  onFgColorChange: (c: string) => void;
  onBgColorChange: (c: string) => void;
}

export function EditorToolbar({ activeTool, onSelectTool, fgColor, bgColor, onFgColorChange, onBgColorChange }: EditorToolbarProps) {
  return (
    <div className="flex flex-col items-center w-10 bg-card border-r border-border py-2 gap-0.5 overflow-y-auto">
      {TOOL_GROUPS.map((group, gi) => (
        <div key={gi} className="flex flex-col items-center gap-0.5">
          {gi > 0 && <div className="w-6 h-px bg-border my-0.5" />}
          {group.tools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSelectTool(tool.id)}
                  className={cn(
                    "h-7 w-7 flex items-center justify-center rounded transition-all",
                    activeTool === tool.id
                      ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <tool.icon className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-[10px]">
                {tool.label}{tool.shortcut ? ` (${tool.shortcut})` : ""}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      ))}

      {/* Color swatches */}
      <div className="mt-auto pt-2 relative w-8 h-8">
        <label className="absolute top-0 left-0 w-5 h-5 rounded-sm border border-border cursor-pointer z-10" style={{ background: fgColor }}>
          <input type="color" value={fgColor} onChange={(e) => onFgColorChange(e.target.value)} className="opacity-0 absolute w-full h-full cursor-pointer" />
        </label>
        <label className="absolute bottom-0 right-0 w-5 h-5 rounded-sm border border-border cursor-pointer" style={{ background: bgColor }}>
          <input type="color" value={bgColor} onChange={(e) => onBgColorChange(e.target.value)} className="opacity-0 absolute w-full h-full cursor-pointer" />
        </label>
      </div>
    </div>
  );
}