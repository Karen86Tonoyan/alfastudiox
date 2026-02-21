import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Square, MessageSquare } from "lucide-react";
import { NodeLibrary } from "@/components/workflow/NodeLibrary";
import { WorkflowContextMenu } from "@/components/workflow/ContextMenu";
import { WorkflowToolbar } from "@/components/workflow/WorkflowToolbar";

interface WorkflowNode {
  id: string;
  title: string;
  type: "model" | "sampler" | "prompt" | "output" | "vae" | "latent" | "banana";
  x: number;
  y: number;
  inputs: { name: string; type: string }[];
  outputs: { name: string; type: string }[];
  fields?: { label: string; value: string }[];
  subtitle?: string;
  width?: number;
}

const typeColor: Record<string, string> = {
  model: "hsl(220, 70%, 55%)",
  sampler: "hsl(265, 60%, 55%)",
  prompt: "hsl(142, 60%, 50%)",
  output: "hsl(30, 80%, 55%)",
  vae: "hsl(340, 65%, 55%)",
  latent: "hsl(190, 70%, 50%)",
  banana: "hsl(45, 90%, 55%)",
};

const portColor: Record<string, string> = {
  MODEL: "hsl(220, 70%, 55%)",
  CLIP: "hsl(45, 90%, 55%)",
  VAE: "hsl(340, 65%, 55%)",
  CONDITIONING: "hsl(30, 80%, 55%)",
  LATENT: "hsl(190, 70%, 50%)",
  IMAGE: "hsl(265, 60%, 55%)",
  STRING: "hsl(142, 60%, 50%)",
};

const mockNodes: WorkflowNode[] = [
  {
    id: "1", title: "Load Checkpoint", type: "model", x: 40, y: 420,
    inputs: [],
    outputs: [
      { name: "MODEL", type: "MODEL" },
      { name: "CLIP", type: "CLIP" },
      { name: "VAE", type: "VAE" },
    ],
    subtitle: "v1-5-pruned-emaonly-fp16.safetensors",
    width: 240,
  },
  {
    id: "2", title: "CLIP Text Encode [Prompt]", type: "prompt", x: 300, y: 50,
    inputs: [{ name: "clip", type: "CLIP" }],
    outputs: [{ name: "CONDITIONING", type: "CONDITIONING" }],
    fields: [{ label: "text", value: "beautiful nature glass bottle landscape, purple galaxy bottle," }],
    width: 260,
  },
  {
    id: "3", title: "CLIP Text Encode [Prompt]", type: "prompt", x: 320, y: 340,
    inputs: [{ name: "clip", type: "CLIP" }],
    outputs: [{ name: "conditioning", type: "CONDITIONING" }],
    fields: [{ label: "text", value: "(negative prompt)" }],
    width: 240,
  },
  {
    id: "4", title: "KSampler", type: "sampler", x: 560, y: 50,
    inputs: [
      { name: "model", type: "MODEL" },
      { name: "positive", type: "CONDITIONING" },
      { name: "negative", type: "CONDITIONING" },
      { name: "latent_image", type: "LATENT" },
    ],
    outputs: [{ name: "LATENT", type: "LATENT" }],
    fields: [
      { label: "seed", value: "158886208700258" },
      { label: "control after generate", value: "randomize" },
      { label: "steps", value: "20" },
      { label: "cfg", value: "8.0" },
      { label: "sampler_name", value: "euler" },
      { label: "scheduler", value: "normal" },
      { label: "denoise", value: "1.00" },
    ],
    width: 240,
  },
  {
    id: "5", title: "VAE Decode", type: "vae", x: 790, y: 50,
    inputs: [
      { name: "samples", type: "LATENT" },
      { name: "vae", type: "VAE" },
    ],
    outputs: [{ name: "IMAGE", type: "IMAGE" }],
    width: 160,
  },
  {
    id: "6", title: "Save Image", type: "output", x: 920, y: 50,
    inputs: [{ name: "images", type: "IMAGE" }],
    outputs: [],
    fields: [{ label: "filename_prefix", value: "ComfyUI" }],
    width: 180,
  },
  {
    id: "7", title: "Empty Latent Image", type: "latent", x: 320, y: 480,
    inputs: [],
    outputs: [{ name: "LATENT", type: "LATENT" }],
    fields: [
      { label: "width", value: "512" },
      { label: "height", value: "512" },
      { label: "batch_size", value: "1" },
    ],
    width: 200,
  },
  {
    id: "8", title: "Nano Banana Pro (Google Gemini Image)", type: "banana", x: 880, y: 350,
    inputs: [{ name: "images", type: "IMAGE" }],
    outputs: [
      { name: "IMAGE", type: "IMAGE" },
      { name: "STRING", type: "STRING" },
    ],
    fields: [
      { label: "model", value: "gemini-3-pro-image-preview" },
      { label: "seed", value: "42" },
      { label: "control after generate", value: "randomize" },
      { label: "aspect_ratio", value: "auto" },
      { label: "resolution", value: "1K" },
      { label: "response_modalities", value: "IMAGE+TEXT" },
    ],
    width: 280,
  },
];

