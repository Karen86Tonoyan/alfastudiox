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
  version: "1.0.0",
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