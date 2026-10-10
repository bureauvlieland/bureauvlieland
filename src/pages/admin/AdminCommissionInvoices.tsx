import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  FileText,
  Lock,
  Receipt,
  Search,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { EmptyState, LoadingState, Notice } from "@/components/system";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { reportError } from "@/lib/errorReporting";
import { useAppSettings } from "@/hooks/useAppSettings";
import { SendCommissionInvoiceDialog } from "@/components/admin/SendCommissionInvoiceDialog";
import { CommissionInvoiceRow } from "@/components/admin/commission-invoices/CommissionInvoiceRow";
import { renderAndStoreCommissionInvoicePdf } from "@/lib/commissionInvoicePdfStorage";
import {
  INVOICE_EMPTY,
  INVOICE_TABS,
  INVOICE_TAB_LABELS,
  invoiceTabTotals,
  invoicedTotal,
  matchesInvoiceSearch,
  sortInvoices,
  type CommissionInvoiceView,
  type InvoiceTab,
} from "@/lib/commissionInvoiceView";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

const TAB_ICONS: Record<InvoiceTab, typeof Clock> = {
  draft: FileText,
  final: Lock,
  sent: Clock,
  forwarded: ArrowRight,
  paid: CheckCircle,
  overdue: AlertTriangle,
};

const INVOICE_SELECT = `
  id, invoice_number, invoice_date, due_date, partner_id, recipient_name, recipient_email,
  amount_excl_vat, vat_amount, amount_incl_vat, vat_rate, status, pdf_path, notes,
  sent_at, forwarded_to_accounting_at, paid_at, finalized_at,
  credits_invoice_id, credit_reason, credited_at,
  partner:partners(id, name, email, contact_email),
  lines:commission_invoice_lines(
    id, item_id, quote_id, purchase_invoice_id, item_type, block_name, customer_label,
    event_date, reference_number, invoiced_amount_excl_vat, commission_percentage,
    commission_amount, description, sort_order
  )
`;

