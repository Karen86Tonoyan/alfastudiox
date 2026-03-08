import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Key, ExternalLink, Shield, Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ProviderGuide {
  id: string;
  name: string;
  logo: string;
  url: string;
  dashboardUrl: string;
  pricing: string;
  freeCredits?: string;
  steps: string[];
  models: string[];
  category: "image" | "video" | "both";
}

const providers: ProviderGuide[] = [
  {
    id: "openai",
    name: "OpenAI",
    logo: "🤖",
    url: "https://platform.openai.com",
    dashboardUrl: "https://platform.openai.com/api-keys",
    pricing: "DALL-E 3: ~$0.04/obraz (1024×1024)",
    freeCredits: "$5 darmowych kredytów na start",
    steps: [
      "Wejdź na platform.openai.com i załóż konto",
      "Przejdź do Settings → API Keys",
      "Kliknij „Create new secret key"",
      "Skopiuj klucz (zaczyna się od sk-...)",
      "Wklej klucz w ALFA Studio → Providers → OpenAI"
    ],
    models: ["DALL-E 3", "DALL-E 2"],
    category: "image"
  },
  {
    id: "replicate",
    name: "Replicate",
    logo: "🔁",
    url: "https://replicate.com",
    dashboardUrl: "https://replicate.com/account/api-tokens",
    pricing: "Od $0.002/s GPU — zależy od modelu",
    freeCredits: "Darmowe predykcje na start",
    steps: [
      "Wejdź na replicate.com i zaloguj się przez GitHub",
      "Przejdź do Account → API Tokens",
      "Kliknij „Create token"",
      "Skopiuj token (zaczyna się od r8_...)",
      "Wklej w ALFA Studio → Providers → Replicate"
    ],
    models: ["SDXL", "Flux", "SVD", "AnimateDiff", "LivePortrait"],
    category: "both"
  },
  {
    id: "google",
    name: "Google AI (Gemini / Imagen)",
    logo: "🌐",
    url: "https://aistudio.google.com",
    dashboardUrl: "https://aistudio.google.com/app/apikey",
    pricing: "Gemini: darmowy tier / Imagen: od $0.02/obraz",
    freeCredits: "Darmowy tier Gemini API",
    steps: [
      "Wejdź na aistudio.google.com",
      "Zaloguj się kontem Google",
      "Kliknij „Get API key" → „Create API key"",
      "Wybierz projekt Google Cloud (lub utwórz nowy)",
      "Skopiuj klucz i wklej w ALFA Studio → Providers → Google"
    ],
    models: ["Gemini 2.5 Pro", "Gemini 2.5 Flash", "Imagen 3", "Veo 2"],
    category: "both"
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    logo: "🤗",
    url: "https://huggingface.co",
    dashboardUrl: "https://huggingface.co/settings/tokens",
    pricing: "Darmowe API (rate limit) / Pro od $9/mies.",
    freeCredits: "Darmowy dostęp z limitem zapytań",
    steps: [
      "Załóż konto na huggingface.co",
      "Przejdź do Settings → Access Tokens",
      "Kliknij „New token" — wybierz typ „Read"",
      "Skopiuj token (zaczyna się od hf_...)",
      "Wklej w ALFA Studio → Providers → Hugging Face"
    ],
    models: ["Stable Diffusion XL", "Flux.1", "SDXL Turbo"],
    category: "image"
  },
  {
    id: "kimi",
    name: "Kimi (Moonshot)",
    logo: "🌙",
    url: "https://platform.moonshot.cn",
    dashboardUrl: "https://platform.moonshot.cn/console/api-keys",
    pricing: "Video gen: od ~$0.05/wideo",
    steps: [
      "Wejdź na platform.moonshot.cn",
      "Załóż konto i zweryfikuj email",
      "Przejdź do Console → API Keys",
      "Wygeneruj nowy klucz",
      "Wklej w ALFA Studio → Providers → Kimi"
    ],
    models: ["Kimi Video", "Moonshot Vision"],
    category: "video"
  },
  {
    id: "qwen",
    name: "Qwen / Alibaba (DashScope)",
    logo: "☁️",
    url: "https://dashscope.console.aliyun.com",
    dashboardUrl: "https://dashscope.console.aliyun.com/apiKey",
    pricing: "Wanx: od ~$0.01/obraz",
    freeCredits: "Darmowe kredyty na start",
    steps: [
      "Wejdź na dashscope.console.aliyun.com",
      "Załóż konto Alibaba Cloud",
      "Przejdź do API Key Management",
      "Kliknij „Create API Key"",
      "Wklej w ALFA Studio → Providers → Qwen"
    ],
    models: ["Wanx Image", "Wanx Video", "Qwen-VL"],
    category: "both"
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    logo: "🧠",
    url: "https://console.anthropic.com",
    dashboardUrl: "https://console.anthropic.com/settings/keys",
    pricing: "Claude Sonnet: $3/$15 za 1M tokenów",
    freeCredits: "$5 darmowych kredytów",
    steps: [
      "Wejdź na console.anthropic.com",
      "Załóż konto i dodaj kartę płatniczą",
      "Przejdź do Settings → API Keys",
      "Kliknij „Create Key"",
      "Wklej w ALFA Studio → Providers → Anthropic"
    ],
    models: ["Claude 3.5 Sonnet (analiza obrazów)"],
    category: "image"
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Skopiowano URL");
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <CheckCircle2 className="h-3 w-3 text-status-ok" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </Button>
  );
}

