import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Sparkles, Users, Loader2, ArrowRight, Calculator, Monitor, Cpu, Image, Video } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const BuyCreditsPage = () => {
  const [promoSlots, setPromoSlots] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingPromo, setCheckingPromo] = useState(true);

  useEffect(() => {
    const checkPromo = async () => {
      const { data } = await supabase.rpc("get_promo_count");
      setPromoSlots(Math.max(0, 50 - (data ?? 0)));
      setCheckingPromo(false);
    };
    checkPromo();
  }, []);

  const handleBuy = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: unknown) {
      toast({ title: "Błąd", description: err instanceof Error ? err.message : "Nie udało się utworzyć sesji płatności", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const promoAvailable = (promoSlots ?? 0) > 0;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold gold-text">Kup Kredyty</h1>
          <p className="text-muted-foreground">
            Doładuj konto i zacznij renderować w ALFA Studio
          </p>
        </div>

        {/* Promo Banner */}
        {!checkingPromo && promoAvailable && (
          <div className="rounded-lg gold-gradient p-[1px]">
            <div className="rounded-lg bg-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Promocja dla pierwszych 50 klientów!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Zostało <span className="text-primary font-bold">{promoSlots}</span> miejsc w cenie promocyjnej
                  </p>
                </div>
              </div>
              <Badge className="gold-gradient text-primary-foreground">
                <Users className="mr-1 h-3 w-3" />
                {promoSlots}/50
              </Badge>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Promo Card */}
          {promoAvailable && (
            <Card className="border-primary/30 gold-glow relative overflow-hidden">
              <div className="absolute top-0 right-0 gold-gradient px-3 py-1 rounded-bl-lg">
                <span className="text-xs font-bold text-primary-foreground">PROMO</span>
              </div>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-foreground">Pakiet Promocyjny</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold gold-text">$50</span>
                  <span className="text-sm text-muted-foreground line-through">$200</span>
                </div>
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary" />
                  <span className="text-sm text-foreground font-medium">200 kredytów</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  75% zniżki — tylko dla pierwszych 50 klientów
                </p>
                <Button
                  onClick={handleBuy}
                  disabled={loading}
                  className="w-full gold-gradient text-primary-foreground font-semibold"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  Kup teraz
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Standard Card */}
          <Card className={!promoAvailable ? "md:col-span-2 max-w-md mx-auto w-full" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-foreground">Pakiet Standard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-foreground">$200</span>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground font-medium">200 kredytów</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Standardowa cena za pełny pakiet renderowania
              </p>
              <Button
                onClick={handleBuy}
                disabled={loading}
                variant={promoAvailable ? "outline" : "default"}
                className={!promoAvailable ? "w-full gold-gradient text-primary-foreground font-semibold" : "w-full"}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Kup teraz
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ───── Cloud Rendering Pricing ───── */}
        <Separator className="my-4" />

        <CloudPricingSection />

        {/* Footer info */}
        <p className="text-center text-xs text-muted-foreground">
          Płatność obsługiwana przez Stripe. Bezpieczne szyfrowanie SSL.
        </p>
      </div>
    </div>
  );
};

/* ── Pricing data ── */

interface RenderTier {
  label: string;
  resolution: string;
  pixels: string;
  creditsPerRender: number;
  estimatedTime: string;
}

interface ProviderPricing {
  id: string;
  name: string;
  icon: string;
  costPerCredit: number; // USD
  tiers: RenderTier[];
  features: string[];
}

const PROVIDER_PRICING: ProviderPricing[] = [
  {
    id: "replicate",
    name: "Replicate",
    icon: "🔄",
    costPerCredit: 0.50,
    tiers: [
      { label: "Preview", resolution: "512×512", pixels: "0.26 Mpx", creditsPerRender: 1, estimatedTime: "~3s" },
      { label: "Standard", resolution: "1024×1024", pixels: "1.05 Mpx", creditsPerRender: 2, estimatedTime: "~8s" },
      { label: "HD", resolution: "1536×1536", pixels: "2.36 Mpx", creditsPerRender: 4, estimatedTime: "~18s" },
      { label: "Ultra HD", resolution: "2048×2048", pixels: "4.19 Mpx", creditsPerRender: 6, estimatedTime: "~35s" },
    ],
    features: ["SDXL", "Flux Dev/Schnell", "AnimateDiff", "SVD"],
  },
  {
    id: "runpod",
    name: "RunPod",
    icon: "🚀",
    costPerCredit: 0.45,
    tiers: [
      { label: "Preview", resolution: "512×512", pixels: "0.26 Mpx", creditsPerRender: 1, estimatedTime: "~2s" },
      { label: "Standard", resolution: "1024×1024", pixels: "1.05 Mpx", creditsPerRender: 2, estimatedTime: "~6s" },
      { label: "HD", resolution: "1536×1536", pixels: "2.36 Mpx", creditsPerRender: 3, estimatedTime: "~14s" },
      { label: "Ultra HD", resolution: "2048×2048", pixels: "4.19 Mpx", creditsPerRender: 5, estimatedTime: "~28s" },
    ],
    features: ["Serverless GPU", "A100/H100", "ComfyUI", "Custom Endpoints"],
  },
  {
    id: "openai",
    name: "OpenAI DALL-E 3",
    icon: "🧠",
    costPerCredit: 0.80,
    tiers: [
      { label: "Standard", resolution: "1024×1024", pixels: "1.05 Mpx", creditsPerRender: 3, estimatedTime: "~10s" },
      { label: "HD", resolution: "1792×1024", pixels: "1.83 Mpx", creditsPerRender: 5, estimatedTime: "~15s" },
    ],
    features: ["DALL-E 3", "HD Quality", "Variations", "GPT-4o Vision"],
  },
  {
    id: "google",
    name: "Google Imagen 3",
    icon: "💎",
    costPerCredit: 0.60,
    tiers: [
      { label: "Fast", resolution: "1024×1024", pixels: "1.05 Mpx", creditsPerRender: 2, estimatedTime: "~5s" },
      { label: "Quality", resolution: "1024×1024", pixels: "1.05 Mpx", creditsPerRender: 3, estimatedTime: "~12s" },
    ],
    features: ["Imagen 3", "Gemini Vision", "Veo 2 Video", "Multimodal"],
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    icon: "🤗",
    costPerCredit: 0.35,
    tiers: [
      { label: "Preview", resolution: "512×512", pixels: "0.26 Mpx", creditsPerRender: 1, estimatedTime: "~5s" },
      { label: "Standard", resolution: "1024×1024", pixels: "1.05 Mpx", creditsPerRender: 2, estimatedTime: "~12s" },
      { label: "HD", resolution: "1536×1536", pixels: "2.36 Mpx", creditsPerRender: 4, estimatedTime: "~25s" },
    ],
    features: ["10k+ Models", "SDXL", "Flux", "Free Tier dostępny"],
  },
];

const VIDEO_PRICING = [
  { label: "AnimateDiff 3s", credits: 8, time: "~45s", provider: "Replicate" },
  { label: "SVD 4s", credits: 10, time: "~60s", provider: "Replicate" },
  { label: "Veo 2 5s", credits: 12, time: "~30s", provider: "Google" },
  { label: "Kimi Video 5s", credits: 10, time: "~40s", provider: "Kimi" },
];

function CloudPricingSection() {
  const [selectedProvider, setSelectedProvider] = useState("replicate");
  const [renderCount, setRenderCount] = useState(10);

  const provider = PROVIDER_PRICING.find((p) => p.id === selectedProvider) ?? PROVIDER_PRICING[0];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Cennik Cloud Renderowania</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Nie masz karty graficznej? Renderuj w chmurze — płać tylko za to, czego używasz.
        </p>
      </div>

      {/* Intro info */}
      <Card className="border-primary/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Monitor className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Jak to działa?</p>
              <p>
                1 kredyt = 1 jednostka obliczeniowa. Koszt renderowania zależy od rozdzielczości,
                modelu i dostawcy chmurowego. Kupujesz pakiet <span className="text-primary font-semibold">200 kredytów</span>,
                a system automatycznie odlicza odpowiednią liczbę za każdy render.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">Dostawca:</span>
        <Select value={selectedProvider} onValueChange={setSelectedProvider}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVIDER_PRICING.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.icon} {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Image render pricing table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Image className="h-4 w-4 text-primary" />
            {provider.icon} {provider.name} — Generowanie Obrazów
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-4 text-muted-foreground font-medium">Tier</th>
                  <th className="pb-2 pr-4 text-muted-foreground font-medium">Rozdzielczość</th>
                  <th className="pb-2 pr-4 text-muted-foreground font-medium">Kredyty</th>
                  <th className="pb-2 pr-4 text-muted-foreground font-medium">Koszt USD</th>
                  <th className="pb-2 text-muted-foreground font-medium">Czas</th>
                </tr>
              </thead>
              <tbody>
                {provider.tiers.map((tier) => (
                  <tr key={tier.label} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium text-foreground">{tier.label}</td>
                    <td className="py-2 pr-4 text-muted-foreground font-mono text-xs">{tier.resolution}</td>
                    <td className="py-2 pr-4">
                      <Badge variant="secondary" className="text-xs">{tier.creditsPerRender} kr</Badge>
                    </td>
                    <td className="py-2 pr-4 text-primary font-semibold">
                      ${(tier.creditsPerRender * provider.costPerCredit).toFixed(2)}
                    </td>
                    <td className="py-2 text-muted-foreground text-xs">{tier.estimatedTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Features */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {provider.features.map((f) => (
              <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calculator */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Kalkulator — ile renderów z paczki 200 kredytów?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {provider.tiers.map((tier) => {
              const rendersPerPack = Math.floor(200 / tier.creditsPerRender);
              return (
                <div key={tier.label} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                  <div>
                    <span className="text-sm font-medium text-foreground">{tier.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{tier.resolution}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary">{rendersPerPack}</span>
                    <span className="text-xs text-muted-foreground ml-1">renderów</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Video pricing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            Generowanie Wideo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-4 text-muted-foreground font-medium">Typ</th>
                  <th className="pb-2 pr-4 text-muted-foreground font-medium">Dostawca</th>
                  <th className="pb-2 pr-4 text-muted-foreground font-medium">Kredyty</th>
                  <th className="pb-2 text-muted-foreground font-medium">Czas</th>
                </tr>
              </thead>
              <tbody>
                {VIDEO_PRICING.map((v) => (
                  <tr key={v.label} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium text-foreground">{v.label}</td>
                    <td className="py-2 pr-4 text-muted-foreground text-xs">{v.provider}</td>
                    <td className="py-2 pr-4">
                      <Badge variant="secondary" className="text-xs">{v.credits} kr</Badge>
                    </td>
                    <td className="py-2 text-muted-foreground text-xs">{v.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Comparison: GPU vs Cloud */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            Lokalna GPU vs Cloud — porównanie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-4 text-muted-foreground font-medium" />
                  <th className="pb-2 pr-4 text-muted-foreground font-medium">Lokalna GPU</th>
                  <th className="pb-2 text-muted-foreground font-medium">Cloud Rendering</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">Koszt wejścia</td>
                  <td className="py-2 pr-4 text-muted-foreground">$800–$2000+ (GPU)</td>
                  <td className="py-2 text-primary font-medium">$50–$200 (kredyty)</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">Koszt per render</td>
                  <td className="py-2 pr-4 text-muted-foreground">~$0.01 (prąd)</td>
                  <td className="py-2 text-muted-foreground">$0.35–$4.00</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">Konfiguracja</td>
                  <td className="py-2 pr-4 text-muted-foreground">Wymaga instalacji</td>
                  <td className="py-2 text-primary font-medium">Zero konfiguracji</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">Dostępność</td>
                  <td className="py-2 pr-4 text-muted-foreground">Tylko na PC z GPU</td>
                  <td className="py-2 text-primary font-medium">Dowolne urządzenie</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Najlepsze dla</td>
                  <td className="py-2 pr-4 text-muted-foreground">Duże wolumeny</td>
                  <td className="py-2 text-primary font-medium">Okazjonalny użytek</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BuyCreditsPage;
