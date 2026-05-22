/**
 * MCP Server (Streamable HTTP) — eksponuje narzędzia do sterowania dwoma
 * komputerami ComfyUI. Klienci MCP (np. Claude Desktop, edytory) mogą
 * używać tych narzędzi przez gateway HTTP.
 */
import { Hono } from "npm:hono@4.6.14";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@^0.10.0";

const app = new Hono();

const mcp = new McpServer({
  name: "alfa-dual-compute",
  version: "1.1.0",
});

async function comfyQueue(apiUrl: string, workflow: object) {
  const res = await fetch(`${apiUrl.replace(/\/$/, "")}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow }),
  });
  if (!res.ok) throw new Error(`ComfyUI ${res.status}: ${await res.text()}`);
  return await res.json();
}

async function comfyStats(apiUrl: string) {
  const res = await fetch(`${apiUrl.replace(/\/$/, "")}/system_stats`);
  if (!res.ok) throw new Error(`stats ${res.status}`);
  return await res.json();
}

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

async function aiChat(model: string, messages: Array<{ role: string; content: string }>, opts: { temperature?: number; max_tokens?: number } = {}) {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, ...opts }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

mcp.tool({
  name: "ping_node",
  description: "Sprawdza dostępność i statystyki node'a ComfyUI.",
  inputSchema: {
    type: "object",
    properties: { api_url: { type: "string" } },
    required: ["api_url"],
  },
  handler: async ({ api_url }: { api_url: string }) => {
    try {
      const stats = await comfyStats(api_url);
      return { content: [{ type: "text", text: JSON.stringify(stats) }] };
    } catch (e) {
      return { content: [{ type: "text", text: `ERROR: ${e instanceof Error ? e.message : String(e)}` }] };
    }
  },
});

mcp.tool({
  name: "ai_chat",
  description: "Wywołaj model AI (Gemini / GPT) przez Lovable AI Gateway. Zwraca treść odpowiedzi.",
  inputSchema: {
    type: "object",
    properties: {
      model: { type: "string", description: "np. google/gemini-2.5-pro, openai/gpt-5, google/gemini-3-flash-preview" },
      prompt: { type: "string" },
      system: { type: "string" },
      temperature: { type: "number" },
      max_tokens: { type: "number" },
    },
    required: ["model", "prompt"],
  },
  handler: async ({ model, prompt, system, temperature, max_tokens }: { model: string; prompt: string; system?: string; temperature?: number; max_tokens?: number }) => {
    try {
      const msgs = [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: prompt },
      ];
      const out = await aiChat(model, msgs, { temperature, max_tokens });
      return { content: [{ type: "text", text: out }] };
    } catch (e) {
      return { content: [{ type: "text", text: `ERROR: ${e instanceof Error ? e.message : String(e)}` }] };
    }
  },
});

mcp.tool({
  name: "ai_plan_dual_render",
  description: "Planista AI: na podstawie opisu zwraca podział pracy na PC_A i PC_B (JSON z task_a, task_b, reasoning).",
  inputSchema: {
    type: "object",
    properties: {
      goal: { type: "string", description: "Co chcemy wyrenderować / osiągnąć" },
      pc_a_caps: { type: "string", description: "Możliwości PC_A (np. VRAM, GPU)" },
      pc_b_caps: { type: "string", description: "Możliwości PC_B" },
      model: { type: "string", description: "Domyślnie google/gemini-3-flash-preview" },
    },
    required: ["goal"],
  },
  handler: async ({ goal, pc_a_caps, pc_b_caps, model }: { goal: string; pc_a_caps?: string; pc_b_caps?: string; model?: string }) => {
    try {
      const sys = `Jesteś planistą renderingu ComfyUI. Zwracaj WYŁĄCZNIE JSON: {"task_a":"...","task_b":"...","reasoning":"..."}. Dziel zadanie równolegle między dwa komputery.`;
      const usr = `Cel: ${goal}\nPC_A: ${pc_a_caps || "nieznane"}\nPC_B: ${pc_b_caps || "nieznane"}`;
      const out = await aiChat(model || "google/gemini-3-flash-preview", [
        { role: "system", content: sys },
        { role: "user", content: usr },
      ], { temperature: 0.3 });
      return { content: [{ type: "text", text: out }] };
    } catch (e) {
      return { content: [{ type: "text", text: `ERROR: ${e instanceof Error ? e.message : String(e)}` }] };
    }
  },
});

mcp.tool({
  name: "ai_list_models",
  description: "Lista wspieranych modeli AI w Lovable Gateway.",
  inputSchema: { type: "object", properties: {} },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify([
      "google/gemini-3-flash-preview",
      "google/gemini-2.5-pro",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-lite",
      "openai/gpt-5",
      "openai/gpt-5-mini",
      "openai/gpt-5-nano",
    ]) }],
  }),
});

mcp.tool({
  name: "dispatch_single",
  description: "Wyślij workflow ComfyUI do jednego komputera.",
  inputSchema: {
    type: "object",
    properties: {
      api_url: { type: "string" },
      workflow: { type: "object" },
    },
    required: ["api_url", "workflow"],
  },
  handler: async ({ api_url, workflow }: { api_url: string; workflow: object }) => {
    try {
      const out = await comfyQueue(api_url, workflow);
      return { content: [{ type: "text", text: JSON.stringify(out) }] };
    } catch (e) {
      return { content: [{ type: "text", text: `ERROR: ${e instanceof Error ? e.message : String(e)}` }] };
    }
  },
});

mcp.tool({
  name: "dispatch_dual",
  description: "Wyślij dwa workflow równolegle na dwa różne komputery ComfyUI (PC_A i PC_B).",
  inputSchema: {
    type: "object",
    properties: {
      pc_a_url: { type: "string" },
      pc_b_url: { type: "string" },
      workflow_a: { type: "object" },
      workflow_b: { type: "object" },
    },
    required: ["pc_a_url", "pc_b_url", "workflow_a", "workflow_b"],
  },
  handler: async ({ pc_a_url, pc_b_url, workflow_a, workflow_b }: {
    pc_a_url: string; pc_b_url: string; workflow_a: object; workflow_b: object;
  }) => {
    const [a, b] = await Promise.allSettled([
      comfyQueue(pc_a_url, workflow_a),
      comfyQueue(pc_b_url, workflow_b),
    ]);
    const text = JSON.stringify({
      pc_a: a.status === "fulfilled" ? a.value : { error: String(a.reason) },
      pc_b: b.status === "fulfilled" ? b.value : { error: String(b.reason) },
    });
    return { content: [{ type: "text", text }] };
  },
});

const transport = new StreamableHttpTransport();

app.all("/*", async (c) => transport.handleRequest(c.req.raw, mcp));

Deno.serve(app.fetch);