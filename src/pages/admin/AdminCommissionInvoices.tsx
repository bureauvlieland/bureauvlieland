import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Receipt,
  Search,
  Mail,
  Check,
  Download,
  Clock,
  CheckCircle,
  ArrowRight,
  Euro,
  FileText,
  Loader2,
  Lock,
  Pencil,
  RefreshCw,
  Send,
  Trash2,
  Undo2,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { reportError } from "@/lib/errorReporting";
import { useAppSettings } from "@/hooks/useAppSettings";
import { SendCommissionInvoiceDialog } from "@/components/admin/SendCommissionInvoiceDialog";
import {
  COMMISSION_INVOICE_STATUS_LABELS,
  COMMISSION_INVOICE_STATUS_ORDER,
  commissionInvoiceActions,
  commissionInvoiceLabel,
  commissionInvoicePdfPath,
  countsTowardsTotal,
  type CommissionInvoiceStatus,
} from "@/lib/commissionInvoiceStatus";
import {
  buildCommissionInvoicePdf,
  bureauFromSettings,
  paymentTermFromSettings,
} from "@/lib/commissionInvoicePdf";

interface CommissionInvoice {
  id: string;
  invoice_number: string | null;
  invoice_date: string;
  due_date: string | null;
  partner_id: string;
  recipient_name: string;
  recipient_email: string | null;
  amount_excl_vat: number;
  vat_amount: number;
  amount_incl_vat: number;
  status: CommissionInvoiceStatus;
  pdf_path: string | null;
  notes: string | null;
  vat_rate: number;
  sent_at: string | null;
  forwarded_to_accounting_at: string | null;
  paid_at: string | null;
  partner?: { id: string; name: string; email: string | null; contact_email: string | null } | null;
}

