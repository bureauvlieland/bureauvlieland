import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type CommissionInvoiceStatus = "draft" | "sent" | "forwarded" | "paid";

interface CommissionInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  partner_id: string;
  recipient_name: string;
  amount_excl_vat: number;
  vat_amount: number;
  amount_incl_vat: number;
  status: CommissionInvoiceStatus;
  pdf_path: string | null;
  sent_at: string | null;
  forwarded_to_accounting_at: string | null;
  paid_at: string | null;
  partner?: { id: string; name: string } | null;
}

const formatCurrency = (n: number) =>
  `€${Number(n).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminCommissionInvoices() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<CommissionInvoiceStatus | "all">("all");
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [forwardingId, setForwardingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

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
          id, invoice_number, invoice_date, due_date, partner_id, recipient_name,
          amount_excl_vat, vat_amount, amount_incl_vat, status, pdf_path,
          sent_at, forwarded_to_accounting_at, paid_at,
          partner:partners(id, name)
        `)
        .order("invoice_date", { ascending: false });

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (partnerFilter !== "all") query = query.eq("partner_id", partnerFilter);
      if (searchQuery) query = query.ilike("invoice_number", `%${searchQuery}%`);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any;
    },
  });

  const stats = (() => {
    const all = invoices || [];
    return {
      draft: all.filter((i) => i.status === "draft").length,
      sent: all.filter((i) => i.status === "sent").length,
      forwarded: all.filter((i) => i.status === "forwarded").length,
      paid: all.filter((i) => i.status === "paid").length,
      totalAmount: all.reduce((sum, i) => sum + Number(i.amount_incl_vat || 0), 0),
    };
  })();

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

  const forwardToSnelstart = async (invoice: CommissionInvoice) => {
    setForwardingId(invoice.id);
    try {
      const { error } = await supabase.functions.invoke("forward-commission-invoice", {
        body: { invoiceId: invoice.id },
      });
      if (error) throw error;
      toast.success(`${invoice.invoice_number} doorgestuurd naar Snelstart`);
      queryClient.invalidateQueries({ queryKey: ["commission-invoices"] });
    } catch (err) {
      console.error(err);
      toast.error("Fout bij doorsturen");
    } finally {
      setForwardingId(null);
    }
  };

  const markAsPaid = async (invoice: CommissionInvoice) => {
    setPayingId(invoice.id);
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
        .eq("id", invoice.id);
      if (error) throw error;

      // Mark linked items / quotes as paid
      const { data: lines } = await supabase
        .from("commission_invoice_lines")
        .select("item_id, quote_id")
        .eq("invoice_id", invoice.id);
      const itemIds = (lines || []).map((l: any) => l.item_id).filter(Boolean);
      const quoteIds = (lines || []).map((l: any) => l.quote_id).filter(Boolean);
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
      queryClient.invalidateQueries({ queryKey: ["commission-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
    } catch (err) {
      console.error(err);
      toast.error("Fout bij markeren als betaald");
    } finally {
      setPayingId(null);
    }
  };

  const getStatusBadge = (invoice: CommissionInvoice) => {
    switch (invoice.status) {
      case "draft":
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
            <FileText className="h-3 w-3 mr-1" />
            Concept
          </Badge>
        );
      case "sent":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Verzonden
          </Badge>
        );
      case "forwarded":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <ArrowRight className="h-3 w-3 mr-1" />
            Doorgestuurd
          </Badge>
        );
      case "paid":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Betaald
          </Badge>
        );
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

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardDescription>Concept</CardDescription>
              <CardTitle className="text-2xl">{stats.draft}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-2">
              <CardDescription>Verzonden</CardDescription>
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
              <CardDescription>Totaal incl. BTW</CardDescription>
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
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Alle statussen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  <SelectItem value="draft">Concept</SelectItem>
                  <SelectItem value="sent">Verzonden</SelectItem>
                  <SelectItem value="forwarded">Doorgestuurd</SelectItem>
                  <SelectItem value="paid">Betaald</SelectItem>
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
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>{invoice.partner?.name || invoice.recipient_name}</TableCell>
                      <TableCell>
                        {format(new Date(invoice.invoice_date), "EEE d MMM yyyy", { locale: nl })}
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
                          {invoice.pdf_path && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => downloadPdf(invoice)}
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          {(invoice.status === "sent" || invoice.status === "draft") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => forwardToSnelstart(invoice)}
                              title="Doorsturen naar Snelstart"
                              disabled={forwardingId === invoice.id}
                            >
                              {forwardingId === invoice.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {invoice.status !== "paid" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => markAsPaid(invoice)}
                              title="Markeer als betaald"
                              disabled={payingId === invoice.id}
                            >
                              {payingId === invoice.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
