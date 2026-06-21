import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Square, MessageSquare, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NodeLibrary } from "@/components/workflow/NodeLibrary";
import { WorkflowContextMenu } from "@/components/workflow/ContextMenu";
import { WorkflowToolbar } from "@/components/workflow/WorkflowToolbar";
import { ScenarioManager } from "@/components/workflow/ScenarioManager";
import { useCopilotTools } from "@/lib/aiCopilot/useCopilotTool";
import { toast } from "sonner";

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
  previewImage?: string;
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
    previewImage: "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=400&h=400&fit=crop",
    width: 220,
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

interface Connection {
  from: string;
  fromPort: string;
  to: string;
  toPort: string;
}

const initialConnections: Connection[] = [
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
  const previewH = node.previewImage ? (node.width || 200) - 12 + 8 : 0;
  return TITLE_H + Math.max(ports * PORT_SPACING, 20) + fields * FIELD_H + 12 + previewH;
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
  const [conns, setConns] = useState<Connection[]>(initialConnections);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const [connecting, setConnecting] = useState<{
    fromNodeId: string;
    fromPort: string;
    fromType: string;
    mouseX: number;
    mouseY: number;
  } | null>(null);

  const getSvgCoords = useCallback((e: React.MouseEvent) => {
    const svg = (e.target as SVGElement).closest("svg");
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handlePortMouseDown = useCallback((e: React.MouseEvent, nodeId: string, portName: string, portType: string) => {
    e.stopPropagation();
    const coords = getSvgCoords(e);
    setConnecting({ fromNodeId: nodeId, fromPort: portName, fromType: portType, mouseX: coords.x, mouseY: coords.y });
  }, [getSvgCoords]);

  const handlePortMouseUp = useCallback((e: React.MouseEvent, nodeId: string, portName: string) => {
    e.stopPropagation();
    if (connecting && connecting.fromNodeId !== nodeId) {
      setConns((prev) => [...prev, { from: connecting.fromNodeId, fromPort: connecting.fromPort, to: nodeId, toPort: portName }]);
    }
    setConnecting(null);
  }, [connecting]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string, nodeX: number, nodeY: number) => {
    e.stopPropagation();
    if (connecting) return;
    setActiveNode(nodeId);
    const svg = (e.target as SVGElement).closest("svg");
    if (!svg) return;
    const pt = svg.getBoundingClientRect();
    setDragging({ id: nodeId, offsetX: e.clientX - pt.left - nodeX, offsetY: e.clientY - pt.top - nodeY });
  }, [connecting]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (connecting) {
      const coords = getSvgCoords(e);
      setConnecting((prev) => prev ? { ...prev, mouseX: coords.x, mouseY: coords.y } : null);
      return;
    }
    if (!dragging) return;
    const svg = (e.currentTarget as SVGElement);
    const pt = svg.getBoundingClientRect();
    const newX = e.clientX - pt.left - dragging.offsetX;
    const newY = e.clientY - pt.top - dragging.offsetY;
    setNodes((prev) => prev.map((n) => n.id === dragging.id ? { ...n, x: Math.max(0, newX), y: Math.max(0, newY) } : n));
  }, [dragging, connecting, getSvgCoords]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setConnecting(null);
    setPanning(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.min(3, Math.max(0.2, prev * delta)));
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle mouse button or left click on empty canvas for panning
    if (e.button === 1 || (e.button === 0 && e.target === e.currentTarget)) {
      e.preventDefault();
      setPanning({ startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y });
    }
  }, [pan]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (panning) {
      setPan({
        x: panning.panX + (e.clientX - panning.startX),
        y: panning.panY + (e.clientY - panning.startY),
      });
    }
  }, [panning]);

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

  const deleteActiveNode = useCallback(() => {
    if (!activeNode) return;
    setNodes((prev) => prev.filter((n) => n.id !== activeNode));
    setConns((prev) => prev.filter((c) => c.from !== activeNode && c.to !== activeNode));
    setActiveNode("");
  }, [activeNode]);

  const updateNodeField = useCallback((nodeId: string, idx: number, value: string) => {
    setNodes((prev) => prev.map((n) => {
      if (n.id !== nodeId || !n.fields) return n;
      const fields = n.fields.map((f, i) => i === idx ? { ...f, value } : f);
      return { ...n, fields };
    }));
  }, []);

  const updateNodeMeta = useCallback((nodeId: string, patch: Partial<WorkflowNode>) => {
    setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, ...patch } : n));
  }, []);

  const addFieldToNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.map((n) => n.id === nodeId
      ? { ...n, fields: [...(n.fields ?? []), { label: "new_field", value: "" }] }
      : n));
  }, []);

  const removeFieldFromNode = useCallback((nodeId: string, idx: number) => {
    setNodes((prev) => prev.map((n) => n.id === nodeId && n.fields
      ? { ...n, fields: n.fields.filter((_, i) => i !== idx) }
      : n));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && activeNode) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        deleteActiveNode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeNode, deleteActiveNode]);

  /* ───────── AI Copilot tools ───────── */
  useCopilotTools([
    {
      name: "workflow.list_nodes",
      description: "Zwróć listę wszystkich node'ów na canvasie z id, tytułem, typem i pozycją.",
      parameters: { type: "object", properties: {} },
      scope: "workflow",
      handler: () => nodes.map((n) => ({ id: n.id, title: n.title, type: n.type, x: n.x, y: n.y,
        inputs: n.inputs.map((p) => p.name), outputs: n.outputs.map((p) => p.name) })),
    },
    {
      name: "workflow.add_node",
      description: "Dodaj nowy node na canvas. Typy: model | sampler | prompt | output | vae | latent | banana.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Nazwa wyświetlana, np. 'KSampler'" },
          type: { type: "string", enum: ["model", "sampler", "prompt", "output", "vae", "latent", "banana"] },
          x: { type: "number" }, y: { type: "number" },
          inputs: { type: "array", items: { type: "object", properties: { name: { type: "string" }, type: { type: "string" } }, required: ["name", "type"] } },
          outputs: { type: "array", items: { type: "object", properties: { name: { type: "string" }, type: { type: "string" } }, required: ["name", "type"] } },
        },
        required: ["title"],
      },
      scope: "workflow",
      handler: (a: any) => {
        const id = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const node: WorkflowNode = {
          id, title: a.title, type: (a.type as WorkflowNode["type"]) ?? "prompt",
          x: a.x ?? 80 + Math.random() * 600, y: a.y ?? 80 + Math.random() * 400,
          inputs: a.inputs ?? [{ name: "input", type: "MODEL" }],
          outputs: a.outputs ?? [{ name: "output", type: "IMAGE" }],
          width: 220,
        };
        setNodes((p) => [...p, node]);
        setActiveNode(id);
        return { ok: true, id };
      },
    },
    {
      name: "workflow.connect_nodes",
      description: "Połącz output jednego node'a z input innego. Użyj id z list_nodes oraz nazw portów.",
      parameters: {
        type: "object",
        properties: {
          from_node: { type: "string" }, from_port: { type: "string" },
          to_node: { type: "string" }, to_port: { type: "string" },
        },
        required: ["from_node", "from_port", "to_node", "to_port"],
      },
      scope: "workflow",
      handler: (a: any) => {
        if (!nodes.find((n) => n.id === a.from_node) || !nodes.find((n) => n.id === a.to_node)) {
          return { ok: false, error: "Nie znaleziono node'a o podanym id" };
        }
        setConns((p) => [...p, { from: a.from_node, fromPort: a.from_port, to: a.to_node, toPort: a.to_port }]);
        return { ok: true };
      },
    },
    {
      name: "workflow.delete_node",
      description: "Usuń node po id (razem z połączeniami).",
      parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      scope: "workflow",
      handler: (a: { id: string }) => {
        const exists = nodes.some((n) => n.id === a.id);
        if (!exists) return { ok: false, error: "Brak node'a" };
        setNodes((p) => p.filter((n) => n.id !== a.id));
        setConns((p) => p.filter((c) => c.from !== a.id && c.to !== a.id));
        if (activeNode === a.id) setActiveNode("");
        return { ok: true };
      },
    },
    {
      name: "workflow.move_node",
      description: "Przesuń node na pozycję x,y na canvasie.",
      parameters: { type: "object", properties: { id: { type: "string" }, x: { type: "number" }, y: { type: "number" } }, required: ["id", "x", "y"] },
      scope: "workflow",
      handler: (a: any) => {
        setNodes((p) => p.map((n) => n.id === a.id ? { ...n, x: a.x, y: a.y } : n));
        return { ok: true };
      },
    },
    {
      name: "workflow.clear",
      description: "Wyczyść cały canvas (wszystkie node'y i połączenia).",
      parameters: { type: "object", properties: {} },
      scope: "workflow",
      handler: () => { setNodes([]); setConns([]); setActiveNode(""); return { ok: true }; },
    },
    {
      name: "workflow.run",
      description: "Uruchom lub zatrzymaj workflow. action: 'start' | 'stop'.",
      parameters: { type: "object", properties: { action: { type: "string", enum: ["start", "stop"] } }, required: ["action"] },
      scope: "workflow",
      handler: (a: { action: "start" | "stop" }) => {
        const next = a.action === "start";
        setRunning(next);
        toast.success(`Workflow ${next ? "uruchomiony" : "zatrzymany"} przez Copilota`);
        return { ok: true, running: next };
      },
    },
    {
      name: "workflow.set_zoom",
      description: "Ustaw zoom canvasu w zakresie 0.2 – 3.",
      parameters: { type: "object", properties: { zoom: { type: "number" } }, required: ["zoom"] },
      scope: "workflow",
      handler: (a: { zoom: number }) => { setZoom(Math.min(3, Math.max(0.2, a.zoom))); return { ok: true }; },
    },
  ], [nodes, activeNode]);

  const svgW = 1200;
  const svgH = 650;

  return (
    <div className="flex h-full">
      {/* Node Library */}
      <NodeLibrary className="w-64 shrink-0" onAddNode={addNodeToCanvas} />

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 overflow-hidden relative"
        onContextMenu={handleContextMenu}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleMouseUp}
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
          width="100%"
          height="100%"
          className="absolute inset-0"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{
            background: "radial-gradient(circle, hsl(228 10% 14%) 1px, transparent 1px)",
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
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
          {conns.map((c, i) => {
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
                    <g key={`in-${i}`}
                      onMouseUp={(e) => handlePortMouseUp(e, node.id, port.name)}
                      style={{ cursor: connecting ? "crosshair" : "default" }}
                    >
                      <circle cx={node.x} cy={py} r={PORT_R + 3} fill="transparent" />
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
                    <g key={`out-${i}`}
                      onMouseDown={(e) => handlePortMouseDown(e, node.id, port.name, port.type)}
                      style={{ cursor: "crosshair" }}
                    >
                      <circle cx={node.x + w} cy={py} r={PORT_R + 3} fill="transparent" />
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
                    <g
                      key={`f-${i}`}
                      style={{ cursor: "text" }}
                      onMouseDown={(e) => { e.stopPropagation(); setActiveNode(node.id); }}
                    >
                      <rect x={node.x + 6} y={fy - 10} width={w - 12} height={FIELD_H - 3} rx={3} fill={isActive ? "hsl(228,10%,22%)" : "hsl(228,10%,18%)"} stroke={isActive ? color : "transparent"} strokeWidth={0.5} strokeOpacity={0.4} />
                      <text x={node.x + 12} y={fy} fill="hsl(210,15%,50%)" fontSize={8}>
                        {field.label}
                      </text>
                      <text x={node.x + w - 12} y={fy} fill="hsl(210,20%,75%)" fontSize={8} textAnchor="end" fontFamily="monospace">
                        {field.value.length > 18 ? field.value.substring(0, 18) + "…" : field.value}
                      </text>
                    </g>
                  );
                })}

                {/* Preview image */}
                {node.previewImage && (() => {
                  const imgSize = w - 12;
                  const fy = node.y + TITLE_H + Math.max(node.inputs.length, node.outputs.length) * PORT_SPACING + 8 + (node.fields?.length || 0) * FIELD_H;
                  return (
                    <g>
                      <rect x={node.x + 6} y={fy} width={imgSize} height={imgSize} rx={4} fill="hsl(228,10%,10%)" />
                      <clipPath id={`clip-preview-${node.id}`}>
                        <rect x={node.x + 6} y={fy} width={imgSize} height={imgSize} rx={4} />
                      </clipPath>
                      <image
                        href={node.previewImage}
                        x={node.x + 6}
                        y={fy}
                        width={imgSize}
                        height={imgSize}
                        clipPath={`url(#clip-preview-${node.id})`}
                        preserveAspectRatio="xMidYMid slice"
                      />
                      <rect x={node.x + 6} y={fy} width={imgSize} height={imgSize} rx={4} fill="none" stroke={color} strokeWidth={0.5} opacity={0.3} />
                    </g>
                  );
                })()}
              </g>
            );
          })}

          {/* Connection being drawn */}
          {connecting && (() => {
            const fromNode = nodeMap[connecting.fromNodeId];
            if (!fromNode) return null;
            const p1 = getPortPos(fromNode, connecting.fromPort, true);
            const dx = Math.abs(connecting.mouseX - p1.x) * 0.5;
            const d = `M${p1.x},${p1.y} C${p1.x + dx},${p1.y} ${connecting.mouseX - dx},${connecting.mouseY} ${connecting.mouseX},${connecting.mouseY}`;
            const pc = portColor[connecting.fromType] || "hsl(210,20%,50%)";
            return (
              <path d={d} fill="none" stroke={pc} strokeWidth={2} opacity={0.7} strokeDasharray="6 4" />
            );
          })()}
          </g>
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
            <span>{Math.round(zoom * 100)}%</span>
          </div>
        </div>

        {contextMenu && (
          <WorkflowContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} onDelete={deleteActiveNode} />
        )}
      </div>

      {/* AI Scenario Manager */}
      <ScenarioManager className="w-72 shrink-0" />
    </div>
  );
}
