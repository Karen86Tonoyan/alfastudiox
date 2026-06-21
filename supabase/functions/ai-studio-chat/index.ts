// AI Studio Chat – hybrid (local fallback handled client-side; cloud via Lovable AI)
// Modes: chat | vision | image_generate | book_outline | book_cover_prompt | ad_campaign

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

type Attach = { kind: "image" | "text"; data: string; name?: string; mime?: string };

interface Body {
  mode: "chat" | "vision" | "image_generate" | "book_outline" | "book_cover_prompt" | "ad_campaign";
  model?: string;
  prompt?: string;
  system?: string;
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  attachments?: Attach[];
  // ad_campaign
  product?: string;
  variants?: number;
  size?: string;
  quality?: "draft" | "standard" | "premium";
  // book
  topic?: string;
  chapters?: number;
  style?: string;
}

const pickModel = (mode: Body["mode"], fallback?: string) => {
  if (fallback) return fallback;
  if (mode === "image_generate") return "google/gemini-2.5-flash-image";
  if (mode === "vision") return "google/gemini-2.5-flash";
  if (mode === "book_outline") return "openai/gpt-5-mini";
  return "google/gemini-3-flash-preview";
};

async function callGateway(payload: Record<string, unknown>, key: string) {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Response(JSON.stringify({ error: "AI gateway error", status: res.status, detail: text.slice(0, 800) }), {
      status: res.status === 429 ? 429 : res.status === 402 ? 402 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function buildVisionMessages(prompt: string, attachments: Attach[] = [], system?: string) {
  const content: any[] = [{ type: "text", text: prompt }];
  for (const a of attachments) {
    if (a.kind === "image") {
      content.push({ type: "image_url", image_url: { url: a.data } });
    } else if (a.kind === "text") {
      content.push({ type: "text", text: `\n\n=== Plik: ${a.name ?? "file"} ===\n${a.data.slice(0, 6000)}` });
    }
  }
  const messages: any[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content });
  return messages;
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

  try {
    const mode = body.mode ?? "chat";
    const model = pickModel(mode, body.model);

    if (mode === "image_generate") {
      const data = await callGateway({
        model,
        messages: [{ role: "user", content: body.prompt ?? "" }],
        modalities: ["image", "text"],
      }, key);
      const msg = data?.choices?.[0]?.message;
      const images: string[] = (msg?.images ?? []).map((i: any) => i?.image_url?.url).filter(Boolean);
      return new Response(JSON.stringify({ ok: true, model, images, text: msg?.content ?? "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "ad_campaign") {
      const n = Math.max(1, Math.min(8, body.variants ?? 4));
      const quality = body.quality ?? "standard";
      const size = body.size ?? "1024x1024";
      const product = (body.product ?? body.prompt ?? "produkt").trim();
      const stylePrompt = `Komercyjna fotografia reklamowa, ${quality === "premium" ? "ultra-detailed, octane render," : ""} produkt: ${product}. Czyste tło, profesjonalne studyjne światło, kompozycja reklamowa, miejsce na tekst. Rozmiar docelowy: ${size}.`;
      const visualModel = "google/gemini-2.5-flash-image";
      const variants = await Promise.all(
        Array.from({ length: n }).map((_, i) => callGateway({
          model: visualModel,
          messages: [{ role: "user", content: `${stylePrompt}\n\nWariant #${i + 1}: zmień kąt, oświetlenie lub tło.` }],
          modalities: ["image", "text"],
        }, key).catch((e) => ({ error: e instanceof Response ? "gateway" : String(e) })))
      );
      const images = variants.flatMap((v: any) => (v?.choices?.[0]?.message?.images ?? []).map((i: any) => i?.image_url?.url).filter(Boolean));
      return new Response(JSON.stringify({ ok: true, model: visualModel, images, variants: n, size, quality }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "book_outline") {
      const chapters = Math.max(3, Math.min(30, body.chapters ?? 8));
      const sys = `Jesteś pisarzem. Wygeneruj kompletną książkę w Markdown: tytuł (#), spis treści, ${chapters} rozdziałów (## Rozdział N: Tytuł) z 3-5 akapitów każdy. Język polski. Styl: ${body.style ?? "popularnonaukowy"}.`;
      const data = await callGateway({
        model,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Temat: ${body.topic ?? body.prompt ?? "Nowa książka"}` },
        ],
      }, key);
      return new Response(JSON.stringify({ ok: true, model, text: data?.choices?.[0]?.message?.content ?? "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "book_cover_prompt") {
      const data = await callGateway({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: `Wygeneruj okładkę książki w formacie portretowym. Temat: ${body.topic ?? body.prompt}. Styl: ${body.style ?? "eleganckie wydanie, typografia, atmosfera kinowa"}.` }],
        modalities: ["image", "text"],
      }, key);
      const images: string[] = (data?.choices?.[0]?.message?.images ?? []).map((i: any) => i?.image_url?.url).filter(Boolean);
      return new Response(JSON.stringify({ ok: true, images }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // chat / vision
    const messages = body.attachments?.length || body.prompt
      ? buildVisionMessages(body.prompt ?? "", body.attachments ?? [], body.system)
      : (body.messages ?? []);
    const data = await callGateway({ model, messages }, key);
    const text = data?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ ok: true, model, text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
