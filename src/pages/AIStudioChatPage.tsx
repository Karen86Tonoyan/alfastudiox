import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import JSZip from "jszip";
import jsPDF from "jspdf";
import {
  Send, Paperclip, Trash2, Loader2, Image as ImageIcon, FileText, Brush, BookOpen,
  Megaphone, Eraser, Wand2, Download, Play, CheckCircle2, XCircle, Clock
} from "lucide-react";

type Attach = { kind: "image" | "text"; data: string; name: string; mime?: string; size?: number };
type ChatMsg = { id: string; role: "user" | "assistant"; text: string; images?: string[]; ts: number };
type Task = { id: string; label: string; prompt: string; status: "pending" | "running" | "done" | "error"; result?: string; resultImage?: string };

const FUNC_URL = (name: string) =>
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;

async function fileToDataURL(f: File): Promise<string> {
  return await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}
async function fileToText(f: File): Promise<string> {
  return await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsText(f);
  });
}

async function expandZip(zipFile: File): Promise<Attach[]> {
  const zip = await JSZip.loadAsync(zipFile);
  const out: Attach[] = [];
  const entries = Object.values(zip.files).filter((f) => !f.dir).slice(0, 25);
  for (const entry of entries) {
    const lower = entry.name.toLowerCase();
    if (/\.(png|jpe?g|webp|gif)$/i.test(lower)) {
      const blob = await entry.async("blob");
      const data = await new Promise<string>((res, rej) => {
        const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(blob);
      });
      out.push({ kind: "image", data, name: entry.name, size: blob.size });
    } else if (/\.(txt|md|json|csv|yml|yaml|html?|css|js|ts|tsx|py)$/i.test(lower)) {
      const text = await entry.async("string");
      out.push({ kind: "text", data: text, name: entry.name, size: text.length });
    }
  }
  return out;
}

