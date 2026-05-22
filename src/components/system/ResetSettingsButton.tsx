import { useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { resetAlfaSettings } from "@/lib/resetSettings";
import { downloadMigratedSnapshot } from "@/lib/migrationSnapshot";

interface Props {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "destructive";
}

export function ResetSettingsButton({ className, variant = "outline" }: Props) {
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);

  const handleReset = () => {
    setWorking(true);
    try {
      const { cleared, defaultsApplied } = resetAlfaSettings();
      toast.success("Ustawienia przywrócone do domyślnych", {
        description: `Wyczyszczono ${cleared.length} kluczy, zastosowano ${defaultsApplied.length} domyślnych.`,
      });
    } catch (e) {
      toast.error("Nie udało się zresetować ustawień", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setWorking(false);
      setOpen(false);
    }
  };

  const handleBackupFirst = () => {
    downloadMigratedSnapshot();
    toast.success("Pobrano kopię zapasową ustawień");
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size="sm" className={className}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Reset ustawień
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Przywrócić ustawienia fabryczne?</AlertDialogTitle>
          <AlertDialogDescription>
            Wszystkie klucze <code className="font-mono text-xs">alfa_*</code> zostaną wyczyszczone,
            a następnie zostaną zapisane wartości domyślne: kolor kursora (auto), brush outline (off),
            presety pędzla i sesji (puste). Aplikacja nie zostanie przeładowana — komponenty same odświeżą stan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="rounded border border-border bg-secondary/30 p-2 text-xs text-muted-foreground">
          💡 Zalecane: pobierz kopię obecnych presetów przed resetem.
        </div>
        <AlertDialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={handleBackupFirst} disabled={working}>
            Pobierz backup JSON
          </Button>
          <AlertDialogCancel disabled={working}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleReset(); }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {working ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RotateCcw className="h-3.5 w-3.5 mr-1.5" />}
            Resetuj
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
