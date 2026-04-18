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
      }));
  }

  if (items.length > 0) {
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

  return [];
}

function computeLineTotals(line: LineRow) {
  const qty = parseFloat(line.quantity) || 0;
  const unit = parseFloat(line.unit_price) || 0;
  const rate = parseFloat(line.vat_rate) || 0;
  const excl = qty * unit;
  const vat = excl * (rate / 100);
  return {
    amount_excl_vat: excl,
    vat_amount: vat,
    amount_incl_vat: excl + vat,
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

  const [partnerSearchOpen, setPartnerSearchOpen] = useState(false);
  const [projectSearchOpen, setProjectSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
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

      // Header values: from lines if present, otherwise manual
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
        item_id: itemId || null,
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
      });

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

            {/* Optional: link to item */}
            {requestId && items && items.length > 0 && (
              <div className="space-y-1.5">
                <Label>Programma-onderdeel (optioneel)</Label>
                <Select value={itemId || "none"} onValueChange={(v) => setItemId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Geen specifiek onderdeel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen specifiek onderdeel</SelectItem>
                    {items.map((it: any) => (
                      <SelectItem key={it.id} value={it.id}>
                        Dag {it.day_index + 1}: {it.block_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
                <Select value={vatRate} onValueChange={setVatRate} disabled={hasLines}>
                  <SelectTrigger className={hasLines ? "bg-muted" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{lineTotals?.isMixed ? "Gemengd" : "0%"}</SelectItem>
                    <SelectItem value="9">9%</SelectItem>
                    <SelectItem value="21">21%</SelectItem>
                  </SelectContent>
                </Select>
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
