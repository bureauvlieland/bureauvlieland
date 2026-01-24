import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, Ban } from "lucide-react";
import { useState } from "react";

interface CancelRequestDialogProps {
  isOpen: boolean;
  onConfirm: (reason?: string) => Promise<void>;
  onCancel: () => void;
  itemCount: number;
  providerCount: number;
  dateRange: string;
  isSubmitting?: boolean;
}

export const CancelRequestDialog = ({
  isOpen,
  onConfirm,
  onCancel,
  itemCount,
  providerCount,
  dateRange,
  isSubmitting = false,
}: CancelRequestDialogProps) => {
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    await onConfirm(reason.trim() || undefined);
    setReason("");
  };

  const handleCancel = () => {
    setReason("");
    onCancel();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <Ban className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Aanvraag annuleren</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Weet je zeker dat je de hele aanvraag wilt annuleren?
              </p>
              
              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Activiteiten:</span>
                  <span className="font-medium">{itemCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aanbieders te informeren:</span>
                  <span className="font-medium">{providerCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Datum:</span>
                  <span className="font-medium">{dateRange}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Na annulering kun je deze aanvraag niet meer bekijken. 
                  Je kunt altijd een nieuwe aanvraag indienen.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reden voor annulering (optioneel)</Label>
                <Textarea
                  id="reason"
                  placeholder="Bijv. 'Evenement is verplaatst naar andere locatie'"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Terug
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Bezig...
              </>
            ) : (
              <>
                <Ban className="h-4 w-4 mr-2" />
                Definitief annuleren
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
