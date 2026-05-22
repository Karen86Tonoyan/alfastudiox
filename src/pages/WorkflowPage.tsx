import { useEffect, useMemo, useState } from "react";
import { ExternalLink, PlugZap, RefreshCcw, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { comfyApi } from "@/lib/comfyApi";
import { useComfyUI } from "@/hooks/useComfyUI";

function getStatusLabel(status: string) {
  switch (status) {
    case "connected":
      return "Połączony";
    case "connecting":
      return "Łączenie";
    case "error":
      return "Błąd";
    default:
      return "Rozłączony";
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "connected":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "connecting":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "error":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border-border bg-secondary text-muted-foreground";
  }
}

export default function WorkflowPage() {
  const { status, connect, disconnect } = useComfyUI();
  const [serverUrl, setServerUrl] = useState(comfyApi.baseUrl || "127.0.0.1:8000");
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    void connect(serverUrl);
  }, [connect, serverUrl]);

  useEffect(() => {
    const syncUrl = () => setServerUrl(comfyApi.baseUrl || "127.0.0.1:8000");
    const unsubStatus = comfyApi.on("status", syncUrl);
    syncUrl();
    return () => {
      unsubStatus();
    };
  }, []);

  const iframeUrl = useMemo(() => {
    const raw = serverUrl.trim() || "127.0.0.1:8000";
    return raw.startsWith("http://") || raw.startsWith("https://") ? raw : `http://${raw}`;
  }, [serverUrl]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="border-b border-border bg-card/70 px-4 py-3 backdrop-blur">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-lg font-semibold text-foreground">ComfyUI Native Workflow</div>
            <div className="text-sm text-muted-foreground">
              Studio osadza prawdziwy interfejs ComfyUI 1:1. Tutaj piszesz prompt, zmieniasz modele i pracujesz na natywnym graphie.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(status)}`}>
              {getStatusLabel(status)}
            </div>

            <input
              value={serverUrl}
              onChange={(event) => setServerUrl(event.target.value)}
              className="h-9 min-w-[220px] rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none ring-0 placeholder:text-muted-foreground"
              placeholder="127.0.0.1:8000"
            />

            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                comfyApi.baseUrl = serverUrl;
                void connect(serverUrl);
                setIframeKey((value) => value + 1);
              }}
            >
              <PlugZap className="h-4 w-4" />
              Połącz
            </Button>

            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={() => setIframeKey((value) => value + 1)}
            >
              <RefreshCcw className="h-4 w-4" />
              Odśwież UI
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={disconnect}
            >
              <Unplug className="h-4 w-4" />
              Rozłącz
            </Button>

            <Button
              asChild
              size="sm"
              variant="outline"
              className="gap-1.5"
            >
              <a href={iframeUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Otwórz osobno
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-3">
        <div className="h-full overflow-hidden rounded-xl border border-border bg-black/20 shadow-2xl">
          <iframe
            key={`${iframeUrl}-${iframeKey}`}
            src={iframeUrl}
            title="Embedded ComfyUI"
            className="h-full w-full border-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
}