const connections = [
  { from: "1", fromPort: "MODEL", to: "4", toPort: "model" },
  { from: "1", fromPort: "CLIP", to: "2", toPort: "clip" },
  { from: "1", fromPort: "CLIP", to: "3", toPort: "clip" },
  { from: "2", fromPort: "CONDITIONING", to: "4", toPort: "positive" },
  { from: "3", fromPort: "conditioning", to: "4", toPort: "negative" },
  { from: "4", fromPort: "LATENT", to: "5", toPort: "samples" },
  { from: "1", fromPort: "VAE", to: "5", toPort: "vae" },
  { from: "5", fromPort: "IMAGE", to: "6", toPort: "images" },
  { from: "7", fromPort: "LATENT", to: "4", toPort: "latent_image" },
  { from: "5", fromPort: "IMAGE", to: "8", toPort: "images" },
];

const TITLE_H = 24;
const PORT_SPACING = 22;
const FIELD_H = 20;
const PORT_R = 5;

function getNodeHeight(node: WorkflowNode) {
  const ports = Math.max(node.inputs.length, node.outputs.length);
  const fields = node.fields?.length || 0;
  return TITLE_H + Math.max(ports * PORT_SPACING, 20) + fields * FIELD_H + 12;
}

function getPortPos(node: WorkflowNode, portName: string, isOutput: boolean) {
  const list = isOutput ? node.outputs : node.inputs;
  const idx = list.findIndex((p) => p.name === portName);
  const w = node.width || 200;
  const x = isOutput ? node.x + w : node.x;
  const y = node.y + TITLE_H + 14 + idx * PORT_SPACING;
  return { x, y };
}

