import { useState, useEffect, useMemo } from "react";
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
import { useDuplicatePurchaseInvoiceCheck } from "@/lib/purchaseInvoiceDuplicateCheck";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ExtraProjectSplitBlock,
  type ExtraProjectSplit,
} from "@/components/admin/purchase-invoices/ExtraProjectSplitBlock";


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
  amount_excl_vat: number | null;
  vat_rate: number | null;
  vat_amount: number | null;
  amount_incl_vat: number | null;
  description: string | null;
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


/**
 * Build prefill LineRows from an AI scan result.
 *
 * Priority:
 * 1. If `line_items` are present AND every item has its own `vat_rate`, use those (most fine-grained).
 * 2. Otherwise, if `vat_breakdown` has multiple entries (mixed VAT invoice), create one row per VAT rate
 *    using the breakdown subtotals. This is the only correct path for invoices like watertaxi (9% + 21%).
 * 3. Otherwise, fall back to `line_items` (single-rate factuur) or no rows (header-only).
 */
function buildLinesFromScan(result: ScanResult | null): LineRow[] {
  if (!result) return [];

  const breakdown = result.vat_breakdown || [];
  const items = result.line_items || [];
  const itemsAllHaveRate = items.length > 0 && items.every((li) => li.vat_rate != null);

  if (itemsAllHaveRate) {
    return items.map((li) => ({
      description: li.description || "",
      quantity: li.quantity != null ? String(li.quantity) : "1",
      unit_price:
        li.unit_price != null
          ? String(li.unit_price)
          : li.total_excl_vat != null && li.quantity
          ? String(li.total_excl_vat / li.quantity)
          : li.total_excl_vat != null
          ? String(li.total_excl_vat)
          : "",
      vat_rate: String(li.vat_rate ?? result.vat_rate ?? 21),
    }));
  }

  if (breakdown.length > 1) {
    return breakdown
      .filter((b) => b.amount_excl > 0 || b.vat_amount > 0)
      .map((b) => ({
        description: `BTW ${b.vat_rate}%`,
        quantity: "1",
        unit_price: String(b.amount_excl),
        vat_rate: String(b.vat_rate),
        // Neem de exacte BTW van de PDF mee zodat we niet herrekenen.
        vat_amount_override: b.vat_amount != null ? String(b.vat_amount) : undefined,
        amount_incl_override:
          b.amount_excl != null && b.vat_amount != null
            ? String(Math.round((b.amount_excl + b.vat_amount) * 100) / 100)
            : undefined,
      }));
  }

  if (items.length > 0) {
    // Single-rate factuur: als de scanner een totaal-BTW heeft gegeven,
    // verdelen we die over de rijen op basis van excl-aandeel zodat
    // herrekening geen afrondingsdrift veroorzaakt.
    const headerVat = result.vat_amount != null ? Number(result.vat_amount) : null;
    const headerExcl = result.amount_excl_vat != null ? Number(result.amount_excl_vat) : null;
    return items.map((li, idx, arr) => {
      const excl =
        li.unit_price != null && li.quantity
          ? Number(li.unit_price) * Number(li.quantity)
          : li.total_excl_vat != null
          ? Number(li.total_excl_vat)
          : 0;
      let vatOverride: string | undefined;
      let inclOverride: string | undefined;
      if (headerVat != null && headerExcl && headerExcl > 0) {
        const share =
          idx === arr.length - 1
            ? // laatste rij sluitend maken
              headerVat -
              arr
                .slice(0, idx)
                .reduce((s, x) => {
                  const e =
                    x.unit_price != null && x.quantity
                      ? Number(x.unit_price) * Number(x.quantity)
                      : Number(x.total_excl_vat || 0);
                  return s + Math.round((headerVat * (e / headerExcl)) * 100) / 100;
                }, 0)
            : Math.round((headerVat * (excl / headerExcl)) * 100) / 100;
        vatOverride = String(share);
        inclOverride = String(Math.round((excl + share) * 100) / 100);
      }
      return {
        description: li.description || "",
        quantity: li.quantity != null ? String(li.quantity) : "1",
        unit_price:
          li.unit_price != null
            ? String(li.unit_price)
            : li.total_excl_vat != null && li.quantity
            ? String(li.total_excl_vat / li.quantity)
            : li.total_excl_vat != null
            ? String(li.total_excl_vat)
            : "",
        vat_rate: String(li.vat_rate ?? result.vat_rate ?? 21),
        vat_amount_override: vatOverride,
        amount_incl_override: inclOverride,
      };
    });
  }

  return [];
}

