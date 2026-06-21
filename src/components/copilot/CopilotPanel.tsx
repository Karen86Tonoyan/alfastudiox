import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { copilotRegistry, type CopilotTool } from "@/lib/aiCopilot/registry";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  Bot, X, Send, Loader2, Wrench, Trash2, Maximize2, Minimize2, ChevronDown, ChevronUp, AlertCircle,
} from "lucide-react";

type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
type Msg =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; name: string; content: string }
  | { role: "system"; content: string };

const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-copilot`;
const MAX_LOOPS = 6;

/* ─── global tools always available ─── */
function useGlobalTools(navigate: ReturnType<typeof useNavigate>, location: ReturnType<typeof useLocation>) {
  useEffect(() => {
    const tools: CopilotTool[] = [
      {
        name: "navigate",
        description: "Przejdź do innej strony w aplikacji. Path zaczyna się od '/'.",
        parameters: { type: "object", properties: { path: { type: "string", description: "Ścieżka np. /workflow, /render, /ai-studio-chat" } }, required: ["path"] },
        handler: (a: { path: string }) => { navigate(a.path); return { ok: true, navigatedTo: a.path }; },
        scope: "global",
      },
      {
        name: "current_route",
        description: "Zwróć aktualną ścieżkę URL.",
        parameters: { type: "object", properties: {} },
        handler: () => ({ route: location.pathname }),
        scope: "global",
      },
      {
        name: "list_tools",
        description: "Zwróć listę wszystkich dostępnych narzędzi w aktualnym kontekście aplikacji.",
        parameters: { type: "object", properties: {} },
        handler: () => ({ tools: copilotRegistry.list().map((t) => ({ name: t.name, scope: t.scope, description: t.description })) }),
        scope: "global",
      },
      {
        name: "toast",
        description: "Pokaż powiadomienie użytkownikowi.",
        parameters: {
          type: "object",
          properties: {
            message: { type: "string" },
            kind: { type: "string", enum: ["info", "success", "error", "warning"] },
          },
          required: ["message"],
        },
        handler: (a: { message: string; kind?: "info" | "success" | "error" | "warning" }) => {
          const fn = a.kind === "error" ? toast.error : a.kind === "success" ? toast.success : a.kind === "warning" ? toast.warning : toast.message;
          fn(a.message);
          return { ok: true };
        },
        scope: "global",
      },
      {
        name: "click_button",
        description: "Kliknij widoczny przycisk po tekście (case-insensitive, częściowe dopasowanie). Użyj gdy nie ma dedykowanego narzędzia.",
        parameters: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
        handler: (a: { text: string }) => {
          const all = Array.from(document.querySelectorAll("button, a")) as HTMLElement[];
          const needle = a.text.toLowerCase();
          const hit = all.find((b) => b.innerText?.toLowerCase().includes(needle) && b.offsetParent !== null);
          if (!hit) return { ok: false, error: "Nie znaleziono widocznego przycisku" };
          hit.click();
          return { ok: true, clicked: hit.innerText?.slice(0, 60) };
        },
        scope: "global",
      },
    ];
    const offs = tools.map((t) => copilotRegistry.register(t));
    return () => offs.forEach((o) => o());
  }, [navigate, location.pathname]);
}

export function CopilotPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  useGlobalTools(navigate, location);

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [toolCount, setToolCount] = useState(copilotRegistry.list().length);
  const [showTools, setShowTools] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const off = copilotRegistry.subscribe(() => setToolCount(copilotRegistry.list().length));
    return () => { off; };
  }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }); }, [messages, busy]);

  const runLoop = useCallback(async (history: Msg[]) => {
    let convo = [...history];
    setBusy(true);
    try {
      for (let i = 0; i < MAX_LOOPS; i++) {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(FUNC_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({
            messages: convo,
            tools: copilotRegistry.asOpenAITools(),
            context: { route: location.pathname, viewport: `${window.innerWidth}x${window.innerHeight}` },
          }),
        });
        const json = await res.json().catch(() => ({ error: "bad response" }));
        if (!res.ok || json.error) {
          const errMsg: Msg = { role: "assistant", content: `❌ ${json.error || `HTTP ${res.status}`}${json.detail ? `\n\n\`\`\`\n${String(json.detail).slice(0, 400)}\n\`\`\`` : ""}` };
          convo = [...convo, errMsg];
          setMessages(convo);
          break;
        }
        const assistantMsg = json.message as Msg & { tool_calls?: ToolCall[] };
        convo = [...convo, assistantMsg];
        setMessages(convo);

        const calls = (assistantMsg as any).tool_calls as ToolCall[] | undefined;
        if (!calls?.length) break; // model finished

        // execute all tool calls in parallel
        const results = await Promise.all(calls.map(async (c) => {
          const tool = copilotRegistry.get(c.function.name);
          if (!tool) return { id: c.id, name: c.function.name, output: { error: "Nieznane narzędzie" } };
          let args: any = {};
          try { args = c.function.arguments ? JSON.parse(c.function.arguments) : {}; } catch { args = {}; }
          try {
            const out = await tool.handler(args);
            return { id: c.id, name: c.function.name, output: out };
          } catch (e: any) {
            return { id: c.id, name: c.function.name, output: { error: e?.message ?? String(e) } };
          }
        }));

        const toolMsgs: Msg[] = results.map((r) => ({
          role: "tool",
          tool_call_id: r.id,
          name: r.name,
          content: JSON.stringify(r.output).slice(0, 4000),
        }));
        convo = [...convo, ...toolMsgs];
        setMessages(convo);
      }
    } catch (e: any) {
      toast.error(`Copilot: ${e.message}`);
      convo = [...convo, { role: "assistant", content: `❌ ${e.message}` }];
      setMessages(convo);
    } finally {
      setBusy(false);
    }
  }, [location.pathname]);

  async function send() {
    const text = prompt.trim();
    if (!text || busy) return;
    setPrompt("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    await runLoop(next);
  }

  if (!open) {
    return createPortal(
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform p-4 flex items-center gap-2"
        title="AI Copilot — sterowanie aplikacją"
      >
        <Bot className="h-5 w-5" />
        <span className="text-xs font-medium">Copilot</span>
        <Badge variant="secondary" className="text-[10px]">{toolCount}</Badge>
      </button>, document.body,
    );
  }

  return createPortal(
    <Card className={`fixed z-50 right-6 bottom-6 flex flex-col border-primary/30 shadow-2xl ${expanded ? "w-[min(640px,90vw)] h-[min(800px,85vh)]" : "w-[min(420px,90vw)] h-[min(600px,80vh)]"}`}>
      <header className="flex items-center gap-2 p-3 border-b border-border">
        <Bot className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">AI Copilot</h3>
        <Badge variant="outline" className="text-[10px]"><Wrench className="h-2.5 w-2.5 mr-1" />{toolCount} narzędzi</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowTools((s) => !s)} title="Lista narzędzi">
            {showTools ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMessages([])} title="Wyczyść"><Trash2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded((e) => !e)}>
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
        </div>
      </header>

      {showTools && (
        <div className="max-h-40 overflow-y-auto p-2 border-b border-border bg-secondary/20 text-[11px] space-y-1">
          {copilotRegistry.list().map((t) => (
            <div key={t.name} className="flex gap-2"><Badge variant="outline" className="text-[9px] shrink-0">{t.scope || "-"}</Badge><code className="text-primary">{t.name}</code><span className="text-muted-foreground truncate">{t.description}</span></div>
          ))}
        </div>
      )}

      <ScrollArea className="flex-1 p-3" ref={scrollRef as any}>
        <div className="space-y-2">
          {messages.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-8 space-y-2">
              <p>Sterowanie aplikacją przez AI 🤖</p>
              <p className="text-[10px]">Spróbuj: <em>"przejdź do workflow i dodaj 3 node'y: KSampler, VAE Decode, Save Image"</em></p>
              <p className="text-[10px]">albo: <em>"wygeneruj kampanię reklamową dla zegarka, 4 warianty 1:1"</em></p>
            </div>
          )}
          {messages.map((m, i) => {
            if (m.role === "user") return <div key={i} className="ml-auto max-w-[85%] bg-primary text-primary-foreground rounded px-3 py-1.5 text-xs">{m.content}</div>;
            if (m.role === "assistant") return (
              <div key={i} className="space-y-1">
                {m.content && <div className="prose prose-xs prose-invert max-w-none text-xs"><ReactMarkdown>{String(m.content)}</ReactMarkdown></div>}
                {(m as any).tool_calls?.map((c: ToolCall) => (
                  <div key={c.id} className="text-[10px] bg-secondary/40 rounded px-2 py-1 font-mono">
                    <Wrench className="inline h-2.5 w-2.5 mr-1" />{c.function.name}({c.function.arguments?.slice(0, 80)}{(c.function.arguments?.length ?? 0) > 80 ? "…" : ""})
                  </div>
                ))}
              </div>
            );
            if (m.role === "tool") {
              const out = (() => { try { return JSON.parse(m.content); } catch { return m.content; } })();
              const isErr = out && typeof out === "object" && (out as any).error;
              return (
                <div key={i} className={`text-[10px] rounded px-2 py-1 ${isErr ? "bg-destructive/15 text-destructive" : "bg-green-500/10 text-green-400"}`}>
                  {isErr && <AlertCircle className="inline h-2.5 w-2.5 mr-1" />}
                  <span className="font-mono">{(m as any).name}</span> → <span className="font-mono">{typeof out === "string" ? out.slice(0, 120) : JSON.stringify(out).slice(0, 120)}</span>
                </div>
              );
            }
            return null;
          })}
          {busy && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Copilot pracuje…</div>}
        </div>
      </ScrollArea>

      <div className="p-2 border-t border-border flex gap-2">
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} placeholder="Powiedz co zrobić w aplikacji…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} className="text-xs min-h-[44px] resize-none" />
        <Button onClick={send} disabled={busy || !prompt.trim()} size="icon"><Send className="h-4 w-4" /></Button>
      </div>
    </Card>, document.body,
  );
}
