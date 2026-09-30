import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Check, Link2, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  amountMatchFor,
  sortLinkTargets,
  type LinkTarget,
} from "@/lib/purchaseInvoiceLinkTargets";
import {
  buildAllocationRows,
  isSplitBalanced,
  proposeSplit,
  splitTotals,
  type AllocationAmount,
} from "@/lib/purchaseInvoiceSplit";

export interface LinkableInvoice {
  id: string;
  partner_id: string | null;
  partner_name?: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  amount_incl_vat: number | null;
  request_id?: string | null;
}

interface Props {
  invoice: LinkableInvoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinked?: () => void;
}

const formatCurrency = (amount: number | null) =>
  amount === null || amount === undefined
    ? "—"
    : new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);

/**
 * Koppelt een losse inkoopfactuur aan één of meer programma-onderdelen, of aan een
 * logies-offerte. Bij meerdere onderdelen (bv. catering op meerdere dagen op één
 * factuur) wordt het bedrag ex btw als allocaties over de onderdelen verdeeld.
 * De database-triggers vullen daarna factuurnummer, bedrag en commissie per onderdeel.
 */
export function LinkPurchaseInvoiceDialog({ invoice, open, onOpenChange, onLinked }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"item" | "lodging">("item");
  const [search, setSearch] = useState("");
  /** Logies: één offerte. */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Onderdelen: één of meer, in volgorde van aanklikken. */
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  /** Verdeling ex btw per onderdeel (als tekst, zodat de admin kan typen). */
  const [splitInputs, setSplitInputs] = useState<Record<string, string>>({});

  const partnerId = invoice?.partner_id ?? null;
  const invoiceAmount = invoice?.amount_incl_vat ?? null;

  // Bedrag ex btw en btw-tarief van de factuur zijn nodig om te kunnen verdelen;
  // niet elke aanroeper geeft die mee, dus halen we ze hier op.
  const { data: header } = useQuery({
    queryKey: ["link-invoice-header", invoice?.id],
    enabled: open && !!invoice?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_purchase_invoices")
        .select("id, amount_excl_vat, vat_rate, request_id")
        .eq("id", invoice!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const invoiceExcl = header ? Number(header.amount_excl_vat ?? 0) : null;
  const invoiceVatRate = header ? Number(header.vat_rate ?? 0) : 0;

  const { data: itemTargets = [], isLoading: itemsLoading } = useQuery<LinkTarget[]>({
    queryKey: ["link-invoice-items", partnerId],
    enabled: open && !!partnerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_request_items")
        .select(
          "id, block_name, quoted_price, admin_price_override, invoiced_number, request_id, program_requests(reference_number, customer_name, customer_company)",
        )
        .eq("provider_id", partnerId!)
        .is("invoiced_number", null)
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id as string,
        label: (row.block_name as string) ?? "Onderdeel",
        projectReference: row.program_requests?.reference_number ?? null,
        projectLabel:
          row.program_requests?.customer_company || row.program_requests?.customer_name || null,
        amountIncl:
          row.admin_price_override !== null && row.admin_price_override !== undefined
            ? Number(row.admin_price_override)
            : row.quoted_price !== null && row.quoted_price !== undefined
              ? Number(row.quoted_price)
              : null,
      }));
    },
  });

  const { data: lodgingTargets = [], isLoading: lodgingLoading } = useQuery<LinkTarget[]>({
    queryKey: ["link-invoice-lodging", partnerId],
    enabled: open && !!partnerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accommodation_quotes")
        .select(
          "id, accommodation_name, price_total, invoiced_number, request_id, accommodation_requests(reference_number, customer_name, customer_company)",
        )
        .eq("partner_id", partnerId!)
        .is("invoiced_number", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id as string,
        label: (row.accommodation_name as string) ?? "Logies-offerte",
        projectReference: row.accommodation_requests?.reference_number ?? null,
        projectLabel:
          row.accommodation_requests?.customer_company ||
          row.accommodation_requests?.customer_name ||
          null,
        amountIncl:
          row.price_total !== null && row.price_total !== undefined ? Number(row.price_total) : null,
      }));
    },
  });

  const visible = useMemo(
    () => sortLinkTargets(tab === "item" ? itemTargets : lodgingTargets, invoiceAmount, search),
    [tab, itemTargets, lodgingTargets, invoiceAmount, search],
  );

  const selectedItems = useMemo(
    () =>
      selectedItemIds
        .map((id) => itemTargets.find((t) => t.id === id))
        .filter((t): t is LinkTarget => !!t),
    [selectedItemIds, itemTargets],
  );
  const isSplit = tab === "item" && selectedItems.length > 1;

  const proposeForSelection = (items: LinkTarget[]) => {
    if (invoiceExcl === null) return;
    const proposal = proposeSplit(
      invoiceExcl,
      items.map((t) => ({ id: t.id, weight: t.amountIncl })),
    );
    setSplitInputs(
      Object.fromEntries(proposal.map((p) => [p.item_id, p.amount_excl_vat.toFixed(2)])),
    );
  };

  // Nieuwe selectie of nieuw factuurtotaal → verdeling opnieuw voorstellen.
  useEffect(() => {
    if (selectedItems.length > 1) proposeForSelection(selectedItems);
    else setSplitInputs({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemIds.join("|"), invoiceExcl]);

  const splitAmounts: AllocationAmount[] = selectedItems.map((t) => ({
    item_id: t.id,
    amount_excl_vat: Number(String(splitInputs[t.id] ?? "").replace(",", ".")) || 0,
  }));
  const splitBalanced = invoiceExcl !== null && isSplitBalanced(splitAmounts, invoiceExcl);
  const splitSummary = invoiceExcl !== null ? splitTotals(splitAmounts, invoiceExcl) : null;

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const resetSelection = () => {
    setSelectedId(null);
    setSelectedItemIds([]);
    setSplitInputs({});
  };

  const canSubmit =
    tab === "item"
      ? selectedItems.length === 1 || (selectedItems.length > 1 && splitBalanced)
      : !!selectedId;

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!invoice) throw new Error("Geen factuur geselecteerd.");
      if (tab === "item") {
        if (selectedItems.length === 0) throw new Error("Kies eerst een onderdeel.");
        const firstId = selectedItems[0].id;
        const { data: item, error: itemError } = await supabase
          .from("program_request_items")
          .select("request_id")
          .eq("id", firstId)
          .maybeSingle();
        if (itemError) throw itemError;
        const requestId = item?.request_id ?? invoice.request_id ?? null;

        if (selectedItems.length === 1) {
          const { error } = await supabase
            .from("partner_purchase_invoices")
            .update({ item_id: firstId, request_id: requestId })
            .eq("id", invoice.id);
          if (error) throw error;
          return selectedItems[0].label;
        }

        // Verzamelfactuur: verdeel over de onderdelen via allocaties. De trigger
        // op de allocatietabel zet per onderdeel factuurgegevens en commissie.
        if (invoiceExcl === null) throw new Error("Factuurbedrag ex btw is nog niet geladen.");
        if (!isSplitBalanced(splitAmounts, invoiceExcl)) {
          throw new Error("De verdeling sluit niet op het factuurbedrag ex btw.");
        }
        const rows = buildAllocationRows(invoice.id, invoiceVatRate, splitAmounts);
        if (rows.length < 2) throw new Error("Geef minstens twee onderdelen een bedrag.");

        const { error: clearError } = await supabase
          .from("partner_purchase_invoice_allocations")
          .delete()
          .eq("invoice_id", invoice.id);
        if (clearError) throw clearError;
        const { error: insertError } = await supabase
          .from("partner_purchase_invoice_allocations")
          .insert(rows);
        if (insertError) throw insertError;
        const { error: headerError } = await supabase
          .from("partner_purchase_invoices")
          .update({ item_id: null, request_id: requestId })
          .eq("id", invoice.id);
        if (headerError) throw headerError;
        return `${rows.length} onderdelen`;
      }

      if (!selectedId) throw new Error("Kies eerst een logies-offerte.");
      const target = lodgingTargets.find((t) => t.id === selectedId);
      const today = new Date().toISOString().slice(0, 10);
      const { error: quoteError } = await supabase
        .from("accommodation_quotes")
        .update({
          purchase_invoice_id: invoice.id,
          invoiced_number: invoice.invoice_number,
          invoiced_date: invoice.invoice_date ?? today,
        })
        .eq("id", selectedId);
      if (quoteError) throw quoteError;
      return target?.label ?? "logies-offerte";
    },
    onSuccess: async (label) => {
      toast({ title: "Factuur gekoppeld", description: `Gekoppeld aan ${label}.` });
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["commission-worklist"] });
      queryClient.invalidateQueries({ queryKey: ["werkbank-inbox"] });
      queryClient.invalidateQueries({ queryKey: ["admin-todos"] });
      queryClient.invalidateQueries({ queryKey: ["link-invoice-items"] });
      queryClient.invalidateQueries({ queryKey: ["link-invoice-lodging"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-invoice-consistency"] });
      resetSelection();
      setSearch("");
      onOpenChange(false);
      onLinked?.();
    },
    onError: (err: Error) => {
      toast({ title: "Koppelen mislukt", description: err.message, variant: "destructive" });
    },
  });

  const isLoading = tab === "item" ? itemsLoading : lodgingLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Factuur koppelen</DialogTitle>
          <DialogDescription>
            Koppel deze inkoopfactuur aan één of meer programma-onderdelen, of aan een
            logies-offerte, zodat de commissie meeloopt in de werklijst. Kies meerdere
            onderdelen als één factuur over meerdere dagen of onderdelen gaat.
          </DialogDescription>
        </DialogHeader>

        {invoice && (
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <div className="font-medium">
              {invoice.partner_name || "Partner"} — factuur {invoice.invoice_number || "zonder nummer"}
            </div>
            <div className="text-xs text-muted-foreground">
              {invoice.invoice_date
                ? format(new Date(invoice.invoice_date), "d MMM yyyy", { locale: nl })
                : "geen datum"}{" "}
              · {formatCurrency(invoice.amount_incl_vat)} incl. btw
              {invoiceExcl !== null && <> · {formatCurrency(invoiceExcl)} ex btw</>}
            </div>
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => { setTab(v as "item" | "lodging"); resetSelection(); }}>
          <TabsList>
            <TabsTrigger value="item">Programma-onderdeel</TabsTrigger>
            <TabsTrigger value="lodging">Logies-offerte</TabsTrigger>
          </TabsList>

          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Zoek op onderdeel, project of klant"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <TabsContent value={tab} forceMount className="mt-3">
            <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
              {isLoading && (
                <div className="py-8 text-center text-sm text-muted-foreground">Laden…</div>
              )}
              {!isLoading && visible.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Geen open {tab === "item" ? "onderdelen" : "logies-offertes"} van deze partner
                  gevonden.
                </div>
              )}
              {visible.map((target) => {
                const match = amountMatchFor(target, invoiceAmount);
                const active =
                  tab === "item" ? selectedItemIds.includes(target.id) : selectedId === target.id;
                return (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() =>
                      tab === "item" ? toggleItem(target.id) : setSelectedId(target.id)
                    }
                    className={cn(
                      "w-full rounded-md border px-3 py-2 text-left text-sm transition-colors",
                      active ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-medium">
                        {tab === "item" && (
                          <span
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                              active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                            )}
                            aria-hidden
                          >
                            {active && <Check className="h-3 w-3" />}
                          </span>
                        )}
                        {target.label}
                      </span>
                      <span className="tabular-nums text-xs text-muted-foreground">
                        {formatCurrency(target.amountIncl)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {target.projectReference && <span>{target.projectReference}</span>}
                      {target.projectLabel && <span>{target.projectLabel}</span>}
                      {match && (
                        <Badge variant="secondary" className="text-[10px]">
                          {match === "exact" ? "past bij bedrag" : "bedrag lijkt te passen"}
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {isSplit && (
              <div className="mt-3 rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">Verdeling ex btw over {selectedItems.length} onderdelen</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => proposeForSelection(selectedItems)}
                    disabled={invoiceExcl === null}
                  >
                    Naar rato van verkoopprijs
                  </Button>
                </div>
                <div className="mt-2 space-y-1.5">
                  {selectedItems.map((target) => (
                    <div key={target.id} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{target.label}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {[target.projectReference, target.projectLabel].filter(Boolean).join(" · ")}
                          {target.amountIncl !== null && (
                            <> · verkoop {formatCurrency(target.amountIncl)} incl.</>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">€</span>
                        <Input
                          inputMode="decimal"
                          className="h-8 w-28 text-right tabular-nums"
                          value={splitInputs[target.id] ?? ""}
                          onChange={(event) =>
                            setSplitInputs((prev) => ({ ...prev, [target.id]: event.target.value }))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {splitSummary && (
                  <div
                    className={cn(
                      "mt-2 flex items-center justify-between text-xs",
                      splitBalanced ? "text-muted-foreground" : "text-destructive",
                    )}
                  >
                    <span>
                      Verdeeld {formatCurrency(splitSummary.sum)} van {formatCurrency(invoiceExcl)} ex btw
                    </span>
                    {!splitBalanced && (
                      <span>
                        Verschil {formatCurrency(splitSummary.diff)} — pas de bedragen aan tot het sluit
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            disabled={!canSubmit || linkMutation.isPending}
            onClick={() => linkMutation.mutate()}
          >
            {linkMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="mr-2 h-4 w-4" />
            )}
            {isSplit ? `Verdelen over ${selectedItems.length} onderdelen` : "Koppelen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