function computeLineTotals(line: LineRow) {
  const qty = parseFloat(line.quantity) || 0;
  const unit = parseFloat(line.unit_price) || 0;
  const rate = parseFloat(line.vat_rate) || 0;
  const excl = qty * unit;
  // Als de scanner een exacte BTW van de PDF heeft meegegeven en de
  // gebruiker excl/qty niet aangepast heeft, gebruik die override
  // zodat ons totaal exact matcht met de leveranciersfactuur.
  const overrideVat =
    line.vat_amount_override != null && line.vat_amount_override !== ""
      ? parseFloat(line.vat_amount_override)
      : null;
  const overrideIncl =
    line.amount_incl_override != null && line.amount_incl_override !== ""
      ? parseFloat(line.amount_incl_override)
      : null;
  const useOverride =
    overrideVat != null &&
    !Number.isNaN(overrideVat) &&
    Math.abs(excl - (overrideIncl != null ? overrideIncl - overrideVat : excl)) < 0.02;
  const vat = useOverride ? (overrideVat as number) : excl * (rate / 100);
  const incl = useOverride && overrideIncl != null ? overrideIncl : excl + vat;
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
  const [itemId, setItemId] = useState<string>("");
  const [allocations, setAllocations] = useState<Array<{ item_id: string; amount_excl_vat: string; vat_rate: string; notes?: string }>>([]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(undefined);
  const [amountExcl, setAmountExcl] = useState<string>("");
  const [vatRate, setVatRate] = useState<string>("21");
  const [vatAmount, setVatAmount] = useState<string>("");
  const [amountIncl, setAmountIncl] = useState<string>("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<LineRow[]>([]);
  const [extraProjects, setExtraProjects] = useState<ExtraProjectSplit[]>([]);

  const [partnerSearchOpen, setPartnerSearchOpen] = useState(false);
  const [projectSearchOpen, setProjectSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptDuplicate, setAcceptDuplicate] = useState(false);
  // Default ON: kosten van inkoopfactuur worden direct overgenomen als
  // verkoopfactuurregels, zodat ze gegarandeerd op de klantfactuur landen.
  const [copyToBillingLines, setCopyToBillingLines] = useState(true);

  // Duplicate check (same partner + invoice number)
  const { data: duplicateInvoice } = useDuplicatePurchaseInvoiceCheck(
    partnerId,
    invoiceNumber,
    { enabled: open },
  );

  // Reset override when key fields change
  useEffect(() => {
    setAcceptDuplicate(false);
  }, [partnerId, invoiceNumber]);


  const { data: partners } = useQuery({
    queryKey: ["partners-active-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, name")
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
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const { data: items } = useQuery({
    queryKey: ["program-items-for-invoice", requestId, partnerId],
    queryFn: async () => {
      if (!requestId) return [];
      let q = supabase
        .from("program_request_items")
        .select("id, block_name, provider_id, day_index")
        .eq("request_id", requestId);
      if (partnerId) q = q.eq("provider_id", partnerId);
      const { data, error } = await q.order("day_index");
      if (error) throw error;
      return data || [];
    },
    enabled: !!requestId,
  });

  // Items for extra project splits (one query for all selected extra projectIds)
  const extraProjectIds = extraProjects.map((e) => e.requestId).filter(Boolean);
  const { data: extraItems } = useQuery({
    queryKey: ["program-items-for-extras", extraProjectIds.sort().join(","), partnerId],
    queryFn: async () => {
      if (extraProjectIds.length === 0) return [];
      let q = supabase
        .from("program_request_items")
        .select("id, block_name, provider_id, day_index, request_id")
        .in("request_id", extraProjectIds);
      if (partnerId) q = q.eq("provider_id", partnerId);
      const { data, error } = await q.order("day_index");
      if (error) throw error;
      return data || [];
    },
    enabled: extraProjectIds.length > 0,
  });

  // Reset on open
  useEffect(() => {
    if (!open) return;

    setScanFailed(false);
    setIsDragging(false);

    if (inboxItem) {
      setStep("verify");
      setFile(null);
      setFilePath(inboxItem.attachment_path || null);
      const result = inboxItem.scan_result as ScanResult | null;
      setScanResult(result);
      setPartnerId(defaultPartnerId || "");
      setRequestId(defaultRequestId || "");
      setItemId("");
      setAllocations([]);
      setInvoiceNumber(result?.invoice_number || "");
      if (result?.invoice_date) {
        const d = new Date(result.invoice_date);
        setInvoiceDate(!isNaN(d.getTime()) ? d : undefined);
      } else {
        setInvoiceDate(undefined);
      }
      setAmountExcl(result?.amount_excl_vat != null ? String(result.amount_excl_vat) : "");
      setVatRate(result?.vat_rate != null ? String(result.vat_rate) : "21");
      setVatAmount("");
      setAmountIncl("");
      setDescription(result?.description || inboxItem.subject || "");
      setLines(buildLinesFromScan(result));
      setExtraProjects([]);
    } else {
      setStep("upload");
      setFile(null);
      setFilePath(null);
      setScanResult(null);
      setPartnerId(defaultPartnerId || "");
      setRequestId(defaultRequestId || "");
      setItemId("");
      setAllocations([]);
      setInvoiceNumber("");
      setInvoiceDate(undefined);
      setAmountExcl("");
      setVatRate("21");
      setVatAmount("");
      setAmountIncl("");
      setDescription("");
      setLines([]);
      setExtraProjects([]);
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

  const suggestedPartnerId = useMemo(() => {
    if (!scanResult?.supplier_name || !partners) return null;
    const supplier = scanResult.supplier_name.toLowerCase().trim();
    const exact = partners.find((p) => p.name.toLowerCase() === supplier);
    if (exact) return exact.id;
    const partial = partners.find(
      (p) =>
        supplier.includes(p.name.toLowerCase()) ||
        p.name.toLowerCase().includes(supplier),
    );
    return partial?.id || null;
  }, [scanResult, partners]);

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
      console.error("Scan error:", err);
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
    if (!invoiceDate) return toast.error("Factuurdatum is verplicht");
    const excl = parseFloat(amountExcl);
    if (isNaN(excl) || excl <= 0) return toast.error("Bedrag excl. BTW is verplicht");

    if (duplicateInvoice && !acceptDuplicate) {
      return toast.error(
        `Factuurnummer ${duplicateInvoice.invoice_number} is al geregistreerd voor deze leverancier. Vink "Toch opslaan" aan om door te gaan.`,
      );
    }


    // Validate allocations if any are set
    const validAllocations = allocations
      .filter((a) => a.item_id && parseFloat(a.amount_excl_vat) > 0)
      .map((a, idx) => {
        const allocExcl = parseFloat(a.amount_excl_vat) || 0;
        const rate = parseFloat(a.vat_rate) || 0;
        const vat = allocExcl * (rate / 100);
        return {
          item_id: a.item_id,
          amount_excl_vat: allocExcl,
          vat_rate: rate,
          vat_amount: vat,
          amount_incl_vat: allocExcl + vat,
          notes: a.notes || null,
          sort_order: idx,
        };
      });

    setIsSubmitting(true);
    try {
      // Build line payload (only valid lines)
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

      // Header values priority:
      //   a) Top split-blocks (primary BTW-splits + extras) — leidend wanneer ingevuld
      //   b) Manueel ingevuld amountExcl + vatRate
      //   c) Fallback: orderregels-totaal
      let headerExcl: number;
      let headerVatRate: number;
      let headerVat: number;
      let headerIncl: number;

      const round2pre = (n: number) => Math.round(n * 100) / 100;

      const primarySplitExclSum = allocations
        .filter((a) => a.item_id && parseFloat(a.amount_excl_vat) > 0)
        .reduce((s, a) => s + (parseFloat(a.amount_excl_vat) || 0), 0);
      const primarySplitInclSum = allocations
        .filter((a) => a.item_id && parseFloat(a.amount_excl_vat) > 0)
        .reduce((s, a) => {
          const c = calculateVatAmounts(parseFloat(a.amount_excl_vat) || 0, parseFloat(a.vat_rate) || 0);
          return s + c.amountInclVat;
        }, 0);

      const extrasExclTop = extraProjects.reduce((sum, e) => {
        if (!e.requestId) return sum;
        const headerEx = parseFloat(e.amountExclVat);
        if (headerEx > 0) return sum + headerEx;
        return sum + e.allocations.reduce((s, a) => s + (parseFloat(a.amount_excl_vat) || 0), 0);
      }, 0);
      const extrasInclTop = extraProjects.reduce((sum, e) => {
        if (!e.requestId) return sum;
        const headerEx = parseFloat(e.amountExclVat);
        if (headerEx > 0) {
          const c = calculateVatAmounts(headerEx, parseFloat(e.vatRate) || 0);
          return sum + c.amountInclVat;
        }
        return sum + e.allocations.reduce((s, a) => {
          const c = calculateVatAmounts(parseFloat(a.amount_excl_vat) || 0, parseFloat(a.vat_rate) || 0);
          return s + c.amountInclVat;
        }, 0);
      }, 0);

      const topInputExcl = primarySplitExclSum + extrasExclTop;
      const topInputIncl = primarySplitInclSum + extrasInclTop;

      if (topInputExcl > 0) {
        headerExcl = round2pre(topInputExcl);
        headerIncl = round2pre(topInputIncl);
        headerVat = round2pre(headerIncl - headerExcl);
        headerVatRate = 0;
      } else if (validLines.length > 0 && lineTotals) {
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

      const round2 = (n: number) => Math.round(n * 100) / 100;
      // Tolerance scales with line count: 1ct per regel, cap €0.10
      const toleranceFor = (count: number) => Math.min(0.1, Math.max(0.01, 0.01 * count));
      // Rebalance last allocation to absorb sub-cent rounding so totals match exactly
      const rebalance = <T extends { amount_excl_vat: number; amount_incl_vat: number; vat_amount: number; vat_rate: number }>(
        rows: T[],
        targetIncl: number,
      ) => {
        if (rows.length === 0) return;
        const sum = rows.reduce((s, r) => s + r.amount_incl_vat, 0);
        const diff = round2(targetIncl - sum);
        if (Math.abs(diff) < 0.005) return;
        const last = rows[rows.length - 1];
        last.amount_incl_vat = round2(last.amount_incl_vat + diff);
        // recompute excl + vat for the adjusted row keeping its rate
        const rate = last.vat_rate || 0;
        const recalc = rate > 0
          ? { excl: round2(last.amount_incl_vat / (1 + rate / 100)) }
          : { excl: last.amount_incl_vat };
        last.amount_excl_vat = recalc.excl;
        last.vat_amount = round2(last.amount_incl_vat - last.amount_excl_vat);
      };

      // Validate extra project splits — alle bedragen op 2 decimalen geronden
      const validExtras = extraProjects
        .filter((e) => {
          if (!e.requestId) return false;
          const hasHeader = parseFloat(e.amountExclVat) > 0;
          const hasAllocs = e.allocations.some(
            (a) => a.item_id && parseFloat(a.amount_excl_vat) > 0,
          );
          return hasHeader || hasAllocs;
        })
        .map((e) => {
          const eAllocs = e.allocations
            .filter((a) => a.item_id && parseFloat(a.amount_excl_vat) > 0)
            .map((a, idx) => {
              const aExcl = parseFloat(a.amount_excl_vat) || 0;
              const aRate = parseFloat(a.vat_rate) || 0;
              const calc = calculateVatAmounts(aExcl, aRate);
              return {
                item_id: a.item_id,
                amount_excl_vat: calc.amountExclVat,
                vat_rate: calc.vatRate,
                vat_amount: calc.vatAmount,
                amount_incl_vat: calc.amountInclVat,
                notes: a.notes || null,
                sort_order: idx,
              };
            });
          const headerExclInput = parseFloat(e.amountExclVat);
          const useDerived = !(headerExclInput > 0) && eAllocs.length > 0;
          let eExcl: number;
          let eIncl: number;
          let eRate: number;
          let eVat: number;
          if (useDerived) {
            eExcl = round2(eAllocs.reduce((s, a) => s + a.amount_excl_vat, 0));
            eIncl = round2(eAllocs.reduce((s, a) => s + a.amount_incl_vat, 0));
            eVat = round2(eIncl - eExcl);
            eRate = 0;
          } else {
            const calc = calculateVatAmounts(headerExclInput || 0, parseFloat(e.vatRate) || 0);
            eExcl = calc.amountExclVat;
            eIncl = calc.amountInclVat;
            eVat = calc.vatAmount;
            eRate = calc.vatRate;
            // Auto-rebalance interne allocaties zodat ze exact optellen tot eIncl
            if (eAllocs.length > 0) {
              rebalance(eAllocs, eIncl);
            }
          }
          return {
            requestId: e.requestId,
            amount_excl_vat: eExcl,
            vat_rate: eRate,
            vat_amount: eVat,
            amount_incl_vat: eIncl,
            allocations: eAllocs,
            copyToBillingLines: !!e.copyToBillingLines,
          };
        });

      // Compute primary share when extras exist
      const extrasExclSum = round2(validExtras.reduce((s, e) => s + e.amount_excl_vat, 0));
      const extrasInclSum = round2(validExtras.reduce((s, e) => s + e.amount_incl_vat, 0));
      if (validExtras.length > 0) {
        if (extrasExclSum > headerExcl + 0.01) {
          setIsSubmitting(false);
          return toast.error(
            `Som van extra projecten (€${extrasExclSum.toFixed(2)}) is hoger dan factuurtotaal excl. BTW (€${headerExcl.toFixed(2)})`,
          );
        }
        const primaryExcl = round2(headerExcl - extrasExclSum);
        const primaryIncl = round2(headerIncl - extrasInclSum);
        const primaryVat = round2(primaryIncl - primaryExcl);
        if (primaryExcl <= 0.01) {
          setIsSubmitting(false);
          return toast.error("Het hoofdproject heeft geen restbedrag — verwijder een extra project of pas het bedrag aan.");
        }
        headerExcl = primaryExcl;
        headerIncl = primaryIncl;
        headerVat = primaryVat;
      }

      // Validate primary allocations match adjusted primary header — met tolerantie + auto-rebalance
      if (validAllocations.length > 0) {
        const allocSum = round2(validAllocations.reduce((s, a) => s + a.amount_incl_vat, 0));
        const diff = Math.abs(allocSum - headerIncl);
        const tol = toleranceFor(validAllocations.length);
        if (diff > tol) {
          setIsSubmitting(false);
          return toast.error(
            `Verdeling klopt niet: €${allocSum.toFixed(2)} toegewezen vs €${headerIncl.toFixed(2)} ${validExtras.length > 0 ? "(hoofdproject)" : "factuurtotaal"} — verschil €${diff.toFixed(2)}`,
          );
        }
        if (diff > 0.005) {
          rebalance(validAllocations as any, headerIncl);
        }
      }

      // Validate each extra's internal allocations — zelfde aanpak
      for (const e of validExtras) {
        if (e.allocations.length > 0) {
          const s = round2(e.allocations.reduce((sum, a) => sum + a.amount_incl_vat, 0));
          const diff = Math.abs(s - e.amount_incl_vat);
          const tol = toleranceFor(e.allocations.length);
          if (diff > tol) {
            setIsSubmitting(false);
            return toast.error(
              `Onderdeel-verdeling extra project klopt niet: €${s.toFixed(2)} vs €${e.amount_incl_vat.toFixed(2)} — verschil €${diff.toFixed(2)}`,
            );
          }
          if (diff > 0.005) {
            rebalance(e.allocations as any, e.amount_incl_vat);
          }
        }
      }

      const created = await createInvoice.mutateAsync({
        request_id: requestId,
        item_id: validAllocations.length > 0 ? null : (itemId || null),
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
        lines: validExtras.length === 0 && validLines.length > 0 ? validLines : undefined,
        allocations: validAllocations.length > 0 ? validAllocations : undefined,
        allowDuplicate: acceptDuplicate,
      });

      // Create one purchase invoice per extra project (shared invoice_number + file_path)
      for (const e of validExtras) {
        const createdExtra = await createInvoice.mutateAsync({
          request_id: e.requestId,
          item_id: null,
          partner_id: partnerId,
          invoice_number: invoiceNumber,
          invoice_date: format(invoiceDate, "yyyy-MM-dd"),
          amount_excl_vat: e.amount_excl_vat,
          vat_rate: e.vat_rate,
          vat_amount: e.vat_amount,
          amount_incl_vat: e.amount_incl_vat,
          description: description ? `${description} (deel project)` : `Aandeel factuur ${invoiceNumber}`,
          file_path: filePath,
          registered_by: "admin",
          allocations: e.allocations.length > 0 ? e.allocations : undefined,
          allowDuplicate: true,
        });

        // Optional: copy invoice allocations into program_item_billing_lines for the extra project
        if (e.copyToBillingLines && createdExtra?.id && e.allocations.length > 0) {
          const uniqueExtraItems = Array.from(new Set(e.allocations.map((a) => a.item_id)));
          if (uniqueExtraItems.length === 1) {
            const targetItemId = uniqueExtraItems[0];
            try {
              await supabase.from("program_item_billing_lines").delete().eq("item_id", targetItemId);
              const rowsToInsert = e.allocations.map((a, idx) => ({
                item_id: targetItemId,
                description: a.notes || `${description || `Factuur ${invoiceNumber}`} (BTW ${a.vat_rate}%)`,
                quantity: 1,
                unit_price_excl_vat: a.amount_excl_vat,
                vat_rate: a.vat_rate,
                vat_amount: a.vat_amount,
                amount_excl_vat: a.amount_excl_vat,
                amount_incl_vat: a.amount_incl_vat,
                sort_order: idx,
              }));
              await supabase.from("program_item_billing_lines").insert(rowsToInsert);
              await supabase
                .from("program_request_items")
                .update({ use_actual_costs: true, final_billing_locked_at: new Date().toISOString() })
                .eq("id", targetItemId);
              toast.success("Factuurregels overgenomen op programma-onderdeel (extra project)");
            } catch (err) {
              console.error("copyToBillingLines (extra) failed", err);
              toast.error("Overnemen naar factuurregels (extra project) mislukt");
            }
          }
        }
      }


      // Optional: copy invoice lines into program_item_billing_lines (sales lines) for the linked item
      if (copyToBillingLines && created?.id) {
        const uniqueAllocItems = Array.from(new Set(validAllocations.map((a) => a.item_id)));
        const targetItemId = uniqueAllocItems.length === 1
          ? uniqueAllocItems[0]
          : (validAllocations.length === 0 && itemId ? itemId : null);
        if (targetItemId) {
          try {
            // Wipe existing
            await supabase.from("program_item_billing_lines").delete().eq("item_id", targetItemId);
            let rowsToInsert: any[];
            if (validAllocations.length > 1 && uniqueAllocItems.length === 1) {
              // Meerdere BTW-regels op hetzelfde onderdeel → één billing-line per allocatie
              rowsToInsert = validAllocations.map((a, idx) => ({
                item_id: targetItemId,
                description: a.notes || `${description || `Factuur ${invoiceNumber}`} (BTW ${a.vat_rate}%)`,
                quantity: 1,
                unit_price_excl_vat: a.amount_excl_vat,
                vat_rate: a.vat_rate,
                vat_amount: a.vat_amount,
                amount_excl_vat: a.amount_excl_vat,
                amount_incl_vat: a.amount_incl_vat,
                sort_order: idx,
              }));
            } else if (validLines.length > 0) {
              rowsToInsert = validLines.map((l, idx) => ({
                item_id: targetItemId,
                description: l.description,
                quantity: l.quantity,
                unit_price_excl_vat: l.amount_excl_vat / (l.quantity || 1),
                vat_rate: l.vat_rate,
                vat_amount: l.vat_amount,
                amount_excl_vat: l.amount_excl_vat,
                amount_incl_vat: l.amount_incl_vat,
                sort_order: idx,
              }));
            } else {
              rowsToInsert = [{
                item_id: targetItemId,
                description: description || `Factuur ${invoiceNumber}`,
                quantity: 1,
                unit_price_excl_vat: headerExcl,
                vat_rate: headerVatRate,
                vat_amount: headerVat,
                amount_excl_vat: headerExcl,
                amount_incl_vat: headerIncl,
                sort_order: 0,
              }];
            }
            await supabase.from("program_item_billing_lines").insert(rowsToInsert);
            await supabase
              .from("program_request_items")
              .update({ use_actual_costs: true, final_billing_locked_at: new Date().toISOString() })
              .eq("id", targetItemId);
            toast.success("Factuurregels overgenomen op programma-onderdeel");
          } catch (e) {
            console.error("copyToBillingLines failed", e);
            toast.error("Overnemen naar factuurregels mislukt");
          }
        }
      }

      if (inboxItem && created?.id) {
        await markProcessed.mutateAsync({ id: inboxItem.id, invoiceId: created.id });
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Fout bij opslaan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPartner = partners?.find((p) => p.id === partnerId);
  const selectedProject = projects?.find((p) => p.id === requestId);
  const hasLines = lines.length > 0;

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
                                setItemId("");
                                setAllocations([]);
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
                                <div className="text-xs text-muted-foreground">
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
            </div>

            {/* Allocatie: verdeel het factuurbedrag over één of meerdere programma-onderdelen */}
            {requestId && items && items.length > 0 && (() => {
              const invoiceIncl = parseFloat(amountIncl) || 0;
              const invoiceExcl = parseFloat(amountExcl) || 0;
              // Subtract extras (per-project shares) so primary-project allocaties tegen het juiste deelbedrag worden geijkt
              const extrasInclSum = extraProjects.reduce((s, e) => {
                const eh = parseFloat(e.amountExclVat);
                const er = parseFloat(e.vatRate) || 0;
                if (eh > 0) return s + eh * (1 + er / 100);
                return s + e.allocations.reduce((ss, a) => {
                  const ae = parseFloat(a.amount_excl_vat) || 0;
                  const ar = parseFloat(a.vat_rate) || 0;
                  return ss + ae * (1 + ar / 100);
                }, 0);
              }, 0);
              const totalIncl = Math.max(0, invoiceIncl - extrasInclSum);
              const hasExtras = extrasInclSum > 0.005;
              const allocTotalIncl = allocations.reduce((sum, a) => {
                const excl = parseFloat(a.amount_excl_vat) || 0;
                const rate = parseFloat(a.vat_rate) || 0;
                return sum + excl * (1 + rate / 100);
              }, 0);
              const diff = totalIncl - allocTotalIncl;
              const matches = Math.abs(diff) < 0.01;
              const availableItems = items;

              const addAllocation = (item_id: string) => {
                setAllocations((prev) => [
                  ...prev,
                  { item_id, amount_excl_vat: "", vat_rate: vatRate || "21", notes: "" },
                ]);
              };
              const splitAllocation = (idx: number) => {
                setAllocations((prev) => {
                  const src = prev[idx];
                  if (!src) return prev;
                  const usedRates = prev
                    .filter((a) => a.item_id === src.item_id)
                    .map((a) => a.vat_rate);
                  const nextRate = ["21", "9", "0"].find((r) => !usedRates.includes(r)) || "21";
                  const copy = [...prev];
                  copy.splice(idx + 1, 0, { item_id: src.item_id, amount_excl_vat: "", vat_rate: nextRate, notes: "" });
                  return copy;
                });
              };
              const updateAllocation = (idx: number, patch: Partial<typeof allocations[number]>) => {
                setAllocations((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
              };
              const removeAllocation = (idx: number) => {
                setAllocations((prev) => prev.filter((_, i) => i !== idx));
              };
              const distributeEvenly = () => {
                if (allocations.length === 0 || totalIncl <= 0) return;
                const totalExcl = parseFloat(amountExcl) || 0;
                const per = totalExcl / allocations.length;
                const headerRate = vatRate || "21";
                setAllocations((prev) => prev.map((a) => ({ ...a, amount_excl_vat: per.toFixed(2), vat_rate: a.vat_rate || headerRate })));
              };

              return (
                <div className="space-y-2 rounded-md border border-border p-3 bg-muted/30">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <Label className="text-sm">Toewijzen aan programma-onderdelen (optioneel)</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Verdeel het factuurbedrag over één of meerdere onderdelen.
                      </p>
                    </div>
                    {allocations.length > 0 && (
                      <Button type="button" variant="ghost" size="sm" onClick={distributeEvenly}>
                        Verdeel gelijk
                      </Button>
                    )}
                  </div>

                  {allocations.length > 0 && (
                    <div className="space-y-2">
                      {allocations.map((alloc, idx) => {
                        const it: any = items.find((i: any) => i.id === alloc.item_id);
                        const excl = parseFloat(alloc.amount_excl_vat) || 0;
                        const rate = parseFloat(alloc.vat_rate) || 0;
                        const vat = excl * (rate / 100);
                        const incl = excl + vat;
                        return (
                          <div key={idx} className="grid grid-cols-12 gap-2 items-center text-sm bg-background rounded-md p-2 border border-border">
                            <div className="col-span-4 truncate">
                              <div className="font-medium truncate">
                                {it ? `Dag ${it.day_index + 1}: ${it.block_name}` : "Onbekend onderdeel"}
                              </div>
                            </div>
                            <div className="col-span-3">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Excl. €"
                                value={alloc.amount_excl_vat}
                                onChange={(e) => updateAllocation(idx, { amount_excl_vat: e.target.value })}
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-2">
                              <Select value={alloc.vat_rate} onValueChange={(v) => updateAllocation(idx, { vat_rate: v })}>
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">0%</SelectItem>
                                  <SelectItem value="9">9%</SelectItem>
                                  <SelectItem value="21">21%</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-1 text-right text-xs tabular-nums text-muted-foreground">
                              €{incl.toFixed(2)}
                            </div>
                            <div className="col-span-2 flex justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                title="Voeg een extra BTW-regel toe voor hetzelfde onderdeel"
                                onClick={() => splitAllocation(idx)}
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                BTW-regel
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeAllocation(idx)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {availableItems.length > 0 && (
                    <Select value="" onValueChange={(v) => v && addAllocation(v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={allocations.length === 0 ? "+ Onderdeel toevoegen" : "+ Nog een onderdeel toevoegen"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableItems.map((it: any) => (
                          <SelectItem key={it.id} value={it.id}>
                            Dag {it.day_index + 1}: {it.block_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {allocations.length > 0 && (
                    <div className={cn(
                      "flex items-center justify-between gap-2 text-xs px-2 py-1.5 rounded-md",
                      matches ? "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300" : "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
                    )}>
                      <span>
                        Toegewezen: <strong>€{allocTotalIncl.toFixed(2)}</strong> van €{totalIncl.toFixed(2)} (incl. BTW){hasExtras ? " — hoofdproject-aandeel" : ""}
                      </span>
                      <span>
                        {matches ? "✓ Klopt" : `Verschil: €${diff.toFixed(2)}`}
                      </span>
                    </div>
                  )}
                  {(() => {
                    const filledAllocs = allocations.filter((a) => a.item_id && parseFloat(a.amount_excl_vat) > 0);
                    const uniqueItems = new Set(filledAllocs.map((a) => a.item_id));
                    const canCopy =
                      (filledAllocs.length >= 1 && uniqueItems.size === 1) ||
                      (filledAllocs.length === 0 && !!itemId);
                    const hasMultiItems = uniqueItems.size > 1;
                    if (canCopy) {
                      return (
                        <label className="flex items-start gap-2 text-xs bg-background border border-border rounded-md p-2 cursor-pointer">
                          <Checkbox
                            checked={copyToBillingLines}
                            onCheckedChange={(c) => setCopyToBillingLines(Boolean(c))}
                            className="mt-0.5"
                          />
                          <span>
                            <strong>Direct overnemen als factuurregels</strong> op het programma-onderdeel
                            <span className="block text-muted-foreground">
                              Vervangt bestaande factuurregels en zet 'werkelijke kosten leidend' aan. Bij meerdere BTW-regels op hetzelfde onderdeel worden ze allemaal overgenomen.
                            </span>
                          </span>
                        </label>
                      );
                    }
                    if (hasMultiItems) {
                      return (
                        <div className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-md p-2">
                          <strong>Overnemen als factuurregels</strong> is niet beschikbaar bij verdeling over meerdere programma-onderdelen — splits dit handmatig per onderdeel als je inkoop = verkoop wilt vastleggen.
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              );
            })()}

            {/* Extra projecten: splits factuur naar meerdere projecten */}
            {requestId && (() => {
              const headerExclNum = parseFloat(amountExcl) || 0;
              const headerInclNum = parseFloat(amountIncl) || 0;
              // Per project: excl + incl (header-modus óf afgeleid uit onderdelen)
              const extraRows = extraProjects.map((e) => {
                const eh = parseFloat(e.amountExclVat);
                const er = parseFloat(e.vatRate) || 0;
                if (eh > 0) {
                  return { excl: eh, incl: eh * (1 + er / 100), mixed: false };
                }
                let excl = 0;
                let incl = 0;
                const rates = new Set<number>();
                e.allocations.forEach((a) => {
                  const ae = parseFloat(a.amount_excl_vat) || 0;
                  if (ae <= 0) return;
                  const ar = parseFloat(a.vat_rate) || 0;
                  excl += ae;
                  incl += ae * (1 + ar / 100);
                  rates.add(ar);
                });
                return { excl, incl, mixed: rates.size > 1 };
              });
              const extrasExcl = extraRows.reduce((s, r) => s + r.excl, 0);
              const extrasIncl = extraRows.reduce((s, r) => s + r.incl, 0);
              const primaryShareExcl = headerExclNum - extrasExcl;
              const primaryShareIncl = headerInclNum - extrasIncl;
              const balancedExcl = extrasExcl <= headerExclNum + 0.01 && primaryShareExcl >= -0.01;
              const balancedIncl = extrasIncl <= headerInclNum + 0.01 && primaryShareIncl >= -0.01;
              const balanced = balancedExcl && balancedIncl;
              const addExtra = () => {
                setExtraProjects((prev) => [
                  ...prev,
                  { requestId: "", amountExclVat: "", vatRate: vatRate || "21", allocations: [], copyToBillingLines: true },
                ]);
              };
              return (
                <div className="space-y-2 rounded-md border border-dashed border-border p-3 bg-muted/20">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <Label className="text-sm">Extra projecten (splits factuur)</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Heeft deze factuur posten voor meerdere projecten? Voeg er hier extra toe — er wordt dan per project een aparte inkoopfactuur aangemaakt. Voor mixed BTW: laat header-bedrag leeg en voeg onderdelen toe per tarief.
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addExtra}>
                      <Plus className="h-3 w-3 mr-1" /> Project toevoegen
                    </Button>
                  </div>

                  {extraProjects.length > 0 && (
                    <>
                      <div className="space-y-2">
                        {extraProjects.map((split, idx) => (
                          <ExtraProjectSplitBlock
                            key={idx}
                            index={idx}
                            split={split}
                            projects={(projects as any) || []}
                            itemsForProject={(extraItems as any || []).filter((it: any) => it.request_id === split.requestId)}
                            partnerId={partnerId}
                            onChange={(patch) =>
                              setExtraProjects((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)))
                            }
                            onRemove={() =>
                              setExtraProjects((prev) => prev.filter((_, i) => i !== idx))
                            }
                          />
                        ))}
                      </div>
                      <div
                        className={cn(
                          "text-xs px-2 py-1.5 rounded-md space-y-0.5",
                          balanced
                            ? "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300"
                            : "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300",
                        )}
                      >
                        <div className="opacity-80 mb-1">
                          Controle: zo wordt deze inkoopfactuur over projecten verdeeld.
                        </div>
                        <div className="flex justify-between">
                          <span>Hoofdproject (rest van factuurtotaal)</span>
                          <span className="tabular-nums">€{primaryShareExcl.toFixed(2)} excl · €{primaryShareIncl.toFixed(2)} incl</span>
                        </div>
                        {extraRows.map((r, i) => {
                          const p = (projects as any || []).find((pp: any) => pp.id === extraProjects[i]?.requestId);
                          const label = p
                            ? `${p.reference_number || "Geen ref"} — ${p.customer_company || p.customer_name}`
                            : `Extra project ${i + 1}`;
                          return (
                            <div key={i} className="flex justify-between">
                              <span>Extra project {i + 1}: {label}{r.mixed ? " (gemengd BTW)" : ""}</span>
                              <span className="tabular-nums">€{r.excl.toFixed(2)} excl · €{r.incl.toFixed(2)} incl</span>
                            </div>
                          );
                        })}
                        <div className="flex justify-between border-t border-current/20 pt-0.5 font-medium">
                          <span>{balanced ? "✓ Klopt — sluit aan op factuurtotaal" : primaryShareExcl < -0.01 || primaryShareIncl < -0.01 ? "⚠ Extras > factuurtotaal" : "⚠ Verschil met factuurtotaal"}</span>
                          <span className="tabular-nums">Factuurtotaal: €{headerExclNum.toFixed(2)} excl · €{headerInclNum.toFixed(2)} incl</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}



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

            {duplicateInvoice && (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 p-3 space-y-2">
                <div className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-100">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Mogelijk dubbele inkoopfactuur</p>
                    <p className="text-xs mt-0.5">
                      Factuurnummer <strong>{duplicateInvoice.invoice_number}</strong> is al geregistreerd
                      voor deze leverancier op {duplicateInvoice.invoice_date} voor €
                      {Number(duplicateInvoice.amount_incl_vat ?? duplicateInvoice.amount_excl_vat).toFixed(2)}
                      {" "}(status: {duplicateInvoice.status}).
                    </p>
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
