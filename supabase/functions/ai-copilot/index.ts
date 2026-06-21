// AI Copilot — tool-calling loop endpoint.
// Client provides: messages (OpenAI-compatible) + tools (function schemas) + context.
// Server forwards to Lovable AI Gateway, returns the assistant message verbatim
// (text + tool_calls). The client executes tools and POSTs again with tool results.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const SYSTEM = `Jesteś AI Copilot dla aplikacji ALFA Studio. Sterujesz całą aplikacją od początku do końca poprzez wywoływanie zarejestrowanych narzędzi (tool calls).

Zasady:
- Zawsze najpierw zaplanuj krótko (1-2 zdania), potem wywołuj narzędzia.
- Łącz wiele tool calls w jednym kroku, kiedy są niezależne.
- Jeśli użytkownik prosi o coś, czego nie potrafisz wykonać dostępnymi narzędziami, powiedz to wprost.
- Po wykonaniu zadania potwierdź krótko po polsku co zostało zrobione.
- Nawigację (zmiana strony) wykonuj narzędziem 'navigate'. Operacje na workflow narzędziami z prefiksem 'workflow.'.
- Nie wymyślaj nazw narzędzi — używaj tylko tych z aktualnej listy.`;

interface Body {
  messages: Array<Record<string, unknown>>;
  tools?: Array<{ type: "function"; function: { name: string; description: string; parameters: Record<string, unknown> } }>;
  context?: { route?: string; viewport?: string; user_id?: string };
  model?: string;
  temperature?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (!Array.isArray(body.messages)) {
    return new Response(JSON.stringify({ error: "messages[] required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const sysParts = [SYSTEM];
  if (body.context?.route) sysParts.push(`Aktualna strona: ${body.context.route}`);
  if (body.tools?.length) {
    sysParts.push(`Dostępne narzędzia (${body.tools.length}): ${body.tools.map((t) => t.function.name).join(", ")}`);
  }

  const payload: Record<string, unknown> = {
    model: body.model ?? "google/gemini-3-flash-preview",
    temperature: body.temperature ?? 0.2,
    messages: [
      { role: "system", content: sysParts.join("\n\n") },
      ...body.messages,
    ],
  };
  if (body.tools?.length) {
    payload.tools = body.tools;
    payload.tool_choice = "auto";
  }

  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    });
    const txt = await res.text();
    if (!res.ok) {
      return new Response(JSON.stringify({
        error: "AI gateway error",
        status: res.status,
        detail: txt.slice(0, 1000),
      }), {
        status: res.status === 429 ? 429 : res.status === 402 ? 402 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const json = JSON.parse(txt);
    const message = json?.choices?.[0]?.message ?? { role: "assistant", content: "" };
    return new Response(JSON.stringify({ ok: true, message, model: payload.model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
