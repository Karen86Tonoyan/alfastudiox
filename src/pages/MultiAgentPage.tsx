import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Bot, User, Send, Loader2, Sparkles,
  Brain, ShieldCheck, Palette, Code, MessageSquare,
  RefreshCw, Play, Trash2, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type AgentRole = "strategist" | "designer" | "critic" | "executor";

interface Agent {
  id: AgentRole;
  name: string;
  icon: any;
  color: string;
  description: string;
  systemPrompt: string;
}

const AGENTS: Agent[] = [
  {
    id: "strategist",
    name: "Strateg",
    icon: Brain,
    color: "text-purple-400",
    description: "Planowanie i orkiestracja zadań.",
    systemPrompt: "Jesteś Strategiem w systemie Multi-Agent ALFA Studio. Twoim zadaniem jest planowanie złożonych zadań, dzielenie ich na mniejsze etapy i decydowanie, który agent powinien zająć się konkretną częścią. Odpowiadaj zwięźle i konkretnie po polsku."
  },
  {
    id: "designer",
    name: "Designer",
    icon: Palette,
    color: "text-pink-400",
    description: "Kreatywne wizje i prompty wizualne.",
    systemPrompt: "Jesteś Designerem w systemie Multi-Agent ALFA Studio. Specjalizujesz się w estetyce, kompozycji i tworzeniu zaawansowanych promptów dla generatorów obrazu (Flux, SDXL). Skupiasz się na detalach wizualnych. Odpowiadaj po polsku."
  },
  {
    id: "critic",
    name: "Krytyk",
    icon: ShieldCheck,
    color: "text-amber-400",
    description: "Analiza jakości i wyłapywanie błędów.",
    systemPrompt: "Jesteś Krytykiem w systemie Multi-Agent ALFA Studio. Twoim zadaniem jest ocena propozycji innych agentów, wyłapywanie potencjalnych problemów (np. artefaktów w obrazach, niespójności logicznych) i sugerowanie poprawek. Bądź konstruktywny ale surowy. Odpowiadaj po polsku."
  },
  {
    id: "executor",
    name: "Wykonawca",
    icon: Code,
    color: "text-blue-400",
    description: "Techniczna implementacja i parametry.",
    systemPrompt: "Jesteś Wykonawcą w systemie Multi-Agent ALFA Studio. Specjalizujesz się w technicznych aspektach ComfyUI, doborze samplerów, schedulerów, optymalizacji VRAM i konfiguracji workflow. Skupiasz się na tym, 'jak' coś zrobić technicznie. Odpowiadaj po polsku."
  }
];

interface Message {
  id: string;
  role: "user" | "assistant";
  agentId?: AgentRole;
  content: string;
  timestamp: number;
}

const FUNC_URL = (name: string) =>
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;

