import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const TIERS = {
  starter: { product_id: "prod_U7lHDM4tn0ZvJ7", name: "Starter", price: 100 },
  pro: { product_id: "prod_U7lPTcXkn1M6a8", name: "Pro", price: 200 },
} as const;

type TierKey = keyof typeof TIERS | null;

export function useSubscription() {
  const [subscribed, setSubscribed] = useState(false);
  const [tier, setTier] = useState<TierKey>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setSubscribed(data.subscribed);
      if (data.product_id) {
        const found = Object.entries(TIERS).find(([, v]) => v.product_id === data.product_id);
        setTier(found ? (found[0] as TierKey) : null);
      } else {
        setTier(null);
      }
      setSubscriptionEnd(data.subscription_end);
    } catch (e) {
      console.error("check-subscription error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [check]);

  const subscribe = async (tierKey: "starter" | "pro") => {
    const { data, error } = await supabase.functions.invoke("create-subscription", {
      body: { tier: tierKey },
    });
    if (error) throw error;
    if (data?.url) window.open(data.url, "_blank");
  };

  const manageSubscription = async () => {
    const { data, error } = await supabase.functions.invoke("customer-portal");
    if (error) throw error;
    if (data?.url) window.open(data.url, "_blank");
  };

  return { subscribed, tier, subscriptionEnd, loading, check, subscribe, manageSubscription, TIERS };
}
