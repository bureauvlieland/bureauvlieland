import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export type CompletionEntityType = "program" | "accommodation";

interface CompletionActionsProps {
  entityType: CompletionEntityType;
  entityId: string;
  /** Current completion_status value from DB */
  completionStatus: string | null;
  /** Optional completion timestamp to render in the badge */
  completedAt?: string | null;
  /** Outstanding (incl. VAT). Used to enable/disable the complete button. */
  outstanding: number;
  /** Optional callback after a successful action (refresh, etc.) */
  onChanged?: () => void;
  /**
   * Visual variant. 'compact' = single button (no badge),
   * 'full' = badge + button(s) suitable for header/banner.
   */
  variant?: "compact" | "full";
  /** Override the invalidate keys after success */
  invalidateKeys?: string[][];
  size?: "sm" | "default";
}

/**
 * Shared admin actions to mark a project / standalone logies as
 * "fully invoiced" (Afgerond) — or to reopen one with a mandatory reason.
 */
export const CompletionActions = ({
  entityType,
  entityId,
  completionStatus,
  completedAt,
  outstanding,
  onChanged,
  variant = "compact",
  invalidateKeys,
  size = "sm",
}: CompletionActionsProps) => {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [completeOpen, setCompleteOpen] = useState(false);

  const isCompleted = completionStatus === "fully_invoiced";
  const canComplete = !isCompleted && outstanding <= 0.005; // tolerate rounding

  const invalidate = () => {
    if (invalidateKeys && invalidateKeys.length) {
      invalidateKeys.forEach((k) => queryClient.invalidateQueries({ queryKey: k }));
    } else {
      queryClient.invalidateQueries();
    }
    onChanged?.();
  };

  const callEdge = async (action: "complete" | "reopen", reason?: string) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "set-project-completion",
        {
          body: {
            entity_type: entityType,
            entity_id: entityId,
            action,
            ...(reason ? { reason } : {}),
          },
        },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(
        action === "complete" ? "Gemarkeerd als afgerond" : "Heropend",
      );
      invalidate();
      setReopenOpen(false);
      setCompleteOpen(false);
      setReopenReason("");
    } catch (err) {
      console.error(err);
      toast.error(
        (err as Error).message || "Er ging iets mis. Probeer opnieuw.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {variant === "full" && isCompleted && (
          <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Afgerond
            {completedAt && (
              <span className="font-normal opacity-80">
                · {format(new Date(completedAt), "d MMM yyyy", { locale: nl })}
              </span>
            )}
          </Badge>
        )}

        {!isCompleted && canComplete && (
          <Button
            size={size}
            variant="default"
            className="gap-1.5"
            onClick={() => setCompleteOpen(true)}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Markeer als afgerond
          </Button>
        )}

        {isCompleted && (
          <Button
            size={size}
            variant="outline"
            className="gap-1.5"
            onClick={() => setReopenOpen(true)}
            disabled={busy}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Heropen
          </Button>
        )}
      </div>

      {/* Confirm complete */}
      <AlertDialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {entityType === "program"
                ? "Project markeren als afgerond?"
                : "Logies-aanvraag markeren als afgerond?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Het verdwijnt uit de werkvoorraad en verschuift naar het tabblad
              <strong> Afgerond</strong>. Je kunt het later met reden heropenen
              als er nog een correctie nodig is.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                callEdge("complete");
              }}
            >
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ja, markeer als afgerond
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reopen with reason */}
      <AlertDialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Heropenen</AlertDialogTitle>
            <AlertDialogDescription>
              Geef een korte reden waarom je dit weer opent. De reden komt in de
              historie en het activiteitenlog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reopen-reason">Reden van heropening *</Label>
            <Textarea
              id="reopen-reason"
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Bijv. creditfactuur nodig, partner stuurt nog een factuur, …"
              rows={3}
              maxLength={2000}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || reopenReason.trim().length < 3}
              onClick={(e) => {
                e.preventDefault();
                callEdge("reopen", reopenReason.trim());
              }}
            >
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Heropenen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
