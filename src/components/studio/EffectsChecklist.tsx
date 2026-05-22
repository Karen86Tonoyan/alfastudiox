import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Copy, Film, Camera } from "lucide-react";
import { toast } from "sonner";

interface Effect {
  id: string;
  name: string;
  snippet: string;
  category: string;
  type: "photo" | "video" | "both";
}

const EFFECTS: Effect[] = [
  // Video - Styl wizualny
  { id: "v-cinema", name: "Kinowy", snippet: "styl kinowy, kolorystyka filmowa, ziarnistość filmu, lens flare", category: "Styl wizualny", type: "video" },
  { id: "v-vhs", name: "VHS / Retro", snippet: "efekt taśmy VHS, zakłócenia, data w rogu, proporcje 4:3", category: "Styl wizualny", type: "video" },
  { id: "v-anime", name: "Anime", snippet: "styl anime, cel shading, dynamiczne linie, japońska animacja", category: "Styl wizualny", type: "video" },
  { id: "v-doc", name: "Dokument", snippet: "styl dokumentalny, ujęcia z ręki, naturalne światło, ziarniste", category: "Styl wizualny", type: "video" },
  { id: "v-clip", name: "Teledysk", snippet: "szybki montaż, neony, glitch, styl teledysku z lat 2000", category: "Styl wizualny", type: "video" },
  // Video - Kamera i ruch
  { id: "v-slow", name: "Slow motion", snippet: "slow motion, 120fps, dramatyczne spowolnienie", category: "Kamera i ruch", type: "video" },
  { id: "v-time", name: "Timelapse", snippet: "timelapse, przyspieszone chmury, szybki upływ czasu", category: "Kamera i ruch", type: "video" },
  { id: "v-zoom", name: "Najazd/odjazd", snippet: "powolny najazd kamery na twarz, dramatyczny odjazd", category: "Kamera i ruch", type: "video" },
  { id: "v-drone", name: "Dron", snippet: "ujęcie z drona, lot nad lasem, top down shot", category: "Kamera i ruch", type: "video" },
  { id: "v-fpp", name: "FPP", snippet: "ujęcie z pierwszej osoby, widok jakbyś tam był", category: "Kamera i ruch", type: "video" },
  // Pogoda i atmosfera (both)
  { id: "a-rain", name: "Deszcz", snippet: "ulewny deszcz, krople na obiektywie, kałuże, odbicia neonów", category: "Pogoda i atmosfera", type: "both" },
  { id: "a-snow", name: "Śnieg", snippet: "padający śnieg, zamieć, mroźna atmosfera", category: "Pogoda i atmosfera", type: "both" },
  { id: "a-fog", name: "Mgła", snippet: "gęsta mgła, tajemniczy klimat, promienie światła przez mgłę", category: "Pogoda i atmosfera", type: "both" },
  { id: "a-golden", name: "Złota godzina", snippet: "złota godzina, ciepłe światło zachodu, długie cienie", category: "Pogoda i atmosfera", type: "both" },
  { id: "a-neon", name: "Noc + neony", snippet: "noc, neonowe światła, cyberpunk, mokre ulice", category: "Pogoda i atmosfera", type: "both" },
  // Efekty specjalne (both)
  { id: "s-explode", name: "Eksplozja", snippet: "filmowa eksplozja w tle, slow motion, odłamki lecą", category: "Efekty specjalne", type: "both" },
  { id: "s-magic", name: "Magia", snippet: "magiczne cząsteczki wokół dłoni, poświata, iskry", category: "Efekty specjalne", type: "both" },
  { id: "s-glitch", name: "Glitch", snippet: "efekt glitch, cyfrowe zakłócenia, rozrywanie obrazu", category: "Efekty specjalne", type: "both" },
  { id: "s-smoke", name: "Dym", snippet: "kłęby dymu, dramatyczne podświetlenie, mrocznie", category: "Efekty specjalne", type: "both" },
  { id: "s-fire", name: "Ogień", snippet: "płomienie, iskry, ciepły blask na twarzy", category: "Efekty specjalne", type: "both" },
  // Photo - Styl artystyczny
  { id: "p-real", name: "Fotorealistyczne", snippet: "fotorealistyczne, 8k, ultra detaliczne, ostre, skóra z porami", category: "Styl artystyczny", type: "photo" },
  { id: "p-water", name: "Akwarela", snippet: "malarstwo akwarelowe, rozmyte krawędzie, plamy farby", category: "Styl artystyczny", type: "photo" },
  { id: "p-oil", name: "Olejne", snippet: "obraz olejny, grube pociągnięcia pędzla, styl van Gogh", category: "Styl artystyczny", type: "photo" },
  { id: "p-pixel", name: "Pixel Art", snippet: "pixel art, 16-bit, retro gra, styl SNES", category: "Styl artystyczny", type: "photo" },
  { id: "p-comic", name: "Komiks", snippet: "styl komiksowy, gruby kontur, kontrastowe kolory, Marvel", category: "Styl artystyczny", type: "photo" },
  { id: "p-clay", name: "Gliniane", snippet: "figurka z gliny, plastelina, styl Wallace & Gromit", category: "Styl artystyczny", type: "photo" },
  // Photo - Oświetlenie
  { id: "l-studio", name: "Studyjne", snippet: "studyjne oświetlenie, softbox, gładkie tło, portretowe", category: "Oświetlenie", type: "photo" },
  { id: "l-rembrandt", name: "Rembrandt", snippet: "oświetlenie Rembrandta, trójkąt światła na policzku, dramatyczne", category: "Oświetlenie", type: "photo" },
  { id: "l-neon", name: "Neonowe", snippet: "oświetlenie neonowe, róż i błękit, cyberpunk, ciemne tło", category: "Oświetlenie", type: "photo" },
  { id: "l-back", name: "Pod światło", snippet: "pod światło, konturowe, zachód słońca za postacią", category: "Oświetlenie", type: "photo" },
  { id: "l-candle", name: "Świece", snippet: "ciepłe światło świec, klimatyczne, mroczne cienie", category: "Oświetlenie", type: "photo" },
  // Photo - Obiektyw i kadr
  { id: "o-85", name: "Portret 85mm", snippet: "portret, obiektyw 85mm, mała głębia ostrości, bokeh", category: "Obiektyw i kadr", type: "photo" },
  { id: "o-wide", name: "Szeroki kąt", snippet: "obiektyw szerokokątny, 24mm, przerysowana perspektywa", category: "Obiektyw i kadr", type: "photo" },
  { id: "o-macro", name: "Makro", snippet: "makro, ekstremalne zbliżenie, widać detal", category: "Obiektyw i kadr", type: "photo" },
  { id: "o-frog", name: "Żabia perspektywa", snippet: "ujęcie z dołu, żabia perspektywa, monumentalnie", category: "Obiektyw i kadr", type: "photo" },
  { id: "o-bird", name: "Z lotu ptaka", snippet: "widok z lotu ptaka, top down, symetria", category: "Obiektyw i kadr", type: "photo" },
  // Photo - Kolorystyka
  { id: "c-bw", name: "Czarno-białe", snippet: "czarno-białe, wysoki kontrast, klasyczna fotografia", category: "Kolorystyka", type: "photo" },
  { id: "c-sepia", name: "Sepia", snippet: "efekt sepii, vintage, stara fotografia", category: "Kolorystyka", type: "photo" },
  { id: "c-pastel", name: "Pastelowe", snippet: "pastelowe kolory, miękkie, marzycielskie", category: "Kolorystyka", type: "photo" },
  { id: "c-desat", name: "Desaturacja", snippet: "desaturacja, zostaw tylko kolor czerwony, Sin City style", category: "Kolorystyka", type: "photo" },
  { id: "c-hdr", name: "HDR", snippet: "HDR, nasycone kolory, wysoki zakres dynamiki", category: "Kolorystyka", type: "photo" },
];

