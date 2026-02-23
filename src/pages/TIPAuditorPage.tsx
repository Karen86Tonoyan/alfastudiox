import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Settings, FileText, RefreshCw } from "lucide-react";
import { TIPDashboard } from "@/components/tip/TIPDashboard";
import { TIPConfigEditor } from "@/components/tip/TIPConfigEditor";
import { type TIPConfig, DEFAULT_CONFIG, generateDemoReport } from "@/lib/tipAuditor";

export default function TIPAuditorPage() {
  const [config, setConfig] = useState<TIPConfig>(DEFAULT_CONFIG);
  const [reportKey, setReportKey] = useState(0);

  const report = useMemo(() => generateDemoReport(config), [config, reportKey]);

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
        <Button size="sm" variant="outline" className="text-xs gap-1.5 h-7"
          onClick={() => setReportKey(k => k + 1)}>
          <RefreshCw className="h-3 w-3" /> Nowy audyt (demo)
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
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
