import { useEffect } from "react";
import { copilotRegistry, type CopilotTool } from "./registry";

/** Register a tool while the component is mounted. */
export function useCopilotTool(tool: CopilotTool, deps: unknown[] = []) {
  useEffect(() => {
    const off = copilotRegistry.register(tool);
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useCopilotTools(tools: CopilotTool[], deps: unknown[] = []) {
  useEffect(() => {
    const offs = tools.map((t) => copilotRegistry.register(t));
    return () => offs.forEach((o) => o());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
