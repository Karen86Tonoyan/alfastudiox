import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sparkles, Wand2, SlidersHorizontal, MessageSquare,
  Send, Loader2, Bot, User, RefreshCw, Zap, Copy, Check
} from "lucide-react";
import type { UseOllamaReturn } from "@/hooks/useOllama";
import type { RenderSettings } from "./RenderControlPanel";

interface AIAssistPanelProps {
  className?: string;
  ollama: UseOllamaReturn;
  currentSettings: RenderSettings;
  onApplyPrompt?: (prompt: string) => void;
  onApplyParams?: (params: Partial<RenderSettings>) => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export function AIAssistPanel({
  className,
  ollama,
  currentSettings,
  onApplyPrompt,
  onApplyParams,
}: AIAssistPanelProps) {
  const [enhanceInput, setEnhanceInput] = useState("");
  const [enhancedResult, setEnhancedResult] = useState("");
  const [paramInput, setParamInput] = useState("");
  const [suggestedParams, setSuggestedParams] = useState<Record<string, any> | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, streamingText]);

  const handleEnhance = async () => {
    const input = enhanceInput.trim() || currentSettings.prompt;
    if (!input) return;
    const result = await ollama.enhancePrompt(input, currentSettings.modelType);
    if (result) setEnhancedResult(result);
  };

  const handleApplyEnhanced = () => {
    if (enhancedResult) {
      onApplyPrompt?.(enhancedResult);
      setEnhancedResult("");
    }
  };

  const handleCopyEnhanced = () => {
    if (enhancedResult) {
      navigator.clipboard.writeText(enhancedResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSuggestParams = async () => {
    const input = paramInput.trim() || currentSettings.prompt;
    if (!input) return;
    const result = await ollama.suggestParams(input);
    if (result) setSuggestedParams(result);
  };

  const handleApplyParams = () => {
    if (suggestedParams) {
      onApplyParams?.(suggestedParams as Partial<RenderSettings>);
      setSuggestedParams(null);
    }
  };

  const handleChatSend = async () => {
    const text = chatInput.trim();
    if (!text || ollama.isChatting) return;

    const userMsg: ChatMessage = { role: "user", content: text, timestamp: Date.now() };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setStreamingText("");

    const systemPrompt = `You are an AI rendering assistant inside "AI Director", a ComfyUI-based rendering studio. Help users with:
- Writing better prompts for Stable Diffusion, Flux, and video models
- Choosing optimal parameters (steps, CFG, sampler, resolution)
- Understanding different models and LoRAs
- Troubleshooting render issues
Current settings: model=${currentSettings.model}, steps=${currentSettings.steps}, cfg=${currentSettings.cfg}, sampler=${currentSettings.sampler}, resolution=${currentSettings.width}x${currentSettings.height}
Be concise and practical.`;

    let accumulated = "";
    await ollama.chatStream(
      [
        { role: "system", content: systemPrompt },
        ...chatMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: text },
      ],
      (chunk) => {
        accumulated += chunk;
        setStreamingText(accumulated);
      },
      () => {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: accumulated, timestamp: Date.now() },
        ]);
        setStreamingText("");
      }
    );
  };

  if (!ollama.isConnected) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-6 text-center", className)}>
        <Bot className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Ollama nie jest podłączony</p>
        <p className="text-xs text-muted-foreground/60 mt-1 max-w-[200px]">
          Połącz się z Ollama w zakładce Providers, aby uzyskać dostęp do AI Assist
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-3 gap-1.5 text-xs border-primary/30 text-primary"
          onClick={() => ollama.checkConnection()}
          disabled={ollama.isChecking}
        >
          {ollama.isChecking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Sprawdź połączenie
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col bg-background", className)}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Bot className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wider text-primary">AI Assist</span>
        <Badge variant="outline" className="ml-auto text-[8px] px-1.5 py-0 border-status-ok/30 text-status-ok">
          <div className="h-1.5 w-1.5 rounded-full bg-status-ok mr-1 animate-pulse" />
          Ollama
        </Badge>
      </div>

      <Tabs defaultValue="enhance" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-3 mt-2 bg-secondary h-8">
          <TabsTrigger value="enhance" className="text-[10px] gap-1 h-6">
            <Wand2 className="h-3 w-3" /> Prompt
          </TabsTrigger>
          <TabsTrigger value="params" className="text-[10px] gap-1 h-6">
            <SlidersHorizontal className="h-3 w-3" /> Auto
          </TabsTrigger>
          <TabsTrigger value="chat" className="text-[10px] gap-1 h-6">
            <MessageSquare className="h-3 w-3" /> Chat
          </TabsTrigger>
        </TabsList>

        {/* Prompt Enhancement */}
        <TabsContent value="enhance" className="flex-1 flex flex-col overflow-hidden p-3 space-y-2 mt-0">
          <Textarea
            value={enhanceInput}
            onChange={(e) => setEnhanceInput(e.target.value)}
            placeholder={currentSettings.prompt || "Opisz co chcesz wygenerować..."}
            className="min-h-[60px] text-xs bg-card border-border resize-none"
          />
          <Button
            size="sm"
            onClick={handleEnhance}
            disabled={ollama.isEnhancing}
            className="gap-1.5 text-xs gold-gradient text-primary-foreground"
          >
            {ollama.isEnhancing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {ollama.isEnhancing ? "Ulepszam..." : "Ulepsz prompt"}
          </Button>

          {enhancedResult && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 space-y-2">
              <p className="text-[10px] font-semibold uppercase text-primary">Ulepszony prompt:</p>
              <p className="text-xs text-foreground leading-relaxed">{enhancedResult}</p>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] gap-1 border-primary/30 text-primary flex-1"
                  onClick={handleApplyEnhanced}
                >
                  <Zap className="h-2.5 w-2.5" /> Zastosuj
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] gap-1 border-border"
                  onClick={handleCopyEnhanced}
                >
                  {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Auto Parameters */}
        <TabsContent value="params" className="flex-1 flex flex-col overflow-hidden p-3 space-y-2 mt-0">
          <Textarea
            value={paramInput}
            onChange={(e) => setParamInput(e.target.value)}
            placeholder={currentSettings.prompt || "Opisz scenę, a AI dobierze parametry..."}
            className="min-h-[60px] text-xs bg-card border-border resize-none"
          />
          <Button
            size="sm"
            onClick={handleSuggestParams}
            disabled={ollama.isSuggesting}
            className="gap-1.5 text-xs gold-gradient text-primary-foreground"
          >
            {ollama.isSuggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <SlidersHorizontal className="h-3 w-3" />}
            {ollama.isSuggesting ? "Analizuję..." : "Sugeruj parametry"}
          </Button>

          {suggestedParams && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 space-y-2">
              <p className="text-[10px] font-semibold uppercase text-primary">Sugerowane parametry:</p>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(suggestedParams).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-[10px] px-1.5 py-0.5 rounded bg-card">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-mono text-foreground">{String(value)}</span>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-6 text-[10px] gap-1 border-primary/30 text-primary"
                onClick={handleApplyParams}
              >
                <Zap className="h-2.5 w-2.5" /> Zastosuj wszystkie
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Chat */}
        <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden mt-0">
          <ScrollArea className="flex-1 px-3 py-2">
            <div className="space-y-2">
              {chatMessages.length === 0 && !streamingText && (
                <div className="text-center py-6">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-[10px] text-muted-foreground">
                    Zapytaj o cokolwiek związanego z renderowaniem
                  </p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2 text-xs",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <Bot className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  )}
                  <div
                    className={cn(
                      "rounded-md px-2.5 py-1.5 max-w-[85%]",
                      msg.role === "user"
                        ? "bg-primary/10 text-foreground"
                        : "bg-card border border-border text-foreground"
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                  {msg.role === "user" && (
                    <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                </div>
              ))}
              {streamingText && (
                <div className="flex gap-2 text-xs">
                  <Bot className="h-4 w-4 text-primary shrink-0 mt-0.5 animate-pulse" />
                  <div className="rounded-md px-2.5 py-1.5 bg-card border border-border max-w-[85%]">
                    <p className="whitespace-pre-wrap leading-relaxed">{streamingText}</p>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          <div className="border-t border-border p-2 flex gap-1.5">
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Napisz wiadomość..."
              className="min-h-[32px] max-h-[80px] text-xs bg-card border-border resize-none flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleChatSend();
                }
              }}
            />
            <Button
              size="sm"
              className="h-8 w-8 p-0 gold-gradient text-primary-foreground"
              onClick={handleChatSend}
              disabled={ollama.isChatting || !chatInput.trim()}
            >
              {ollama.isChatting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
