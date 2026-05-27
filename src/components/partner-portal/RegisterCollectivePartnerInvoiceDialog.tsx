import { useState, useEffect, useMemo, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Loader2, Info, Receipt, Building2, Mail, Upload, File as FileIcon, X } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useItemVatRates } from "@/hooks/useItemVatRates";
import { calculateFromInclVat } from "@/lib/vatCalculation";
import type { PartnerItem } from "@/types/partner";
import { getItemLineTotal } from "@/lib/portalPricing";

/** Te-factureren bedrag: partner-quote heeft voorrang, anders admin-inschatting × pers × dagen. */
const getBillableAmount = (item: PartnerItem): number => {
  const people = item.program_requests.number_of_people || 1;
  const days = Math.max((item.program_requests.selected_dates || []).length, 1);
  return getItemLineTotal(item as unknown as Parameters<typeof getItemLineTotal>[0], people, days) ?? 0;
};
const isEstimatedAmount = (item: PartnerItem): boolean =>
  item.quoted_price == null && item.admin_price_override != null;

interface BureauDetails {
  companyName?: string;
  kvkNumber?: string;
  vatNumber?: string;
  address?: string;
  email?: string;
}

export interface CollectiveInvoiceSubmitPayload {
  items: Array<{ itemId: string; amount: number; amountInclVat: number; vatRate: number }>;
  invoicedNumber: string;
  invoicedDate: string;
  notes?: string;
  filePath?: string;
  viaEmail?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** All eligible items in this project (same request_id). */
  projectItems: PartnerItem[];
  /** Initially-selected item ids. */
  initialSelectedIds: string[];
  commissionPercentage: number;
  bureauDetails?: BureauDetails | null;
  /** "upload" = PDF verplicht; "email" = partner bevestigt verzending naar inkoop@. */
  mode?: "upload" | "email";
  onSubmit: (payload: CollectiveInvoiceSubmitPayload) => Promise<{ success: boolean }>;
}

const INKOOP_INBOX = "inkoop@reply.bureauvlieland.nl";

