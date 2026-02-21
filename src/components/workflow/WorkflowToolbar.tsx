import { Trash2, Info, Circle, Maximize2, Redo2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WorkflowToolbar() {
  return (
    <div className="absolute left-4 top-4 z-10 flex items-center gap-1 rounded-lg border border-border bg-card/90 px-2 py-1 backdrop-blur-sm">
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
        <Info className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
        <Circle className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
        <Redo2 className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
        <MoreHorizontal className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
