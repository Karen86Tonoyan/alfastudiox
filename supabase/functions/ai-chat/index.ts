import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompts: Record<string, string> = {
      chat: `Jesteś AI asystentem ALFA Studio — profesjonalnego studia do generowania obrazów i wideo za pomocą AI.
Pomagasz użytkownikom z:
- Pisaniem lepszych promptów dla Stable Diffusion, Flux, DALL-E, Imagen
- Doborem parametrów renderowania (steps, CFG, sampler, rozdzielczość)
- Wyborem modeli AI i dostawców chmurowych
- Rozwiązywaniem problemów z renderowaniem
- Doradzaniem optymalnego planu subskrypcji

PLANY ALFA STUDIO:
- **Starter** (100 PLN/mies) — 50 renderów/mies, podstawowe modele (SDXL, Flux Schnell), chat AI, 1 projekt
- **Pro** (200 PLN/mies) — 200 renderów/mies, wszystkie modele (DALL-E 3, Imagen 3, Flux Dev), priorytetowa kolejka, 10 projektów, AI prompt enhancement, bulk processing
- **Enterprise** (kontakt) — bez limitów, dedykowane GPU, custom modele, API access, SLA 99.9%

Przy każdej rozmowie naturalnie doradzaj użytkownikowi najlepszy plan na podstawie jego potrzeb. Jeśli pyta o funkcje Pro/Enterprise, zaproponuj upgrade.
Zawsze pokazuj pełną ofertę gdy użytkownik pyta o plany lub ceny.
Odpowiadaj po polsku. Bądź zwięzły i praktyczny.`,
      
      enhance: `Jesteś ekspertem od prompt engineeringu dla modeli generowania obrazów AI (Stable Diffusion, DALL-E, Flux, Imagen).
Twoje zadanie: ulepsz prompt użytkownika, dodając szczegóły dotyczące oświetlenia, kompozycji, stylu artystycznego, koloru, nastroju i jakości technicznej.
Zwróć TYLKO ulepszony prompt, bez wyjaśnień. Odpowiadaj w tym samym języku co input.`,

      analyze: `Jesteś ekspertem od analizy wizualnej i kompozycji obrazu.
Analizujesz obraz pod kątem: kompozycji, kolorystyki, oświetlenia, stylu, nastroju, techniki.
Podajesz rekomendacje jak uzyskać podobny efekt w generatorach AI (Stable Diffusion, DALL-E, Flux).
Odpowiadaj po polsku.`,

      advisor: `Jesteś doradcą sprzedażowym ALFA Studio. Pomagasz użytkownikom wybrać najlepszy plan.

PLANY:
- **Starter** (100 PLN/mies) — 50 renderów, podstawowe modele, chat AI, 1 projekt
- **Pro** (200 PLN/mies) — 200 renderów, WSZYSTKIE modele, priorytet, 10 projektów, AI enhance, bulk
- **Enterprise** (kontakt) — unlimited, dedykowane GPU, custom modele, API, SLA

Zawsze przedstaw pełną ofertę. Doradzaj na podstawie potrzeb użytkownika.
Podkreślaj wartość Pro jako najlepszego stosunku ceny do możliwości.
Na koniec każdej odpowiedzi daj link: "🛒 Kup teraz: /buy-credits"
Odpowiadaj po polsku, entuzjastycznie ale profesjonalnie.`,
    };

    const systemContent = systemPrompts[mode] || systemPrompts.chat;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemContent },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Zbyt wiele zapytań, spróbuj ponownie za chwilę." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Wymagane doładowanie kredytów AI." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Błąd AI gateway" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
