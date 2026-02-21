import { cn } from "@/lib/utils";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

interface MenuItem {
  label: string;
  shortcut?: string;
  danger?: boolean;
  hasSubmenu?: boolean;
}

const menuSections: (MenuItem | "divider")[][] = [
  [{ label: "Przemianować" }],
  [{ label: "Kopia", shortcut: "Ctrl+C" }, { label: "Duplikat", shortcut: "Ctrl+D" }],
  [{ label: "Szpilka" }, { label: "Objazd", shortcut: "Ctrl+B" }],
  [
    { label: "Konwertuj na podgraf" },
    { label: "Minimalizuj węzeł" },
    { label: "Zawalić się" },
    { label: "Zmień rozmiar" },
    { label: "Klon" },
    { label: "Informacje o węźle" },
  ],
  [{ label: "Kolor", hasSubmenu: true }, { label: "Kształt", hasSubmenu: true }],
  [
    { label: "Rozszerzenia" },
    { label: "Dodaj GetNode" },
    { label: "Dodaj SetNode" },
    { label: "Dodaj PreviewAsTextNode" },
    { label: "Konwertuj na węzeł grupy (przestarzałe)" },
  ],
  [{ label: "Usunąć", danger: true }],
];

export function WorkflowContextMenu({ x, y, onClose }: ContextMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 min-w-[220px] rounded-md border border-border bg-popover py-1 shadow-lg"
        style={{ left: x, top: y }}
      >
        {menuSections.map((section, si) => (
          <div key={si}>
            {si > 0 && <div className="my-1 h-px bg-border" />}
            {section.map((item, i) => {
              if (item === "divider") return null;
              return (
                <button
                  key={i}
                  onClick={onClose}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-secondary",
                    item.danger ? "text-destructive" : "text-foreground"
                  )}
                >
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.shortcut && (
                    <span className="text-[10px] text-muted-foreground">{item.shortcut}</span>
                  )}
                  {item.hasSubmenu && <span className="text-muted-foreground">›</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
