import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, Zap, Crown, Rocket, Loader2, Settings } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

const plans = [
  {
    key: "starter" as const,
    name: "Starter",
    price: "100 PLN",
    period: "/mies",
    icon: Zap,
    features: [
      "50 renderów / miesiąc",
      "Podstawowe modele (SDXL, Flux Schnell)",
      "AI Chat asystent",
      "1 projekt",
      "Prompt Enhancement",
    ],
    color: "border-primary/30",
    buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90",
  },
  {
    key: "pro" as const,
    name: "Pro",
    price: "200 PLN",
    period: "/mies",
    icon: Crown,
    popular: true,
    features: [
      "200 renderów / miesiąc",
      "Wszystkie modele (DALL-E 3, Imagen 3, Flux Dev)",
      "Priorytetowa kolejka renderowania",
      "10 projektów",
      "AI Prompt Enhancement",
      "Bulk Processing",
      "Export wariantów",
      "Dedykowany support",
    ],
    color: "border-primary",
    buttonClass: "gold-gradient text-primary-foreground",
  },
  {
    key: "enterprise" as const,
    name: "Enterprise",
    price: "Kontakt",
    period: "",
    icon: Rocket,
    features: [
      "Bez limitów renderowania",
      "Dedykowane GPU",
      "Custom modele AI",
      "API Access",
      "SLA 99.9%",
      "Dedykowany Account Manager",
      "On-premise deployment",
    ],
    color: "border-muted-foreground/30",
    buttonClass: "bg-secondary text-foreground hover:bg-secondary/80",
  },
];

export default function SubscribePage() {
  const { subscribed, tier, subscriptionEnd, loading, subscribe, manageSubscription, check } = useSubscription();
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const handleSubscribe = async (planKey: "starter" | "pro") => {
    setSubscribing(planKey);
    try {
      await subscribe(planKey);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubscribing(null);
    }
  };

  const handleManage = async () => {
    try {
      await manageSubscription();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Plany ALFA Studio</h1>
        <p className="text-muted-foreground">Wybierz plan dopasowany do Twoich potrzeb</p>
        {subscribed && tier && (
          <div className="flex items-center justify-center gap-2">
            <Badge className="gold-gradient text-primary-foreground text-sm px-3 py-1">
              <Crown className="h-3.5 w-3.5 mr-1.5" />
              Aktywny plan: {tier === "starter" ? "Starter" : "Pro"}
            </Badge>
            {subscriptionEnd && (
              <span className="text-xs text-muted-foreground">
                do {new Date(subscriptionEnd).toLocaleDateString("pl-PL")}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isActive = subscribed && tier === plan.key;
          const Icon = plan.icon;

          return (
            <Card
              key={plan.key}
              className={`relative flex flex-col ${plan.color} ${isActive ? "ring-2 ring-primary gold-glow" : ""} ${plan.popular ? "scale-105 shadow-xl" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="gold-gradient text-primary-foreground text-[10px] px-3">
                    NAJPOPULARNIEJSZY
                  </Badge>
                </div>
              )}
              {isActive && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="outline" className="border-primary text-primary text-[10px]">
                    TWÓJ PLAN
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <Icon className="h-8 w-8 text-primary mx-auto mb-2" />
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {plan.key === "enterprise" ? (
                  <Button variant="outline" className="w-full" onClick={() => toast.info("Skontaktuj się: contact@alfastudio.pl")}>
                    Skontaktuj się
                  </Button>
                ) : isActive ? (
                  <Button variant="outline" className="w-full gap-2" onClick={handleManage}>
                    <Settings className="h-4 w-4" /> Zarządzaj subskrypcją
                  </Button>
                ) : (
                  <Button
                    className={`w-full gap-2 ${plan.buttonClass}`}
                    onClick={() => handleSubscribe(plan.key)}
                    disabled={!!subscribing || loading}
                  >
                    {subscribing === plan.key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    {subscribing === plan.key ? "Przekierowuję..." : "Wybierz plan"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={() => check()} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          Odśwież status subskrypcji
        </Button>
      </div>
    </div>
  );
}