export default function AdminCommissionInvoices() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { getSetting } = useAppSettings();
  const [tab, setTab] = useState<InvoiceTab | "all">("all");
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sendTarget, setSendTarget] = useState<CommissionInvoiceView | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CommissionInvoiceView | null>(null);
  const [creditTarget, setCreditTarget] = useState<CommissionInvoiceView | null>(null);
  const [creditReason, setCreditReason] = useState("");

  const { data: partners } = useQuery({
    queryKey: ["partners-for-commission-invoice-filter"],
    queryFn: async () => {
      const { data } = await supabase.from("partners").select("id, name").eq("is_active", true).order("name");
      return data || [];
    },
  });

  // Alles in één keer: zo'n twintig facturen per seizoen, met hun regels, zodat
  // tegels, zoeken en filters in het geheugen werken.
  const { data: invoices, isLoading, error } = useQuery<CommissionInvoiceView[]>({
    queryKey: ["commission-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_invoices")
        .select(INVOICE_SELECT)
        .order("invoice_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data || []) as unknown as CommissionInvoiceView[]).map((invoice) => ({
        ...invoice,
        lines: [...(invoice.lines ?? [])].sort((a, b) => a.sort_order - b.sort_order),
      }));
    },
  });

  const all = useMemo(() => invoices ?? [], [invoices]);
  const totals = useMemo(() => invoiceTabTotals(all), [all]);
  const grandTotal = useMemo(() => invoicedTotal(all), [all]);

  const visible = useMemo(() => {
    let list = all;
    if (tab !== "all") list = list.filter((invoice) => (tab === "overdue" ? totalsIncludes(invoice, tab) : invoice.status === tab));
    if (partnerFilter !== "all") list = list.filter((invoice) => invoice.partner_id === partnerFilter);
    if (search.trim()) list = list.filter((invoice) => matchesInvoiceSearch(invoice, search));
    return sortInvoices(list);
  }, [all, tab, partnerFilter, search]);

  /** Nummer van factuur-id, voor de verwijzingen tussen factuur en creditnota. */
  const numberById = useMemo(() => {
    const map = new Map<string, string>();
    for (const inv of all) if (inv.invoice_number) map.set(inv.id, inv.invoice_number);
    return map;
  }, [all]);
  const creditNoteByOriginal = useMemo(() => {
    const map = new Map<string, string>();
    for (const inv of all) {
      if (inv.credits_invoice_id && inv.invoice_number) map.set(inv.credits_invoice_id, inv.invoice_number);
    }
    return map;
  }, [all]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["commission-invoices"] });
    queryClient.invalidateQueries({ queryKey: ["commission-invoice-mails"] });
    queryClient.invalidateQueries({ queryKey: ["commission-worklist"] });
  };

  const withBusy = async (invoice: CommissionInvoiceView, where: string, fallback: string, work: () => Promise<void>) => {
    setBusyId(invoice.id);
    try {
      await work();
      refresh();
    } catch (err) {
      reportError(err, { where: `AdminCommissionInvoices: ${where}` });
      toast.error(errorMessage(err, fallback));
    } finally {
      setBusyId(null);
    }
  };

  const openPdf = async (invoice: CommissionInvoiceView) => {
    if (!invoice.pdf_path) return;
    const { data, error } = await supabase.storage.from("commission-invoices").createSignedUrl(invoice.pdf_path, 300);
    if (error || !data) {
      toast.error("Fout bij ophalen PDF");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const regeneratePdf = (invoice: CommissionInvoiceView) =>
    withBusy(invoice, "regeneratePdf", "Fout bij maken van de PDF", async () => {
      await renderAndStoreCommissionInvoicePdf(invoice.id, getSetting);
      toast.success(`PDF van ${invoice.invoice_number} opnieuw gemaakt`);
    });

  const deleteDraft = async () => {
    const invoice = deleteTarget;
    setDeleteTarget(null);
    if (!invoice) return;
    await withBusy(invoice, "deleteDraft", "Fout bij verwijderen", async () => {
      const { error } = await supabase.rpc("delete_commission_invoice_draft", { p_invoice_id: invoice.id });
      if (error) throw error;
      toast.success("Concept verwijderd; de regels staan weer bij Te factureren");
    });
  };

  const creditInvoice = async () => {
    const invoice = creditTarget;
    const reason = creditReason.trim();
    setCreditTarget(null);
    setCreditReason("");
    if (!invoice) return;
    await withBusy(invoice, "creditInvoice", "Fout bij crediteren", async () => {
      const { data, error } = await supabase.rpc("credit_commission_invoice", {
        p_invoice_id: invoice.id,
        p_reason: reason || null,
      });
      if (error) throw error;
      const credit = Array.isArray(data) ? data[0] : data;
      if (!credit?.id || !credit.invoice_number) throw new Error("Geen creditnota ontvangen");
      try {
        await renderAndStoreCommissionInvoicePdf(credit.id, getSetting);
        toast.success(`${invoice.invoice_number} gecrediteerd met ${credit.invoice_number}; de regels staan weer bij Te factureren`);
      } catch (pdfError) {
        reportError(pdfError, { where: "AdminCommissionInvoices: PDF van creditnota" });
        toast.warning(
          `${invoice.invoice_number} gecrediteerd met ${credit.invoice_number}, maar de PDF kon niet worden gemaakt. Gebruik "PDF opnieuw maken".`,
        );
      }
    });
  };

  const forwardToSnelstart = (invoice: CommissionInvoiceView) =>
    withBusy(invoice, "forward", "Fout bij doorsturen", async () => {
      const { error } = await supabase.functions.invoke("forward-commission-invoice", { body: { invoiceId: invoice.id } });
      if (error) throw error;
      toast.success(`${invoice.invoice_number} doorgestuurd naar Snelstart`);
    });

  const markAsPaid = (invoice: CommissionInvoiceView) =>
    withBusy(invoice, "markAsPaid", "Fout bij markeren als betaald", async () => {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase
        .from("commission_invoices")
        .update({ status: "paid", paid_at: new Date().toISOString(), paid_by: session.session?.user.id })
        .eq("id", invoice.id)
        .in("status", ["sent", "forwarded"]);
      if (error) throw error;
      // De bronnen (onderdelen, offertes) volgen via de databasetrigger.
      toast.success(`${invoice.invoice_number} gemarkeerd als betaald`);
    });

  const isFiltering = search.trim().length > 0 || partnerFilter !== "all";

  return (
    <AdminLayout>
      <Helmet>
        <title>Commissiefacturen | Admin | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Receipt className="h-7 w-7" aria-hidden="true" />
              Commissiefacturen
            </h1>
            <p className="text-muted-foreground">
              Uitgaande facturen aan partners voor commissie. Totaal zonder concepten:{" "}
              <span className="font-medium tabular-nums text-foreground">{formatCurrency(grandTotal)}</span> incl. btw.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/admin/commissies">Naar de werklijst</Link>
          </Button>
        </div>

        {isLoading && <LoadingState label="Facturen laden…" />}
        {error && (
          <Notice tone="danger" title="Kon de facturen niet laden">
            {(error as Error).message}
          </Notice>
        )}

        {!isLoading && !error && (
          <>
            <div role="tablist" aria-label="Factuurstatus" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {INVOICE_TABS.map((key) => {
                const active = key === tab;
                const Icon = TAB_ICONS[key];
                const total = totals[key];
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(active ? "all" : key)}
                    className={`rounded-lg border p-3 text-left transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4 ${
                      active ? "border-primary bg-accent-soft" : "bg-card hover:bg-muted"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {INVOICE_TAB_LABELS[key]}
                    </span>
                    <span className="mt-1 block text-2xl font-semibold tabular-nums text-foreground">{total.count}</span>
                    <span className="block text-xs text-muted-foreground">{formatCurrency(total.amount)}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Zoek op nummer, partner, klant of projectreferentie"
                  aria-label="Zoeken"
                  className="pl-9"
                />
              </div>
              <Select value={partnerFilter} onValueChange={setPartnerFilter}>
                <SelectTrigger className="sm:w-60" aria-label="Partner">
                  <SelectValue placeholder="Alle partners" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle partners</SelectItem>
                  {partners?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tab !== "all" && (
                <Button variant="ghost" onClick={() => setTab("all")}>
                  Alle statussen
                </Button>
              )}
            </div>

            {visible.length === 0 ? (
              <EmptyState
                icon={<Receipt />}
                title={isFiltering ? "Niets gevonden" : tab === "all" ? "Nog geen commissiefacturen" : INVOICE_EMPTY[tab].title}
                description={
                  isFiltering
                    ? "Geen facturen die aan je zoekopdracht of filter voldoen."
                    : tab === "all"
                      ? "Maak een factuur vanuit de werklijst op Commissies."
                      : INVOICE_EMPTY[tab].description
                }
                action={
                  isFiltering ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearch("");
                        setPartnerFilter("all");
                      }}
                    >
                      Filters wissen
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {visible.length} factu{visible.length === 1 ? "ur" : "ren"}
                  {tab !== "all" && ` · ${INVOICE_TAB_LABELS[tab]}`}
                </p>
                {visible.map((invoice) => (
                  <CommissionInvoiceRow
                    key={invoice.id}
                    invoice={invoice}
                    busy={busyId === invoice.id}
                    numberById={numberById}
                    creditNoteByOriginal={creditNoteByOriginal}
                    onEdit={(inv) => navigate(`/admin/commissies/factuur-maken?invoiceId=${inv.id}`)}
                    onFinalize={(inv) => navigate(`/admin/commissies/factuur-maken?invoiceId=${inv.id}&finalize=1`)}
                    onDelete={setDeleteTarget}
                    onSend={setSendTarget}
                    onForward={forwardToSnelstart}
                    onMarkPaid={markAsPaid}
                    onCredit={setCreditTarget}
                    onOpenPdf={openPdf}
                    onRegeneratePdf={regeneratePdf}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {sendTarget && sendTarget.invoice_number && (
        <SendCommissionInvoiceDialog
          isOpen={!!sendTarget}
          onClose={() => setSendTarget(null)}
          commissionInvoiceId={sendTarget.id}
          defaultRecipient={sendTarget.recipient_email || sendTarget.partner?.contact_email || sendTarget.partner?.email || ""}
          recipientName={sendTarget.partner?.name || sendTarget.recipient_name}
          invoiceNumber={sendTarget.invoice_number}
          amountInclVat={Number(sendTarget.amount_incl_vat)}
          onSent={refresh}
        />
      )}

      <AlertDialog open={!!creditTarget} onOpenChange={(open) => !open && setCreditTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Factuur {creditTarget?.invoice_number} crediteren?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Er komt een creditnota met een eigen nummer voor {formatCurrency(Number(creditTarget?.amount_incl_vat ?? 0))} incl.
                  btw. De factuur zelf blijft bestaan als "Gecrediteerd" (de reeks blijft heel). De onderdelen en
                  inkoopfacturen erop komen terug bij "Te factureren", zodat je een nieuwe factuur kunt maken.
                </p>
                <div className="space-y-1">
                  <Label htmlFor="credit-reason">Reden (komt op de creditnota)</Label>
                  <Textarea
                    id="credit-reason"
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    rows={3}
                    placeholder="Bijv. verkeerde grondslag voor het diner"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={creditInvoice}>Crediteren</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concept verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Het concept voor {deleteTarget?.partner?.name || deleteTarget?.recipient_name} (
              {formatCurrency(Number(deleteTarget?.amount_incl_vat ?? 0))} incl. btw) wordt weggegooid. De onderdelen en
              inkoopfacturen erop komen terug bij "Te factureren". Er is nog geen nummer uitgegeven, dus de reeks blijft
              heel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={deleteDraft}>Verwijderen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

/** Hoort deze factuur in de tegel? (Alleen nodig voor het zicht "Te laat".) */
function totalsIncludes(invoice: CommissionInvoiceView, tab: InvoiceTab): boolean {
  return invoiceTabTotals([invoice])[tab].count > 0;
}
