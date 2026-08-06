import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export type CommissionExemptRowType = "activity" | "accommodation" | "purchase_invoice";

export interface CommissionExemptRow {
  type: CommissionExemptRowType;
  id: string;
}

interface CommissionExemptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: CommissionExemptRow[];
  onDone?: () => void;
}

/**
 * Eén reden-dialoog voor "Commissievrij markeren", gebruikt door de commissie-werklijst
 * en door taakdetails in de Werkbank. Sluit automatisch de bijbehorende taken.
 */
export function CommissionExemptDialog({
  open,
  onOpenChange,
  rows,
  onDone,
}: CommissionExemptDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: async (reasonText: string) => {
      const { data, error } = await supabase.functions.invoke("set-commission-exempt", {
        body: { rows, exempt: true, reason: reasonText },
      });
      if (error) throw error;
      if ((data as { error?: string } | null)?.error) {
        throw new Error((data as { error: string }).error);
      }
      return data as { updated: number; todosClosed: number };
    },
    onSuccess: (result) => {
      toast({
        title: "Commissievrij gemarkeerd",
        description: `${result.updated} regel(s) gearchiveerd${
          result.todosClosed ? `, ${result.todosClosed} taak/taken gesloten` : ""
        }.`,
      });
      setReason("");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["commission-worklist"] });
      queryClient.invalidateQueries({ queryKey: ["admin-todos"] });
      queryClient.invalidateQueries({ queryKey: ["werkbank-inbox"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      onDone?.();
    },
    onError: (err: Error) => {
      toast({ title: "Actie mislukt", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Commissievrij markeren</DialogTitle>
          <DialogDescription>
            {rows.length} regel(s) verdwijnen uit de actieve lijst en blijven terugvindbaar onder
            "Commissievrij / gearchiveerd". Openstaande commissietaken worden gesloten.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="commission-exempt-reason">Reden (verplicht)</Label>
          <Textarea
            id="commission-exempt-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Bijv. afspraak zonder commissie, project geannuleerd, al via Snelstart verrekend"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            disabled={reason.trim().length < 3 || mutation.isPending || rows.length === 0}
            onClick={() => mutation.mutate(reason.trim())}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Markeren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
