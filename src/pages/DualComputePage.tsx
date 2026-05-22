import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Cpu, Send, Loader2, Sparkles, Server, Copy, Check } from "lucide-react";
import { useCluster } from "@/hooks/useCluster";
import { clusterManager } from "@/lib/clusterManager";
import { toast } from "sonner";

type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
type Msg = {
  role: "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dual-ai-orchestrator`;
const MCP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp-server`;

const MODELS = [
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (szybki)" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "openai/gpt-5", label: "GPT-5" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini" },
];

function PCStatusCard({ label, node, color }: { label: string; node: ReturnType<typeof useCluster>["nodes"][number] | undefined; color: string }) {
  const vramPct = node && node.vramTotal > 0 ? Math.round((node.vramUsed / node.vramTotal) * 100) : 0;
  return (
    <Card className="p-4 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4" />
          <span className="font-semibold">{label}</span>
        </div>
        <Badge variant={node?.status === "connected" ? "default" : "secondary"}>
          {node?.status || "brak"}
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground space-y-0.5">
        <div>{node?.name || "— nie skonfigurowano —"}</div>
        <div className="font-mono truncate">{node?.url || "—"}</div>
        <div className="flex justify-between pt-1">
          <span>VRAM: {node?.vramUsed?.toFixed(1) ?? 0} / {node?.vramTotal?.toFixed(1) ?? 0} GB ({vramPct}%)</span>
          <span>Temp: {node?.gpuTemp ?? 0}°C</span>
        </div>
        <div>Kolejka: {node?.queueSize ?? 0}</div>
      </div>
    </Card>
  );
}

export default function DualComputePage() {
  const { nodes } = useCluster();
  const [pcAId, setPcAId] = useState<string>("");
  const [pcBId, setPcBId] = useState<string>("");
  const [model, setModel] = useState(MODELS[0].id);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Cześć! Mogę uruchomić dwa zadania równolegle na PC_A i PC_B. Powiedz co chcesz wyrenderować." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!pcAId && nodes[0]) setPcAId(nodes[0].id);
    if (!pcBId && nodes[1]) setPcBId(nodes[1].id);
  }, [nodes, pcAId, pcBId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const pcA = useMemo(() => nodes.find((n) => n.id === pcAId), [nodes, pcAId]);
  const pcB = useMemo(() => nodes.find((n) => n.id === pcBId), [nodes, pcBId]);

  async function runTool(name: string, args: Record<string, unknown>): Promise<string> {
    if (name === "get_cluster_status") {
      return JSON.stringify({
        PC_A: pcA ? { name: pcA.name, status: pcA.status, vramUsed: pcA.vramUsed, vramTotal: pcA.vramTotal, temp: pcA.gpuTemp, queue: pcA.queueSize } : null,
        PC_B: pcB ? { name: pcB.name, status: pcB.status, vramUsed: pcB.vramUsed, vramTotal: pcB.vramTotal, temp: pcB.gpuTemp, queue: pcB.queueSize } : null,
      });
    }
    if (name === "dispatch_dual") {
      const taskA = String(args.task_a || "");
      const taskB = String(args.task_b || "");
      const vram = Number(args.required_vram_gb) || 8;
      if (!pcA || !pcB) return JSON.stringify({ error: "Wybierz oba komputery (PC_A i PC_B) w panelu powyżej." });
      const [a, b] = await Promise.all([
        clusterManager.dispatch({ task: taskA }, { forceNodeId: pcA.id, requiredVramGB: vram }),
        clusterManager.dispatch({ task: taskB }, { forceNodeId: pcB.id, requiredVramGB: vram }),
      ]);
      return JSON.stringify({ pc_a: a, pc_b: b });
    }
    if (name === "dispatch_single") {
      const target = String(args.target || "auto");
      const task = String(args.task || "");
      const vram = Number(args.required_vram_gb) || 8;
      const nodeId = target === "PC_A" ? pcA?.id : target === "PC_B" ? pcB?.id : undefined;
      const res = await clusterManager.dispatch({ task }, { forceNodeId: nodeId, requiredVramGB: vram });
      return JSON.stringify(res);
    }
    return JSON.stringify({ error: `Unknown tool ${name}` });
  }

  async function streamOnce(history: Msg[]): Promise<{ content: string; toolCalls: { id: string; name: string; args: string }[] }> {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: history.map((m) => {
          if (m.role === "tool") {
            return { role: "tool", content: m.content, tool_call_id: m.tool_call_id, name: m.name };
          }
          if (m.role === "assistant") {
            return {
              role: "assistant",
              content: m.content,
              ...(m.tool_calls && m.tool_calls.length ? { tool_calls: m.tool_calls } : {}),
            };
          }
          return { role: m.role, content: m.content };
        }),
      }),
    });
    if (!resp.ok || !resp.body) {
      const err = await resp.json().catch(() => ({ error: "Błąd połączenia" }));
      throw new Error(err.error || "Stream error");
    }
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let assistant = "";
    const calls: Record<string, { id: string; name: string; args: string }> = {};
    let done = false;

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    while (!done) {
      const { done: rd, value } = await reader.read();
      if (rd) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") { done = true; break; }
        try {
          const p = JSON.parse(json);
          const delta = p.choices?.[0]?.delta;
          if (delta?.content) {
            assistant += delta.content;
            setMessages((prev) => {
              const cp = [...prev];
              cp[cp.length - 1] = { role: "assistant", content: assistant };
              return cp;
            });
          }
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const id = tc.id || tc.index?.toString() || "0";
              if (!calls[id]) calls[id] = { id, name: "", args: "" };
              if (tc.function?.name) calls[id].name = tc.function.name;
              if (tc.function?.arguments) calls[id].args += tc.function.arguments;
            }
          }
        } catch {
          buf = line + "\n" + buf;
          break;
        }
      }
    }
    return { content: assistant, toolCalls: Object.values(calls) };
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);
    const userMsg: Msg = { role: "user", content: text };
    let history: Msg[] = [...messages, userMsg];
    setMessages(history);

    try {
      for (let i = 0; i < 4; i++) {
        const { content, toolCalls } = await streamOnce(history);
        const assistantMsg: Msg = {
          role: "assistant",
          content,
          ...(toolCalls.length
            ? {
                tool_calls: toolCalls.map((tc) => ({
                  id: tc.id,
                  type: "function" as const,
                  function: { name: tc.name, arguments: tc.args || "{}" },
                })),
              }
            : {}),
        };
        history = [...history, assistantMsg];
        if (toolCalls.length === 0) break;
        for (const tc of toolCalls) {
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(tc.args || "{}"); } catch { /* ignore */ }
          const result = await runTool(tc.name, args);
          const toolMsg: Msg = { role: "tool", name: tc.name, content: result, tool_call_id: tc.id };
          history = [...history, toolMsg];
          setMessages((prev) => [...prev, toolMsg]);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd AI");
    } finally {
      setLoading(false);
    }
  }

  const copyMcp = () => {
    navigator.clipboard.writeText(MCP_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("URL MCP skopiowany");
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cpu className="h-6 w-6 text-primary" />
            Dual Compute AI
          </h1>
          <p className="text-sm text-muted-foreground">Steruj dwoma komputerami równolegle przez asystenta AI (Gemini / GPT) + MCP Server.</p>
        </div>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* PC selectors + status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">PC_A (Komputer 1)</label>
          <Select value={pcAId} onValueChange={setPcAId}>
            <SelectTrigger><SelectValue placeholder="Wybierz node…" /></SelectTrigger>
            <SelectContent>
              {nodes.map((n) => <SelectItem key={n.id} value={n.id}>{n.name} — {n.url}</SelectItem>)}
            </SelectContent>
          </Select>
          <PCStatusCard label="PC_A" node={pcA} color="hsl(var(--primary))" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">PC_B (Komputer 2)</label>
          <Select value={pcBId} onValueChange={setPcBId}>
            <SelectTrigger><SelectValue placeholder="Wybierz node…" /></SelectTrigger>
            <SelectContent>
              {nodes.map((n) => <SelectItem key={n.id} value={n.id}>{n.name} — {n.url}</SelectItem>)}
            </SelectContent>
          </Select>
          <PCStatusCard label="PC_B" node={pcB} color="hsl(var(--accent))" />
        </div>
      </div>

      {/* Chat */}
      <Card className="flex flex-col h-[520px]">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Asystent orkiestratora</span>
          </div>
          <Badge variant="outline" className="text-xs">{model}</Badge>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user" ? "bg-primary text-primary-foreground" :
                m.role === "tool" ? "bg-muted/60 font-mono text-xs border" :
                "bg-secondary"
              }`}>
                {m.role === "tool" && <div className="text-[10px] uppercase text-muted-foreground mb-1">tool: {m.name}</div>}
                {m.content || (loading && i === messages.length - 1 ? "…" : "")}
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder='np. "Wyrenderuj tło zachodu słońca na PC_A i postać kobiety na PC_B równolegle"'
            className="min-h-[44px] resize-none"
          />
          <Button onClick={send} disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </Card>

      {/* MCP Server info */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Server className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">MCP Server</h3>
              <Badge variant="outline" className="text-xs">aktywny</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Endpoint Streamable HTTP. Podłącz w Claude Desktop / Cursor / dowolnym kliencie MCP.
              Eksponuje narzędzia: <code>ping_node</code>, <code>dispatch_single</code>, <code>dispatch_dual</code>.
            </p>
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">{MCP_URL}</code>
          </div>
          <Button variant="outline" size="sm" onClick={copyMcp}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <Separator className="my-3" />
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">Przykładowa konfiguracja klienta MCP</summary>
          <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">{JSON.stringify({
            mcpServers: {
              "alfa-dual-compute": { url: MCP_URL, transport: "streamable-http" }
            }
          }, null, 2)}</pre>
        </details>
      </Card>
    </div>
  );
}