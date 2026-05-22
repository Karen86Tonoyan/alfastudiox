import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, FolderSync, Layers, Wand2, Image, ArrowRightLeft } from "lucide-react";
import { RecipeBuilder } from "@/components/automation/RecipeBuilder";
import { BulkRunner } from "@/components/automation/BulkRunner";
import { TemplateEngine } from "@/components/automation/TemplateEngine";
import { AIEditPack } from "@/components/automation/AIEditPack";
import { ImageProcessor } from "@/components/automation/ImageProcessor";
import { ExportVariants } from "@/components/automation/ExportVariants";

export default function AutomationPage() {
  return (
    <div className="h-full flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Automation Hub</h1>
        <p className="text-sm text-muted-foreground">
          Profesjonalna automatyzacja obrazów — przepisy, batch, szablony, AI edycja, eksport wariantów
        </p>
      </div>

      <Tabs defaultValue="recipes" className="flex-1 flex flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="recipes" className="text-xs gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Recipe Builder</TabsTrigger>
          <TabsTrigger value="bulk" className="text-xs gap-1.5"><FolderSync className="h-3.5 w-3.5" /> Bulk Runner</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs gap-1.5"><Layers className="h-3.5 w-3.5" /> Template Engine</TabsTrigger>
          <TabsTrigger value="ai-edit" className="text-xs gap-1.5"><Wand2 className="h-3.5 w-3.5" /> AI Edit Pack</TabsTrigger>
          <TabsTrigger value="processor" className="text-xs gap-1.5"><Image className="h-3.5 w-3.5" /> Image Processor</TabsTrigger>
          <TabsTrigger value="export" className="text-xs gap-1.5"><ArrowRightLeft className="h-3.5 w-3.5" /> Export Variants</TabsTrigger>
        </TabsList>

        <TabsContent value="recipes" className="flex-1 mt-4"><RecipeBuilder /></TabsContent>
        <TabsContent value="bulk" className="flex-1 mt-4"><BulkRunner /></TabsContent>
        <TabsContent value="templates" className="flex-1 mt-4"><TemplateEngine /></TabsContent>
        <TabsContent value="ai-edit" className="flex-1 mt-4"><AIEditPack /></TabsContent>
        <TabsContent value="processor" className="flex-1 mt-4"><ImageProcessor /></TabsContent>
        <TabsContent value="export" className="flex-1 mt-4"><ExportVariants /></TabsContent>
      </Tabs>
    </div>
  );
}