const MAX_SELECTED = 3;

interface EffectsChecklistProps {
  className?: string;
  onPromptGenerated?: (prompt: string) => void;
}

export function EffectsChecklist({ className, onPromptGenerated }: EffectsChecklistProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<"photo" | "video">("photo");

  const filtered = useMemo(
    () => EFFECTS.filter((e) => e.type === mode || e.type === "both"),
    [mode]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Effect[]>();
    filtered.forEach((e) => {
      const arr = map.get(e.category) || [];
      arr.push(e);
      map.set(e.category, arr);
    });
    return map;
  }, [filtered]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECTED) {
        toast.warning(`Max ${MAX_SELECTED} efekty — odznacz jeden`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const generatedPrompt = useMemo(() => {
    if (selected.length === 0) return "";
    const parts = selected
      .map((id) => EFFECTS.find((e) => e.id === id))
      .filter(Boolean)
      .map((e) => e!.snippet);
    const prefix = mode === "photo"
      ? "[Twój opis sceny], "
      : "[Opis sceny/akcji], ";
    const negative = "\nNegatywny: bez tekstu, bez rozmycia, bez zniekształconej twarzy, bez dodatkowych palców";
    return prefix + parts.join(", ") + negative;
  }, [selected, mode]);

  const copyPrompt = () => {
    if (!generatedPrompt) return;
    navigator.clipboard.writeText(generatedPrompt);
    toast.success("Prompt skopiowany!");
    onPromptGenerated?.(generatedPrompt);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Efekty ze ściągi
        </span>
        <Badge variant="outline" className="ml-auto text-[8px] px-1.5 py-0 border-primary/30 text-primary">
          {selected.length}/{MAX_SELECTED}
        </Badge>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1">
        <button
          onClick={() => { setMode("photo"); setSelected([]); }}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium transition-colors",
            mode === "photo"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Camera className="h-3 w-3" /> Zdjęcia
        </button>
        <button
          onClick={() => { setMode("video"); setSelected([]); }}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium transition-colors",
            mode === "video"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Film className="h-3 w-3" /> Wideo
        </button>
      </div>

      <ScrollArea className="max-h-[260px]">
        <div className="space-y-2 pr-2">
          {Array.from(grouped.entries()).map(([cat, effs]) => (
            <div key={cat}>
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {cat}
              </span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {effs.map((e) => {
                  const isChecked = selected.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      onClick={() => toggle(e.id)}
                      className={cn(
                        "flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] transition-all",
                        isChecked
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      )}
                    >
                      <Checkbox
                        checked={isChecked}
                        className="h-3 w-3 pointer-events-none"
                        tabIndex={-1}
                      />
                      {e.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Generated prompt */}
      {selected.length > 0 && (
        <div className="space-y-1.5">
          <div className="rounded-md border border-primary/20 bg-primary/5 p-2">
            <p className="text-[10px] font-mono text-foreground leading-relaxed break-words">
              {generatedPrompt}
            </p>
          </div>
          <Button size="sm" variant="outline" className="w-full h-7 text-[10px] gap-1" onClick={copyPrompt}>
            <Copy className="h-3 w-3" /> Kopiuj prompt
          </Button>
        </div>
      )}
    </div>
  );
}