export const RegisterCollectivePartnerInvoiceDialog = ({
  isOpen,
  onClose,
  projectItems,
  initialSelectedIds,
  commissionPercentage,
  bureauDetails,
  mode = "upload",
  onSubmit,
}: Props) => {
  const isEmailMode = mode === "email";
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { getItemVatRate } = useItemVatRates(projectItems);

  useEffect(() => {
    if (!isOpen) return;
    const ids = new Set(initialSelectedIds);
    setSelectedIds(ids);
    const initialAmounts: Record<string, string> = {};
    for (const it of projectItems) {
      const amt = getBillableAmount(it);
      initialAmounts[it.id] = amt > 0 ? amt.toFixed(2).replace(".", ",") : "";
    }
    setAmounts(initialAmounts);
    setInvoiceNumber("");
    setInvoiceDate(format(new Date(), "yyyy-MM-dd"));
    setNotes("");
    setSelectedFile(null);
    setErrors({});
  }, [isOpen, initialSelectedIds, projectItems]);

  const project = projectItems[0]?.program_requests;
  const customerLabel = project?.customer_company || project?.customer_name || "";

  const parseAmt = (s: string) => parseFloat((s || "").replace(",", ".")) || 0;

  const { totalIncl, totalExcl } = useMemo(() => {
    let incl = 0;
    let excl = 0;
    for (const id of selectedIds) {
      const item = projectItems.find((p) => p.id === id);
      const inclAmt = parseAmt(amounts[id] || "");
      incl += inclAmt;
      const rate = item ? getItemVatRate(item) : 21;
      excl += calculateFromInclVat(inclAmt, rate).amountExclVat;
    }
    return { totalIncl: +incl.toFixed(2), totalExcl: +excl.toFixed(2) };
  }, [selectedIds, amounts, projectItems, getItemVatRate]);

  const commissionAmount = +((totalExcl * commissionPercentage) / 100).toFixed(2);

  const bureauInfo = {
    companyName: bureauDetails?.companyName || "Bureau Vlieland",
    kvkNumber: bureauDetails?.kvkNumber || "",
    vatNumber: bureauDetails?.vatNumber || "",
    address: bureauDetails?.address || "Vlieland",
    email: bureauDetails?.email || "administratie@bureauvlieland.nl",
  };

  const toggleItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Alleen PDF-bestanden zijn toegestaan");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Bestand is te groot (max 10MB)");
      return;
    }
    setSelectedFile(file);
  };

  const uploadFile = async (firstItem: PartnerItem): Promise<string | null> => {
    if (!selectedFile) return null;
    setIsUploading(true);
    try {
      const ext = selectedFile.name.split(".").pop();
      const path = `${firstItem.provider_id}/${firstItem.request_id}/collective-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("partner-invoices").upload(path, selectedFile);
      if (error) {
        console.error(error);
        toast.error("Fout bij uploaden van PDF");
        return null;
      }
      return path;
    } finally {
      setIsUploading(false);
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (selectedIds.size === 0) e.items = "Selecteer minimaal 1 onderdeel";
    for (const id of selectedIds) {
      if (parseAmt(amounts[id] || "") <= 0) {
        e[`amount-${id}`] = "Vul een geldig bedrag in";
      }
    }
    if (!invoiceNumber.trim()) e.invoiceNumber = "Factuurnummer is verplicht";
    if (!invoiceDate) e.invoiceDate = "Factuurdatum is verplicht";
    if (!isEmailMode && !selectedFile) e.file = "PDF van de factuur is verplicht";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const firstItem = projectItems.find((i) => selectedIds.has(i.id)) || projectItems[0];
    if (!firstItem) return;

    setIsSubmitting(true);
    try {
      let filePath: string | undefined;
      if (!isEmailMode) {
        const uploaded = await uploadFile(firstItem);
        if (!uploaded) {
          setErrors({ file: "Upload van PDF is mislukt" });
          return;
        }
        filePath = uploaded;
      }
      const emailNoteSuffix = `Factuur verzonden via e-mail naar ${INKOOP_INBOX}`;
      const combinedNotes = isEmailMode
        ? [notes?.trim(), emailNoteSuffix].filter(Boolean).join(" — ")
        : notes || undefined;
      const payload: CollectiveInvoiceSubmitPayload = {
        items: Array.from(selectedIds).map((id) => {
          const item = projectItems.find((p) => p.id === id);
          const incl = parseAmt(amounts[id] || "");
          const rate = item ? getItemVatRate(item) : 21;
          const breakdown = calculateFromInclVat(incl, rate);
          return {
            itemId: id,
            amount: breakdown.amountExclVat,
            amountInclVat: breakdown.amountInclVat,
            vatRate: rate,
          };
        }),
        invoicedNumber: invoiceNumber.trim(),
        invoicedDate: invoiceDate,
        notes: combinedNotes || undefined,
        filePath,
        viaEmail: isEmailMode,
      };
      const res = await onSubmit(payload);
      if (!res.success) {
        setErrors({ submit: "Er is een fout opgetreden bij het registreren" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (projectItems.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEmailMode ? <Mail className="h-5 w-5" /> : <Receipt className="h-5 w-5" />}
            {isEmailMode ? "Markeer als gefactureerd via e-mail" : "Verzamelfactuur registreren"}
          </DialogTitle>
          <DialogDescription>
            Project {project?.reference_number || ""} — {customerLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
              <Building2 className="h-4 w-4" /> Factureer aan {bureauInfo.companyName}
            </div>
            {bureauInfo.address && <div className="text-muted-foreground">{bureauInfo.address}</div>}
            {bureauInfo.kvkNumber && <div className="text-muted-foreground">KvK: {bureauInfo.kvkNumber}</div>}
            {bureauInfo.vatNumber && <div className="text-muted-foreground">BTW: {bureauInfo.vatNumber}</div>}
            {bureauInfo.email && (
              <div className="text-muted-foreground">Administratie: {bureauInfo.email}</div>
            )}
            <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
                <Mail className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium">PDF mailen kan ook naar:</div>
                  <a href={`mailto:${INKOOP_INBOX}`} className="underline">{INKOOP_INBOX}</a>
                  <div className="text-xs text-muted-foreground mt-1">
                    Factuur wordt automatisch ingelezen en aan het project gekoppeld.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Onderdelen op deze factuur (bedragen incl. BTW)</Label>
            <div className="rounded-md border divide-y">
              {projectItems.map((it) => {
                const checked = selectedIds.has(it.id);
                return (
                  <div key={it.id} className="flex items-center gap-3 p-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleItem(it.id)}
                      className="h-4 w-4"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{it.block_name}</div>
                      {(() => {
                        const amt = getBillableAmount(it);
                        if (!amt) return null;
                        const label = isEstimatedAmount(it) ? "Geschat bedrag" : "Bevestigde prijs";
                        return (
                          <div className="text-xs text-muted-foreground">
                            {label}: €{amt.toLocaleString("nl-NL", { minimumFractionDigits: 2 })} incl. BTW
                          </div>
                        );
                      })()}
                    </div>
                    <div className="w-32">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                        <Input
                          disabled={!checked}
                          value={amounts[it.id] || ""}
                          onChange={(e) => setAmounts({ ...amounts, [it.id]: e.target.value })}
                          placeholder="0,00"
                          inputMode="decimal"
                          className={`pl-7 ${errors[`amount-${it.id}`] ? "border-destructive" : ""}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {errors.items && <p className="text-sm text-destructive">{errors.items}</p>}
            <div className="space-y-1 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Totaal incl. BTW</span>
                <span className="font-semibold">€{totalIncl.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>waarvan excl. BTW (basis commissie)</span>
                <span>€{totalExcl.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Factuurnummer *</Label>
              <Input
                id="invoiceNumber"
                placeholder="Bijv. FA-2026-0042"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className={errors.invoiceNumber ? "border-destructive" : ""}
              />
              {errors.invoiceNumber && <p className="text-sm text-destructive">{errors.invoiceNumber}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Factuurdatum *</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className={errors.invoiceDate ? "border-destructive" : ""}
              />
              {errors.invoiceDate && <p className="text-sm text-destructive">{errors.invoiceDate}</p>}
            </div>
          </div>

          {commissionPercentage > 0 && totalExcl > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Commissie Bureau Vlieland ({commissionPercentage}% over €{totalExcl.toLocaleString("nl-NL", { minimumFractionDigits: 2 })} excl. BTW): <strong>€{commissionAmount.toFixed(2)}</strong>
                <div className="text-muted-foreground text-sm">U ontvangt hiervoor een aparte factuur van Bureau Vlieland.</div>
              </AlertDescription>
            </Alert>
          )}

          {isEmailMode ? (
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
              <Mail className="h-4 w-4" />
              <AlertDescription className="space-y-1">
                <div className="font-medium text-amber-900 dark:text-amber-200">
                  Je bevestigt dat je factuur {invoiceNumber ? <strong>#{invoiceNumber}</strong> : "(vul nummer hierboven in)"} per e-mail hebt verzonden naar{" "}
                  <a href={`mailto:${INKOOP_INBOX}`} className="underline font-medium">{INKOOP_INBOX}</a>.
                </div>
                <div className="text-xs text-muted-foreground">
                  Bureau Vlieland koppelt de PDF automatisch zodra de e-mail binnenkomt. De onderdelen worden direct als gefactureerd geregistreerd.
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              <Label>PDF van de factuur *</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              {selectedFile ? (
                <div className="flex items-center justify-between gap-2 rounded-md border p-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{selectedFile.name}</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> PDF uploaden (verplicht)
                </Button>
              )}
              {errors.file && <p className="text-sm text-destructive">{errors.file}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Opmerkingen (optioneel)</Label>
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {errors.submit && <p className="text-sm text-destructive">{errors.submit}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting || isUploading}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isUploading}>
            {(isSubmitting || isUploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEmailMode ? "Bevestig verzending" : "Factuur registreren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
