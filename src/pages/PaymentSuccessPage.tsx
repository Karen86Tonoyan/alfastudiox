import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, XCircle, Coins } from "lucide-react";

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setStatus("error");
      return;
    }

    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { session_id: sessionId },
        });
        if (error) throw error;
        if (data?.success) {
          setResult(data);
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Weryfikacja płatności...</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-12 w-12 text-[hsl(var(--status-ok))] mx-auto" />
              <h2 className="text-xl font-bold text-foreground">Płatność zakończona!</h2>
              <div className="flex items-center justify-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold gold-text">
                  +{result?.credits_added ?? 200} kredytów
                </span>
              </div>
              {result?.is_promo && (
                <p className="text-sm text-primary font-medium">🎉 Skorzystałeś z oferty promocyjnej!</p>
              )}
              <Button onClick={() => navigate("/dashboard")} className="gold-gradient text-primary-foreground mt-4">
                Przejdź do Dashboard
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="text-xl font-bold text-foreground">Coś poszło nie tak</h2>
              <p className="text-sm text-muted-foreground">
                Nie udało się zweryfikować płatności. Skontaktuj się z supportem.
              </p>
              <Button variant="outline" onClick={() => navigate("/buy-credits")} className="mt-4">
                Spróbuj ponownie
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccessPage;
