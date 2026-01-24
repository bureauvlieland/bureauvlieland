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
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Save } from "lucide-react";

interface DraftRecoveryDialogProps {
  isOpen: boolean;
  onRestore: () => void;
  onDiscard: () => void;
  itemCount: number;
  savedAt: Date;
}

export const DraftRecoveryDialog = ({
  isOpen,
  onRestore,
  onDiscard,
  itemCount,
  savedAt,
}: DraftRecoveryDialogProps) => {
  const timeAgo = formatDistanceToNow(savedAt, { addSuffix: true, locale: nl });

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-primary" />
            Je hebt een eerder concept
          </AlertDialogTitle>
          <AlertDialogDescription>
            Je had een programma met {itemCount} {itemCount === 1 ? "item" : "items"} opgeslagen ({timeAgo}).
            Wil je hiermee verder of opnieuw beginnen?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard}>
            Opnieuw beginnen
          </AlertDialogCancel>
          <AlertDialogAction onClick={onRestore}>
            Verder met concept
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
