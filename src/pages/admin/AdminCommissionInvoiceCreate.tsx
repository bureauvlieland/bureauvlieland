import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Download,
  Loader2,
  FileText,
  Mail,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAppSettings } from "@/hooks/useAppSettings";
import { renderInvoicePdf, type InvoiceCategory, type InvoiceLineRow } from "@/lib/invoicePdfRenderer";
import { SendCommissionInvoiceDialog } from "@/components/admin/SendCommissionInvoiceDialog";

interface SourceItem {
  id: string;
  block_name: string;
  invoiced_amount: number | null;
  invoiced_number: string | null;
  invoiced_date: string | null;
  commission_percentage: number;
  commission_amount: number | null;
  provider_id: string;
  provider_name: string;
  item_type: "activity" | "accommodation";
  vat_rate?: number;
  program_requests: {
    id: string;
    customer_name: string;
    customer_company: string | null;
    selected_dates: unknown;
    reference_number?: string | null;
  } | null;
  accommodation_requests: {
    id: string;
    customer_name: string;
    customer_company: string | null;
    arrival_date: string;
    departure_date: string;
    reference_number?: string | null;
  } | null;
  partner: {
    id: string;
    name: string;
    email: string;
    contact_email?: string | null;
    kvk_number: string | null;
    address_street: string | null;
    address_postal: string | null;
    address_city: string | null;
  } | null;
}

interface EditableLine {
  source: SourceItem;
  description: string;
  baseAmountExclVat: number; // grondslag (excl. BTW)
  commissionPct: number;
  customerLabel: string;
  eventDate: string | null;
  reference: string | null;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);

const formatDateNL = (dateStr?: string | null) => {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "d MMM yyyy", { locale: nl });
  } catch {
    return dateStr;
  }
};

export default function AdminCommissionInvoiceCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getSetting, isLoading: isAppSettingsLoading } = useAppSettings();
  const pdfRef = useRef<HTMLDivElement>(null);

  const itemIdsParam = searchParams.get("itemIds") || "";
  const quoteIdsParam = searchParams.get("quoteIds") || "";
  const itemIds = useMemo(() => itemIdsParam.split(",").filter(Boolean), [itemIdsParam]);
  const quoteIds = useMemo(() => quoteIdsParam.split(",").filter(Boolean), [quoteIdsParam]);

  const [isLoading, setIsLoading] = useState(true);
  const [partner, setPartner] = useState<SourceItem["partner"]>(null);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [paymentTermDays, setPaymentTermDays] = useState(14);
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 14));
  const [notes, setNotes] = useState("");
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null);
  const [savedInvoiceNumber, setSavedInvoiceNumber] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  // Bureau details
  const companyName = getSetting<string>("bureau_company_name", "Bureau Vlieland");
  const legalName = getSetting<string>("bureau_legal_name", "Bureau Vlieland B.V.");
  const kvkNumber = getSetting<string>("bureau_kvk_number", "");
  const vatNumber = getSetting<string>("bureau_vat_number", "");
  const street = getSetting<string>("bureau_street", "");
  const postalCode = getSetting<string>("bureau_postal_code", "");
  const city = getSetting<string>("bureau_city", "");
  const phone = getSetting<string>("bureau_phone", "");
  const websiteSetting = getSetting<string>("bureau_website", "bureauvlieland.nl");
  const iban = getSetting<string>("bureau_iban", "");
  const adminEmail = getSetting<string>("bureau_admin_email", "administratie@bureauvlieland.nl");
  const settingPaymentTermDays =
    Number(getSetting<number | string>("bureau_payment_term_days", 14)) || 14;

  useEffect(() => {
    setPaymentTermDays(settingPaymentTermDays);
    setDueDate(addDays(invoiceDate, settingPaymentTermDays));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingPaymentTermDays]);

  useEffect(() => {
    if (itemIds.length === 0 && quoteIds.length === 0) {
      toast.error("Geen items geselecteerd");
      navigate("/admin/commissies");
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let activityRows: any[] = [];
      let quoteRows: any[] = [];

      if (itemIds.length > 0) {
        const { data, error } = await supabase
          .from("program_request_items")
          .select(`
            id, block_name, invoiced_amount, invoiced_number, invoiced_date,
            commission_percentage, commission_amount, commission_status,
            provider_id, provider_name,
            program_requests!inner(id, customer_name, customer_company, selected_dates, reference_number)
          `)
          .in("id", itemIds);
        if (error) throw error;
        activityRows = data || [];
      }

      if (quoteIds.length > 0) {
        const { data, error } = await supabase
          .from("accommodation_quotes")
          .select(`
            id, accommodation_name, partner_id,
            invoiced_amount, invoiced_number, invoiced_date, vat_rate, price_includes_vat,
            commission_percentage, commission_amount, commission_status,
            accommodation_requests!inner(id, customer_name, customer_company, arrival_date, departure_date, reference_number)
          `)
          .in("id", quoteIds);
        if (error) throw error;
        quoteRows = data || [];
      }

      // Determine partner ids and ensure all from same partner
      const partnerIds = new Set<string>();
      activityRows.forEach((r) => partnerIds.add(r.provider_id));
      quoteRows.forEach((r) => partnerIds.add(r.partner_id));
      if (partnerIds.size > 1) {
        toast.error("Geselecteerde items behoren tot meerdere partners");
        navigate("/admin/commissies");
        return;
      }
      const partnerId = partnerIds.values().next().value as string;

      const { data: partnerData } = await supabase
        .from("partners")
        .select("id, name, email, contact_email, kvk_number, address_street, address_postal, address_city, accommodation_commission_percentage, commission_percentage")
        .eq("id", partnerId)
        .maybeSingle();

      setPartner(partnerData as any);

      const editable: EditableLine[] = [];

      for (const row of activityRows) {
        const customerLabel =
          row.program_requests?.customer_company || row.program_requests?.customer_name || "Klant";
        const dates = row.program_requests?.selected_dates as string[] | null;
        const eventDate = Array.isArray(dates) && dates.length > 0 ? dates[0] : null;
        // Grondslag: invoiced_amount is incl. BTW (sale to customer); we use invoiced_amount excl. VAT (21%)
        // Convention: partners invoice excl. VAT in NL, but to be safe we use invoiced_amount as-is (treated as excl. VAT for commission base, matching existing logic where commission_amount is computed from amount_excl_vat × pct%).
        // We back-out the original base from commission_amount/pct if available.
        const pct = Number(row.commission_percentage) || 15;
        const baseFromCommission = pct > 0 && row.commission_amount
          ? Number(row.commission_amount) / (pct / 100)
          : Number(row.invoiced_amount) || 0;

        editable.push({
          source: { ...row, item_type: "activity", partner: partnerData as any, accommodation_requests: null } as any,
          description: `Commissie ${row.block_name} – ${customerLabel}${eventDate ? ` – ${formatDateNL(eventDate)}` : ""}`,
          baseAmountExclVat: Math.round(baseFromCommission * 100) / 100,
          commissionPct: pct,
          customerLabel,
          eventDate,
          reference: row.program_requests?.reference_number || null,
        });
      }

      for (const row of quoteRows) {
        const customerLabel =
          row.accommodation_requests?.customer_company || row.accommodation_requests?.customer_name || "Klant";
        const eventDate = row.accommodation_requests?.arrival_date || null;
        const pct = Number(row.commission_percentage) || 10;
        const baseFromCommission = pct > 0 && row.commission_amount
          ? Number(row.commission_amount) / (pct / 100)
          : Number(row.invoiced_amount) || 0;

        editable.push({
          source: {
            id: row.id,
            block_name: row.accommodation_name,
            invoiced_amount: row.invoiced_amount,
            invoiced_number: row.invoiced_number,
            invoiced_date: row.invoiced_date,
            commission_percentage: pct,
            commission_amount: row.commission_amount,
            provider_id: row.partner_id,
            provider_name: partnerData?.name || "",
            item_type: "accommodation",
            partner: partnerData as any,
            program_requests: null,
            accommodation_requests: row.accommodation_requests as any,
          },
          description: `Commissie logies ${row.accommodation_name} – ${customerLabel}${eventDate ? ` – ${formatDateNL(eventDate)}` : ""}`,
          baseAmountExclVat: Math.round(baseFromCommission * 100) / 100,
          commissionPct: pct,
          customerLabel,
          eventDate,
          reference: row.accommodation_requests?.reference_number || null,
        });
      }

      setLines(editable);

      // Suggest invoice number — placeholder; final number is generated by DB trigger on save
      const suggested = `BVC-${format(new Date(), "yyMM")}-XXXX`;
      setInvoiceNumber(suggested);
    } catch (err) {
      console.error("Error loading commission invoice source:", err);
      toast.error("Fout bij laden gegevens");
      navigate("/admin/commissies");
    } finally {
      setIsLoading(false);
    }
  };

  const updateLine = (idx: number, patch: Partial<EditableLine>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const totals = useMemo(() => {
    const exclVat = lines.reduce(
      (sum, l) => sum + (l.baseAmountExclVat * l.commissionPct) / 100,
      0
    );
    const vatRate = 21;
    const vat = exclVat * (vatRate / 100);
    return {
      totalExclVat: Math.round(exclVat * 100) / 100,
      vatRate,
      totalVat: Math.round(vat * 100) / 100,
      totalInclVat: Math.round((exclVat + vat) * 100) / 100,
    };
  }, [lines]);

  // Save invoice header + lines (status=draft) and return invoice id + number
  const saveInvoice = async (): Promise<{ id: string; invoiceNumber: string } | null> => {
    if (!partner) return null;
    if (lines.length === 0) {
      toast.error("Geen regels om te factureren");
      return null;
    }
    if (savedInvoiceId) {
      return { id: savedInvoiceId, invoiceNumber: savedInvoiceNumber };
    }
    setIsSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;

      const insertHeader = {
        invoice_number: invoiceNumber.includes("XXXX") ? null : invoiceNumber,
        invoice_date: format(invoiceDate, "yyyy-MM-dd"),
        due_date: format(dueDate, "yyyy-MM-dd"),
        partner_id: partner.id,
        recipient_name: partner.name,
        recipient_email: partner.contact_email || partner.email,
        recipient_address_street: partner.address_street,
        recipient_address_postal: partner.address_postal,
        recipient_address_city: partner.address_city,
        recipient_kvk_number: partner.kvk_number,
        amount_excl_vat: totals.totalExclVat,
        vat_rate: totals.vatRate,
        vat_amount: totals.totalVat,
        amount_incl_vat: totals.totalInclVat,
        status: "draft",
        notes: notes || null,
        created_by: userId,
      };

      const { data: invRow, error: invErr } = await supabase
        .from("commission_invoices")
        .insert(insertHeader as any)
        .select("id, invoice_number")
        .single();
      if (invErr) throw invErr;

      const lineInserts = lines.map((l, idx) => ({
        invoice_id: invRow.id,
        item_id: l.source.item_type === "activity" ? l.source.id : null,
        quote_id: l.source.item_type === "accommodation" ? l.source.id : null,
        item_type: l.source.item_type,
        block_name: l.source.block_name,
        customer_label: l.customerLabel,
        event_date: l.eventDate,
        reference_number: l.reference,
        invoiced_amount_excl_vat: l.baseAmountExclVat,
        commission_percentage: l.commissionPct,
        commission_amount: Math.round(((l.baseAmountExclVat * l.commissionPct) / 100) * 100) / 100,
        description: l.description,
        sort_order: idx,
      }));

      const { error: linesErr } = await supabase
        .from("commission_invoice_lines")
        .insert(lineInserts as any);
      if (linesErr) throw linesErr;

      setSavedInvoiceId(invRow.id);
      setSavedInvoiceNumber(invRow.invoice_number);
      setInvoiceNumber(invRow.invoice_number);
      toast.success(`Concept ${invRow.invoice_number} opgeslagen`);
      return { id: invRow.id, invoiceNumber: invRow.invoice_number };
    } catch (err) {
      console.error("Save commission invoice error:", err);
      toast.error(err instanceof Error ? err.message : "Fout bij opslaan");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const buildPdfBlob = async (): Promise<Blob | null> => {
    if (!partner) return null;
    const fmt = (n: number) => formatCurrency(n);

    const rows: InvoiceLineRow[] = lines.map((l) => {
      const subtotal = (l.baseAmountExclVat * l.commissionPct) / 100;
      return {
        description: l.description,
        subDescription: l.reference ? `Ref: ${l.reference}` : undefined,
        qty: "1",
        unitPrice: `${fmt(l.baseAmountExclVat)} × ${l.commissionPct}%`,
        amount: fmt(subtotal),
      };
    });

    const categories: InvoiceCategory[] = [{ label: "Commissie", rows }];

    const eventDates = lines
      .map((l) => l.eventDate)
      .filter(Boolean)
      .sort();
    const deliveryDate =
      eventDates.length > 0
        ? eventDates.length === 1
          ? formatDateNL(eventDates[0]!)
          : `${formatDateNL(eventDates[0]!)} – ${formatDateNL(eventDates[eventDates.length - 1]!)}`
        : undefined;

    const numberToUse = savedInvoiceNumber || invoiceNumber;

    const blob = await renderInvoicePdf({
      bureau: {
        legalName: legalName || companyName,
        street,
        postalCode,
        city,
        phone,
        email: adminEmail,
        website: websiteSetting,
        iban,
        kvkNumber,
        vatNumber,
      },
      customer: {
        name: partner.name,
        street: partner.address_street ?? undefined,
        postalCity:
          [partner.address_postal, partner.address_city].filter(Boolean).join(" ") || undefined,
        customerNumber: partner.id,
      },
      meta: {
        invoiceNumber: numberToUse,
        invoiceDate,
        dueDate,
        paymentTermDays,
        deliveryDate,
      },
      categories,
      totals: {
        totalExclVat: totals.totalExclVat,
        totalVat: totals.totalVat,
        totalInclVat: totals.totalInclVat,
        vatLines: [
          { rate: totals.vatRate, exclVat: totals.totalExclVat, vatAmount: totals.totalVat },
        ],
      },
      notes: notes || `Commissie conform partneraanbod. Voldoening binnen ${paymentTermDays} dagen op ${iban || "ons IBAN"}.`,
    });
    return blob;
  };

  const downloadPdf = async () => {
    setIsGenerating(true);
    try {
      // Save first so the PDF gets the official invoice number
      const saved = await saveInvoice();
      if (!saved) return;
      const blob = await buildPdfBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Commissiefactuur-${saved.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("PDF gedownload");
    } catch (err) {
      console.error(err);
      toast.error("Fout bij genereren PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const openSendDialog = async () => {
    const saved = await saveInvoice();
    if (saved) setSendDialogOpen(true);
  };

  if (isLoading || isAppSettingsLoading) {
    return (
      <AdminLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[600px]" />
        </div>
      </AdminLayout>
    );
  }

  if (!partner) return null;

  return (
    <>
      <Helmet>
        <title>Commissiefactuur Maken | Admin | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AdminLayout>
        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/admin/commissies">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Commissiefactuur maken</h1>
                <p className="text-muted-foreground">
                  {partner.name} • {lines.length} regel{lines.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={downloadPdf} disabled={isGenerating || isSaving}>
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download PDF
              </Button>
              <Button onClick={openSendDialog} disabled={isGenerating || isSaving || lines.length === 0}>
                <Mail className="h-4 w-4 mr-2" />
                Verstuur naar partner
              </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Settings sidebar */}
            <Card className="lg:order-2">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold">Factuurgegevens</h3>

                <div className="space-y-2">
                  <Label>Factuurnummer</Label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    disabled={!!savedInvoiceId}
                  />
                  {!savedInvoiceId && (
                    <p className="text-xs text-muted-foreground">
                      Definitief nummer wordt gegenereerd bij opslaan (BVC-JJMM-XXXX).
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Factuurdatum</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(invoiceDate, "d MMMM yyyy", { locale: nl })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={invoiceDate}
                        onSelect={(date) => {
                          if (date) {
                            setInvoiceDate(date);
                            setDueDate(addDays(date, paymentTermDays));
                          }
                        }}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Vervaldatum (betaaltermijn {paymentTermDays} dagen)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(dueDate, "d MMMM yyyy", { locale: nl })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={(date) => date && setDueDate(date)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Opmerkingen</Label>
                  <Textarea
                    placeholder="Bijv. periode, betaalinstructies..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                  />
                </div>

                <Separator />

                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Ontvanger: {partner.name}</p>
                  <p>{partner.address_street}</p>
                  <p>{[partner.address_postal, partner.address_city].filter(Boolean).join(" ")}</p>
                  {partner.kvk_number && <p>KvK: {partner.kvk_number}</p>}
                </div>

                <Separator />

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotaal excl. BTW:</span>
                    <span className="font-medium tabular-nums">{formatCurrency(totals.totalExclVat)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">BTW (21%):</span>
                    <span className="tabular-nums">{formatCurrency(totals.totalVat)}</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold pt-1 border-t">
                    <span>Totaal incl. BTW:</span>
                    <span className="tabular-nums">{formatCurrency(totals.totalInclVat)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Editable lines */}
            <div className="lg:col-span-2 lg:order-1">
              <Card>
                <CardContent className="p-0">
                  <div className="bg-slate-100 p-4 rounded-t-lg border-b flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Factuurregels</span>
                  </div>
                  <div ref={pdfRef} className="p-6 space-y-4">
                    {lines.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Geen regels geselecteerd.
                      </p>
                    )}
                    {lines.map((l, idx) => {
                      const subtotal = (l.baseAmountExclVat * l.commissionPct) / 100;
                      return (
                        <div key={l.source.id} className="border rounded-lg p-4 space-y-3 bg-card">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-1">
                              <Input
                                value={l.description}
                                onChange={(e) => updateLine(idx, { description: e.target.value })}
                                className="font-medium"
                              />
                              <p className="text-xs text-muted-foreground">
                                {l.source.item_type === "activity" ? "Activiteit" : "Logies"}
                                {l.reference && ` • ${l.reference}`}
                                {l.source.invoiced_number && ` • Partnerfactuur ${l.source.invoiced_number}`}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLine(idx)}
                              title="Regel verwijderen"
                              disabled={!!savedInvoiceId}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-3 items-end">
                            <div className="space-y-1">
                              <Label className="text-xs">Grondslag (excl. BTW)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={l.baseAmountExclVat}
                                onChange={(e) =>
                                  updateLine(idx, { baseAmountExclVat: Number(e.target.value) })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Commissie %</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={l.commissionPct}
                                onChange={(e) =>
                                  updateLine(idx, { commissionPct: Number(e.target.value) })
                                }
                              />
                            </div>
                            <div className="text-right">
                              <Label className="text-xs">Commissie excl. BTW</Label>
                              <p className="font-semibold tabular-nums text-lg">
                                {formatCurrency(subtotal)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AdminLayout>

      {savedInvoiceId && (
        <SendCommissionInvoiceDialog
          isOpen={sendDialogOpen}
          onClose={() => setSendDialogOpen(false)}
          commissionInvoiceId={savedInvoiceId}
          defaultRecipient={partner.contact_email || partner.email || ""}
          recipientName={partner.name}
          invoiceNumber={savedInvoiceNumber || invoiceNumber}
          amountInclVat={totals.totalInclVat}
          onGeneratePdf={buildPdfBlob}
          onSent={() => {
            navigate("/admin/commissies/facturen");
          }}
        />
      )}
    </>
  );
}
