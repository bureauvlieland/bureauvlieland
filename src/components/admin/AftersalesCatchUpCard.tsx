import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Loader2, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  isAftersalesCandidate,
  isLateAftersales,
  lastProgramDate,
  type AftersalesItemLike,
  type AftersalesProgramLike,
} from "@/lib/aftersalesEligibility";

/** Vanaf deze programmadatum halen we de nazorgmail in (het afgelopen seizoen). */
export const AFTERSALES_CATCH_UP_FROM = "2025-09-01";

type CandidateRow = AftersalesProgramLike & {
  id: string;
  reference_number: string | null;
  customer_name: string;
  customer_company: string | null;
  customer_email: string;
  items: AftersalesItemLike[] | null;
};

/**
 * Nazorgmail inhalen: afgelopen, geboekte programma's die de mail nooit
 * kregen. De admin kiest wie hem alsnog krijgt; versturen gaat via
 * send-customer-aftersales, dat bij programma's van langer dan een maand
 * geleden een andere openingszin gebruikt.
 */
export const AftersalesCatchUpCard = () => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState<{ done: number; total: number } | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["admin-aftersales-catchup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_requests")
        .select(
          "id, reference_number, customer_name, customer_company, customer_email, selected_dates, status, cancelled_at, terms_accepted_at, quote_status, completion_status, aftersales_sent_at, items:program_request_items(status, executed_at, customer_accepted_at, customer_approved_at)",
        )
        .is("aftersales_sent_at", null)
        .is("cancelled_at", null)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return ((data ?? []) as unknown as CandidateRow[])
        .filter((r) => isAftersalesCandidate(r, r.items ?? [], today))
        .filter((r) => (lastProgramDate(r.selected_dates) ?? "") >= AFTERSALES_CATCH_UP_FROM)
        .sort((a, b) => (lastProgramDate(b.selected_dates) ?? "").localeCompare(lastProgramDate(a.selected_dates) ?? ""));
    },
  });

  const allSelected = candidates.length > 0 && candidates.every((c) => selected.has(c.id));

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const toggleAll = (on: boolean) => setSelected(on ? new Set(candidates.map((c) => c.id)) : new Set());

  const chosen = useMemo(() => candidates.filter((c) => selected.has(c.id)), [candidates, selected]);

  const send = async () => {
    setConfirmOpen(false);
    let sent = 0;
    const failed: string[] = [];
    setSending({ done: 0, total: chosen.length });
    for (const c of chosen) {
      const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>(
        "send-customer-aftersales",
        { body: { request_id: c.id, origin: window.location.origin, sent_by: "admin" } },
      );
      if (error || data?.error || !data?.success) failed.push(c.reference_number || c.customer_company || c.customer_name);
      else sent++;
      setSending((s) => (s ? { ...s, done: s.done + 1 } : s));
    }
    setSending(null);
    setSelected(new Set());
    void queryClient.invalidateQueries({ queryKey: ["admin-aftersales-catchup"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-aftersales-sent"] });
    toast({
      title: `${sent} nazorgmail${sent === 1 ? "" : "s"} verstuurd`,
      description: failed.length ? `Niet gelukt: ${failed.join(", ")}` : undefined,
      variant: failed.length ? "destructive" : undefined,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div className="min-w-0 flex-1 space-y-1.5">
          <CardTitle className="text-base">Nazorgmail inhalen</CardTitle>
          <CardDescription>
            Afgelopen programma's sinds {format(new Date(AFTERSALES_CATCH_UP_FROM), "MMMM yyyy", { locale: nl })} die de
            mail met de vraag om een beoordeling nooit kregen. Bij programma's van langer dan een maand geleden begint de
            mail met "Een tijdje geleden was u…".
          </CardDescription>
        </div>
        <Button onClick={() => setConfirmOpen(true)} disabled={chosen.length === 0 || !!sending} className="shrink-0 gap-2">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending ? `Bezig ${sending.done}/${sending.total}` : `Verstuur (${chosen.length})`}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Alle afgelopen programma's hebben de nazorgmail gehad.</p>
        ) : (
          <div className="max-h-[480px] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(v) => toggleAll(v === true)}
                      aria-label="Alles selecteren"
                    />
                  </TableHead>
                  <TableHead>Programma</TableHead>
                  <TableHead className="whitespace-nowrap">Laatste dag</TableHead>
                  <TableHead>Openingszin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c) => {
                  const last = lastProgramDate(c.selected_dates);
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(c.id)}
                          onCheckedChange={(v) => toggle(c.id, v === true)}
                          aria-label={`Selecteer ${c.customer_company || c.customer_name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Link to={`/admin/aanvragen/${c.id}`} className="font-medium underline-offset-2 hover:underline">
                          {c.customer_company || c.customer_name}
                        </Link>
                        {c.reference_number && (
                          <span className="ml-2 whitespace-nowrap text-xs text-muted-foreground">{c.reference_number}</span>
                        )}
                        <div className="text-xs text-muted-foreground">{c.customer_email}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {last ? format(new Date(last), "d MMM yyyy", { locale: nl }) : "–"}
                      </TableCell>
                      <TableCell>
                        {isLateAftersales(c.selected_dates, today) ? (
                          <Badge variant="outline" className="whitespace-nowrap">Een tijdje geleden</Badge>
                        ) : (
                          <Badge variant="secondary" className="whitespace-nowrap">Standaard</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {chosen.length} nazorgmail{chosen.length === 1 ? "" : "s"} versturen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deze klanten krijgen nu de mail met de vraag om hun ervaring te delen via de beoordelingspagina. Dit is niet
              terug te draaien.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={() => void send()}>Versturen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
