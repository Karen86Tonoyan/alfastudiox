import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Jesteś asystentem ALFA Studio sterującym dwoma komputerami ComfyUI (PC_A i PC_B) jednocześnie.
Twoje zadania:
- proponować podział zadań pomiędzy dwa komputery (równolegle gdy to możliwe)
- używać narzędzia dispatch_dual aby zlecić rendering na oba PC równolegle
- używać narzędzia dispatch_single aby zlecić zadanie na jeden wybrany PC
- używać get_cluster_status do sprawdzenia VRAM, temperatury i kolejki
Odpowiadaj po polsku, krótko i konkretnie.`;

const tools = [
  {
    type: "function",
    function: {
      name: "get_cluster_status",
      description: "Pobierz status obu komputerów (VRAM, temperatura, kolejka).",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "dispatch_dual",
      description: "Uruchom dwa zadania równolegle: jedno na PC_A, drugie na PC_B.",
      parameters: {
        type: "object",
        properties: {
          task_a: { type: "string", description: "Opis / prompt zadania dla PC_A" },
          task_b: { type: "string", description: "Opis / prompt zadania dla PC_B" },
          required_vram_gb: { type: "number" },
        },
        required: ["task_a", "task_b"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "dispatch_single",
      description: "Uruchom jedno zadanie na wybranym komputerze.",
      parameters: {
        type: "object",
        properties: {
          target: { type: "string", enum: ["PC_A", "PC_B", "auto"] },
          task: { type: "string" },
          required_vram_gb: { type: "number" },
        },
        required: ["target", "task"],
        additionalProperties: false,
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, model } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const selectedModel = (typeof model === "string" && model) || "google/gemini-3-flash-preview";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [{ role: "system", content: SYSTEM }, ...messages],
        tools,
        stream: true,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Przekroczono limit zapytań. Spróbuj ponownie później." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "Brak kredytów w Lovable AI. Doładuj w Settings → Usage." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("dual-ai-orchestrator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});