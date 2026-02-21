import { useState } from "react";
import { Search, Filter, ChevronRight, ChevronDown, Folder } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NodeCategory {
  name: string;
  count: number;
  icon?: string;
  children: { name: string; count?: number; children?: { name: string }[] }[];
}

const nodeCategories: NodeCategory[] = [
  {
    name: "Subgraph Blueprints",
    count: 19,
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
  { name: "NormalCrafter", count: 2, children: [] },
  { name: "FlashVSR", count: 3, children: [] },
  { name: "DepthAnythingV2", count: 2, children: [] },
  { name: "Lum3on", count: 28, icon: "🟣", children: [] },
  { name: "WanVideoWrapper", count: 137, children: [] },
  { name: "LivePortrait", count: 1, children: [] },
  { name: "WanAnimatePreprocess", count: 6, children: [] },
  { name: "SUPIR", count: 10, children: [] },
  { name: "ComfyUI-Lotus", count: 2, children: [] },
  { name: "Florence2", count: 4, children: [] },
  { name: "Adv-ControlNet", count: 33, children: [] },
  { name: "inpaint", count: 6, children: [] },
  { name: "ipadapter", count: 29, children: [] },
  { name: "Animate Diff", count: 114, icon: "🐉", children: [] },
  { name: "Video Helper Suite", count: 33, icon: "🎬", children: [] },
  { name: "SEEDVR2", count: 4, children: [] },
  { name: "FL Path Animator", count: 1, icon: "🌺", children: [] },
];

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
          c.children.some((ch) => ch.name.toLowerCase().includes(search.toLowerCase()))
      )
    : nodeCategories;

  const toggle = (name: string) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className={cn("flex flex-col border-r border-border bg-card", className)}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-sm font-semibold text-foreground">Node Library</span>
      </div>

      {/* Search */}
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Nodes..."
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
                <span className="ml-auto shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {cat.count}
                </span>
              </button>

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
  );
}
