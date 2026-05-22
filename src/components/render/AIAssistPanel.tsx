import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sparkles, Wand2, SlidersHorizontal, MessageSquare,
  Send, Loader2, Bot, User, Zap, Copy, Check, ShoppingCart
} from "lucide-react";
import { useAIChat, type ChatMessage } from "@/hooks/useAIChat";
import type { RenderSettings } from "./RenderControlPanel";
import { toast } from "sonner";

interface AIAssistPanelProps {
  className?: string;
  currentSettings: RenderSettings;
  onApplyPrompt?: (prompt: string) => void;
  onApplyParams?: (params: Partial<RenderSettings>) => void;
}

export function AIAssistPanel({
  className,
  currentSettings,
  onApplyPrompt,
  onApplyParams,
}: AIAssistPanelProps) {
  const { streamChat, enhancePrompt, isStreaming } = useAIChat();
  const [enhanceInput, setEnhanceInput] = useState("");
  const [enhancedResult, setEnhancedResult] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeMode, setActiveMode] = useState<"chat" | "advisor">("chat");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, streamingText]);

  const handleEnhance = async () => {
    const input = enhanceInput.trim() || currentSettings.prompt;
    if (!input) return;
    setIsEnhancing(true);
    try {
      const result = await enhancePrompt(input);
      if (result) setEnhancedResult(result);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setIsEnhancing(false);
    }
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

  const handleChatSend = async () => {
    const text = chatInput.trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setStreamingText("");

    let accumulated = "";
    await streamChat({
      messages: [...chatMessages, userMsg],
      mode: activeMode,
      onDelta: (chunk) => {
        accumulated += chunk;
        setStreamingText(accumulated);
      },
      onDone: () => {
        setChatMessages((prev) => [...prev, { role: "assistant", content: accumulated }]);
        setStreamingText("");
      },
      onError: (err) => {
        toast.error(err);
        setStreamingText("");
      },
    });
  };

  return (
    <div className={cn("flex flex-col bg-background", className)}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Bot className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wider text-primary">AI Assist</span>
        <Badge variant="outline" className="ml-auto text-[8px] px-1.5 py-0 border-status-ok/30 text-status-ok">
          <div className="h-1.5 w-1.5 rounded-full bg-status-ok mr-1 animate-pulse" />
          Cloud AI
        </Badge>
      </div>

      <Tabs defaultValue="enhance" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-3 mt-2 bg-secondary h-8">
          <TabsTrigger value="enhance" className="text-[10px] gap-1 h-6">
            <Wand2 className="h-3 w-3" /> Prompt
          </TabsTrigger>
          <TabsTrigger value="chat" className="text-[10px] gap-1 h-6" onClick={() => setActiveMode("chat")}>
            <MessageSquare className="h-3 w-3" /> Chat
          </TabsTrigger>
          <TabsTrigger value="advisor" className="text-[10px] gap-1 h-6" onClick={() => setActiveMode("advisor")}>
            <ShoppingCart className="h-3 w-3" /> Plany
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
            disabled={isEnhancing}
            className="gap-1.5 text-xs gold-gradient text-primary-foreground"
          >
            {isEnhancing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {isEnhancing ? "Ulepszam..." : "Ulepsz prompt"}
          </Button>

          {enhancedResult && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 space-y-2">
              <p className="text-[10px] font-semibold uppercase text-primary">Ulepszony prompt:</p>
              <p className="text-xs text-foreground leading-relaxed">{enhancedResult}</p>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 border-primary/30 text-primary flex-1" onClick={handleApplyEnhanced}>
                  <Zap className="h-2.5 w-2.5" /> Zastosuj
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 border-border" onClick={handleCopyEnhanced}>
                  {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Chat & Advisor share same UI */}
        {["chat", "advisor"].map((tab) => (
          <TabsContent key={tab} value={tab} className="flex-1 flex flex-col overflow-hidden mt-0">
            <ScrollArea className="flex-1 px-3 py-2">
              <div className="space-y-2">
                {chatMessages.length === 0 && !streamingText && (
                  <div className="text-center py-6">
                    {tab === "advisor" ? (
                      <>
                        <ShoppingCart className="h-8 w-8 text-primary/30 mx-auto mb-2" />
                        <p className="text-[10px] text-muted-foreground">Zapytaj o plany i ofertę ALFA Studio</p>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-[10px] text-muted-foreground">Zapytaj o cokolwiek związanego z renderowaniem</p>
                      </>
                    )}
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn("flex gap-2 text-xs", msg.role === "user" ? "justify-end" : "justify-start")}>
                    {msg.role === "assistant" && <Bot className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                    <div className={cn(
                      "rounded-md px-2.5 py-1.5 max-w-[85%]",
                      msg.role === "user" ? "bg-primary/10 text-foreground" : "bg-card border border-border text-foreground"
                    )}>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                    {msg.role === "user" && <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
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
                placeholder={tab === "advisor" ? "Jaki plan mi polecasz?" : "Napisz wiadomość..."}
                className="min-h-[32px] max-h-[80px] text-xs bg-card border-border resize-none flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
                }}
              />
              <Button
                size="sm"
                className="h-8 w-8 p-0 gold-gradient text-primary-foreground"
                onClick={handleChatSend}
                disabled={isStreaming || !chatInput.trim()}
              >
                {isStreaming ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              </Button>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
