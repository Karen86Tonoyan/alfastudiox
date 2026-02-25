import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Sparkles, Users, Loader2, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
    } catch (err: any) {
      toast({ title: "Błąd", description: err.message || "Nie udało się utworzyć sesji płatności", variant: "destructive" });
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

        {/* Footer info */}
        <p className="text-center text-xs text-muted-foreground">
          Płatność obsługiwana przez Stripe. Bezpieczne szyfrowanie SSL.
        </p>
      </div>
    </div>
  );
};

export default BuyCreditsPage;
