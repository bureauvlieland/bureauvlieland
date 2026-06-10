import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface OverrideItemStatusButtonProps {
  itemId: string;
  blockName: string;
  providerName?: string | null;
  onDone?: () => void;
}

export const OverrideItemStatusButton = ({
  itemId,
  blockName,
  providerName,
  onDone,
}: OverrideItemStatusButtonProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke(
      "override-item-status",
      {
        body: {
          item_id: itemId,
          new_status: "confirmed",
          reason: reason.trim() || undefined,
        },
      },
    );
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast({
        title: "Kon item niet bevestigen",
        description: error?.message || (data as any)?.error || "Onbekende fout",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Item op bevestigd gezet",
      description: `"${blockName}" is handmatig bevestigd door admin.`,
    });
    setOpen(false);
    setReason("");
    onDone?.();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center self-start gap-1 whitespace-nowrap rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium leading-tight text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40"
      >
        <CheckCheck className="h-2.5 w-2.5" />
        Status overrulen
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Partner-status overrulen?</AlertDialogTitle>
            <AlertDialogDescription>
              Hiermee zet je "{blockName}"
              {providerName ? ` (${providerName})` : ""} handmatig op{" "}
              <strong>bevestigd</strong>. Gebruik dit wanneer de partner buiten
              de portal om al heeft bevestigd, of bij bureau-onderdelen die je
              zelf hebt geregeld. Er gaat geen mail naar de partner.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm">
              Reden (optioneel, komt in de history)
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Bijv. mondeling bevestigd per telefoon op 10-06-2026"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={submitting}>
              {submitting ? "Bezig…" : "Bevestig override"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
