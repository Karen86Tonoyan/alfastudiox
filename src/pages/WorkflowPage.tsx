import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  return (
    <div className="flex h-full gap-4">
      {/* Canvas */}
      <div className="flex-1 overflow-auto rounded-lg border border-border bg-background">
        <svg
          width="1300"
          height="340"
          className="min-w-full"
          style={{ background: "radial-gradient(circle, hsl(228 10% 14%) 1px, transparent 1px)", backgroundSize: "20px 20px" }}
        >
          {/* Connections */}
          {connections.map((c, i) => {
            const from = nodeMap[c.from];
            const to = nodeMap[c.to];
            const p1 = getPortPos(from, true, c.fromOut, from.outputs.length);
            const p2 = getPortPos(to, false, c.toIn, to.inputs.length);
            const cx1 = p1.x + 60;
            const cx2 = p2.x - 60;
            return (
              <path
                key={i}
                d={`M${p1.x},${p1.y} C${cx1},${p1.y} ${cx2},${p2.y} ${p2.x},${p2.y}`}
                fill="none"
                stroke={typeColor[from.type]}
                strokeWidth={2}
                opacity={0.6}
              />
            );
          })}

          {/* Nodes */}
          {mockNodes.map((node) => (
            <g key={node.id}>
              <rect
                x={node.x}
                y={node.y}
                width={nodeW}
                height={nodeH}
                rx={6}
                fill="hsl(228, 12%, 15%)"
                stroke={typeColor[node.type]}
                strokeWidth={1.5}
              />
              {/* Title bar */}
              <rect
                x={node.x}
                y={node.y}
                width={nodeW}
                height={24}
                rx={6}
                fill={typeColor[node.type]}
                opacity={0.2}
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
          ))}
        </svg>
      </div>

      {/* Properties panel */}
      <Card className={`w-72 shrink-0 border-t-2 ${typeBorder.sampler}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-node-sampler">KSampler — Właściwości</CardTitle>
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
