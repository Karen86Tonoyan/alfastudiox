import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Upload, Image, ArrowLeftRight, X, GripVertical } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeSrc: string | null;
  afterSrc: string | null;
  onSelectBefore: (source: "upload" | "lastRender") => void;
  onUploadBefore: (file: File) => void;
  onClearBefore: () => void;
  lastRenderSrc: string | null;
  active: boolean;
  onToggle: (val: boolean) => void;
}

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  onSelectBefore,
  onUploadBefore,
  onClearBefore,
  lastRenderSrc,
  active,
  onToggle,
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current || !dragging.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [handleMove]);

  if (!active) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => onToggle(true)}
      >
        <ArrowLeftRight className="h-3.5 w-3.5" />
        Before / After
      </Button>
    );
  }

  const hasBoth = beforeSrc && afterSrc;

  return (
    <div className="flex flex-col gap-3 w-full h-full">
      {/* Controls bar */}
      <div className="flex items-center gap-2 px-1">
        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary gap-1">
          <ArrowLeftRight className="h-3 w-3" />
          Before / After
        </Badge>

        <div className="flex items-center gap-1 ml-auto">
          {lastRenderSrc && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] gap-1"
              onClick={() => onSelectBefore("lastRender")}
            >
              <Image className="h-3 w-3" />
              Poprzedni render
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] gap-1"
            onClick={() => uploadRef.current?.click()}
          >
            <Upload className="h-3 w-3" />
            Upload
          </Button>
          {beforeSrc && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] text-destructive"
              onClick={onClearBefore}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] text-muted-foreground"
            onClick={() => onToggle(false)}
          >
            Zamknij
          </Button>
        </div>

        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUploadBefore(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* Slider viewport */}
      {hasBoth ? (
        <div
          ref={containerRef}
          className="relative flex-1 rounded-lg border border-border overflow-hidden select-none cursor-col-resize"
          onMouseDown={() => { dragging.current = true; }}
          onTouchStart={() => { dragging.current = true; }}
        >
          {/* After (bottom layer, full) */}
          <img
            src={afterSrc}
            alt="After"
            className="absolute inset-0 w-full h-full object-contain"
            draggable={false}
          />

          {/* Before (top layer, clipped) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${position}%` }}
          >
            <img
              src={beforeSrc}
              alt="Before"
              className="absolute inset-0 w-full h-full object-contain"
              style={{ width: `${containerRef.current?.offsetWidth ?? 1000}px` }}
              draggable={false}
            />
          </div>

          {/* Divider line */}
          <div
            className="absolute top-0 bottom-0 z-10 flex items-center"
            style={{ left: `${position}%`, transform: "translateX(-50%)" }}
          >
            <div className="w-0.5 h-full bg-white/80 shadow-lg" />
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white/90 rounded-full p-1.5 shadow-xl">
              <GripVertical className="h-4 w-4 text-black/60" />
            </div>
          </div>

          {/* Labels */}
          <Badge className="absolute top-3 left-3 bg-black/60 text-white border-0 text-[10px] z-20">
            Before
          </Badge>
          <Badge className="absolute top-3 right-3 bg-black/60 text-white border-0 text-[10px] z-20">
            After
          </Badge>
        </div>
      ) : (
        <div className="flex-1 rounded-lg border border-dashed border-border flex items-center justify-center">
          <div className="text-center space-y-2 p-8">
            <ArrowLeftRight className="h-8 w-8 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {!beforeSrc
                ? "Wybierz obraz \"Before\" — upload lub poprzedni render"
                : "Wygeneruj nowy render, aby zobaczyć porównanie"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}