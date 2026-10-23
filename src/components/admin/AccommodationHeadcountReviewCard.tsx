import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Check, Loader2, Send, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { extractEdgeError } from "@/lib/edgeFunctionError";
import { formatEuro } from "@/lib/formatEuro";
import { needsHeadcountConfirmation, parseHeadcountProposal } from "@/lib/accommodationHeadcount";

interface HeadcountQuote {
  id: string;
  status: string;
  accommodation_name: string | null;
  price_total: number;
  priced_for_guests?: number | null;
  headcount_proposal?: unknown;
  headcount_change_requested_at?: string | null;
  headcount_confirmed_at?: string | null;
}

interface Props {
  quote: HeadcountQuote;
  /** Het huidige aantal gasten van de logiesaanvraag. */
  requestGuests: number;
  linkedProgramId: string | null;
  partnerName: string;
  onChanged: () => void;
}

/**
 * Aantalwijziging bij een gekozen logiesofferte, bureaukant
 * (docs/plan-logies-aantalwijziging.md):
 *   - ligt er een voorstel van de partner, dan goedkeuren (klant wordt
 *     geïnformeerd, oude waarden naar de versiehistorie) of afwijzen met reden;
 *   - wacht de bevestiging nog, dan de partner (opnieuw) vragen;
 *   - is alles verwerkt, dan een regel wanneer het aantal is bevestigd.
 */
