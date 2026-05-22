import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Terminal, Send, Loader2, Copy, Check, Braces, List, MessageSquare, GitBranch } from "lucide-react";
import { toast } from "sonner";

const MCP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp-server`;

const MODELS = [
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "openai/gpt-5", label: "GPT-5" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { id: "openai/gpt-5-nano", label: "GPT-5 Nano" },
];

let rpcId = 0;
function nextId() {
  rpcId += 1;
  return rpcId;
}

async function mcpCall(method: string, params?: Record<string, unknown>) {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: nextId(), method, params }),
  });
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("text/event-stream")) {
    const text = await res.text();
    const lines = text.split("\n").filter((l) => l.startsWith("data:"));
    for (const line of lines) {
      const payload = line.replace(/^data:\s*/, "");
      if (payload === "[DONE]") break;
      try {
        const parsed = JSON.parse(payload);
        if (parsed.result) return parsed.result;
      } catch { /* ignore */ }
    }
    return { raw: text };
  }
  return await res.json();
}

function RawResponse({ data }: { data: unknown }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(data, null, 2);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Skopiowano do schowka");
  };
  return (
    <div className="relative mt-2">
      <Button
        size="sm"
        variant="ghost"
        className="absolute right-2 top-2 h-7 text-xs gap-1"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Skopiowano" : "Kopiuj"}
      </Button>
      <pre className="bg-black/80 text-green-400 font-mono text-xs p-4 rounded-lg overflow-auto max-h-96 border border-border">
        {text}
      </pre>
    </div>
  );
}

export default function MCPTestPage() {
  const [activeTab, setActiveTab] = useState("list");
  const [loading, setLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState<unknown>(null);

  // ai_chat state
  const [chatModel, setChatModel] = useState(MODELS[0].id);
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatSystem, setChatSystem] = useState("");
  const [chatTemp, setChatTemp] = useState<string>("0.7");
  const [chatMaxTokens, setChatMaxTokens] = useState<string>("1024");

  // ai_plan_dual_render state
  const [planGoal, setPlanGoal] = useState("");
  const [planPcA, setPlanPcA] = useState("RTX 4090 24GB VRAM");
  const [planPcB, setPlanPcB] = useState("RTX 3090 24GB VRAM");
  const [planModel, setPlanModel] = useState(MODELS[0].id);

  const handleListTools = async () => {
    setLoading(true);
    setRawResponse(null);
    try {
      const data = await mcpCall("tools/list");
      setRawResponse(data);
      toast.success("Lista narzędzi pobrana");
    } catch (e) {
      toast.error("Błąd: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  const handleAiChat = async () => {
    if (!chatPrompt.trim()) { toast.error("Wpisz prompt"); return; }
    setLoading(true);
    setRawResponse(null);
    try {
      const data = await mcpCall("tools/call", {
        name: "ai_chat",
        arguments: {
          model: chatModel,
          prompt: chatPrompt,
          ...(chatSystem ? { system: chatSystem } : {}),
          ...(chatTemp ? { temperature: parseFloat(chatTemp) } : {}),
          ...(chatMaxTokens ? { max_tokens: parseInt(chatMaxTokens, 10) } : {}),
        },
      });
      setRawResponse(data);
      toast.success("ai_chat wykonane");
    } catch (e) {
      toast.error("Błąd: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  const handleAiPlan = async () => {
    if (!planGoal.trim()) { toast.error("Wpisz cel renderingu"); return; }
    setLoading(true);
    setRawResponse(null);
    try {
      const data = await mcpCall("tools/call", {
        name: "ai_plan_dual_render",
        arguments: {
          goal: planGoal,
          pc_a_caps: planPcA,
          pc_b_caps: planPcB,
          model: planModel,
        },
      });
      setRawResponse(data);
      toast.success("ai_plan_dual_render wykonane");
    } catch (e) {
      toast.error("Błąd: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  const handleAiListModels = async () => {
    setLoading(true);
    setRawResponse(null);
    try {
      const data = await mcpCall("tools/call", {
        name: "ai_list_models",
        arguments: {},
      });
      setRawResponse(data);
      toast.success("ai_list_models wykonane");
    } catch (e) {
      toast.error("Błąd: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Terminal className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MCP Test Panel</h1>
          <p className="text-sm text-muted-foreground">
            Testuj narzędzia MCP bezpośrednio — widzisz surowe odpowiedzi JSON-RPC.
          </p>
        </div>
        <Badge variant="outline" className="ml-auto font-mono text-xs">
          {MCP_URL.replace(/^https:\/\//, "")}
        </Badge>
      </div>

      <Separator />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" /> Lista narzędzi
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="h-4 w-4" /> ai_chat
          </TabsTrigger>
          <TabsTrigger value="plan" className="gap-2">
            <GitBranch className="h-4 w-4" /> ai_plan_dual_render
          </TabsTrigger>
          <TabsTrigger value="models" className="gap-2">
            <Braces className="h-4 w-4" /> ai_list_models
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">tools/list</h3>
                <p className="text-sm text-muted-foreground">
                  Pobiera listę wszystkich zarejestrowanych narzędzi z MCP servera.
                </p>
              </div>
              <Button onClick={handleListTools} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Wyślij
              </Button>
            </div>
            {rawResponse !== null && activeTab === "list" && <RawResponse data={rawResponse} />}
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">ai_chat</h3>
                <p className="text-sm text-muted-foreground">
                  Wywołanie modelu AI przez Lovable Gateway — zwraca treść odpowiedzi.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium">Model</label>
                <Select value={chatModel} onValueChange={setChatModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Temperature</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={chatTemp}
                  onChange={(e) => setChatTemp(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Max tokens</label>
                <Input
                  type="number"
                  min="1"
                  max="8192"
                  value={chatMaxTokens}
                  onChange={(e) => setChatMaxTokens(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">System prompt (opcjonalny)</label>
              <Textarea
                placeholder="Jesteś pomocnym asystentem..."
                value={chatSystem}
                onChange={(e) => setChatSystem(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">User prompt</label>
              <Textarea
                placeholder="Napisz co chcesz zapytać AI..."
                value={chatPrompt}
                onChange={(e) => setChatPrompt(e.target.value)}
                rows={4}
              />
            </div>

            <Button onClick={handleAiChat} disabled={loading} className="gap-2 w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Wywołaj ai_chat
            </Button>

            {rawResponse !== null && activeTab === "chat" && <RawResponse data={rawResponse} />}
          </Card>
        </TabsContent>

        <TabsContent value="plan" className="mt-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">ai_plan_dual_render</h3>
                <p className="text-sm text-muted-foreground">
                  Planista AI dzielący zadanie renderingu między PC_A i PC_B.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium">Model</label>
                <Select value={planModel} onValueChange={setPlanModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium">PC_A capabilities</label>
                <Input value={planPcA} onChange={(e) => setPlanPcA(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">PC_B capabilities</label>
                <Input value={planPcB} onChange={(e) => setPlanPcB(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">Cel renderingu</label>
              <Textarea
                placeholder="Np. Wyrenderuj 4K portret kobiety w stylu cyberpunk z neonami..."
                value={planGoal}
                onChange={(e) => setPlanGoal(e.target.value)}
                rows={4}
              />
            </div>

            <Button onClick={handleAiPlan} disabled={loading} className="gap-2 w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Wywołaj ai_plan_dual_render
            </Button>

            {rawResponse !== null && activeTab === "plan" && <RawResponse data={rawResponse} />}
          </Card>
        </TabsContent>

        <TabsContent value="models" className="mt-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">ai_list_models</h3>
                <p className="text-sm text-muted-foreground">
                  Zwraca listę modeli AI dostępnych w Lovable Gateway.
                </p>
              </div>
              <Button onClick={handleAiListModels} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Wyślij
              </Button>
            </div>
            {rawResponse !== null && activeTab === "models" && <RawResponse data={rawResponse} />}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
