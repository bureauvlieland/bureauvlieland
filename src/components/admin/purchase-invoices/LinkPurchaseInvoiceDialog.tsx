import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Link2, Loader2, Search } from "lucide-react";
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
 * Koppelt een losse inkoopfactuur aan een programma-onderdeel of een logies-offerte.
 * De database-triggers vullen daarna factuurnummer, bedrag en commissie op het onderdeel.
 */
export function LinkPurchaseInvoiceDialog({ invoice, open, onOpenChange, onLinked }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"item" | "lodging">("item");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const partnerId = invoice?.partner_id ?? null;
  const invoiceAmount = invoice?.amount_incl_vat ?? null;

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

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!invoice || !selectedId) throw new Error("Kies eerst een onderdeel of logies-offerte.");
      if (tab === "item") {
        const target = itemTargets.find((t) => t.id === selectedId);
        const { data: item, error: itemError } = await supabase
          .from("program_request_items")
          .select("request_id")
          .eq("id", selectedId)
          .maybeSingle();
        if (itemError) throw itemError;
        const { error } = await supabase
          .from("partner_purchase_invoices")
          .update({
            item_id: selectedId,
            request_id: item?.request_id ?? invoice.request_id ?? null,
          })
          .eq("id", invoice.id);
        if (error) throw error;
        return target?.label ?? "onderdeel";
      }

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
      setSelectedId(null);
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
            Koppel deze inkoopfactuur aan een programma-onderdeel of logies-offerte, zodat de
            commissie meeloopt in de werklijst.
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
            </div>
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => { setTab(v as "item" | "lodging"); setSelectedId(null); }}>
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
                const active = selectedId === target.id;
                return (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => setSelectedId(target.id)}
                    className={cn(
                      "w-full rounded-md border px-3 py-2 text-left text-sm transition-colors",
                      active ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{target.label}</span>
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
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            disabled={!selectedId || linkMutation.isPending}
            onClick={() => linkMutation.mutate()}
          >
            {linkMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="mr-2 h-4 w-4" />
            )}
            Koppelen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
