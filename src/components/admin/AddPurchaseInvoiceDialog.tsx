import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { isValidInvoiceNumberInput } from "@/lib/purchaseInvoiceConsistency";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import {
  Upload,
  Loader2,
  FileText,
  Sparkles,
  Check,
  ChevronsUpDown,
  CalendarIcon,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { evaluateSaveGuard } from "@/lib/purchaseInvoiceTotalMatch";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { calculateVatAmounts } from "@/lib/vatCalculation";
import { usePurchaseInvoices } from "@/hooks/usePurchaseInvoices";
import { usePurchaseInvoiceInbox } from "@/hooks/usePurchaseInvoiceInbox";
import type { PurchaseInvoiceInboxItem } from "@/types/purchaseInvoiceInbox";
import type { PurchaseInvoiceLine } from "@/types/purchaseInvoice";
import { useLikelyDuplicatePurchaseInvoice } from "@/lib/purchaseInvoiceDuplicateCheck";
import { looksLikeProjectReference } from "@/lib/purchaseInvoiceDuplicateRules";
import { useRegisterPartnerIban } from "@/hooks/usePartnerIbanSuggestions";
import { Checkbox } from "@/components/ui/checkbox";
import { reportError } from "@/lib/errorReporting";
import { buildLinesFromScan } from "@/lib/purchaseInvoiceScanLines";
import { suggestPartner } from "@/lib/purchaseInvoicePartnerSuggestion";
import {
  PROJECT_MATCH_LABELS,
  shouldPreselectProject,
  suggestProjectFromText,
} from "@/lib/purchaseInvoiceProjectSuggestion";

/**
 * Registreren van een inkoopfactuur: alleen wat de leverancier stuurt.
 *
 * Partner, project (als geheel), nummer, datum, bedragen en de orderregels
 * zoals gescand. Wat er van de factuur aan de klant wordt doorbelast, en op
 * welk onderdeel, wordt niet hier beslist maar op het project zelf — met het
 * hele programma in beeld (`docs/plan-inkoopfacturen-doorbelasten.md`).
 * Tot 16 oktober 2026 moest je hier per gescande regel een onderdeel kiezen
 * voordat je mocht opslaan; die blokken zijn weg.
 */

interface ScanLineItem {
  description: string;
  quantity: number | null;
  unit_price: number | null;
  total_excl_vat: number | null;
  vat_rate?: number | null;
}

interface ScanResult {
  invoice_number: string | null;
  invoice_date: string | null;
  supplier_name: string | null;
  supplier_iban?: string | null;
  amount_excl_vat: number | null;
  vat_rate: number | null;
  vat_amount: number | null;
  amount_incl_vat: number | null;
  description: string | null;
  /** De groep of opdrachtgever waarvoor het werk was, als de partner die noemt. */
  customer_reference?: string | null;
  line_items: ScanLineItem[];
  vat_breakdown?: Array<{ vat_rate: number; amount_excl: number; vat_amount: number }>;
}

interface LineRow {
  description: string;
  quantity: string;
  unit_price: string;
  vat_rate: string;
  /** Optionele override uit de PDF/scanner zodat we vat niet hoeven te herrekenen. */
  vat_amount_override?: string;
  amount_incl_override?: string;
  /** Interpretatie van de eenheidsprijs (default excl.). Als true wordt excl herrekend als unit/(1+rate/100). */
  unit_price_is_inclusive?: boolean;
}

interface AddPurchaseInvoiceDialogProps {
  open: boolean;
  onClose: () => void;
  defaultRequestId?: string;
  defaultPartnerId?: string;
  inboxItem?: PurchaseInvoiceInboxItem;
}

type Step = "upload" | "scanning" | "verify";

const emptyLine = (): LineRow => ({ description: "", quantity: "1", unit_price: "", vat_rate: "21" });

function computeLineTotals(line: LineRow) {
  const qty = parseFloat(line.quantity) || 0;
  const unit = parseFloat(line.unit_price) || 0;
  const rate = parseFloat(line.vat_rate) || 0;

  // Als de admin heeft aangevinkt dat de eenheidsprijs INCL. BTW is,
  // dan reken we excl uit als unit/(1+rate/100). Dit is de nieuwe safeguard
  // die voorkomt dat 11×€49,70 incl. per ongeluk als excl. verwerkt wordt.
  const unitIsIncl = line.unit_price_is_inclusive === true;
  const grossPerUnit = unit;
  const netPerUnit = unitIsIncl ? unit / (1 + rate / 100) : unit;
  const excl = qty * netPerUnit;
  const inclFromToggle = unitIsIncl ? qty * grossPerUnit : excl * (1 + rate / 100);

  // Overrides uit de scanner (BTW-bedrag of totaal-incl per regel) hebben voorrang
  // wanneer ze intern consistent zijn met het aantal × prijs excl. dat we hebben.
  const overrideVat =
    line.vat_amount_override != null && line.vat_amount_override !== ""
      ? parseFloat(line.vat_amount_override)
      : null;
  const overrideIncl =
    line.amount_incl_override != null && line.amount_incl_override !== ""
      ? parseFloat(line.amount_incl_override)
      : null;
  const useOverride =
    !unitIsIncl &&
    overrideVat != null &&
    !Number.isNaN(overrideVat) &&
    Math.abs(excl - (overrideIncl != null ? overrideIncl - overrideVat : excl)) < 0.02;
  const vat = useOverride ? (overrideVat as number) : (unitIsIncl ? inclFromToggle - excl : excl * (rate / 100));
  const incl = useOverride && overrideIncl != null ? overrideIncl : (unitIsIncl ? inclFromToggle : excl + vat);
  return {
    amount_excl_vat: Math.round(excl * 100) / 100,
    vat_amount: Math.round(vat * 100) / 100,
    amount_incl_vat: Math.round(incl * 100) / 100,
    vat_rate: rate,
  };
}

export function AddPurchaseInvoiceDialog({
  open,
  onClose,
  defaultRequestId,
  defaultPartnerId,
  inboxItem,
}: AddPurchaseInvoiceDialogProps) {
  const navigate = useNavigate();
  const { createInvoice } = usePurchaseInvoices();
  const { markProcessed } = usePurchaseInvoiceInbox();

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanFailed, setScanFailed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Form state
  const [partnerId, setPartnerId] = useState<string>(defaultPartnerId || "");
  const [requestId, setRequestId] = useState<string>(defaultRequestId || "");
  /** Het project dat op grond van ons referentienummer vast is voorgekozen. */
  const [autoPickedProjectId, setAutoPickedProjectId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(undefined);
  const [amountExcl, setAmountExcl] = useState<string>("");
  const [vatRate, setVatRate] = useState<string>("21");
  const [vatAmount, setVatAmount] = useState<string>("");
  const [amountIncl, setAmountIncl] = useState<string>("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<LineRow[]>([]);

  const [partnerSearchOpen, setPartnerSearchOpen] = useState(false);
  const [projectSearchOpen, setProjectSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptDuplicate, setAcceptDuplicate] = useState(false);
  // PDF-totaal verificatie (voorkomt de "Manege Seeruyter" bug: incl-vs-excl fout)
  const [pdfTotalIncl, setPdfTotalIncl] = useState<string>("");
  const [amountMismatchReason, setAmountMismatchReason] = useState<string>("");
  const [manuallyConfirmedNoPdfTotal, setManuallyConfirmedNoPdfTotal] = useState(false);

  // Dubbel-controle: zelfde partner + zelfde nummer, óf zelfde bedrag op
  // hetzelfde project / rond dezelfde datum. Die tweede vangt de factuur die
  // de partner onder ons projectnummer registreerde.
  const { data: duplicateMatch } = useLikelyDuplicatePurchaseInvoice(
    {
      partnerId,
      invoiceNumber,
      invoiceDate: invoiceDate ? format(invoiceDate, "yyyy-MM-dd") : null,
      amountInclVat: parseFloat(amountIncl) || null,
      requestId: requestId || null,
    },
    { enabled: open },
  );
  const duplicateInvoice = duplicateMatch?.invoice ?? null;
  const hasDuplicateWarning = !!duplicateInvoice;

  // Reset override when key fields change
  useEffect(() => {
    setAcceptDuplicate(false);
  }, [partnerId, invoiceNumber, amountIncl, requestId]);

  const { data: partners } = useQuery({
    queryKey: ["partners-active-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, name, iban")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const { data: projects } = useQuery({
    queryKey: ["program-requests-all-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_requests")
        .select("id, reference_number, customer_name, customer_company, created_at, status")
        .not("status", "in", "(cancelled,deleted)")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Reset on open
  useEffect(() => {
    if (!open) return;

    setScanFailed(false);
    setIsDragging(false);
    setAutoPickedProjectId(null);
    setPartnerId(defaultPartnerId || "");
    setRequestId(defaultRequestId || "");
    setVatAmount("");
    setAmountIncl("");
    setAmountMismatchReason("");
    setManuallyConfirmedNoPdfTotal(false);

    if (inboxItem) {
      setStep("verify");
      setFile(null);
      setFilePath(inboxItem.attachment_path || null);
      const result = inboxItem.scan_result as ScanResult | null;
      setScanResult(result);
      setInvoiceNumber(result?.invoice_number || "");
      if (result?.invoice_date) {
        const d = new Date(result.invoice_date);
        setInvoiceDate(!isNaN(d.getTime()) ? d : undefined);
      } else {
        setInvoiceDate(undefined);
      }
      setAmountExcl(result?.amount_excl_vat != null ? String(result.amount_excl_vat) : "");
      setVatRate(result?.vat_rate != null ? String(result.vat_rate) : "21");
      setPdfTotalIncl(result?.amount_incl_vat != null ? String(result.amount_incl_vat) : "");
      setDescription(result?.description || inboxItem.subject || "");
      setLines(buildLinesFromScan(result));
    } else {
      setStep("upload");
      setFile(null);
      setFilePath(null);
      setScanResult(null);
      setInvoiceNumber("");
      setInvoiceDate(undefined);
      setAmountExcl("");
      setVatRate("21");
      setPdfTotalIncl("");
      setDescription("");
      setLines([]);
    }
  }, [open, defaultRequestId, defaultPartnerId, inboxItem]);

  // When lines change, aggregate to header totals
  const lineTotals = useMemo(() => {
    if (lines.length === 0) return null;
    const byRate = new Map<number, { excl: number; vat: number }>();
    let totalExcl = 0;
    let totalVat = 0;
    for (const ln of lines) {
      const t = computeLineTotals(ln);
      totalExcl += t.amount_excl_vat;
      totalVat += t.vat_amount;
      const cur = byRate.get(t.vat_rate) || { excl: 0, vat: 0 };
      byRate.set(t.vat_rate, { excl: cur.excl + t.amount_excl_vat, vat: cur.vat + t.vat_amount });
    }
    const rates = Array.from(byRate.keys());
    const dominantRate = rates.length === 1 ? rates[0] : rates.reduce((a, b) => (byRate.get(a)!.excl >= byRate.get(b)!.excl ? a : b));
    return {
      totalExcl,
      totalVat,
      totalIncl: totalExcl + totalVat,
      byRate,
      isMixed: rates.length > 1,
      dominantRate,
    };
  }, [lines]);

  // Auto-sync header from lines when present
  useEffect(() => {
    if (lineTotals) {
      setAmountExcl(lineTotals.totalExcl.toFixed(2));
      setVatAmount(lineTotals.totalVat.toFixed(2));
      setAmountIncl(lineTotals.totalIncl.toFixed(2));
      setVatRate(String(lineTotals.dominantRate));
    }
  }, [lineTotals]);

  // When NO lines, recalc header vat amount from excl + rate
  useEffect(() => {
    if (lines.length > 0) return;
    const excl = parseFloat(amountExcl);
    const rate = parseFloat(vatRate);
    if (!isNaN(excl) && !isNaN(rate)) {
      const calc = calculateVatAmounts(excl, rate);
      setVatAmount(calc.vatAmount.toFixed(2));
      setAmountIncl(calc.amountInclVat.toFixed(2));
    }
  }, [amountExcl, vatRate, lines.length]);

  // Op IBAN, op naam, of op dezelfde woorden in een andere volgorde: "Jan van
  // Vlieland Fietsverhuur & Bagagevervoer" is bij ons "Fietsverhuur Jan van Vlieland".
  const suggestedPartnerId = useMemo(() => {
    if (!scanResult || !partners) return null;
    return suggestPartner(scanResult, partners)?.partnerId ?? null;
  }, [scanResult, partners]);

  /**
   * Partners zetten er vaak bij voor wie het werk was — "Groep: ..." onderaan de
   * factuur, of ons referentienummer. Die tekst hebben we al; hier zoeken we het
   * project erbij. Alles wat we van de factuur weten telt mee: de omschrijving
   * die de scanner eruit haalde, de regels zelf, en het onderwerp van de mail
   * waarmee hij binnenkwam.
   */
  const projectSuggestion = useMemo(() => {
    if (!projects || projects.length === 0) return null;
    const haystack = [
      // Het veld dat de scanner hier expliciet voor invult; de rest is vrije tekst
      // waarin de groep soms wél en soms niet terechtkomt.
      scanResult?.customer_reference,
      scanResult?.description,
      description,
      inboxItem?.subject,
      ...(scanResult?.line_items ?? []).map((li) => li.description),
      ...lines.map((l) => l.description),
    ]
      .filter(Boolean)
      .join(" ");
    return suggestProjectFromText(haystack, projects);
  }, [projects, scanResult, description, inboxItem, lines]);

  const suggestedProject = projectSuggestion
    ? projects?.find((p) => p.id === projectSuggestion.projectId)
    : undefined;

  // Ons referentienummer op de factuur: dan staat het project vast voorgekozen.
  // Eén keer per keer openen, en nooit over een keuze van de gebruiker heen.
  useEffect(() => {
    if (!open || requestId || autoPickedProjectId) return;
    if (!projectSuggestion || !shouldPreselectProject(projectSuggestion)) return;
    setRequestId(projectSuggestion.projectId);
    setAutoPickedProjectId(projectSuggestion.projectId);
  }, [open, requestId, autoPickedProjectId, projectSuggestion]);

  const processFile = async (selected: File) => {
    if (selected.type !== "application/pdf") {
      toast.error("Alleen PDF-bestanden zijn toegestaan");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      toast.error("PDF mag maximaal 10MB zijn");
      return;
    }
    setFile(selected);
    await uploadAndScan(selected);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    await processFile(selected);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) await processFile(dropped);
  };

  const uploadAndScan = async (pdfFile: File) => {
    setStep("scanning");
    setScanFailed(false);
    try {
      const timestamp = Date.now();
      const safeName = pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `inkomend/${timestamp}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("partner-invoices")
        .upload(path, pdfFile, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;
      setFilePath(path);

      const { data, error } = await supabase.functions.invoke("scan-purchase-invoice", {
        body: { file_path: path },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const result: ScanResult = data.data;
      setScanResult(result);

      if (result.invoice_number) setInvoiceNumber(result.invoice_number);
      if (result.invoice_date) {
        const d = new Date(result.invoice_date);
        if (!isNaN(d.getTime())) setInvoiceDate(d);
      }
      if (result.description) setDescription(result.description);
      // Het totaal van de PDF is de controlewaarde waartegen het opslaan wordt
      // geblokkeerd. Bij de inbox werd die al voorgevuld, bij uploaden niet —
      // waardoor juist op deze route een verschil niet opviel.
      setPdfTotalIncl(result.amount_incl_vat != null ? String(result.amount_incl_vat) : "");

      // Pre-fill lines from scan (auto-syncs header via effect).
      // Uses vat_breakdown for mixed-VAT invoices so 9% + 21% blijven correct gescheiden.
      const prefillLines = buildLinesFromScan(result);
      if (prefillLines.length > 0) {
        setLines(prefillLines);
      } else {
        if (result.amount_excl_vat != null) setAmountExcl(String(result.amount_excl_vat));
        if (result.vat_rate != null) setVatRate(String(result.vat_rate));
      }

      setStep("verify");
      toast.success("Factuur gescand — controleer de gegevens");
    } catch (err: any) {
      reportError(err, { where: "AddPurchaseInvoiceDialog: Scan error" });
      setScanFailed(true);
      toast.error(err.message || "Fout bij scannen factuur");
      setStep("verify");
    }
  };

  const applyPartnerSuggestion = () => {
    if (suggestedPartnerId) setPartnerId(suggestedPartnerId);
  };

  const updateLine = (idx: number, patch: Partial<LineRow>) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const next = { ...l, ...patch };
        // Zodra de gebruiker bedragen/aantal/btw aanpast, vervalt de PDF-override
        // zodat we niet langer het oude bedrag forceren.
        const editsTotals =
          patch.quantity !== undefined ||
          patch.unit_price !== undefined ||
          patch.vat_rate !== undefined;
        if (editsTotals) {
          next.vat_amount_override = undefined;
          next.amount_incl_override = undefined;
        }
        return next;
      })
    );
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!partnerId) return toast.error("Selecteer een leverancier (partner)");
    if (!requestId) return toast.error("Selecteer een project");
    if (!invoiceNumber) return toast.error("Factuurnummer is verplicht");
    if (!isValidInvoiceNumberInput(invoiceNumber))
      return toast.error("Vul het echte factuurnummer in (minimaal één cijfer, geen 'nvt' of '-')");
    if (!invoiceDate) return toast.error("Factuurdatum is verplicht");
    const excl = parseFloat(amountExcl);
    if (isNaN(excl) || excl <= 0) return toast.error("Bedrag excl. BTW is verplicht");

    if (looksLikeProjectReference(invoiceNumber)) {
      return toast.error(
        "Dit is een projectreferentie van Bureau Vlieland, geen factuurnummer van de leverancier. Neem het nummer van de factuur zelf over.",
      );
    }
    if (hasDuplicateWarning && !acceptDuplicate) {
      return toast.error(
        `Deze factuur lijkt al geregistreerd te zijn (${duplicateInvoice?.invoice_number}). Vink "Toch opslaan" aan om door te gaan.`,
      );
    }

    // PDF-totaal verificatie: voorkomt de "Manege Seeruyter" bug waarbij een tarief
    // dat op de PDF incl. BTW is, ten onrechte als excl. wordt geregistreerd.
    const computedInclForGuard =
      lineTotals?.totalIncl ??
      (Number.isFinite(parseFloat(amountIncl)) && parseFloat(amountIncl) > 0
        ? parseFloat(amountIncl)
        : (parseFloat(amountExcl) || 0) * (1 + (parseFloat(vatRate) || 0) / 100));
    const pdfTotalNum = pdfTotalIncl.trim() === "" ? null : parseFloat(pdfTotalIncl);
    const guard = evaluateSaveGuard({
      computedInclVat: computedInclForGuard,
      pdfInclVat: pdfTotalNum,
      mismatchReason: amountMismatchReason,
      manuallyConfirmed: manuallyConfirmedNoPdfTotal,
    });
    if (!guard.canSave) {
      return toast.error(guard.blockers.join(" • "));
    }

    setIsSubmitting(true);
    try {
      // De orderregels zijn de factuur. Ze worden altijd bewaard: het werkblad
      // op het project belast ze straks regel voor regel door.
      const validLines: PurchaseInvoiceLine[] = lines
        .filter((l) => l.description.trim() && parseFloat(l.unit_price) > 0)
        .map((l, idx) => {
          const t = computeLineTotals(l);
          return {
            description: l.description.trim(),
            quantity: parseFloat(l.quantity) || 1,
            unit_price: parseFloat(l.unit_price) || 0,
            amount_excl_vat: t.amount_excl_vat,
            vat_rate: t.vat_rate,
            vat_amount: t.vat_amount,
            amount_incl_vat: t.amount_incl_vat,
            sort_order: idx,
          };
        });

      // Kop: uit de regels als die er zijn, anders de handmatige bedragen.
      // Een gemengd btw-tarief staat als 0 op de kop; de regels kennen het echte tarief.
      let headerExcl: number;
      let headerVatRate: number;
      let headerVat: number;
      let headerIncl: number;
      if (validLines.length > 0 && lineTotals) {
        headerExcl = lineTotals.totalExcl;
        headerVat = lineTotals.totalVat;
        headerIncl = lineTotals.totalIncl;
        headerVatRate = lineTotals.isMixed ? 0 : lineTotals.dominantRate;
      } else {
        const calc = calculateVatAmounts(excl, parseFloat(vatRate) || 0);
        headerExcl = calc.amountExclVat;
        headerVatRate = calc.vatRate;
        headerVat = calc.vatAmount;
        headerIncl = calc.amountInclVat;
      }

      const created = await createInvoice.mutateAsync({
        request_id: requestId,
        item_id: null,
        partner_id: partnerId,
        invoice_number: invoiceNumber,
        invoice_date: format(invoiceDate, "yyyy-MM-dd"),
        amount_excl_vat: headerExcl,
        vat_rate: headerVatRate,
        vat_amount: headerVat,
        amount_incl_vat: headerIncl,
        description: description || null,
        file_path: filePath,
        registered_by: "admin",
        lines: validLines.length > 0 ? validLines : undefined,
        allowDuplicate: acceptDuplicate,
        pdf_total_incl_vat: pdfTotalNum ?? undefined,
        amount_mismatch_reason: amountMismatchReason.trim() || undefined,
      });

      if (inboxItem && created?.id) {
        await markProcessed.mutateAsync({ id: inboxItem.id, invoiceId: created.id });
      }

      const project = projects?.find((p) => p.id === requestId);
      toast.success(`Inkoopfactuur ${invoiceNumber} geregistreerd op ${project?.reference_number || "het project"}`, {
        description: "Doorbelasten aan de klant doe je op het project, onder Financiën.",
        action: {
          label: "Naar project",
          onClick: () => navigate(`/admin/projecten/${requestId}?tab=financien`),
        },
      });
      onClose();
    } catch (err: any) {
      reportError(err, { where: "AddPurchaseInvoiceDialog" });
      toast.error(err.message || "Fout bij opslaan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPartner = partners?.find((p) => p.id === partnerId);
  const selectedProject = projects?.find((p) => p.id === requestId);
  const hasLines = lines.length > 0;

  // IBAN uit de gescande factuur registreren bij de geselecteerde partner
  const registerIban = useRegisterPartnerIban();
  const scannedIban = useMemo(() => {
    const raw = (scanResult?.supplier_iban || "").replace(/\s/g, "").toUpperCase();
    // Basis-validatie: landcode + 2 cijfers + 11-30 alfanumeriek, plus mod-97 check
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(raw)) return null;
    const rearranged = raw.slice(4) + raw.slice(0, 4);
    const digits = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
    let rem = 0;
    for (let i = 0; i < digits.length; i += 7) {
      rem = Number(String(rem) + digits.slice(i, i + 7)) % 97;
    }
    return rem === 1 ? raw : null;
  }, [scanResult?.supplier_iban]);
  const partnerIban = (selectedPartner?.iban || "").replace(/\s/g, "").toUpperCase();
  const showIbanSuggestion = !!scannedIban && !!selectedPartner && !partnerIban;
  const ibanMismatch = !!scannedIban && !!partnerIban && scannedIban !== partnerIban;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Inkoopfactuur toevoegen
          </DialogTitle>
          <DialogDescription>
            Upload de PDF — de factuur wordt automatisch gescand en de velden worden voorgevuld.
            Doorbelasten aan de klant doe je daarna op het project.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="py-12">
            <label
              htmlFor="invoice-pdf"
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 cursor-pointer transition-colors",
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <Upload className={cn("h-12 w-12 mb-4", isDragging ? "text-primary" : "text-muted-foreground")} />
              <p className="text-lg font-medium mb-1">
                {isDragging ? "Laat los om te uploaden" : "Sleep de PDF hierheen of klik om te uploaden"}
              </p>
              <p className="text-sm text-muted-foreground">PDF, max 10 MB</p>
              <input
                id="invoice-pdf"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            <div className="mt-4 text-center">
              <Button variant="ghost" size="sm" onClick={() => setStep("verify")}>
                Of vul handmatig in zonder PDF →
              </Button>
            </div>
          </div>
        )}

        {step === "scanning" && (
          <div className="py-16 flex flex-col items-center gap-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <Sparkles className="h-5 w-5 text-primary absolute -top-1 -right-1" />
            </div>
            <p className="font-medium">Factuur wordt gescand met AI…</p>
            <p className="text-sm text-muted-foreground">Dit kan 10–30 seconden duren</p>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4 py-2">
            {file && (
              <div className="flex items-center gap-2 text-sm bg-muted rounded-md p-2">
                <FileText className="h-4 w-4" />
                <span className="flex-1 truncate">{file.name}</span>
                {scanResult && (
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <Sparkles className="h-3 w-3" /> Gescand
                  </span>
                )}
              </div>
            )}

            {/* Partner */}
            <div className="space-y-1.5">
              <Label>Leverancier (partner) *</Label>
              <Popover open={partnerSearchOpen} onOpenChange={setPartnerSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {selectedPartner?.name || "Selecteer partner..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Zoek partner..." autoFocus />
                    <CommandList>
                      <CommandEmpty>Geen partner gevonden</CommandEmpty>
                      <CommandGroup>
                        {partners?.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={p.name.toLowerCase()}
                            onSelect={() => {
                              setPartnerId(p.id);
                              setPartnerSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                partnerId === p.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            {p.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {suggestedPartnerId && suggestedPartnerId !== partnerId && (
                <button
                  type="button"
                  onClick={applyPartnerSuggestion}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  AI-suggestie: {partners?.find((p) => p.id === suggestedPartnerId)?.name}
                </button>
              )}
              {/* Geen suggestie is ook informatie: dan weet je of het aan de scan
                  ligt of aan een partnernaam die bij ons anders geschreven staat. */}
              {scanResult && !suggestedPartnerId && !partnerId && (
                <p className="text-xs text-muted-foreground">
                  {scanResult.supplier_name
                    ? <>Scanner las &ldquo;{scanResult.supplier_name}&rdquo; — geen partner met die naam gevonden.</>
                    : <>Scanner kon de leverancier niet uit de factuur halen.</>}
                </p>
              )}
              {showIbanSuggestion && (
                <div className="flex items-center justify-between gap-2 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs text-blue-800">
                  <span className="truncate">
                    IBAN op factuur: <span className="font-mono font-medium">{scannedIban}</span> — nog niet geregistreerd bij {selectedPartner?.name}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs shrink-0 bg-white"
                    disabled={registerIban.isPending}
                    onClick={() => registerIban.mutate({ partnerId, iban: scannedIban! })}
                  >
                    {registerIban.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Registreren"}
                  </Button>
                </div>
              )}
              {ibanMismatch && (
                <div className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    IBAN op factuur (<span className="font-mono">{scannedIban}</span>) wijkt af van geregistreerd IBAN (<span className="font-mono">{partnerIban}</span>)
                  </span>
                </div>
              )}
            </div>

            {/* Project */}
            <div className="space-y-1.5">
              <Label>Project *</Label>
              <Popover open={projectSearchOpen} onOpenChange={setProjectSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {selectedProject
                      ? `${selectedProject.reference_number || "Geen ref"} — ${selectedProject.customer_company || selectedProject.customer_name}`
                      : "Selecteer project..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Zoek op referentie, klant of bedrijf..." autoFocus />
                    <CommandList>
                      <CommandEmpty>Geen project gevonden</CommandEmpty>
                      <CommandGroup>
                        {projects?.map((p) => {
                          const yearMonth = p.created_at ? format(new Date(p.created_at), "yyyy MM MMM yyyy", { locale: nl }) : "";
                          const searchValue = [
                            p.reference_number || "",
                            p.customer_name || "",
                            p.customer_company || "",
                            yearMonth,
                            p.status || "",
                          ]
                            .join(" ")
                            .toLowerCase();
                          return (
                            <CommandItem
                              key={p.id}
                              value={searchValue}
                              onSelect={() => {
                                setRequestId(p.id);
                                setProjectSearchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  requestId === p.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div>
                                <div className="font-medium">{p.reference_number || "Geen ref"}</div>
                                <div className="text-xs text-muted-foreground [[data-selected=true]_&]:text-accent-foreground/90">
                                  {p.customer_company || p.customer_name}
                                </div>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {requestId && requestId === autoPickedProjectId && projectSuggestion && (
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Sparkles className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                  <span>
                    Voorgekozen op grond van ons referentienummer op de factuur
                    {" "}(&ldquo;{projectSuggestion.matchedOn}&rdquo;). Klopt het niet, kies dan een ander project.
                  </span>
                </p>
              )}
              {suggestedProject && suggestedProject.id !== requestId && projectSuggestion && (
                <button
                  type="button"
                  onClick={() => setRequestId(suggestedProject.id)}
                  className="text-xs text-primary hover:underline flex items-start gap-1 text-left"
                >
                  <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>
                    AI-suggestie: {suggestedProject.reference_number || "Geen ref"} —{" "}
                    {suggestedProject.customer_company || suggestedProject.customer_name}
                    <span className="block text-muted-foreground">
                      op grond van de {PROJECT_MATCH_LABELS[projectSuggestion.reason]}:
                      {" "}&ldquo;{projectSuggestion.matchedOn}&rdquo;
                    </span>
                  </span>
                </button>
              )}
              {scanResult && !projectSuggestion && !requestId && (
                <p className="text-xs text-muted-foreground">
                  Geen project af te leiden uit de factuur. Zet de partner er een groep of
                  ons referentienummer bij, dan herkent hij het de volgende keer.
                </p>
              )}
            </div>

            {/* Invoice details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Factuurnummer *</Label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="F-2026-001"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Factuurdatum *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !invoiceDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {invoiceDate ? format(invoiceDate, "d MMM yyyy", { locale: nl }) : "Kies datum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={invoiceDate} onSelect={setInvoiceDate} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {hasDuplicateWarning && duplicateInvoice && (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 p-3 space-y-2">
                <div className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-100">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium">Mogelijk dubbele inkoopfactuur</p>
                    {duplicateMatch?.reason === "number" && (
                      <p className="text-xs">
                        Factuurnummer <strong>{duplicateInvoice.invoice_number}</strong> is al geregistreerd
                        voor deze leverancier op {duplicateInvoice.invoice_date} voor €
                        {Number(duplicateInvoice.amount_incl_vat ?? duplicateInvoice.amount_excl_vat).toFixed(2)}
                        {" "}(status: {duplicateInvoice.status}).
                      </p>
                    )}
                    {duplicateMatch?.reason === "amount" && (
                      <p className="text-xs">
                        Deze leverancier heeft al een factuur van €
                        {Number(duplicateInvoice.amount_incl_vat ?? duplicateInvoice.amount_excl_vat).toFixed(2)}
                        {" "}onder nummer <strong>{duplicateInvoice.invoice_number}</strong> ({duplicateInvoice.invoice_date}, status: {duplicateInvoice.status}).
                        Waarschijnlijk is dit dezelfde factuur met een ander nummer. Koppel de PDF dan aan die registratie via de inbox in plaats van hier een nieuwe te maken.
                      </p>
                    )}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-100 cursor-pointer">
                  <Checkbox
                    checked={acceptDuplicate}
                    onCheckedChange={(v) => setAcceptDuplicate(v === true)}
                  />
                  Toch opslaan — ik weet zeker dat dit een andere factuur is
                </label>
              </div>
            )}

            {/* Order lines */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Orderregels {hasLines && <span className="text-xs text-muted-foreground font-normal">({lines.length})</span>}</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-3 w-3 mr-1" /> Regel toevoegen
                </Button>
              </div>
              {hasLines && (
                <div className="border rounded-md overflow-hidden">
                  <div className="grid grid-cols-[1fr_70px_100px_80px_100px_100px_36px] gap-2 px-2 py-2 bg-muted text-xs font-medium">
                    <span>Omschrijving</span>
                    <span className="text-right">Aantal</span>
                    <span className="text-right">Stuksprijs</span>
                    <span className="text-right">BTW%</span>
                    <span className="text-right">BTW €</span>
                    <span className="text-right">Incl. €</span>
                    <span></span>
                  </div>
                  {lines.map((line, idx) => {
                    const t = computeLineTotals(line);
                    return (
                      <div
                        key={idx}
                        className="grid grid-cols-[1fr_70px_100px_80px_100px_100px_36px] gap-2 px-2 py-1.5 border-t items-center"
                      >
                        <Input
                          value={line.description}
                          onChange={(e) => updateLine(idx, { description: e.target.value })}
                          placeholder="Omschrijving"
                          className="h-8"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          value={line.quantity}
                          onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                          className="h-8 text-right"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          value={line.unit_price}
                          onChange={(e) => updateLine(idx, { unit_price: e.target.value })}
                          placeholder="0,00"
                          className="h-8 text-right"
                        />
                        <Select value={line.vat_rate} onValueChange={(v) => updateLine(idx, { vat_rate: v })}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0%</SelectItem>
                            <SelectItem value="9">9%</SelectItem>
                            <SelectItem value="21">21%</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="text-right text-sm font-mono pr-1 text-muted-foreground">
                          €{t.vat_amount.toFixed(2)}
                        </div>
                        <div className="text-right text-sm font-mono pr-1 font-medium">
                          €{t.amount_incl_vat.toFixed(2)}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeLine(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                  {lineTotals && (
                    <div className="border-t bg-muted/50 px-2 py-2 space-y-1 text-sm">
                      {Array.from(lineTotals.byRate.entries()).map(([rate, v]) => (
                        <div key={rate} className="flex justify-between text-xs text-muted-foreground">
                          <span>BTW {rate}% over €{v.excl.toFixed(2)}</span>
                          <span className="font-mono">€{v.vat.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-medium pt-1 border-t">
                        <span>Totaal</span>
                        <span className="font-mono">€{lineTotals.totalIncl.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Header totals (auto-filled from lines, or manual when no lines) */}
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>Excl. BTW *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amountExcl}
                  onChange={(e) => setAmountExcl(e.target.value)}
                  placeholder="0,00"
                  readOnly={hasLines}
                  className={hasLines ? "bg-muted" : ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label>BTW %</Label>
                {lineTotals?.isMixed ? (
                  <div className="h-10 px-3 flex items-center rounded-md border bg-muted text-sm text-muted-foreground">
                    Gemengd
                  </div>
                ) : (
                  <Select value={vatRate} onValueChange={setVatRate} disabled={hasLines}>
                    <SelectTrigger className={hasLines ? "bg-muted" : ""}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="9">9%</SelectItem>
                      <SelectItem value="21">21%</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>BTW bedrag</Label>
                <Input value={vatAmount} readOnly className="bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Label>Incl. BTW</Label>
                <Input value={amountIncl} readOnly className="bg-muted font-semibold" />
              </div>
            </div>
            {lineTotals?.isMixed && (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs space-y-1">
                <div className="font-medium text-foreground">BTW-specificatie (gemengd tarief)</div>
                {Array.from(lineTotals.byRate.entries())
                  .sort((a, b) => a[0] - b[0])
                  .map(([rate, v]) => (
                    <div key={rate} className="flex justify-between text-muted-foreground">
                      <span>BTW {rate}% over €{v.excl.toFixed(2)}</span>
                      <span className="font-mono">€{v.vat.toFixed(2)}</span>
                    </div>
                  ))}
              </div>
            )}
            {hasLines && (
              <p className="text-xs text-muted-foreground -mt-2">
                Totalen worden berekend uit de orderregels. Verwijder alle regels om handmatig in te vullen.
              </p>
            )}

            <div className="space-y-1.5">
              <Label>Omschrijving</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Korte omschrijving van de factuur..."
                rows={2}
              />
            </div>

            {/* PDF-totaal verificatie */}
            {(() => {
              const computed =
                lineTotals?.totalIncl ??
                (Number.isFinite(parseFloat(amountIncl)) && parseFloat(amountIncl) > 0
                  ? parseFloat(amountIncl)
                  : (parseFloat(amountExcl) || 0) * (1 + (parseFloat(vatRate) || 0) / 100));
              const pdfNum = pdfTotalIncl.trim() === "" ? null : parseFloat(pdfTotalIncl);
              const g = evaluateSaveGuard({
                computedInclVat: computed,
                pdfInclVat: pdfNum,
                mismatchReason: amountMismatchReason,
                manuallyConfirmed: manuallyConfirmedNoPdfTotal,
              });
              const isMismatch = g.match.status === "mismatch";
              const isMatch = g.match.status === "match";
              const noPdf = g.match.status === "no_pdf_total";
              return (
                <div
                  className={cn(
                    "rounded-md border px-3 py-3 space-y-2 text-sm",
                    isMismatch
                      ? "border-destructive/40 bg-destructive/5"
                      : isMatch
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-amber-300 bg-amber-50",
                  )}
                >
                  <div className="font-medium text-foreground">
                    Verificatie tegen PDF-totaal
                  </div>
                  {scanResult && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Wat heeft de scanner gelezen?
                      </summary>
                      <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-2 text-[11px] leading-relaxed whitespace-pre-wrap break-words">
                        {JSON.stringify(scanResult, null, 2)}
                      </pre>
                    </details>
                  )}
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <Label className="text-xs">Totaal incl. BTW volgens PDF</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={pdfTotalIncl}
                      onChange={(e) => setPdfTotalIncl(e.target.value)}
                      placeholder="bv. 546.70"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Onze berekening: €{computed.toFixed(2)}</span>
                    {pdfNum != null && (
                      <span>
                        Verschil: €{g.match.difference.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {isMismatch && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-destructive">
                        Verschil van €{g.match.absoluteDifference.toFixed(2)} — corrigeer de regels, óf geef een reden op:
                      </Label>
                      <Textarea
                        rows={2}
                        value={amountMismatchReason}
                        onChange={(e) => setAmountMismatchReason(e.target.value)}
                        placeholder="bv. 'Prijs op PDF is incl. BTW — regels aangepast' of 'Partner stuurt correctiefactuur'"
                      />
                    </div>
                  )}
                  {noPdf && (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={manuallyConfirmedNoPdfTotal}
                        onChange={(e) => setManuallyConfirmedNoPdfTotal(e.target.checked)}
                      />
                      <span>Ik heb het bedrag zelf tegen de PDF gecontroleerd</span>
                    </label>
                  )}
                </div>
              );
            })()}

            {scanFailed && file && (
              <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <span>AI-scan mislukt. Vul de velden handmatig in.</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annuleren
          </Button>
          {step === "verify" && (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Inkoopfactuur opslaan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