export default function ApiKeysGuidePage() {
  return (
    <div className="h-full flex flex-col -m-4">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-bold gold-text flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          Przewodnik po kluczach API
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Jak i gdzie kupić klucze API do poszczególnych providerów
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4 max-w-3xl">
          {/* Security notice */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Bezpieczeństwo kluczy API</p>
              <p>Twoje klucze API są przechowywane <strong>wyłącznie w Twojej przeglądarce</strong> (localStorage). Nie są wysyłane na nasz serwer — trafiają bezpośrednio do dostawcy AI podczas renderowania.</p>
              <p>Każdy użytkownik kupuje i zarządza swoimi kluczami samodzielnie.</p>
            </div>
          </div>

          {/* Provider cards */}
          {providers.map((p) => (
            <section key={p.id} className="rounded-lg border border-primary/20 bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border-b border-primary/10">
                <span className="text-xl">{p.logo}</span>
                <div className="flex-1">
                  <h2 className="text-sm font-bold text-foreground">{p.name}</h2>
                  <p className="text-[10px] text-muted-foreground">{p.pricing}</p>
                </div>
                <Badge
                  variant="outline"
                  className="text-[9px] border-primary/30 text-primary"
                >
                  {p.category === "both" ? "Obraz + Wideo" : p.category === "video" ? "Wideo" : "Obraz"}
                </Badge>
                {p.freeCredits && (
                  <Badge variant="outline" className="text-[9px] border-status-ok/30 text-status-ok">
                    {p.freeCredits}
                  </Badge>
                )}
              </div>

              <div className="p-4 space-y-3">
                {/* Steps */}
                <ol className="space-y-1.5">
                  {p.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                      <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>

                {/* Links */}
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={p.dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] text-primary hover:text-primary/80 underline underline-offset-2 font-semibold"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Otwórz panel API Keys
                  </a>
                  <CopyButton text={p.dashboardUrl} />
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Strona główna
                  </a>
                </div>

                {/* Models */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] text-muted-foreground uppercase font-semibold">Modele:</span>
                  {p.models.map((m) => (
                    <Badge key={m} variant="outline" className="text-[8px] px-1.5 py-0 h-4 border-border text-foreground">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            </section>
          ))}

          {/* Local providers note */}
          <div className="rounded-lg border border-border bg-secondary/30 p-4 text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">🖥️ Lokalne integracje (bez klucza API)</p>
            <p><strong>Ollama</strong> — darmowe modele AI uruchamiane lokalnie. Pobierz z <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">ollama.com</a></p>
            <p><strong>ComfyUI</strong> — lokalny silnik renderowania z GPU. Nie wymaga klucza API — wystarczy połączenie WebSocket.</p>
            <p>Oba działają bez opłat na Twoim sprzęcie.</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
