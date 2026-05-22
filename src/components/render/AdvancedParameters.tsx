import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RenderSettings } from "./RenderControlPanel";
import {
  Palette, Scissors, Shirt, Mountain, Car, Sun, Camera, Grid3X3
} from "lucide-react";

const SKIN_TONES = [
  { id: "fair", name: "Fair", color: "#FFE0BD" },
  { id: "light", name: "Light", color: "#F1C27D" },
  { id: "natural", name: "Natural", color: "#E0AC69" },
  { id: "tan", name: "Tan", color: "#C68642" },
  { id: "brown", name: "Brown", color: "#8D5524" },
  { id: "dark", name: "Dark", color: "#5C3317" },
];

const HAIR_COLORS = [
  { id: "black", name: "Black", color: "#1a1a1a" },
  { id: "dark-brown", name: "Dark Brown", color: "#3B2219" },
  { id: "brown", name: "Brown", color: "#6B3A2A" },
  { id: "auburn", name: "Auburn", color: "#8B3A2A" },
  { id: "red", name: "Red", color: "#B33030" },
  { id: "blonde", name: "Blonde", color: "#D4A855" },
  { id: "platinum", name: "Platinum", color: "#E8E0D0" },
  { id: "white", name: "White", color: "#F0F0F0" },
  { id: "blue", name: "Blue", color: "#3060B0" },
  { id: "pink", name: "Pink", color: "#E06080" },
];

const CLOTHING_STYLES = [
  "casual", "formal", "streetwear", "business", "military",
  "sportswear", "elegant-dress", "medieval", "cyberpunk", "fantasy-armor",
];

const SCENE_TYPES = [
  "studio", "outdoor", "urban", "nature", "interior", "underwater",
  "space", "desert", "mountain", "beach", "forest", "night-city",
];

const OBJECTS = [
  { id: "none", name: "None" },
  { id: "sports-car", name: "Sports Car" },
  { id: "luxury-car", name: "Luxury Car" },
  { id: "suv", name: "SUV" },
  { id: "motorcycle", name: "Motorcycle" },
  { id: "modern-house", name: "Modern House" },
  { id: "villa", name: "Villa" },
  { id: "apartment", name: "Apartment" },
  { id: "mansion", name: "Mansion" },
  { id: "yacht", name: "Yacht" },
  { id: "helicopter", name: "Helicopter" },
];

const LIGHTING_OPTIONS = [
  "natural", "golden-hour", "blue-hour", "studio-soft", "studio-hard",
  "rim-light", "neon", "dramatic", "candlelight", "moonlight",
  "volumetric", "backlit",
];

const CAMERA_TYPES = [
  "standard", "wide-angle", "telephoto", "macro", "fisheye",
  "tilt-shift", "anamorphic", "drone", "gopro", "cinema",
];

interface AdvancedParametersProps {
  settings: RenderSettings;
  onUpdate: <K extends keyof RenderSettings>(key: K, value: RenderSettings[K]) => void;
}

function ColorSwatchSelector({
  label,
  icon: Icon,
  items,
  value,
  onChange,
}: {
  label: string;
  icon: React.ElementType;
  items: { id: string; name: string; color: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3 text-primary" /> {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            title={item.name}
            className={cn(
              "h-7 w-7 rounded-md border-2 transition-all",
              value === item.id
                ? "border-primary scale-110 ring-1 ring-primary/50"
                : "border-border hover:border-primary/40"
            )}
            style={{ backgroundColor: item.color }}
          />
        ))}
      </div>
    </div>
  );
}

function SelectField({
  label,
  icon: Icon,
  items,
  value,
  onChange,
}: {
  label: string;
  icon: React.ElementType;
  items: string[] | { id: string; name: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const normalized = items.map((i) =>
    typeof i === "string" ? { id: i, name: i.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) } : i
  );
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3 text-primary" /> {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 bg-card border-border text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {normalized.map((item) => (
            <SelectItem key={item.id} value={item.id} className="text-xs capitalize">
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function AdvancedParameters({ settings, onUpdate }: AdvancedParametersProps) {
  return (
    <div className="space-y-4 rounded-lg border border-primary/20 bg-card/50 p-3">
      <ColorSwatchSelector
        label="Skin Tone"
        icon={Palette}
        items={SKIN_TONES}
        value={settings.skinTone}
        onChange={(v) => onUpdate("skinTone", v)}
      />

      <ColorSwatchSelector
        label="Hair Color"
        icon={Scissors}
        items={HAIR_COLORS}
        value={settings.hairColor}
        onChange={(v) => onUpdate("hairColor", v)}
      />

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Clothing"
          icon={Shirt}
          items={CLOTHING_STYLES}
          value={settings.clothingStyle}
          onChange={(v) => onUpdate("clothingStyle", v)}
        />
        <SelectField
          label="Scene"
          icon={Mountain}
          items={SCENE_TYPES}
          value={settings.sceneType}
          onChange={(v) => onUpdate("sceneType", v)}
        />
        <SelectField
          label="Object"
          icon={Car}
          items={OBJECTS}
          value={settings.objectSelection}
          onChange={(v) => onUpdate("objectSelection", v)}
        />
        <SelectField
          label="Lighting"
          icon={Sun}
          items={LIGHTING_OPTIONS}
          value={settings.lighting}
          onChange={(v) => onUpdate("lighting", v)}
        />
        <SelectField
          label="Camera"
          icon={Camera}
          items={CAMERA_TYPES}
          value={settings.cameraType}
          onChange={(v) => onUpdate("cameraType", v)}
        />
      </div>
    </div>
  );
}
