import { cn } from "@/lib/utils";

const POSES = [
  { id: "standing-front", label: "Stojąca – front", icon: "🧍" },
  { id: "standing-side", label: "Stojąca – 3/4", icon: "🧍‍♀️" },
  { id: "sitting", label: "Siedząca", icon: "🪑" },
  { id: "walking", label: "W ruchu", icon: "🚶" },
  { id: "closeup", label: "Close-up", icon: "👤" },
  { id: "action", label: "Dynamiczna", icon: "⚡" },
  { id: "editorial", label: "Editorial", icon: "📸" },
  { id: "casual", label: "Casual", icon: "😊" },
];

interface PoseSelectorProps {
  value: string;
  onChange: (pose: string) => void;
}

export function PoseSelector({ value, onChange }: PoseSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Poza</label>
      <div className="grid grid-cols-4 gap-1.5">
        {POSES.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-[10px] font-medium transition-all",
              value === p.id
                ? "border-primary/50 bg-primary/10 text-primary gold-glow"
                : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
            )}
          >
            <span className="text-lg">{p.icon}</span>
            <span className="leading-tight text-center">{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
