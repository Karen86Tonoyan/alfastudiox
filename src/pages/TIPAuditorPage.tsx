import { useState, useMemo, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Settings, FileText, RefreshCw, Upload, FileUp, X, AlertCircle } from "lucide-react";
import { TIPDashboard } from "@/components/tip/TIPDashboard";
import { TIPConfigEditor } from "@/components/tip/TIPConfigEditor";
import { type TIPConfig, type TIPReport, DEFAULT_CONFIG, generateDemoReport, parseCSV, parseJSON } from "@/lib/tipAuditor";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function TIPAuditorPage() {
  const [config, setConfig] = useState<TIPConfig>(DEFAULT_CONFIG);
  const [reportKey, setReportKey] = useState(0);
  const [importedReport, setImportedReport] = useState<TIPReport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const report = useMemo(() => {
    if (importedReport) return importedReport;
    return generateDemoReport(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, reportKey, importedReport]);

  const handleFile = useCallback((file: File) => {
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text || text.trim().length === 0) {
        setImportError("Plik jest pusty");
        return;
      }
      try {
        let parsed: TIPReport;
        if (file.name.endsWith(".json")) {
          parsed = parseJSON(text, config);
        } else {
          parsed = parseCSV(text, config);
        }
        setImportedReport(parsed);
        toast.success(`Zaimportowano ${parsed.totalFrames} klatek z ${file.name}`, {
          description: `Postać: ${parsed.character} | Avg TIP: ${parsed.avgTip.toFixed(3)}`,
        });
      } catch (err: unknown) {
        setImportError(err instanceof Error ? err.message : "Błąd parsowania pliku");
        toast.error("Błąd importu", { description: err instanceof Error ? err.message : String(err) });
      }
    };
    reader.readAsText(file);
  }, [config]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".json"))) {
      handleFile(file);
    } else {
      toast.error("Obsługiwane formaty: .csv, .json");
    }
  }, [handleFile]);

  const clearImport = () => {
    setImportedReport(null);
    setImportError(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-sm font-bold">TIP Identity Auditor</h1>
          <p className="text-[10px] text-muted-foreground">External Identity QA Engine — wykrywanie dryfu tożsamości postaci</p>
        </div>
        <Badge variant="outline" className="ml-auto text-[9px] font-mono border-primary/30 text-primary">v1.1</Badge>

        {/* Source badge */}
        {importedReport && (
          <Badge variant="secondary" className="text-[9px] gap-1 font-mono">
            <FileUp className="h-3 w-3" />
            {importedReport.source.toUpperCase()}
            <button onClick={clearImport} className="ml-1 hover:text-foreground">
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        )}

        {/* Import button */}
        <input ref={fileInputRef} type="file" accept=".csv,.json" className="hidden" onChange={onFileChange} />
        <Button size="sm" variant="outline" className="text-xs gap-1.5 h-7"
          onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-3 w-3" /> Import CSV/JSON
        </Button>

        <Button size="sm" variant="outline" className="text-xs gap-1.5 h-7"
          onClick={() => { clearImport(); setReportKey(k => k + 1); }}>
          <RefreshCw className="h-3 w-3" /> Demo
        </Button>
      </div>

      {/* Drag & Drop overlay */}
      <div
        className="flex-1 overflow-hidden relative"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {dragOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary/50 rounded-lg m-2">
            <div className="text-center">
              <Upload className="h-10 w-10 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-primary">Upuść plik CSV lub JSON</p>
              <p className="text-[10px] text-muted-foreground mt-1">diagnostic_raw.csv / tip_report.json</p>
            </div>
          </div>
        )}

        <Tabs defaultValue="dashboard" className="h-full flex flex-col">
          <div className="border-b border-border px-4">
            <TabsList className="h-9 bg-transparent gap-1">
              <TabsTrigger value="dashboard" className="text-xs gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <FileText className="h-3 w-3" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="config" className="text-xs gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Settings className="h-3 w-3" /> Konfiguracja
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto">
            <TabsContent value="dashboard" className="p-4 mt-0">
              {importError && (
                <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Błąd importu</p>
                    <p className="text-[10px] opacity-80">{importError}</p>
                  </div>
                </div>
              )}
              <TIPDashboard report={report} config={config} />
            </TabsContent>
            <TabsContent value="config" className="p-4 mt-0 max-w-xl">
              <TIPConfigEditor config={config} onChange={setConfig} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