export default function WorkflowPage() {
  const [nodes, setNodes] = useState<WorkflowNode[]>(mockNodes);
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const [activeNode, setActiveNode] = useState<string>("4");
  const [running, setRunning] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string, nodeX: number, nodeY: number) => {
    e.stopPropagation();
    setActiveNode(nodeId);
    const svg = (e.target as SVGElement).closest("svg");
    if (!svg) return;
    const pt = svg.getBoundingClientRect();
    setDragging({ id: nodeId, offsetX: e.clientX - pt.left - nodeX, offsetY: e.clientY - pt.top - nodeY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const svg = (e.currentTarget as SVGElement);
    const pt = svg.getBoundingClientRect();
    const newX = e.clientX - pt.left - dragging.offsetX;
    const newY = e.clientY - pt.top - dragging.offsetY;
    setNodes((prev) => prev.map((n) => n.id === dragging.id ? { ...n, x: Math.max(0, newX), y: Math.max(0, newY) } : n));
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const addNodeToCanvas = useCallback((name: string, x?: number, y?: number) => {
    const id = String(Date.now());
    const newNode: WorkflowNode = {
      id,
      title: name,
      type: "prompt",
      x: x ?? 100 + Math.random() * 400,
      y: y ?? 100 + Math.random() * 300,
      inputs: [{ name: "input", type: "MODEL" }],
      outputs: [{ name: "output", type: "IMAGE" }],
      width: 220,
    };
    setNodes((prev) => [...prev, newNode]);
    setActiveNode(id);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const name = e.dataTransfer.getData("workflow/node");
    if (!name || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    addNodeToCanvas(name, e.clientX - rect.left, e.clientY - rect.top);
  }, [addNodeToCanvas]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const svgW = 1200;
  const svgH = 650;

  return (
    <div className="flex h-full">
      {/* Node Library */}
      <NodeLibrary className="w-64 shrink-0" onAddNode={addNodeToCanvas} />

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 overflow-auto relative"
        onContextMenu={handleContextMenu}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* Top bar */}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            Informacja zwrotna
          </button>
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-purple-600 to-pink-500 text-xs text-white hover:from-purple-500 hover:to-pink-400"
          >
            Subskrybuj Run
          </Button>
          <span className="rounded bg-secondary px-2 py-1 text-xs text-muted-foreground">0 aktywnych</span>
          <Button
            size="sm"
            variant={running ? "destructive" : "default"}
            onClick={() => setRunning(!running)}
            className="gap-1.5 text-xs"
          >
            {running ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {running ? "Stop" : "Run"}
          </Button>
        </div>

        <WorkflowToolbar />

        <svg
          width={svgW}
          height={svgH}
          className="min-w-full min-h-full"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            background: "radial-gradient(circle, hsl(228 10% 14%) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Connections */}
          {connections.map((c, i) => {
            const fromNode = nodeMap[c.from];
            const toNode = nodeMap[c.to];
            if (!fromNode || !toNode) return null;
            const p1 = getPortPos(fromNode, c.fromPort, true);
            const p2 = getPortPos(toNode, c.toPort, false);
            const dx = Math.abs(p2.x - p1.x) * 0.5;
            const d = `M${p1.x},${p1.y} C${p1.x + dx},${p1.y} ${p2.x - dx},${p2.y} ${p2.x},${p2.y}`;
            const fromPortDef = fromNode.outputs.find((o) => o.name === c.fromPort);
            const color = portColor[fromPortDef?.type || ""] || "hsl(210,20%,50%)";
            return (
              <g key={i}>
                <path d={d} fill="none" stroke={color} strokeWidth={2} opacity={running ? 0.8 : 0.45} filter={running ? "url(#glow)" : undefined} />
                {running && (
                  <path d={d} fill="none" stroke="white" strokeWidth={2} opacity={0.5} strokeDasharray="6 10">
                    <animate attributeName="stroke-dashoffset" from="0" to="-48" dur="1s" repeatCount="indefinite" />
                  </path>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isActive = activeNode === node.id;
            const w = node.width || 200;
            const h = getNodeHeight(node);
            const color = typeColor[node.type];

            return (
              <g key={node.id} onMouseDown={(e) => handleNodeMouseDown(e, node.id, node.x, node.y)} style={{ cursor: dragging?.id === node.id ? "grabbing" : "grab" }}>
                {/* Active glow */}
                {isActive && (
                  <rect x={node.x - 3} y={node.y - 3} width={w + 6} height={h + 6} rx={8} fill="none" stroke={color} strokeWidth={2} opacity={0.5}>
                    <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2s" repeatCount="indefinite" />
                  </rect>
                )}

                {/* Body */}
                <rect x={node.x} y={node.y} width={w} height={h} rx={5} fill="hsl(228, 12%, 13%)" stroke={color} strokeWidth={isActive ? 2 : 1} opacity={0.95} />

                {/* Title bar */}
                <rect x={node.x} y={node.y} width={w} height={TITLE_H} rx={5} fill={color} opacity={0.25} />
                <rect x={node.x} y={node.y + TITLE_H - 2} width={w} height={3} fill={color} opacity={0.25} />
                <text x={node.x + 8} y={node.y + 15} fill={color} fontSize={10} fontWeight={600}>
                  {node.title.length > w / 7 ? node.title.substring(0, Math.floor(w / 7)) + "…" : node.title}
                </text>

                {/* Subtitle */}
                {node.subtitle && (
                  <text x={node.x + 8} y={node.y + TITLE_H + 12} fill="hsl(210,15%,45%)" fontSize={8}>
                    {node.subtitle.substring(0, 35)}…
                  </text>
                )}

                {/* Input ports */}
                {node.inputs.map((port, i) => {
                  const py = node.y + TITLE_H + 14 + i * PORT_SPACING;
                  const pc = portColor[port.type] || "hsl(210,20%,50%)";
                  return (
                    <g key={`in-${i}`}>
                      <circle cx={node.x} cy={py} r={PORT_R} fill="hsl(228,12%,13%)" stroke={pc} strokeWidth={1.5} />
                      <text x={node.x + 10} y={py + 3} fill="hsl(210,15%,55%)" fontSize={9}>
                        {port.name}
                      </text>
                    </g>
                  );
                })}

                {/* Output ports */}
                {node.outputs.map((port, i) => {
                  const py = node.y + TITLE_H + 14 + i * PORT_SPACING;
                  const pc = portColor[port.type] || "hsl(210,20%,50%)";
                  return (
                    <g key={`out-${i}`}>
                      <circle cx={node.x + w} cy={py} r={PORT_R} fill={pc} />
                      <text x={node.x + w - 10} y={py + 3} fill="hsl(210,15%,55%)" fontSize={9} textAnchor="end">
                        {port.name}
                      </text>
                    </g>
                  );
                })}

                {/* Fields */}
                {node.fields?.map((field, i) => {
                  const fy = node.y + TITLE_H + Math.max(node.inputs.length, node.outputs.length) * PORT_SPACING + 8 + i * FIELD_H;
                  return (
                    <g key={`f-${i}`}>
                      <rect x={node.x + 6} y={fy - 10} width={w - 12} height={FIELD_H - 3} rx={3} fill="hsl(228,10%,18%)" />
                      <text x={node.x + 12} y={fy} fill="hsl(210,15%,50%)" fontSize={8}>
                        {field.label}
                      </text>
                      <text x={node.x + w - 12} y={fy} fill="hsl(210,20%,75%)" fontSize={8} textAnchor="end" fontFamily="monospace">
                        {field.value.length > 18 ? field.value.substring(0, 18) + "…" : field.value}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Minimap */}
        <div className="absolute bottom-3 right-3 z-10 rounded-lg border border-border bg-card/80 p-2 backdrop-blur-sm">
          <svg width={120} height={60} viewBox={`0 0 ${svgW} ${svgH}`}>
            {nodes.map((n) => (
              <rect
                key={n.id}
                x={n.x}
                y={n.y}
                width={n.width || 200}
                height={getNodeHeight(n)}
                rx={3}
                fill={typeColor[n.type]}
                opacity={0.6}
              />
            ))}
          </svg>
          <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>44%</span>
          </div>
        </div>

        {contextMenu && (
          <WorkflowContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} />
        )}
      </div>
    </div>
  );
}