async function invoke(body: Record<string, unknown>) {
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

/* ─────────────────────────────────────── CHAT TAB ─────────────────────────────────────── */
function ChatTab() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState<Attach[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState("google/gemini-3-flash-preview");
  const [backend, setBackend] = useState<"hybrid" | "cloud" | "local">("hybrid");
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, tasks]);

  async function onFiles(files: FileList | null) {
    if (!files) return;
    const added: Attach[] = [];
    for (const f of Array.from(files).slice(0, 10)) {
      try {
        if (/\.zip$/i.test(f.name)) {
          const items = await expandZip(f);
          added.push(...items);
          toast.success(`ZIP: rozpakowano ${items.length} plików`);
        } else if (f.type.startsWith("image/")) {
          added.push({ kind: "image", data: await fileToDataURL(f), name: f.name, mime: f.type, size: f.size });
        } else if (f.type === "application/pdf") {
          // Send as data URL; vision models handle PDFs as image+text proxy via file part
          added.push({ kind: "text", data: `[PDF] ${f.name} (${(f.size / 1024).toFixed(0)} KB)`, name: f.name });
          toast.message("PDF dodany jako metadane (podgląd tekstu wymaga parsera).");
        } else {
          added.push({ kind: "text", data: await fileToText(f), name: f.name, size: f.size });
        }
      } catch (e) { toast.error(`Błąd: ${f.name}`); }
    }
    setAttachments((a) => [...a, ...added]);
  }

  function addTaskFromPrompt() {
    const t = prompt.trim();
    if (!t) return;
    const labels = t.split(/[,;\n]| oraz | i /i).map((s) => s.trim()).filter(Boolean);
    const newTasks: Task[] = labels.map((label, i) => ({
      id: `${Date.now()}-${i}`, label, prompt: label, status: "pending",
    }));
    setTasks((q) => [...q, ...newTasks]);
    setPrompt("");
    toast.success(`Dodano ${newTasks.length} zadań do kolejki`);
  }

  async function runQueue() {
    if (!attachments.some((a) => a.kind === "image")) {
      toast.error("Najpierw wgraj zdjęcie/zdjęcia do obróbki");
      return;
    }
    setBusy(true);
    const sourceImage = attachments.find((a) => a.kind === "image")!;
    try {
      for (const task of tasks.filter((t) => t.status === "pending")) {
        setTasks((q) => q.map((x) => x.id === task.id ? { ...x, status: "running" } : x));
        try {
          const out = await invoke({
            mode: "image_generate",
            prompt: `Wykonaj na zdjęciu: "${task.prompt}". Zwróć zmodyfikowane zdjęcie zachowując kompozycję.`,
            attachments: [sourceImage],
            model: "google/gemini-2.5-flash-image",
          });
          const img = out.images?.[0];
          setTasks((q) => q.map((x) => x.id === task.id ? { ...x, status: "done", resultImage: img, result: out.text } : x));
        } catch (e: any) {
          setTasks((q) => q.map((x) => x.id === task.id ? { ...x, status: "error", result: e.message } : x));
        }
      }
    } finally { setBusy(false); }
  }

  async function sendChat() {
    if (!prompt.trim() && attachments.length === 0) return;
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", text: prompt, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);
    try {
      const hasImage = attachments.some((a) => a.kind === "image");
      const out = await invoke({
        mode: hasImage ? "vision" : "chat",
        prompt,
        attachments,
        model: hasImage ? "google/gemini-2.5-flash" : model,
        system: "Jesteś ekspertem fotografii i AI. Odpowiadasz po polsku, zwięźle i precyzyjnie.",
      });
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", text: out.text || "(pusta odpowiedź)", ts: Date.now() }]);
    } catch (e: any) {
      toast.error(e.message);
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", text: `❌ ${e.message}`, ts: Date.now() }]);
    } finally { setBusy(false); setPrompt(""); }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 h-[calc(100vh-220px)]">
      <Card className="flex flex-col p-4 gap-3 overflow-hidden">
        <div className="flex items-center gap-2">
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="google/gemini-3-flash-preview">Gemini 3 Flash (preview)</SelectItem>
              <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
              <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (vision)</SelectItem>
              <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
              <SelectItem value="openai/gpt-5-mini">GPT-5 mini</SelectItem>
            </SelectContent>
          </Select>
          <Select value={backend} onValueChange={(v: any) => setBackend(v)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hybrid">Hybryda (lokalnie + cloud)</SelectItem>
              <SelectItem value="local">Tylko ComfyUI (local)</SelectItem>
              <SelectItem value="cloud">Tylko Lovable AI</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="ml-auto">{messages.length} wiadomości</Badge>
        </div>

        <ScrollArea className="flex-1 rounded-md border border-border bg-background/40 p-3" ref={scrollRef as any}>
          <div className="space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-12">
                Wgraj plik (ZIP / obraz / PDF) i opisz co zrobić.<br />
                Np: <em>"usuń napisy, popraw światło, zretuszuj twarz"</em> – każda fraza trafi do kolejki zadań.
              </p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "ml-auto max-w-[80%] rounded-md bg-primary text-primary-foreground px-3 py-2" : "max-w-[85%] text-foreground"}>
                <div className="prose prose-sm prose-invert max-w-none"><ReactMarkdown>{m.text}</ReactMarkdown></div>
              </div>
            ))}
            {tasks.length > 0 && (
              <Card className="p-3 mt-4 bg-secondary/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">Kolejka zadań ({tasks.filter(t => t.status === "done").length}/{tasks.length})</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setTasks([])} disabled={busy}>
                      <Trash2 className="h-3 w-3 mr-1" />Wyczyść
                    </Button>
                    <Button size="sm" onClick={runQueue} disabled={busy || tasks.every(t => t.status !== "pending")}>
                      {busy ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                      Uruchom kolejkę
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  {tasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 text-xs p-2 rounded bg-background/50">
                      {t.status === "pending" && <Clock className="h-3 w-3 text-muted-foreground" />}
                      {t.status === "running" && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                      {t.status === "done" && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                      {t.status === "error" && <XCircle className="h-3 w-3 text-destructive" />}
                      <span className="flex-1 truncate">{t.label}</span>
                      {t.resultImage && (
                        <a href={t.resultImage} download={`${t.label}.png`} className="text-primary hover:underline flex items-center gap-1">
                          <Download className="h-3 w-3" />pobierz
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </ScrollArea>

        {attachments.length > 0 && (
          <div className="flex gap-2 flex-wrap p-2 bg-secondary/20 rounded">
            {attachments.map((a, i) => (
              <div key={i} className="relative group">
                {a.kind === "image" ? (
                  <img src={a.data} alt={a.name} className="h-14 w-14 object-cover rounded border border-border" />
                ) : (
                  <div className="h-14 w-14 flex items-center justify-center bg-background border border-border rounded text-[10px] text-center p-1">
                    <FileText className="h-4 w-4" />
                  </div>
                )}
                <button onClick={() => setAttachments((a) => a.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100">
                  <XCircle className="h-3 w-3" />
                </button>
                <span className="block text-[9px] text-muted-foreground truncate max-w-[56px]">{a.name}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <input ref={fileRef} type="file" hidden multiple accept="image/*,.zip,.pdf,.txt,.md,.json"
            onChange={(e) => onFiles(e.target.files)} />
          <Button variant="outline" size="icon" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2}
            placeholder="Opisz zadanie (np: usuń napisy, popraw światło, zretuszuj…)"
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendChat(); }} />
          <div className="flex flex-col gap-1">
            <Button onClick={sendChat} disabled={busy || (!prompt.trim() && attachments.length === 0)}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={addTaskFromPrompt} disabled={!prompt.trim()}>
              <Wand2 className="h-3 w-3 mr-1" />Kolejka
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3 overflow-y-auto">
        <h3 className="font-semibold text-sm">💡 Wskazówki</h3>
        <ul className="text-xs text-muted-foreground space-y-2">
          <li>• <b>ZIP</b> – auto rozpakowanie do 25 plików (obrazy + tekst)</li>
          <li>• <b>Wiele zadań</b> – rozdziel przecinkiem lub średnikiem, każde trafi do kolejki</li>
          <li>• <b>Vision</b> – obrazy automatycznie używają modelu Gemini 2.5 Flash</li>
          <li>• <b>Ctrl+Enter</b> – wyślij szybki czat</li>
        </ul>
        <div className="pt-3 border-t border-border">
          <p className="text-xs font-semibold mb-2">Szybkie akcje:</p>
          <div className="grid grid-cols-1 gap-1">
            {["Usuń napisy ze zdjęcia", "Popraw światło i ekspozycję", "Wyretuszuj twarz", "Usuń tło", "Wyostrz szczegóły"].map((q) => (
              <Button key={q} variant="outline" size="sm" className="justify-start text-xs h-7"
                onClick={() => setPrompt((p) => p ? `${p}, ${q.toLowerCase()}` : q)}>
                <Eraser className="h-3 w-3 mr-2" />{q}
              </Button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────── MASK EDITOR TAB ─────────────────────────────────────── */
function MaskEditorTab() {
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("usuń ten obiekt");
  const [brush, setBrush] = useState(40);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const maskRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  function loadImage(f: File) {
    const r = new FileReader();
    r.onload = () => { setImage(r.result as string); setResult(null); };
    r.readAsDataURL(f);
  }
  useEffect(() => {
    if (!image || !imgRef.current || !maskRef.current) return;
    const img = imgRef.current;
    img.onload = () => {
      const c = maskRef.current!;
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, c.width, c.height);
    };
  }, [image]);

  function getPt(e: React.PointerEvent) {
    const c = maskRef.current!; const rect = c.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (c.width / rect.width), y: (e.clientY - rect.top) * (c.height / rect.height) };
  }
  function start(e: React.PointerEvent) { drawing.current = true; paint(e); }
  function stop() { drawing.current = false; }
  function paint(e: React.PointerEvent) {
    if (!drawing.current || !maskRef.current) return;
    const ctx = maskRef.current.getContext("2d")!;
    const p = getPt(e);
    ctx.fillStyle = "rgba(232, 65, 24, 0.55)";
    ctx.beginPath(); ctx.arc(p.x, p.y, brush, 0, Math.PI * 2); ctx.fill();
  }
  function clearMask() { const c = maskRef.current; if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height); }

  async function runEdit() {
    if (!image) return;
    setBusy(true);
    try {
      // Compose annotated image: original + red mask overlay sent as single vision input
      const compose = document.createElement("canvas");
      const img = imgRef.current!; compose.width = img.naturalWidth; compose.height = img.naturalHeight;
      const cctx = compose.getContext("2d")!;
      cctx.drawImage(img, 0, 0);
      cctx.drawImage(maskRef.current!, 0, 0);
      const annotated = compose.toDataURL("image/png");

      const out = await invoke({
        mode: "image_generate",
        prompt: `Na obrazie zaznaczyłem obszar półprzezroczystą czerwoną maską. Zadanie: ${prompt}. Zwróć zmodyfikowane zdjęcie bez maski.`,
        attachments: [{ kind: "image", data: annotated, name: "annotated.png" }],
      });
      setResult(out.images?.[0] ?? null);
      if (!out.images?.[0]) toast.error("Model nie zwrócił obrazu");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
      <Card className="p-4">
        {!image ? (
          <label className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/30">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Kliknij aby wgrać zdjęcie</span>
            <input type="file" hidden accept="image/*" onChange={(e) => e.target.files && loadImage(e.target.files[0])} />
          </label>
        ) : (
          <div className="space-y-3">
            <div className="relative inline-block max-w-full">
              <img ref={imgRef} src={image} alt="" className="max-h-[60vh] block select-none pointer-events-none" />
              <canvas ref={maskRef}
                className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                onPointerDown={start} onPointerMove={paint} onPointerUp={stop} onPointerLeave={stop} />
            </div>
            {result && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Wynik:</p>
                <img src={result} alt="result" className="max-h-[40vh] rounded border border-primary/30" />
                <a href={result} download="edited.png" className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1">
                  <Download className="h-3 w-3" />Pobierz
                </a>
              </div>
            )}
          </div>
        )}
      </Card>
      <Card className="p-4 space-y-3 h-fit">
        <div>
          <Label className="text-xs">Rozmiar pędzla: {brush}px</Label>
          <Slider value={[brush]} onValueChange={(v) => setBrush(v[0])} min={5} max={120} />
        </div>
        <div>
          <Label className="text-xs">Co zrobić z zaznaczonym obszarem?</Label>
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} />
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={clearMask} disabled={!image}>
          <Eraser className="h-4 w-4 mr-2" />Wyczyść maskę
        </Button>
        <Button className="w-full" onClick={runEdit} disabled={!image || busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brush className="h-4 w-4 mr-2" />}
          Wykonaj edycję
        </Button>
        {image && (
          <Button variant="ghost" size="sm" className="w-full text-destructive" onClick={() => { setImage(null); setResult(null); }}>
            <Trash2 className="h-3 w-3 mr-1" />Zmień zdjęcie
          </Button>
        )}
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────── BOOK TAB ─────────────────────────────────────── */
function BookTab() {
  const [topic, setTopic] = useState("");
  const [chapters, setChapters] = useState(8);
  const [style, setStyle] = useState("popularnonaukowy");
  const [text, setText] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");

  async function generate() {
    if (!topic.trim()) return;
    setBusy(true); setText(""); setCover(null);
    try {
      setStep("LLM #1 (GPT-5 mini): pisze książkę…");
      const book = await invoke({ mode: "book_outline", topic, chapters, style });
      setText(book.text);
      setStep("LLM #2 (Gemini Image): generuje okładkę…");
      const cov = await invoke({ mode: "book_cover_prompt", topic, style });
      setCover(cov.images?.[0] ?? null);
      setStep("Gotowe ✓");
      toast.success("Książka wygenerowana");
    } catch (e: any) { toast.error(e.message); setStep(""); } finally { setBusy(false); }
  }

  function exportPDF() {
    if (!text) return;
    const doc = new jsPDF({ unit: "pt", format: "a5" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    if (cover) {
      try { doc.addImage(cover, "PNG", 0, 0, pageW, pageH); doc.addPage(); } catch {}
    }
    const lines = doc.splitTextToSize(text.replace(/[#*`]/g, ""), pageW - 60);
    let y = 40;
    doc.setFontSize(10);
    for (const line of lines) {
      if (y > pageH - 40) { doc.addPage(); y = 40; }
      doc.text(line, 30, y); y += 14;
    }
    doc.save(`${topic.slice(0, 30) || "ksiazka"}.pdf`);
  }

  function exportEPUB() {
    const blob = new Blob([
      `<?xml version="1.0" encoding="UTF-8"?>\n<html xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="UTF-8"/><title>${topic}</title></head><body>${text.replace(/\n/g, "<br/>")}</body></html>`,
    ], { type: "application/epub+zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${topic.slice(0, 30) || "ksiazka"}.epub`; a.click();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
      <Card className="p-4 space-y-3 h-fit">
        <h3 className="font-semibold text-sm flex items-center gap-2"><BookOpen className="h-4 w-4" />Tryb książka (multi-LLM)</h3>
        <div>
          <Label className="text-xs">Temat / tytuł</Label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="np. AI w fotografii 2026" />
        </div>
        <div>
          <Label className="text-xs">Liczba rozdziałów: {chapters}</Label>
          <Slider value={[chapters]} onValueChange={(v) => setChapters(v[0])} min={3} max={20} />
        </div>
        <div>
          <Label className="text-xs">Styl</Label>
          <Select value={style} onValueChange={setStyle}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="popularnonaukowy">Popularnonaukowy</SelectItem>
              <SelectItem value="techniczny">Techniczny</SelectItem>
              <SelectItem value="powieść">Powieść</SelectItem>
              <SelectItem value="poradnik">Poradnik / how-to</SelectItem>
              <SelectItem value="biografia">Biografia</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="w-full" onClick={generate} disabled={busy || !topic.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
          Generuj książkę + okładkę
        </Button>
        {step && <p className="text-xs text-muted-foreground">{step}</p>}
        {text && (
          <div className="space-y-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" className="w-full" onClick={exportPDF}>
              <Download className="h-3 w-3 mr-1" />Eksport PDF (A5)
            </Button>
            <Button variant="outline" size="sm" className="w-full" onClick={exportEPUB}>
              <Download className="h-3 w-3 mr-1" />Eksport EPUB
            </Button>
          </div>
        )}
      </Card>
      <Card className="p-4 max-h-[calc(100vh-220px)] overflow-y-auto">
        {cover && <img src={cover} alt="okładka" className="float-right ml-4 mb-2 w-40 rounded shadow-lg" />}
        {text ? (
          <article className="prose prose-sm prose-invert max-w-none"><ReactMarkdown>{text}</ReactMarkdown></article>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-20">
            Tutaj pojawi się treść książki i okładka.<br />Jeden LLM pisze tekst, drugi generuje okładkę.
          </p>
        )}
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────── AD CAMPAIGN TAB ─────────────────────────────────────── */
function AdCampaignTab() {
  const [product, setProduct] = useState("");
  const [variants, setVariants] = useState(4);
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState<"draft" | "standard" | "premium">("standard");
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [reference, setReference] = useState<Attach | null>(null);

  async function loadRef(f: File) {
    const data = await fileToDataURL(f);
    setReference({ kind: "image", data, name: f.name, mime: f.type });
  }

  async function generate() {
    if (!product.trim() && !reference) return;
    setBusy(true); setImages([]);
    try {
      const out = await invoke({
        mode: "ad_campaign",
        product: product || "produkt referencyjny",
        variants, size, quality,
        attachments: reference ? [reference] : [],
      });
      setImages(out.images ?? []);
      toast.success(`Wygenerowano ${out.images?.length ?? 0} wariantów`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      <Card className="p-4 space-y-3 h-fit">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Megaphone className="h-4 w-4" />Kampania reklamowa</h3>
        <div>
          <Label className="text-xs">Produkt (przedmiot + otoczenie)</Label>
          <Textarea value={product} onChange={(e) => setProduct(e.target.value)} rows={3}
            placeholder="np. luksusowy zegarek na drewnianym biurku, miękkie światło" />
        </div>
        <div>
          <Label className="text-xs">Zdjęcie referencyjne (opcjonalne)</Label>
          <Input type="file" accept="image/*" onChange={(e) => e.target.files && loadRef(e.target.files[0])} />
          {reference && <img src={reference.data} alt="" className="mt-2 h-20 w-20 object-cover rounded" />}
        </div>
        <div>
          <Label className="text-xs">Liczba wariantów: {variants}</Label>
          <Slider value={[variants]} onValueChange={(v) => setVariants(v[0])} min={1} max={8} />
        </div>
        <div>
          <Label className="text-xs">Rozmiar</Label>
          <Select value={size} onValueChange={setSize}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1024x1024">Kwadrat 1:1 (1024)</SelectItem>
              <SelectItem value="1080x1350">Portret IG 4:5</SelectItem>
              <SelectItem value="1080x1920">Story 9:16</SelectItem>
              <SelectItem value="1920x1080">Banner 16:9</SelectItem>
              <SelectItem value="1200x628">FB Ad</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Jakość</Label>
          <Select value={quality} onValueChange={(v: any) => setQuality(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft (szybka)</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="premium">Premium (foto-real)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="w-full" onClick={generate} disabled={busy || (!product.trim() && !reference)}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
          Generuj kampanię
        </Button>
      </Card>
      <Card className="p-4">
        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-20">
            Warianty reklamowe pojawią się tutaj.<br />Każdy wariant różni się kątem, światłem i tłem.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {images.map((src, i) => (
              <div key={i} className="group relative">
                <img src={src} alt={`v${i}`} className="w-full rounded-lg border border-border" />
                <a href={src} download={`ad-${i + 1}.png`}
                  className="absolute bottom-2 right-2 bg-primary text-primary-foreground rounded p-1 opacity-0 group-hover:opacity-100">
                  <Download className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────── MAIN PAGE ─────────────────────────────────────── */
export default function AIStudioChatPage() {
  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-primary" />AI Studio – Chat & Edycja
        </h1>
        <p className="text-sm text-muted-foreground">
          Czat z LLM, kolejka zadań na ZIP/zdjęciach, maskowanie obszarów, tryb książki (multi-LLM) i generator kampanii reklamowych.
        </p>
      </header>
      <Tabs defaultValue="chat" className="w-full">
        <TabsList>
          <TabsTrigger value="chat"><Send className="h-3 w-3 mr-1" />Czat + ZIP</TabsTrigger>
          <TabsTrigger value="mask"><Brush className="h-3 w-3 mr-1" />Maska / Inpaint</TabsTrigger>
          <TabsTrigger value="book"><BookOpen className="h-3 w-3 mr-1" />Książka (Multi-LLM)</TabsTrigger>
          <TabsTrigger value="ads"><Megaphone className="h-3 w-3 mr-1" />Kampanie reklamowe</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="mt-4"><ChatTab /></TabsContent>
        <TabsContent value="mask" className="mt-4"><MaskEditorTab /></TabsContent>
        <TabsContent value="book" className="mt-4"><BookTab /></TabsContent>
        <TabsContent value="ads" className="mt-4"><AdCampaignTab /></TabsContent>
      </Tabs>
    </div>
  );
}