export function AccommodationHeadcountReviewCard({ quote, requestGuests, linkedProgramId, partnerName, onChanged }: Props) {
  const { toast } = useToast();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const proposal = parseHeadcountProposal(quote.headcount_proposal);
  const pending = needsHeadcountConfirmation(quote, requestGuests);

  // Een al geregistreerde bureaufactuur verandert niet mee met de offerte.
  const { data: bureauInvoices } = useQuery({
    queryKey: ["bureau-invoices-for-headcount", linkedProgramId],
    queryFn: async () => {
      const { data } = await supabase
        .from("bureau_invoices")
        .select("id, invoice_number")
        .eq("request_id", linkedProgramId!)
        .limit(5);
      return data || [];
    },
    enabled: !!proposal && !!linkedProgramId,
  });

  const decide = useMutation({
    mutationFn: async ({ decision, reason }: { decision: "approve" | "reject"; reason?: string }) => {
      const { data, error } = await supabase.functions.invoke("approve-accommodation-headcount", {
        body: { quoteId: quote.id, decision, reason, origin: window.location.origin },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { results?: { customer?: { sent?: boolean } } };
    },
    onSuccess: (data, vars) => {
      setRejectOpen(false);
      setRejectReason("");
      onChanged();
      if (vars.decision === "approve") {
        toast({
          title: "Nieuw totaal overgenomen",
          description: data?.results?.customer?.sent ? "De klant en de partner zijn per mail geïnformeerd." : "De partner is geïnformeerd; de klant heeft geen e-mailadres.",
        });
      } else {
        toast({ title: "Voorstel afgewezen", description: "De partner is per mail geïnformeerd met de reden." });
      }
    },
    onError: async (err) => {
      const message = await extractEdgeError(err, "Probeer het opnieuw.");
      toast({ title: "Beoordelen mislukt", description: message, variant: "destructive" });
    },
  });

  const askConfirmation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("notify-headcount-change-bulk", {
        body: {
          request_id: linkedProgramId ?? undefined,
          old_people: quote.priced_for_guests ?? requestGuests,
          new_people: requestGuests,
          send_customer: false,
          partner_item_ids: [],
          accommodation_quote_ids: [quote.id],
          origin: window.location.origin,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const sent = ((data?.results?.accommodations as Array<{ sent?: boolean; reason?: string }>) || []).some((a) => a.sent);
      if (!sent) throw new Error("De mail is niet verstuurd (geen e-mailadres bij de partner?)");
    },
    onSuccess: () => {
      onChanged();
      toast({ title: "Verzoek verstuurd", description: `${partnerName} is gevraagd het nieuwe aantal te bevestigen.` });
    },
    onError: async (err) => {
      const message = await extractEdgeError(err, "Probeer het opnieuw.");
      toast({ title: "Versturen mislukt", description: message, variant: "destructive" });
    },
  });

  if (quote.status !== "selected") return null;
  if (!proposal && !pending && !quote.headcount_confirmed_at) return null;

  if (proposal) {
    const priceChanged = proposal.price_total !== proposal.previous_price_total;
    const rooms = Array.isArray(proposal.room_configuration) ? (proposal.room_configuration as Array<{ count?: number; type?: string }>) : [];
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
        <p className="flex items-center gap-1.5 font-medium text-amber-900 dark:text-amber-100">
          <Users className="h-4 w-4" aria-hidden="true" />
          Partner bevestigt {proposal.guests} gasten
        </p>
        <p className="mt-1">
          Totaal {formatEuro(proposal.price_total)}
          {priceChanged ? ` (was ${formatEuro(proposal.previous_price_total)} voor ${proposal.previous_guests ?? "?"} gasten)` : " (prijs ongewijzigd)"}
        </p>
        {rooms.length > 0 && <p className="text-xs text-muted-foreground">Kamers: {rooms.map((r) => `${r.count ?? 1} x ${r.type || "kamer"}`).join(", ")}</p>}
        {proposal.note && <p className="mt-1 text-xs italic text-muted-foreground">Toelichting partner: {proposal.note}</p>}
        {proposal.proposed_at && (
          <p className="text-xs text-muted-foreground">Bevestigd op {format(new Date(proposal.proposed_at), "d MMM yyyy HH:mm", { locale: nl })}</p>
        )}
        {bureauInvoices && bureauInvoices.length > 0 && (
          <p className="mt-2 text-xs font-medium text-destructive">
            Let op: er is al een bureaufactuur geregistreerd ({bureauInvoices.map((i) => i.invoice_number).filter(Boolean).join(", ") || bureauInvoices.length}). Die verandert niet mee; maak zo nodig een correctie.
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs" disabled={decide.isPending}>
                {decide.isPending && decide.variables?.decision === "approve" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                Goedkeuren en klant informeren
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Nieuw totaal overnemen?</AlertDialogTitle>
                <AlertDialogDescription>
                  De offerte van {partnerName} gaat naar {formatEuro(proposal.price_total)} voor {proposal.guests} gasten. De vorige versie komt in de versiehistorie, de commissie volgt het nieuwe totaal zolang zij nog niet is gefactureerd, en de klant krijgt een mail met het nieuwe bedrag. De klant hoeft niet opnieuw te kiezen.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuleren</AlertDialogCancel>
                <AlertDialogAction onClick={() => decide.mutate({ decision: "approve" })}>Goedkeuren</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setRejectOpen(true)} disabled={decide.isPending}>
            <X className="mr-1 h-3 w-3" />
            Afwijzen
          </Button>
        </div>

        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Voorstel afwijzen</DialogTitle>
              <DialogDescription>De partner krijgt een mail met uw reden en kan het nieuwe aantal opnieuw bevestigen. De offerte blijft op {formatEuro(proposal.previous_price_total)} staan.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="headcount-reject-reason">Reden</Label>
              <Textarea id="headcount-reject-reason" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Bijvoorbeeld: het totaal is hoger dan de prijs per persoon uit de offerte." />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={decide.isPending}>
                Annuleren
              </Button>
              <Button variant="destructive" onClick={() => decide.mutate({ decision: "reject", reason: rejectReason.trim() })} disabled={decide.isPending || rejectReason.trim().length < 3}>
                {decide.isPending && decide.variables?.decision === "reject" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                Afwijzen en partner mailen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
        <p className="flex items-center gap-1.5 font-medium text-amber-900 dark:text-amber-100">
          <Users className="h-4 w-4" aria-hidden="true" />
          Wacht op bevestiging van {requestGuests} gasten
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          De prijs geldt voor {quote.priced_for_guests} gasten.{" "}
          {quote.headcount_change_requested_at
            ? `Partner gevraagd op ${format(new Date(quote.headcount_change_requested_at), "d MMM yyyy", { locale: nl })}; de herinnering loopt automatisch.`
            : "De partner is nog niet gevraagd het nieuwe aantal te bevestigen."}
        </p>
        <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={() => askConfirmation.mutate()} disabled={askConfirmation.isPending}>
          {askConfirmation.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
          {quote.headcount_change_requested_at ? "Opnieuw om bevestiging vragen" : "Bevestiging nieuw aantal vragen"}
        </Button>
      </div>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      Aantal bevestigd: {quote.priced_for_guests} gasten op {format(new Date(quote.headcount_confirmed_at!), "d MMM yyyy", { locale: nl })}.
    </p>
  );
}
