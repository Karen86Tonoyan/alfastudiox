import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Play, FileSpreadsheet, Eye, Download, Plus, Trash2, Layers } from "lucide-react";

interface TemplateVariable {
  id: string;
  name: string;
  type: "text" | "image" | "visibility" | "color";
  defaultValue: string;
}

interface DataRow {
  [key: string]: string;
}

interface Template {
  id: string;
  name: string;
  variables: TemplateVariable[];
  basePrompt: string;
  exportFormat: string;
  exportSizes: string[];
}

const DEMO_TEMPLATES: Template[] = [
  {
    id: "packshot",
    name: "Product Packshot",
    variables: [
      { id: "v1", name: "product_name", type: "text", defaultValue: "Product Name" },
      { id: "v2", name: "product_image", type: "image", defaultValue: "" },
      { id: "v3", name: "price", type: "text", defaultValue: "$99" },
      { id: "v4", name: "show_badge", type: "visibility", defaultValue: "true" },
      { id: "v5", name: "bg_color", type: "color", defaultValue: "#ffffff" },
    ],
    basePrompt: "Professional product photo of {{product_name}}, clean white background, studio lighting",
    exportFormat: "png",
    exportSizes: ["1080x1080", "1200x628", "1080x1920"],
  },
  {
    id: "social-post",
    name: "Social Media Post",
    variables: [
      { id: "v1", name: "headline", type: "text", defaultValue: "Breaking News" },
      { id: "v2", name: "subtitle", type: "text", defaultValue: "Read more..." },
      { id: "v3", name: "background", type: "image", defaultValue: "" },
      { id: "v4", name: "brand_color", type: "color", defaultValue: "#6366f1" },
    ],
    basePrompt: "Social media graphic with text overlay: {{headline}}",
    exportFormat: "jpg",
    exportSizes: ["1080x1080", "1080x1920", "1200x628"],
  },
  {
    id: "thumbnail",
    name: "YouTube Thumbnail",
    variables: [
      { id: "v1", name: "title", type: "text", defaultValue: "VIDEO TITLE" },
      { id: "v2", name: "face_image", type: "image", defaultValue: "" },
      { id: "v3", name: "emoji", type: "text", defaultValue: "😱" },
      { id: "v4", name: "accent_color", type: "color", defaultValue: "#ef4444" },
    ],
    basePrompt: "Eye-catching YouTube thumbnail: {{title}}, dramatic expression",
    exportFormat: "jpg",
    exportSizes: ["1280x720"],
  },
];

export function TemplateEngine() {
  const [templates] = useState<Template[]>(DEMO_TEMPLATES);
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [dataRows, setDataRows] = useState<DataRow[]>([]);
  const [csvText, setCsvText] = useState("");
  const [previewRow, setPreviewRow] = useState<number>(0);

  const parseCSV = () => {
    if (!csvText.trim() || !activeTemplate) return;
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) return;
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const row: DataRow = {};
      headers.forEach((h, i) => { row[h] = values[i] || ""; });
      return row;
    });
    setDataRows(rows);
  };

  const addEmptyRow = () => {
    if (!activeTemplate) return;
    const row: DataRow = {};
    activeTemplate.variables.forEach((v) => { row[v.name] = v.defaultValue; });
    setDataRows([...dataRows, row]);
  };

  const updateCell = (rowIdx: number, key: string, value: string) => {
    setDataRows(dataRows.map((r, i) => i === rowIdx ? { ...r, [key]: value } : r));
  };

  const removeRow = (idx: number) => setDataRows(dataRows.filter((_, i) => i !== idx));

  return (
    <div className="grid grid-cols-[260px_1fr] gap-4 h-full">
      {/* Left: Template selector */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Szablony</h4>
        {templates.map((t) => (
          <Card
            key={t.id}
            onClick={() => { setActiveTemplate(t); setDataRows([]); setCsvText(""); }}
            className={`p-3 cursor-pointer transition-all ${activeTemplate?.id === t.id ? "border-primary/50 bg-primary/5" : "hover:border-primary/20"}`}
          >
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary/60" />
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-[10px] text-muted-foreground">{t.variables.length} zmiennych • {t.exportSizes.length} rozmiarów</p>
              </div>
            </div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {t.variables.map((v) => (
                <Badge key={v.id} variant="secondary" className="text-[9px]">
                  {v.type === "text" ? "📝" : v.type === "image" ? "🖼️" : v.type === "visibility" ? "👁️" : "🎨"} {v.name}
                </Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Right: Data + Preview */}
      {activeTemplate ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">{activeTemplate.name}</h3>
              <p className="text-xs text-muted-foreground">Prompt: {activeTemplate.basePrompt}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={addEmptyRow}>
                <Plus className="h-3 w-3 mr-1" /> Dodaj wiersz
              </Button>
              <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={dataRows.length === 0}>
                <Play className="h-3 w-3 mr-1" /> Generuj {dataRows.length} wariantów
              </Button>
              {dataRows.length > 0 && (
                <Button size="sm" variant="outline">
                  <Download className="h-3 w-3 mr-1" /> Export ZIP
                </Button>
              )}
            </div>
          </div>

          {/* CSV Import */}
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">Import CSV</span>
            </div>
            <Textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`${activeTemplate.variables.map((v) => v.name).join(",")}\nwartość1,wartość2,...`}
              className="text-xs font-mono h-20"
            />
            <Button size="sm" variant="outline" onClick={parseCSV} className="mt-2">
              <Upload className="h-3 w-3 mr-1" /> Parsuj CSV
            </Button>
          </Card>

          {/* Data Table */}
          {dataRows.length > 0 && (
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 text-[10px]">#</TableHead>
                      {activeTemplate.variables.map((v) => (
                        <TableHead key={v.id} className="text-[10px]">
                          {v.type === "text" ? "📝" : v.type === "image" ? "🖼️" : v.type === "visibility" ? "👁️" : "🎨"} {v.name}
                        </TableHead>
                      ))}
                      <TableHead className="w-20 text-[10px]">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dataRows.map((row, idx) => (
                      <TableRow key={idx} className={previewRow === idx ? "bg-primary/5" : ""}>
                        <TableCell className="text-[10px] text-muted-foreground">{idx + 1}</TableCell>
                        {activeTemplate.variables.map((v) => (
                          <TableCell key={v.id}>
                            <Input
                              value={row[v.name] || ""}
                              onChange={(e) => updateCell(idx, v.name, e.target.value)}
                              className="h-7 text-xs"
                            />
                          </TableCell>
                        ))}
                        <TableCell>
                          <div className="flex gap-1">
                            <button onClick={() => setPreviewRow(idx)} className="p-1 rounded hover:bg-muted">
                              <Eye className="h-3 w-3 text-muted-foreground" />
                            </button>
                            <button onClick={() => removeRow(idx)} className="p-1 rounded hover:bg-destructive/10">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* Export Sizes */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rozmiary eksportu:</span>
            {activeTemplate.exportSizes.map((s) => (
              <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
            ))}
            <Badge variant="outline" className="text-[10px]">Format: {activeTemplate.exportFormat.toUpperCase()}</Badge>
          </div>

          {dataRows.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Brak danych</p>
              <p className="text-xs mt-1">Zaimportuj CSV lub dodaj wiersze ręcznie</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <Layers className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Wybierz szablon z listy</p>
          </div>
        </div>
      )}
    </div>
  );
}
