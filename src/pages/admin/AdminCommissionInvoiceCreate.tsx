import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { format, addDays, parseISO } from "date-fns";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Download,
  Loader2,
  FileText,
  Lock,
  Save,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommissionBasis, ReconRow } from "@/lib/commissionReconciliation";
import {
  buildCommissionLineDrafts,
  parseAmountParam,
  parseBasisParam,
} from "@/lib/commissionInvoiceLines";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAppSettings } from "@/hooks/useAppSettings";
import { reportError } from "@/lib/errorReporting";
import {
  calculateCommissionInvoiceTotals,
  commissionAmountForLine,
} from "@/lib/commissionInvoiceTotals";
import { checkPartnerInvoiceDetails } from "@/lib/commissionInvoiceStatus";
import { renderAndStoreCommissionInvoicePdf } from "@/lib/commissionInvoicePdfStorage";
import {
  DRAFT_PDF_LABEL,
  buildCommissionInvoicePdf,
  bureauFromSettings,
  formatCurrencyNL,
  formatDateNL,
  paymentTermFromSettings,
} from "@/lib/commissionInvoicePdf";

interface InvoicePartner {
  id: string;
  name: string;
  email: string | null;
  contact_email?: string | null;
  kvk_number: string | null;
  address_street: string | null;
  address_postal: string | null;
  address_city: string | null;
}

type LineItemType = "activity" | "accommodation" | "purchase_invoice";

interface EditableLine {
  /** program_request_items.id, accommodation_quotes.id of partner_purchase_invoices.id. */
  sourceId: string;
  itemType: LineItemType;
  blockName: string;
  partnerInvoiceNumber: string | null;
  description: string;
  baseAmountExclVat: number; // grondslag (excl. BTW)
  commissionPct: number;
  customerLabel: string;
  eventDate: string | null;
  reference: string | null;
  /** Grondslag: onze verkoopwaarde of de inkoopfactuur van de partner. */
  basis: CommissionBasis | null;
  /** Gevuld bij losse inkoopfacturen zonder gekoppeld programma-onderdeel. */
  purchaseInvoiceId: string | null;
}

const PARTNER_SELECT =
  "id, name, email, contact_email, kvk_number, address_street, address_postal, address_city";

const TYPE_LABELS: Record<LineItemType, string> = {
  activity: "Activiteit",
  accommodation: "Logies",
  purchase_invoice: "Losse inkoopfactuur",
};

/** Regel zoals save_commission_invoice_draft hem verwacht. */
const lineToPayload = (l: EditableLine) => ({
  item_id: l.itemType === "activity" ? l.sourceId : null,
  quote_id: l.itemType === "accommodation" ? l.sourceId : null,
  purchase_invoice_id: l.purchaseInvoiceId,
  commission_basis: l.basis,
  item_type: l.itemType,
  block_name: l.blockName,
  customer_label: l.customerLabel || null,
  event_date: l.eventDate,
  reference_number: l.reference,
  invoiced_amount_excl_vat: l.baseAmountExclVat,
  commission_percentage: l.commissionPct,
  description: l.description || null,
});

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

export default function AdminCommissionInvoiceCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getSetting, isLoading: isAppSettingsLoading } = useAppSettings();

  /** Bestaand concept bewerken (vanuit het overzicht). */
  const invoiceIdParam = searchParams.get("invoiceId");
  const itemIdsParam = searchParams.get("itemIds") || "";
  const quoteIdsParam = searchParams.get("quoteIds") || "";
  const invoiceIdsParam = searchParams.get("invoiceIds") || "";
  const basisParam = searchParams.get("basis") || "";
  const amountsParam = searchParams.get("amounts") || "";
  const itemIds = useMemo(() => itemIdsParam.split(",").filter(Boolean), [itemIdsParam]);
  const quoteIds = useMemo(() => quoteIdsParam.split(",").filter(Boolean), [quoteIdsParam]);
  const invoiceIds = useMemo(() => invoiceIdsParam.split(",").filter(Boolean), [invoiceIdsParam]);
  /** Map van bron-id → gekozen commissiegrondslag (uit de werklijst). */
  const basisById = useMemo(() => parseBasisParam(basisParam), [basisParam]);
  /** Map van bron-id → grondslagbedrag zoals de werklijst het berekende (controle). */
  const amountById = useMemo(() => parseAmountParam(amountsParam), [amountsParam]);

  const [isLoading, setIsLoading] = useState(true);
  const [partner, setPartner] = useState<InvoicePartner | null>(null);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [paymentTermDays, setPaymentTermDays] = useState(14);
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 14));
  const [notes, setNotes] = useState("");
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(invoiceIdParam);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  /** Regels waar de herberekende grondslag afwijkt van wat de werklijst toonde. */
  const [baseMismatches, setBaseMismatches] = useState<
    Array<{ label: string; expected: number; actual: number }>
  >([]);
  /** De vervaldatum van een geladen concept mag de instelling niet overschrijven. */
  const dueDateFromDraft = useRef(false);

  const bureau = useMemo(() => bureauFromSettings(getSetting), [getSetting]);
  const settingPaymentTermDays = paymentTermFromSettings(getSetting);

  useEffect(() => {
    setPaymentTermDays(settingPaymentTermDays);
    if (!dueDateFromDraft.current) setDueDate(addDays(invoiceDate, settingPaymentTermDays));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingPaymentTermDays]);

  useEffect(() => {
    if (invoiceIdParam) {
      fetchDraft(invoiceIdParam);
      return;
    }
    if (itemIds.length === 0 && quoteIds.length === 0 && invoiceIds.length === 0) {
      toast.error("Geen items geselecteerd");
      navigate("/admin/commissies");
      return;
    }
    fetchFromWorklist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPartner = async (partnerId: string): Promise<InvoicePartner | null> => {
    const { data, error } = await supabase
      .from("partners")
      .select(PARTNER_SELECT)
      .eq("id", partnerId)
      .maybeSingle();
    if (error) throw error;
    return (data as InvoicePartner | null) ?? null;
  };

  /** Nieuwe factuur: de regels komen uit de selectie in de werklijst. */
  const fetchFromWorklist = async () => {
    setIsLoading(true);
    try {
      // Eén bron van waarheid: dezelfde reconciliatie die de werklijst gebruikt.
      const { data, error } = await supabase.functions.invoke("get-commission-reconciliation", {
        body: {},
      });
      if (error) throw error;
      const rows = ((data as { rows?: ReconRow[] } | null)?.rows ?? []) as ReconRow[];

      const drafts = buildCommissionLineDrafts({
        rows,
        itemIds,
        quoteIds,
        invoiceIds,
        basisById,
        amountById,
        formatDate: formatDateNL,
      });

      if (drafts.length === 0) {
        toast.error("Geselecteerde regels niet gevonden in de commissiewerklijst");
        navigate("/admin/commissies");
        return;
      }

      const partnerIds = new Set(drafts.map((d) => d.partnerId));
      if (partnerIds.size > 1) {
        toast.error("Geselecteerde items behoren tot meerdere partners");
        navigate("/admin/commissies");
        return;
      }
      const partnerId = partnerIds.values().next().value as string;
      const partnerData = await loadPartner(partnerId);
      if (!partnerData) {
        toast.error("Partner niet gevonden");
        navigate("/admin/commissies");
        return;
      }
      setPartner(partnerData);

      setLines(
        drafts.map((draft) => ({
          sourceId: draft.sourceId,
          itemType: draft.itemType,
          blockName: draft.blockName,
          partnerInvoiceNumber: draft.partnerInvoiceNumber,
          description: draft.description,
          baseAmountExclVat: draft.baseAmountExclVat,
          commissionPct: draft.commissionPct,
          customerLabel: draft.customerLabel,
          eventDate: draft.eventDate,
          reference: draft.reference,
          basis: draft.basis,
          purchaseInvoiceId: draft.purchaseInvoiceId,
        })),
      );
      setBaseMismatches(
        drafts
          .filter((d) => d.hasBaseMismatch)
          .map((d) => ({
            label: d.blockName,
            expected: d.expectedBaseAmount ?? 0,
            actual: d.baseAmountExclVat,
          })),
      );
    } catch (err) {
      reportError(err, { where: "AdminCommissionInvoiceCreate: Error loading commission invoice source" });
      toast.error("Fout bij laden gegevens");
      navigate("/admin/commissies");
    } finally {
      setIsLoading(false);
    }
  };

  /** Bestaand concept: kop en regels uit de database. */
  const fetchDraft = async (invoiceId: string) => {
    setIsLoading(true);
    try {
      const { data: invoice, error } = await supabase
        .from("commission_invoices")
        .select("id, status, partner_id, invoice_date, due_date, notes")
        .eq("id", invoiceId)
        .maybeSingle();
      if (error) throw error;
      if (!invoice) {
        toast.error("Commissiefactuur niet gevonden");
        navigate("/admin/commissies/facturen");
        return;
      }
      if (invoice.status !== "draft") {
        toast.error("Alleen een concept kan worden bewerkt");
        navigate("/admin/commissies/facturen");
        return;
      }

      const [{ data: lineRows, error: linesError }, partnerData] = await Promise.all([
        supabase
          .from("commission_invoice_lines")
          .select("*")
          .eq("invoice_id", invoiceId)
          .order("sort_order"),
        loadPartner(invoice.partner_id),
      ]);
      if (linesError) throw linesError;
      if (!partnerData) {
        toast.error("Partner niet gevonden");
        navigate("/admin/commissies/facturen");
        return;
      }

      setPartner(partnerData);
      setLines(
        (lineRows ?? []).map((r) => ({
          sourceId: r.item_id ?? r.quote_id ?? r.purchase_invoice_id ?? r.id,
          itemType: (r.item_type as LineItemType) || "activity",
          blockName: r.block_name,
          partnerInvoiceNumber: null,
          description: r.description ?? "",
          baseAmountExclVat: Number(r.invoiced_amount_excl_vat) || 0,
          commissionPct: Number(r.commission_percentage) || 0,
          customerLabel: r.customer_label ?? "",
          eventDate: r.event_date,
          reference: r.reference_number,
          basis: r.commission_basis === "sales" || r.commission_basis === "purchase" ? r.commission_basis : null,
          purchaseInvoiceId: r.purchase_invoice_id,
        })),
      );
      setInvoiceDate(parseISO(invoice.invoice_date));
      if (invoice.due_date) {
        dueDateFromDraft.current = true;
        setDueDate(parseISO(invoice.due_date));
      }
      setNotes(invoice.notes ?? "");
      setSavedInvoiceId(invoice.id);
    } catch (err) {
      reportError(err, { where: "AdminCommissionInvoiceCreate: Error loading draft" });
      toast.error("Fout bij laden van het concept");
      navigate("/admin/commissies/facturen");
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

  // Eén optelling voor scherm, PDF en database: per regel afronden, dan optellen.
  const totals = useMemo(() => calculateCommissionInvoiceTotals(lines), [lines]);
  const partnerCheck = useMemo(() => checkPartnerInvoiceDetails(partner), [partner]);

  /**
   * Concept opslaan: kop, regels, totalen en koppelingen in één transactie
   * (save_commission_invoice_draft). Een concept heeft geen nummer.
   */
  const saveDraft = async (): Promise<string | null> => {
    if (!partner) return null;
    if (lines.length === 0) {
      toast.error("Geen regels om te factureren");
      return null;
    }
    setIsSaving(true);
    try {
      const header = {
        partner_id: partner.id,
        invoice_date: format(invoiceDate, "yyyy-MM-dd"),
        due_date: format(dueDate, "yyyy-MM-dd"),
        recipient_name: partner.name,
        recipient_email: partner.contact_email || partner.email || null,
        recipient_address_street: partner.address_street,
        recipient_address_postal: partner.address_postal,
        recipient_address_city: partner.address_city,
        recipient_kvk_number: partner.kvk_number,
        notes: notes || null,
        vat_rate: totals.vatRate,
      };
      const { data, error } = await supabase.rpc("save_commission_invoice_draft", {
        p_invoice_id: savedInvoiceId,
        p_header: header,
        p_lines: lines.map(lineToPayload),
      });
      if (error) throw error;
      const id = data as string;
      if (!savedInvoiceId) {
        setSavedInvoiceId(id);
        // Na verversen komt hetzelfde concept terug, niet een nieuwe selectie.
        navigate(`/admin/commissies/factuur-maken?invoiceId=${id}`, { replace: true });
      }
      return id;
    } catch (err) {
      reportError(err, { where: "AdminCommissionInvoiceCreate: Save commission invoice error" });
      toast.error(errorMessage(err, "Fout bij opslaan"));
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const saveAndNotify = async () => {
    const id = await saveDraft();
    if (id) toast.success("Concept opgeslagen");
  };

  const buildPdfBlob = (invoiceNumber: string): Promise<Blob> => {
    if (!partner) throw new Error("Geen partner");
    return buildCommissionInvoicePdf({
      bureau,
      partner,
      invoiceNumber,
      invoiceDate,
      dueDate,
      paymentTermDays,
      notes: notes || null,
      vatRate: totals.vatRate,
      lines,
    });
  };

  /** Voorbeeld-PDF van het concept, zonder nummer. Slaat niets op. */
  const downloadPdf = async () => {
    setIsGenerating(true);
    try {
      const blob = await buildPdfBlob(DRAFT_PDF_LABEL);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Commissiefactuur-concept-${partner?.name ?? "partner"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      reportError(err, { where: "AdminCommissionInvoiceCreate" });
      toast.error("Fout bij genereren PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const requestFinalize = () => {
    if (lines.length === 0) {
      toast.error("Geen regels om te factureren");
      return;
    }
    if (partnerCheck.blocking.length > 0) {
      toast.error(`Partnergegevens onvolledig: ${partnerCheck.blocking.join(", ")}`);
      return;
    }
    setFinalizeOpen(true);
  };

  /**
   * Definitief maken: eerst het concept opslaan, dan geeft de database in één
   * transactie het nummer uit en zet de bronnen op gefactureerd. Daarna maakt
   * de browser de PDF met dat nummer en zet hem in de opslag.
   */
  const finalize = async () => {
    setFinalizeOpen(false);
    setIsFinalizing(true);
    try {
      const id = await saveDraft();
      if (!id) return;

      const { data, error } = await supabase.rpc("finalize_commission_invoice", {
        p_invoice_id: id,
      });
      if (error) throw error;
      const invoiceNumber = (Array.isArray(data) ? data[0] : data)?.invoice_number;
      if (!invoiceNumber) throw new Error("Geen factuurnummer ontvangen");

      try {
        // Uit de database, zodat de PDF op de cent gelijk is aan wat is opgeslagen.
        await renderAndStoreCommissionInvoicePdf(id, getSetting);
        toast.success(`Factuur ${invoiceNumber} is definitief. Verstuur hem vanuit het overzicht.`);
      } catch (pdfError) {
        // De factuur ís definitief; alleen de PDF ontbreekt. Het overzicht kan hem opnieuw maken.
        reportError(pdfError, { where: "AdminCommissionInvoiceCreate: PDF opslaan na definitief maken" });
        toast.warning(
          `Factuur ${invoiceNumber} is definitief, maar de PDF kon niet worden opgeslagen. Maak hem opnieuw vanuit het overzicht.`,
        );
      }
      navigate("/admin/commissies/facturen");
    } catch (err) {
      reportError(err, { where: "AdminCommissionInvoiceCreate: Finalize commission invoice error" });
      toast.error(errorMessage(err, "Fout bij definitief maken"));
    } finally {
      setIsFinalizing(false);
    }
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

  const busy = isGenerating || isSaving || isFinalizing;
  const title = savedInvoiceId ? "Concept bewerken" : "Commissiefactuur maken";

  return (
    <>
      <Helmet>
        <title>{title} | Admin | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AdminLayout>
        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to={savedInvoiceId ? "/admin/commissies/facturen" : "/admin/commissies"}>
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{title}</h1>
                <p className="text-muted-foreground">
                  {partner.name} • {lines.length} regel{lines.length === 1 ? "" : "s"} • Concept, nog zonder nummer
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={downloadPdf} disabled={busy || lines.length === 0}>
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Voorbeeld-PDF
              </Button>
              <Button variant="outline" onClick={saveAndNotify} disabled={busy || lines.length === 0}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Concept opslaan
              </Button>
              <Button onClick={requestFinalize} disabled={busy || lines.length === 0}>
                {isFinalizing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                Definitief maken
              </Button>
            </div>
          </div>

          {baseMismatches.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">Let op: grondslag afwijkend van de werklijst</p>
              <ul className="mt-1 list-disc pl-5 space-y-0.5">
                {baseMismatches.map((m) => (
                  <li key={m.label}>
                    {m.label}: werklijst {formatCurrencyNL(m.expected)} → nu {formatCurrencyNL(m.actual)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(partnerCheck.blocking.length > 0 || partnerCheck.warnings.length > 0) && (
            <div
              className={cn(
                "rounded-lg border p-4 text-sm",
                partnerCheck.blocking.length > 0
                  ? "border-destructive/40 bg-destructive/5 text-destructive"
                  : "border-amber-300 bg-amber-50 text-amber-900",
              )}
            >
              <p className="font-medium">
                {partnerCheck.blocking.length > 0
                  ? `Partnergegevens onvolledig: ${partnerCheck.blocking.join(", ")}. Zonder deze gegevens kan de factuur niet definitief worden.`
                  : `Ontbreekt bij de partner: ${partnerCheck.warnings.join(", ")}.`}
              </p>
              <p className="mt-1">
                <Link to={`/admin/partners/${partner.id}`} className="underline">
                  Partnergegevens aanvullen
                </Link>
                {" "}en daarna deze pagina verversen.
              </p>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Settings sidebar */}
            <Card className="lg:order-2">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold">Factuurgegevens</h3>

                <div className="space-y-2">
                  <Label>Factuurnummer</Label>
                  <p className="text-sm text-muted-foreground">
                    Concept. Het nummer (BVC-JJMM-NNNN) wordt uitgegeven bij "Definitief maken",
                    uit de reeks van de maand van de factuurdatum.
                  </p>
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
                  <p>{partner.contact_email || partner.email || "Geen e-mailadres"}</p>
                  <p>{partner.address_street}</p>
                  <p>{[partner.address_postal, partner.address_city].filter(Boolean).join(" ")}</p>
                  {partner.kvk_number && <p>KvK: {partner.kvk_number}</p>}
                </div>

                <Separator />

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotaal excl. BTW:</span>
                    <span className="font-medium tabular-nums">{formatCurrencyNL(totals.totalExclVat)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">BTW ({totals.vatRate}%):</span>
                    <span className="tabular-nums">{formatCurrencyNL(totals.totalVat)}</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold pt-1 border-t">
                    <span>Totaal incl. BTW:</span>
                    <span className="tabular-nums">{formatCurrencyNL(totals.totalInclVat)}</span>
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
                  <div className="p-6 space-y-4">
                    {lines.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Geen regels. Kies regels in de werklijst, of verwijder dit concept vanuit het overzicht.
                      </p>
                    )}
                    {lines.map((l, idx) => {
                      const subtotal = commissionAmountForLine(l);
                      return (
                        <div key={`${l.sourceId}-${idx}`} className="border rounded-lg p-4 space-y-3 bg-card">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-1">
                              <Input
                                value={l.description}
                                onChange={(e) => updateLine(idx, { description: e.target.value })}
                                className="font-medium"
                              />
                              <p className="text-xs text-muted-foreground">
                                {TYPE_LABELS[l.itemType]}
                                {l.reference && ` • ${l.reference}`}
                                {l.partnerInvoiceNumber && ` • Partnerfactuur ${l.partnerInvoiceNumber}`}
                                {l.basis && ` • Grondslag: ${l.basis === "purchase" ? "inkoopfactuur" : "verkoopwaarde"}`}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLine(idx)}
                              title="Regel verwijderen"
                              disabled={busy}
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
                                {formatCurrencyNL(subtotal)}
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

      <AlertDialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Factuur definitief maken?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  De factuur voor {partner.name} krijgt het volgende nummer uit de reeks van{" "}
                  {format(invoiceDate, "MMMM yyyy", { locale: nl })} en ligt daarna vast:{" "}
                  {lines.length} regel{lines.length === 1 ? "" : "s"},{" "}
                  {formatCurrencyNL(totals.totalExclVat)} excl. btw,{" "}
                  {formatCurrencyNL(totals.totalInclVat)} incl. btw.
                </p>
                <p>
                  De onderdelen gaan op "gefactureerd". Een fout corrigeer je daarna alleen nog met een
                  creditnota.
                </p>
                {partnerCheck.warnings.length > 0 && (
                  <p>Ontbreekt bij de partner: {partnerCheck.warnings.join(", ")}.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={finalize}>Definitief maken</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
