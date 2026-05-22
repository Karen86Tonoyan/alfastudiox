import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    const { session_id } = await req.json();
    if (!session_id) throw new Error("Missing session_id");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ success: false, message: "Payment not completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify this payment belongs to this user
    if (session.metadata?.user_id !== user.id) {
      throw new Error("Payment does not belong to this user");
    }

    // Check if credits already added for this session (idempotency)
    const { data: existingTx } = await supabaseAdmin
      .from("credit_transactions")
      .select("id")
      .eq("description", `stripe:${session_id}`)
      .maybeSingle();

    if (existingTx) {
      return new Response(JSON.stringify({ success: true, already_processed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const isPromo = session.metadata?.is_promo === "true";
    const credits = 200;

    // Add credits
    await supabaseAdmin.from("credit_transactions").insert({
      user_id: user.id,
      type: isPromo ? "promo" : "purchase",
      amount: credits,
      description: `stripe:${session_id}`,
    });

    // Update balance
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("credit_balance")
      .eq("user_id", user.id)
      .single();

    await supabaseAdmin
      .from("profiles")
      .update({
        credit_balance: (profile?.credit_balance ?? 0) + credits,
        is_promo_customer: isPromo ? true : undefined,
      })
      .eq("user_id", user.id);

    // Track promo usage
    if (isPromo) {
      await supabaseAdmin.from("promo_tracker").insert({
        user_id: user.id,
        discount_amount: 150,
      });
    }

    return new Response(JSON.stringify({ success: true, credits_added: credits, is_promo: isPromo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
