/**
 * AI Copilot tool registry
 * Pages register tools at mount-time. The copilot agent calls them by name.
 * All tools are JSON-in / JSON-out so they round-trip cleanly through the LLM.
 */
export type CopilotTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;          // JSON-schema (OpenAI tool-call format)
  handler: (args: any) => Promise<unknown> | unknown;
  scope?: string;                                // e.g. "workflow", "global"
};

type Listener = () => void;

class CopilotRegistry {
  private tools = new Map<string, CopilotTool>();
  private listeners = new Set<Listener>();

  register(tool: CopilotTool): () => void {
    this.tools.set(tool.name, tool);
    this.emit();
    return () => this.unregister(tool.name);
  }
  unregister(name: string) {
    if (this.tools.delete(name)) this.emit();
  }
  get(name: string) { return this.tools.get(name); }
  list(): CopilotTool[] { return Array.from(this.tools.values()); }
  asOpenAITools() {
    return this.list().map((t) => ({
      type: "function" as const,
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
  }
  subscribe(fn: Listener) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit() { this.listeners.forEach((l) => l()); }
}

export const copilotRegistry = new CopilotRegistry();