async function invokeAI(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(FUNC_URL("ai-studio-chat"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({ error: "Bad response" }));
  if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

export default function MultiAgentPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<AgentRole | "swarm">("swarm");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const callAgent = async (agentId: AgentRole, userPrompt: string, history: Message[]) => {
    const agent = AGENTS.find(a => a.id === agentId)!;
    const agentMessages = history.map(m => ({
      role: m.role,
      content: m.agentId ? `[${AGENTS.find(a => a.id === m.agentId)?.name}]: ${m.content}` : m.content
    }));

    const out = await invokeAI({
      mode: "chat",
      prompt: userPrompt,
      system: agent.systemPrompt,
      messages: agentMessages,
      model: "google/gemini-2.0-flash-exp"
    });

    return out.text;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || busy) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setBusy(true);

    try {
      if (activeTab === "swarm") {
        // SWARM MODE: Sequential collaboration
        // 1. Strategist plans
        const plan = await callAgent("strategist", `ZAPLANUJ ZADANIE: ${text}`, messages);
        const strategistMsg: Message = {
          id: `a-strat-${Date.now()}`,
          role: "assistant",
          agentId: "strategist",
          content: plan,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, strategistMsg]);

        // 2. Designer envisions
        const design = await callAgent("designer", `NA PODSTAWIE PLANU: ${plan}. Zaproponuj wizję artystyczną i prompty.`, [...messages, userMsg, strategistMsg]);
        const designerMsg: Message = {
          id: `a-des-${Date.now()}`,
          role: "assistant",
          agentId: "designer",
          content: design,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, designerMsg]);

        // 3. Executor details
        const execution = await callAgent("executor", `NA PODSTAWIE WIZJI: ${design}. Podaj techniczne parametry i workflow.`, [...messages, userMsg, strategistMsg, designerMsg]);
        const executorMsg: Message = {
          id: `a-exe-${Date.now()}`,
          role: "assistant",
          agentId: "executor",
          content: execution,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, executorMsg]);

        // 4. Critic reviews
        const review = await callAgent("critic", `OCEŃ PROPOZYCJE: Plan: ${plan}, Wizja: ${design}, Technicze: ${execution}. Czy są jakieś błędy lub ryzyka?`, [...messages, userMsg, strategistMsg, designerMsg, executorMsg]);
        const criticMsg: Message = {
          id: `a-crit-${Date.now()}`,
          role: "assistant",
          agentId: "critic",
          content: review,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, criticMsg]);

      } else {
        // INDIVIDUAL MODE
        const reply = await callAgent(activeTab, text, messages);
        const assistantMsg: Message = {
          id: `a-${Date.now()}`,
          role: "assistant",
          agentId: activeTab,
          content: reply,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (e: any) {
      toast.error(e.message);
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `❌ Wystąpił błąd: ${e.message}`,
        timestamp: Date.now()
      }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <header className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Agent Swarm Intelligence
          </h1>
          <p className="text-sm text-muted-foreground">
            Współpraca wyspecjalizowanych agentów AI nad Twoim projektem.
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1 bg-primary/5 text-primary border-primary/20">
          <Sparkles className="h-3 w-3 mr-2" /> 4 Agenty Aktywne
        </Badge>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 flex-1 overflow-hidden min-h-0">
        <Card className="flex flex-col overflow-hidden border-border/60 bg-card/50 backdrop-blur-sm">
          <div className="border-b border-border p-4 flex items-center justify-between bg-muted/30 shrink-0">
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
              <TabsList className="bg-background/50 border border-border">
                <TabsTrigger value="swarm" className="gap-2 text-xs">
                  <Users className="h-3 w-3" /> Współpraca (Swarm)
                </TabsTrigger>
                {AGENTS.map(agent => (
                  <TabsTrigger key={agent.id} value={agent.id} className="gap-2 text-xs">
                    <agent.icon className={cn("h-3 w-3", agent.color)} />
                    {agent.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-6 max-w-4xl mx-auto pb-10">
              {messages.length === 0 && (
                <div className="text-center py-20 space-y-4">
                  <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/5 text-primary mb-2">
                    <Bot className="h-10 w-10" />
                  </div>
                  <h2 className="text-lg font-semibold">Witaj w Rojowisku Agentów</h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Wybierz agenta do bezpośredniej rozmowy lub użyj trybu Swarm, aby agenci współpracowali ze sobą nad Twoim zadaniem.
                  </p>
                  <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto pt-4">
                    {["Zaprojektuj postać cyberpunk", "Zaplanuj sesję produktową", "Zoptymalizuj workflow ComfyUI", "Oceń mój pomysł na film"].map((suggestion) => (
                      <Button key={suggestion} variant="outline" size="sm" className="text-xs justify-start hover:bg-primary/5" onClick={() => setInput(suggestion)}>
                        <ChevronRight className="h-3 w-3 mr-2 text-primary" /> {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) => {
                const agent = AGENTS.find(a => a.id === m.agentId);
                return (
                  <div key={m.id} className={cn("flex flex-col gap-2", m.role === "user" ? "items-end" : "items-start")}>
                    <div className="flex items-center gap-2">
                      {m.role === "assistant" && agent && (
                        <>
                          <agent.icon className={cn("h-3.5 w-3.5", agent.color)} />
                          <span className={cn("text-[10px] font-bold uppercase tracking-wider", agent.color)}>{agent.name}</span>
                        </>
                      )}
                      {m.role === "user" && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ty</span>
                      )}
                    </div>
                    <div className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm max-w-[85%] shadow-sm",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted/80 text-foreground rounded-tl-none border border-border"
                    )}>
                      <ReactMarkdown className="prose prose-sm prose-invert max-w-none">{m.content}</ReactMarkdown>
                    </div>
                  </div>
                );
              })}
              {busy && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Agent {activeTab === "swarm" ? "Rój" : AGENTS.find(a => a.id === activeTab)?.name} pracuje...
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border bg-muted/20 shrink-0">
            <div className="flex gap-3 max-w-4xl mx-auto">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={activeTab === "swarm" ? "Opisz zadanie dla roju agentów..." : `Zapytaj agenta: ${AGENTS.find(a => a.id === activeTab)?.name}...`}
                className="min-h-[80px] bg-background/50 border-border/60 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <div className="flex flex-col gap-2">
                <Button onClick={handleSend} disabled={busy || !input.trim()} className="h-full px-6 gap-2 font-bold uppercase tracking-wider gold-gradient">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" className="shrink-0" onClick={() => setMessages([])}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <aside className="space-y-6 overflow-y-auto pr-1 shrink-0">
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" /> Status Agentów
            </h3>
            <div className="space-y-2">
              {AGENTS.map((agent) => (
                <div key={agent.id} className="p-3 rounded-lg border border-border bg-card/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <agent.icon className={cn("h-3.5 w-3.5", agent.color)} />
                      <span className="text-xs font-bold">{agent.name}</span>
                    </div>
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{agent.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-tighter text-primary flex items-center gap-2">
              <Play className="h-3 w-3" /> Tryb Współpracy
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              W trybie <b>Swarm</b>, agenci będą ze sobą rozmawiać, aby wypracować najlepsze rozwiązanie.
              Strateg zaplanuje, Designer zaproponuje, Krytyk oceni, a Wykonawca przygotuje technikalia.
            </p>
            <Button size="sm" variant="outline" className="w-full text-[10px] h-7 border-primary/30 text-primary" onClick={() => setMessages([])}>
              <RefreshCw className="h-3 w-3 mr-2" /> Restartuj Rój
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
