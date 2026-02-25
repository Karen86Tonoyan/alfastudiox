import { useRef } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Upload, X } from "lucide-react";

interface ImageUploadZoneProps {
  label: string;
  icon: React.ElementType;
  file: File | null;
  onUpload: (f: File) => void;
  onClear: () => void;
}

export function ImageUploadZone({ label, icon: Icon, file, onUpload, onClear }: ImageUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = file ? URL.createObjectURL(file) : null;

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div
        onClick={() => !file && inputRef.current?.click()}
        className={cn(
          "relative group flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all cursor-pointer overflow-hidden",
          "w-full aspect-[3/4]",
          file
            ? "border-primary/40 bg-primary/5"
            : "border-border hover:border-primary/30 hover:bg-card"
        )}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="rounded-full bg-destructive p-2 text-destructive-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Badge className="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] border-0">
              {file.name.slice(0, 20)}
            </Badge>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 p-4">
            <div className="rounded-full bg-muted p-3">
              <Icon className="h-6 w-6 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">Kliknij aby dodać</span>
            <Upload className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
