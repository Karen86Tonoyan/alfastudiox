import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Square } from "lucide-react";

interface WorkflowNode {
  id: string;
  title: string;
  type: "model" | "sampler" | "prompt" | "output" | "vae";
  x: number;
  y: number;
  inputs: string[];
  outputs: string[];
}

const mockNodes: WorkflowNode[] = [
  { id: "1", title: "Load Checkpoint", type: "model", x: 50, y: 80, inputs: [], outputs: ["MODEL", "CLIP", "VAE"] },
  { id: "2", title: "CLIP Text Encode", type: "prompt", x: 320, y: 30, inputs: ["CLIP"], outputs: ["CONDITIONING"] },
  { id: "3", title: "CLIP Text Encode (Neg)", type: "prompt", x: 320, y: 180, inputs: ["CLIP"], outputs: ["CONDITIONING"] },
  { id: "4", title: "KSampler", type: "sampler", x: 590, y: 80, inputs: ["MODEL", "POSITIVE", "NEGATIVE", "LATENT"], outputs: ["LATENT"] },
  { id: "5", title: "VAE Decode", type: "vae", x: 830, y: 80, inputs: ["LATENT", "VAE"], outputs: ["IMAGE"] },
  { id: "6", title: "Save Image", type: "output", x: 1050, y: 80, inputs: ["IMAGE"], outputs: [] },
];

const connections = [
  { from: "1", fromOut: 0, to: "2", toIn: 0 },
  { from: "1", fromOut: 1, to: "3", toIn: 0 },
  { from: "1", fromOut: 0, to: "4", toIn: 0 },
  { from: "2", fromOut: 0, to: "4", toIn: 1 },
  { from: "3", fromOut: 0, to: "4", toIn: 2 },
  { from: "4", fromOut: 0, to: "5", toIn: 0 },
  { from: "1", fromOut: 2, to: "5", toIn: 1 },
  { from: "5", fromOut: 0, to: "6", toIn: 0 },
];

const typeColor: Record<string, string> = {
  model: "hsl(220, 70%, 55%)",
  sampler: "hsl(265, 60%, 55%)",
  prompt: "hsl(142, 60%, 50%)",
  output: "hsl(30, 80%, 55%)",
  vae: "hsl(340, 65%, 55%)",
};

const typeBorder: Record<string, string> = {
  model: "border-node-model",
  sampler: "border-node-sampler",
  prompt: "border-node-prompt",
  output: "border-node-output",
  vae: "border-node-vae",
};

const nodeW = 200;
const nodeH = 100;

function getPortPos(node: WorkflowNode, isOutput: boolean, index: number, total: number) {
  const x = isOutput ? node.x + nodeW : node.x;
  const step = nodeH / (total + 1);
  const y = node.y + step * (index + 1);
  return { x, y };
}

export default function WorkflowPage() {
  const nodeMap = Object.fromEntries(mockNodes.map((n) => [n.id, n]));
  const [activeNode, setActiveNode] = useState<string>("4");
  const [running, setRunning] = useState(false);

  return (
    <div className="flex h-full gap-4">
      {/* Canvas */}
      <div className="flex-1 overflow-auto rounded-lg border border-border bg-background relative">
        {/* Run controls */}
        <div className="absolute top-2 right-2 z-10 flex gap-2">
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
        <svg
          width="1300"
          height="340"
          className="min-w-full"
          style={{ background: "radial-gradient(circle, hsl(228 10% 14%) 1px, transparent 1px)", backgroundSize: "20px 20px" }}
        >
          <defs>
            {/* Animated dash for running connections */}
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
            const from = nodeMap[c.from];
            const to = nodeMap[c.to];
            const p1 = getPortPos(from, true, c.fromOut, from.outputs.length);
            const p2 = getPortPos(to, false, c.toIn, to.inputs.length);
            const cx1 = p1.x + 60;
            const cx2 = p2.x - 60;
            const d = `M${p1.x},${p1.y} C${cx1},${p1.y} ${cx2},${p2.y} ${p2.x},${p2.y}`;
            return (
              <g key={i}>
                <path
                  d={d}
                  fill="none"
                  stroke={typeColor[from.type]}
                  strokeWidth={2}
                  opacity={running ? 0.8 : 0.5}
                  filter={running ? "url(#glow)" : undefined}
                />
                {running && (
                  <path
                    d={d}
                    fill="none"
                    stroke="white"
                    strokeWidth={2}
                    opacity={0.6}
                    strokeDasharray="6 10"
                  >
                    <animate attributeName="stroke-dashoffset" from="0" to="-48" dur="1s" repeatCount="indefinite" />
                  </path>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {mockNodes.map((node) => {
            const isActive = activeNode === node.id;
            return (
              <g key={node.id} onClick={() => setActiveNode(node.id)} style={{ cursor: "pointer" }}>
                {/* Active glow */}
                {isActive && (
                  <rect
                    x={node.x - 4}
                    y={node.y - 4}
                    width={nodeW + 8}
                    height={nodeH + 8}
                    rx={10}
                    fill="none"
                    stroke={typeColor[node.type]}
                    strokeWidth={2}
                    opacity={0.6}
                  >
                    <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
                  </rect>
                )}
                <rect
                  x={node.x}
                  y={node.y}
                  width={nodeW}
                  height={nodeH}
                  rx={6}
                  fill="hsl(228, 12%, 15%)"
                  stroke={typeColor[node.type]}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                {/* Title bar */}
                <rect
                  x={node.x}
                  y={node.y}
                  width={nodeW}
                  height={24}
                  rx={6}
                  fill={typeColor[node.type]}
                  opacity={isActive ? 0.35 : 0.2}
                />
                <text x={node.x + 10} y={node.y + 16} fill={typeColor[node.type]} fontSize={11} fontWeight={600}>
                  {node.title}
                </text>

                {/* Input ports */}
                {node.inputs.map((label, i) => {
                  const pos = getPortPos(node, false, i, node.inputs.length);
                  return (
                    <g key={`in-${i}`}>
                      <circle cx={pos.x} cy={pos.y} r={4} fill="hsl(228,12%,15%)" stroke="hsl(210,20%,50%)" strokeWidth={1.5} />
                      <text x={pos.x + 10} y={pos.y + 3} fill="hsl(210,15%,55%)" fontSize={9}>{label}</text>
                    </g>
                  );
                })}

                {/* Output ports */}
                {node.outputs.map((label, i) => {
                  const pos = getPortPos(node, true, i, node.outputs.length);
                  return (
                    <g key={`out-${i}`}>
                      <circle cx={pos.x} cy={pos.y} r={4} fill={typeColor[node.type]} />
                      <text x={pos.x - 10} y={pos.y + 3} fill="hsl(210,15%,55%)" fontSize={9} textAnchor="end">{label}</text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Properties panel */}
      <Card className={`w-72 shrink-0 border-t-2 ${typeBorder[nodeMap[activeNode]?.type || "sampler"]}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm" style={{ color: typeColor[nodeMap[activeNode]?.type || "sampler"] }}>
            {nodeMap[activeNode]?.title || "KSampler"} — Właściwości
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {[
            { label: "Seed", value: "42" },
            { label: "Steps", value: "20" },
            { label: "CFG", value: "7.0" },
            { label: "Sampler", value: "euler_ancestral" },
            { label: "Scheduler", value: "normal" },
            { label: "Denoise", value: "1.0" },
          ].map((p) => (
            <div key={p.label} className="flex items-center justify-between rounded bg-secondary px-3 py-2">
              <span className="text-muted-foreground">{p.label}</span>
              <span className="font-mono text-foreground">{p.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