const formatCurrency = (n: number) =>
  `€${Number(n).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

export default function AdminCommissionInvoices() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { getSetting } = useAppSettings();
  const [statusFilter, setStatusFilter] = useState<CommissionInvoiceStatus | "all">("all");
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sendTarget, setSendTarget] = useState<CommissionInvoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CommissionInvoice | null>(null);

  const { data: partners } = useQuery({
    queryKey: ["partners-for-commission-invoice-filter"],
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  const { data: invoices, isLoading } = useQuery<CommissionInvoice[]>({
    queryKey: ["commission-invoices", statusFilter, partnerFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("commission_invoices")
        .select(`
          id, invoice_number, invoice_date, due_date, partner_id, recipient_name, recipient_email,
          amount_excl_vat, vat_amount, amount_incl_vat, status, pdf_path, notes, vat_rate,
          sent_at, forwarded_to_accounting_at, paid_at,
          partner:partners(id, name, email, contact_email)
        `)
        .order("invoice_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (partnerFilter !== "all") query = query.eq("partner_id", partnerFilter);
      if (searchQuery) query = query.ilike("invoice_number", `%${searchQuery}%`);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as CommissionInvoice[];
    },
  });

  const stats = useMemo(() => {
    const all = invoices || [];
    const count = (status: CommissionInvoiceStatus) => all.filter((i) => i.status === status).length;
    return {
      draft: count("draft"),
      final: count("final"),
      sent: count("sent"),
      forwarded: count("forwarded"),
      paid: count("paid"),
      // Een concept is nog niets; alleen definitieve facturen tellen mee.
      totalAmount: all
        .filter((i) => countsTowardsTotal(i.status))
        .reduce((sum, i) => sum + Number(i.amount_incl_vat || 0), 0),
    };
  }, [invoices]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["commission-invoices"] });
    queryClient.invalidateQueries({ queryKey: ["commission-reconciliation"] });
    queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
  };

  const downloadPdf = async (invoice: CommissionInvoice) => {
    if (!invoice.pdf_path) {
      toast.error("Geen PDF beschikbaar");
      return;
    }
    const { data, error } = await supabase.storage
      .from("commission-invoices")
      .createSignedUrl(invoice.pdf_path, 60);
    if (error || !data) {
      toast.error("Fout bij ophalen PDF");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  /**
   * De PDF opnieuw maken uit de opgeslagen regels. Nodig als het opslaan na
   * "Definitief maken" mislukte; verder altijd hetzelfde resultaat.
   */
  const regeneratePdf = async (invoice: CommissionInvoice) => {
    if (!invoice.invoice_number) return;
    setBusyId(invoice.id);
    try {
      const [{ data: lines, error: linesError }, { data: partner, error: partnerError }] =
        await Promise.all([
          supabase
            .from("commission_invoice_lines")
            .select("description, reference_number, event_date, invoiced_amount_excl_vat, commission_percentage")
            .eq("invoice_id", invoice.id)
            .order("sort_order"),
          supabase
            .from("partners")
            .select("id, name, address_street, address_postal, address_city")
            .eq("id", invoice.partner_id)
            .maybeSingle(),
        ]);
      if (linesError) throw linesError;
      if (partnerError) throw partnerError;
      if (!partner) throw new Error("Partner niet gevonden");

      const invoiceDate = parseISO(invoice.invoice_date);
      const dueDate = invoice.due_date ? parseISO(invoice.due_date) : invoiceDate;
      const blob = await buildCommissionInvoicePdf({
        bureau: bureauFromSettings(getSetting),
        partner: { ...partner, name: invoice.recipient_name || partner.name },
        invoiceNumber: invoice.invoice_number,
        invoiceDate,
        dueDate,
        paymentTermDays: paymentTermFromSettings(getSetting),
        notes: invoice.notes,
        vatRate: Number(invoice.vat_rate) || undefined,
        lines: (lines ?? []).map((l) => ({
          description: l.description ?? "",
          reference: l.reference_number,
          eventDate: l.event_date,
          baseAmountExclVat: Number(l.invoiced_amount_excl_vat) || 0,
          commissionPct: Number(l.commission_percentage) || 0,
        })),
      });

      const path = commissionInvoicePdfPath(invoice.partner_id, invoice.invoice_number);
      const { error: uploadError } = await supabase.storage
        .from("commission-invoices")
        .upload(path, blob, { contentType: "application/pdf", upsert: true });
      if (uploadError) throw uploadError;
      const { error: pathError } = await supabase
        .from("commission_invoices")
        .update({ pdf_path: path })
        .eq("id", invoice.id);
      if (pathError) throw pathError;

      toast.success(`PDF van ${invoice.invoice_number} opnieuw gemaakt`);
      refresh();
    } catch (err) {
      reportError(err, { where: "AdminCommissionInvoices: regeneratePdf" });
      toast.error(errorMessage(err, "Fout bij maken van de PDF"));
    } finally {
      setBusyId(null);
    }
  };

  const deleteDraft = async () => {
    const invoice = deleteTarget;
    setDeleteTarget(null);
    if (!invoice) return;
    setBusyId(invoice.id);
    try {
      const { error } = await supabase.rpc("delete_commission_invoice_draft", {
        p_invoice_id: invoice.id,
      });
      if (error) throw error;
      toast.success("Concept verwijderd; de regels staan weer bij Te factureren");
      refresh();
    } catch (err) {
      reportError(err, { where: "AdminCommissionInvoices: deleteDraft" });
      toast.error(errorMessage(err, "Fout bij verwijderen"));
    } finally {
      setBusyId(null);
    }
  };

  const forwardToSnelstart = async (invoice: CommissionInvoice) => {
    setBusyId(invoice.id);
    try {
      const { error } = await supabase.functions.invoke("forward-commission-invoice", {
        body: { invoiceId: invoice.id },
      });
      if (error) throw error;
      toast.success(`${invoice.invoice_number} doorgestuurd naar Snelstart`);
      refresh();
    } catch (err) {
      reportError(err, { where: "AdminCommissionInvoices" });
      toast.error(errorMessage(err, "Fout bij doorsturen"));
    } finally {
      setBusyId(null);
    }
  };

  const markAsPaid = async (invoice: CommissionInvoice) => {
    setBusyId(invoice.id);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;

      const { error } = await supabase
        .from("commission_invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          paid_by: userId,
        })
        .eq("id", invoice.id)
        .in("status", ["sent", "forwarded"]);
      if (error) throw error;

      // Mark linked items / quotes as paid
      const { data: lines } = await supabase
        .from("commission_invoice_lines")
        .select("item_id, quote_id")
        .eq("invoice_id", invoice.id);
      const itemIds = (lines || []).map((l) => l.item_id).filter((id): id is string => !!id);
      const quoteIds = (lines || []).map((l) => l.quote_id).filter((id): id is string => !!id);
      if (itemIds.length > 0) {
        await supabase
          .from("program_request_items")
          .update({ commission_status: "paid" })
          .in("id", itemIds);
      }
      if (quoteIds.length > 0) {
        await supabase
          .from("accommodation_quotes")
          .update({ commission_status: "paid" })
          .in("id", quoteIds);
      }

      toast.success(`${invoice.invoice_number} gemarkeerd als betaald`);
      refresh();
    } catch (err) {
      reportError(err, { where: "AdminCommissionInvoices" });
      toast.error("Fout bij markeren als betaald");
    } finally {
      setBusyId(null);
    }
  };

  const getStatusBadge = (invoice: CommissionInvoice) => {
    const label = COMMISSION_INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status;
    switch (invoice.status) {
      case "draft":
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
            <FileText className="h-3 w-3 mr-1" />
            {label}
          </Badge>
        );
      case "final":
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-900 border-slate-300">
            <Lock className="h-3 w-3 mr-1" />
            {label}
          </Badge>
        );
      case "sent":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            {label}
          </Badge>
        );
      case "forwarded":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <ArrowRight className="h-3 w-3 mr-1" />
            {label}
          </Badge>
        );
      case "paid":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            {label}
          </Badge>
        );
      case "credited":
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">
            <Undo2 className="h-3 w-3 mr-1" />
            {label}
          </Badge>
        );
      default:
        return <Badge variant="outline">{label}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Helmet>
        <title>Commissiefacturen | Admin | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Receipt className="h-8 w-8" />
              Commissiefacturen
            </h1>
            <p className="text-muted-foreground">
              Uitgaande facturen aan partners voor commissie
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/admin/commissies">Terug naar commissies</Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardDescription>Concept</CardDescription>
              <CardTitle className="text-2xl">{stats.draft}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-slate-300">
            <CardHeader className="pb-2">
              <CardDescription>Definitief</CardDescription>
              <CardTitle className="text-2xl">{stats.final}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-2">
              <CardDescription>Verstuurd</CardDescription>
              <CardTitle className="text-2xl text-amber-700">{stats.sent}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-2">
              <CardDescription>Doorgestuurd</CardDescription>
              <CardTitle className="text-2xl text-blue-700">{stats.forwarded}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="pb-2">
              <CardDescription>Betaald</CardDescription>
              <CardTitle className="text-2xl text-green-700">{stats.paid}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Totaal incl. BTW (zonder concepten)</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-1">
                <Euro className="h-5 w-5" />
                {stats.totalAmount.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as CommissionInvoiceStatus | "all")}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Alle statussen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  {COMMISSION_INVOICE_STATUS_ORDER.map((status) => (
                    <SelectItem key={status} value={status}>
                      {COMMISSION_INVOICE_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={partnerFilter} onValueChange={setPartnerFilter}>
                <SelectTrigger className="w-[220px]">
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

              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek factuurnummer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Facturen</CardTitle>
            <CardDescription>{invoices?.length || 0} facturen gevonden</CardDescription>
          </CardHeader>
          <CardContent>
            {!invoices || invoices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Geen commissiefacturen gevonden</p>
                <p className="text-sm">
                  Maak een commissiefactuur via de Commissies-pagina (tab "Te factureren").
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Factuurnummer</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead className="text-right">Excl. BTW</TableHead>
                    <TableHead className="text-right">Incl. BTW</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => {
                    const actions = commissionInvoiceActions(invoice.status);
                    const busy = busyId === invoice.id;
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {commissionInvoiceLabel(invoice)}
                        </TableCell>
                        <TableCell>{invoice.partner?.name || invoice.recipient_name}</TableCell>
                        <TableCell>
                          {format(parseISO(invoice.invoice_date), "EEE d MMM yyyy", { locale: nl })}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(invoice.amount_excl_vat)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(invoice.amount_incl_vat)}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            {actions.edit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  navigate(`/admin/commissies/factuur-maken?invoiceId=${invoice.id}`)
                                }
                                title="Bewerken of definitief maken"
                                disabled={busy}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {actions.delete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteTarget(invoice)}
                                title="Concept verwijderen"
                                disabled={busy}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            {invoice.pdf_path && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => downloadPdf(invoice)}
                                title="Download PDF"
                                disabled={busy}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            {!invoice.pdf_path && invoice.invoice_number && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => regeneratePdf(invoice)}
                                title="PDF opnieuw maken"
                                disabled={busy}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                            {actions.send && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSendTarget(invoice)}
                                title={invoice.status === "sent" ? "Opnieuw versturen naar partner" : "Versturen naar partner"}
                                disabled={busy || !invoice.pdf_path}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            {actions.forward && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => forwardToSnelstart(invoice)}
                                title="Doorsturen naar Snelstart"
                                disabled={busy}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                            )}
                            {actions.markPaid && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => markAsPaid(invoice)}
                                title="Markeer als betaald"
                                disabled={busy}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {sendTarget && sendTarget.invoice_number && (
        <SendCommissionInvoiceDialog
          isOpen={!!sendTarget}
          onClose={() => setSendTarget(null)}
          commissionInvoiceId={sendTarget.id}
          defaultRecipient={
            sendTarget.recipient_email ||
            sendTarget.partner?.contact_email ||
            sendTarget.partner?.email ||
            ""
          }
          recipientName={sendTarget.partner?.name || sendTarget.recipient_name}
          invoiceNumber={sendTarget.invoice_number}
          amountInclVat={Number(sendTarget.amount_incl_vat)}
          onSent={refresh}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concept verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Het concept voor {deleteTarget?.partner?.name || deleteTarget?.recipient_name} (
              {formatCurrency(Number(deleteTarget?.amount_incl_vat ?? 0))} incl. btw) wordt weggegooid.
              De onderdelen en inkoopfacturen erop komen terug bij "Te factureren". Er is nog geen
              nummer uitgegeven, dus de reeks blijft heel.
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
