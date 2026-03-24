import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Mail } from "lucide-react";

export interface PendingChange {
  type: "time_changed" | "day_changed" | "notes_changed" | "removed" | "added" | "people_changed";
  itemName: string;
  providerName: string;
  oldValue?: string;
  newValue?: string;
}

interface ChangeConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  changes: PendingChange[];
  isSubmitting?: boolean;
}

const changeTypeLabels: Record<PendingChange["type"], string> = {
  time_changed: "tijd gewijzigd",
  day_changed: "dag gewijzigd",
  notes_changed: "opmerking aangepast",
  removed: "verwijderd",
  added: "toegevoegd",
  people_changed: "aantal deelnemers gewijzigd",
};

export const ChangeConfirmationDialog = ({
  isOpen,
  onConfirm,
  onCancel,
  changes,
  isSubmitting = false,
}: ChangeConfirmationDialogProps) => {
  // Group changes by provider
  const providerChanges = changes.reduce((acc, change) => {
    if (!acc[change.providerName]) {
      acc[change.providerName] = [];
    }
    acc[change.providerName].push(change);
    return acc;
  }, {} as Record<string, PendingChange[]>);

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Wijzigingen bevestigen
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>Je hebt de volgende wijzigingen gemaakt:</p>
              
              <ul className="space-y-1.5 text-sm text-foreground">
                {changes.map((change, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>
                      <strong>{change.itemName}</strong>:{" "}
                      {changeTypeLabels[change.type]}
                      {change.oldValue && change.newValue && (
                        <span className="text-muted-foreground">
                          {" "}({change.oldValue} → {change.newValue})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              
              <div className="bg-muted/50 rounded-lg p-3 border">
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground mb-1">
                      De betreffende aanbieders worden automatisch op de hoogte gesteld:
                    </p>
                    <ul className="space-y-0.5 text-muted-foreground">
                      {Object.entries(providerChanges).map(([provider, providerItems]) => (
                        <li key={provider}>
                          • {provider} → {providerItems.map(c => changeTypeLabels[c.type]).join(", ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Annuleren</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Bezig..." : "Wijzigingen doorvoeren"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
