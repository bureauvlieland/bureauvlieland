import { useEffect, useMemo, useState } from "react";
import { isValidInvoiceNumberInput } from "@/lib/purchaseInvoiceConsistency";
import { looksLikeProjectReference } from "@/lib/purchaseInvoiceDuplicateRules";
import { PURCHASE_INVOICE_INBOX } from "@/lib/bureauContact";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, Notice, OptionCard, OptionGroup, Pill } from "@/components/system";
import { Building2, Loader2, Mail, Receipt, UserRound } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useItemVatRates } from "@/hooks/useItemVatRates";
import { calculateFromInclVat } from "@/lib/vatCalculation";
import type { PartnerItem } from "@/types/partner";
import { getPartnerBillableAmount, isPartnerEstimatedAmount } from "@/lib/partnerBillableAmount";
import type { InvoiceBilledTo } from "@/lib/invoiceBilledTo";
import { reportError } from "@/lib/errorReporting";
import { formatEuro } from "@/lib/formatEuro";
import { cn } from "@/lib/utils";

/**
 * De verzamelfactuur: meerdere onderdelen van één project, één
 * factuurnummer en één pdf (partnerportaal fase 3: op `FormField` en
 * `Notice`). In e-mailmodus bevestigt de partner dat de factuur naar de
 * inkoopinbox is gemaild; de pdf is dan niet verplicht.
 */
interface BureauDetails {
  companyName?: string;
  legalName?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  kvkNumber?: string;
  vatNumber?: string;
  iban?: string;
}

export interface CollectiveInvoiceSubmitPayload {
  items: Array<{ itemId: string; amount: number; amountInclVat: number; vatRate: number }>;
  invoicedNumber: string;
  invoicedDate: string;
  notes?: string;
  filePath?: string;
  viaEmail?: boolean;
  /** Aan wie de factuur gericht is: bureau (default) of customer (de gast betaalde rechtstreeks). */
  billedTo: InvoiceBilledTo;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Alle onderdelen van dit project die te factureren zijn. */
  projectItems: PartnerItem[];
  initialSelectedIds: string[];
  commissionPercentage: number;
  bureauDetails?: BureauDetails | null;
  /** `upload`: pdf verplicht; `email`: de partner bevestigt de verzending naar de inkoopinbox. */
  mode?: "upload" | "email";
  /** Vooraf ingevulde keuze "aan wie gericht", afgeleid van het project. */
  defaultBilledTo?: InvoiceBilledTo;
  onSubmit: (payload: CollectiveInvoiceSubmitPayload) => Promise<{ success: boolean }>;
}

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const parseAmount = (s: string) => parseFloat((s || "").replace(",", ".")) || 0;

export const RegisterCollectivePartnerInvoiceDialog = ({ isOpen, onClose, projectItems, initialSelectedIds, commissionPercentage, bureauDetails, mode = "upload", defaultBilledTo = "bureau", onSubmit }: Props) => {
  const isEmailMode = mode === "email";
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [billedTo, setBilledTo] = useState<InvoiceBilledTo>(defaultBilledTo);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { getItemVatRate } = useItemVatRates(projectItems);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds(new Set(initialSelectedIds));
    const initial: Record<string, string> = {};
    for (const it of projectItems) {
      const amt = getPartnerBillableAmount(it);
      initial[it.id] = amt > 0 ? amt.toFixed(2).replace(".", ",") : "";
    }
    setAmounts(initial);
    setInvoiceNumber("");
    setInvoiceDate(format(new Date(), "yyyy-MM-dd"));
    setNotes("");
    setFile(null);
    setBilledTo(defaultBilledTo);
    setErrors({});
  }, [isOpen, initialSelectedIds, projectItems, defaultBilledTo]);

  const project = projectItems[0]?.program_requests;
  const customerLabel = project?.customer_company || project?.customer_name || "";

  /** Geselecteerde regels per btw-tarief, plus de totalen. */
  const { totalIncl, totalExcl, vatBreakdown } = useMemo(() => {
    const groups = new Map<number, { excl: number; vat: number }>();
    let incl = 0;
    let excl = 0;
    for (const id of selectedIds) {
      const item = projectItems.find((p) => p.id === id);
      const inclAmt = parseAmount(amounts[id] || "");
      if (inclAmt <= 0) continue;
      const rate = item ? getItemVatRate(item) : 21;
      const breakdown = calculateFromInclVat(inclAmt, rate);
      incl += breakdown.amountInclVat;
      excl += breakdown.amountExclVat;
      const cur = groups.get(rate) || { excl: 0, vat: 0 };
      cur.excl += breakdown.amountExclVat;
      cur.vat += breakdown.vatAmount;
      groups.set(rate, cur);
    }
    return {
      totalIncl: +incl.toFixed(2),
      totalExcl: +excl.toFixed(2),
      vatBreakdown: [...groups.entries()].sort(([a], [b]) => a - b).map(([rate, v]) => ({ rate, excl: +v.excl.toFixed(2), vat: +v.vat.toFixed(2) })),
    };
  }, [selectedIds, amounts, projectItems, getItemVatRate]);

  const commissionAmount = +((totalExcl * commissionPercentage) / 100).toFixed(2);

  const bureauName = bureauDetails?.legalName || bureauDetails?.companyName || "Bureau Vlieland";
  const bureauAddress = [bureauDetails?.street, [bureauDetails?.postalCode, bureauDetails?.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const bureauRegistration = [bureauDetails?.kvkNumber ? `KvK ${bureauDetails.kvkNumber}` : null, bureauDetails?.vatNumber ? `btw ${bureauDetails.vatNumber}` : null, bureauDetails?.iban ? `IBAN ${bureauDetails.iban}` : null]
    .filter(Boolean)
    .join(" · ");

  const toggleItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (selectedIds.size === 0) e.items = "Kies minstens één onderdeel.";
    for (const id of selectedIds) {
      if (parseAmount(amounts[id] || "") <= 0) e[`amount-${id}`] = "Vul een geldig bedrag in.";
    }
    if (!invoiceNumber.trim()) e.invoiceNumber = "Het factuurnummer is verplicht.";
    else if (!isValidInvoiceNumberInput(invoiceNumber)) e.invoiceNumber = "Vul het echte factuurnummer in: minimaal één cijfer, geen 'nvt' of '-'.";
    else if (looksLikeProjectReference(invoiceNumber)) e.invoiceNumber = "Dit is ons projectnummer, niet uw factuurnummer. Vul het nummer in dat op uw eigen factuur staat.";
    if (!invoiceDate) e.invoiceDate = "De factuurdatum is verplicht.";
    if (!isEmailMode && !file) e.file = "De pdf van de factuur is verplicht.";
    else if (file && file.type !== "application/pdf") e.file = "Alleen een pdf is toegestaan.";
    else if (file && file.size > MAX_PDF_BYTES) e.file = "Het bestand is te groot (maximaal 10 MB).";
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
      if (file) {
        const path = `${firstItem.provider_id}/${firstItem.request_id}/collective-${Date.now()}.pdf`;
        const { error } = await supabase.storage.from("partner-invoices").upload(path, file);
        if (error) {
          reportError(error, { where: "RegisterCollectivePartnerInvoiceDialog" });
          setErrors({ file: "De pdf kon niet worden geüpload. Probeer het opnieuw." });
          return;
        }
        filePath = path;
      }
      const emailNote = `Factuur verzonden via e-mail naar ${PURCHASE_INVOICE_INBOX}`;
      const combinedNotes = isEmailMode ? [notes.trim(), emailNote].filter(Boolean).join(" | ") : notes.trim() || undefined;
      const payload: CollectiveInvoiceSubmitPayload = {
        items: [...selectedIds].map((id) => {
          const item = projectItems.find((p) => p.id === id);
          const rate = item ? getItemVatRate(item) : 21;
          const breakdown = calculateFromInclVat(parseAmount(amounts[id] || ""), rate);
          return { itemId: id, amount: breakdown.amountExclVat, amountInclVat: breakdown.amountInclVat, vatRate: rate };
        }),
        invoicedNumber: invoiceNumber.trim(),
        invoicedDate: invoiceDate,
        notes: combinedNotes || undefined,
        filePath,
        viaEmail: isEmailMode,
        billedTo,
      };
      const res = await onSubmit(payload);
      if (!res.success) setErrors({ submit: "Kon de factuur niet registreren. Probeer het opnieuw." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (projectItems.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEmailMode ? <Mail className="h-5 w-5" aria-hidden="true" /> : <Receipt className="h-5 w-5" aria-hidden="true" />}
            {isEmailMode ? "Gefactureerd via e-mail" : "Verzamelfactuur registreren"}
          </DialogTitle>
          <DialogDescription>
            {project?.reference_number ? `Project ${project.reference_number} · ` : ""}
            {customerLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <OptionGroup label="Aan wie is deze factuur gericht?" columns={2}>
            <OptionCard
              selected={billedTo === "bureau"}
              onSelect={() => setBilledTo("bureau")}
              icon={<Building2 />}
              title={bureauName}
              description="Het bureau betaalt uw factuur en stuurt u apart een commissiefactuur."
            />
            <OptionCard
              selected={billedTo === "customer"}
              onSelect={() => setBilledTo("customer")}
              icon={<UserRound />}
              title="De gast, rechtstreeks afgerekend"
              description="De gast heeft u al betaald. U ontvangt alleen een commissiefactuur."
            />
          </OptionGroup>

          {billedTo === "customer" ? (
            <Notice tone="info" title="Factuur aan de gast">
              <p>
                De gast heeft rechtstreeks met u afgerekend; de boeking liep via Bureau Vlieland. Het bureau betaalt
                deze factuur niet en stuurt u alleen een commissiefactuur over het bedrag excl. btw.
              </p>
            </Notice>
          ) : (
            <Notice tone="info" title={`Factureer aan ${bureauName}`}>
              {bureauAddress && <p>{bureauAddress}</p>}
              {bureauRegistration && <p>{bureauRegistration}</p>}
            </Notice>
          )}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Onderdelen op deze factuur, bedragen incl. btw</legend>
            <ul className="divide-y rounded-md border">
              {projectItems.map((it) => {
                const checked = selectedIds.has(it.id);
                const billable = getPartnerBillableAmount(it);
                const amountError = errors[`amount-${it.id}`];
                return (
                  <li key={it.id} className="flex items-center gap-3 p-3">
                    <input id={`verzamel-${it.id}`} type="checkbox" checked={checked} onChange={() => toggleItem(it.id)} className="h-4 w-4 accent-primary" />
                    <label htmlFor={`verzamel-${it.id}`} className="min-w-0 flex-1 cursor-pointer">
                      <span className="block truncate font-medium">{it.block_name}</span>
                      {billable > 0 && (
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {formatEuro(billable)} incl. btw
                          {isPartnerEstimatedAmount(it) && <Pill tone="warning" size="sm">inschatting</Pill>}
                        </span>
                      )}
                    </label>
                    <div className="w-32">
                      <Input
                        aria-label={`Bedrag voor ${it.block_name}`}
                        aria-invalid={amountError ? true : undefined}
                        disabled={!checked}
                        value={amounts[it.id] || ""}
                        onChange={(e) => setAmounts({ ...amounts, [it.id]: e.target.value })}
                        placeholder="0,00"
                        inputMode="decimal"
                        className={cn(amountError && "border-destructive")}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            {errors.items && <p className="text-sm font-medium text-destructive">{errors.items}</p>}
            {Object.keys(errors).some((k) => k.startsWith("amount-")) && <p className="text-sm font-medium text-destructive">Vul bij elk gekozen onderdeel een geldig bedrag in.</p>}
            <dl className="space-y-1 pt-2 text-sm">
              <div className="flex items-center justify-between">
                <dt>Subtotaal excl. btw</dt>
                <dd>{formatEuro(totalExcl)}</dd>
              </div>
              {vatBreakdown.map((g) => (
                <div key={g.rate} className="flex items-center justify-between text-xs text-muted-foreground">
                  <dt>
                    Btw {g.rate}% over {formatEuro(g.excl)}
                  </dt>
                  <dd>{formatEuro(g.vat)}</dd>
                </div>
              ))}
              <div className="mt-1 flex items-center justify-between border-t pt-1 font-semibold">
                <dt>Totaal incl. btw</dt>
                <dd>{formatEuro(totalIncl)}</dd>
              </div>
            </dl>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Factuurnummer" htmlFor="collectiveInvoiceNumber" required error={errors.invoiceNumber}>
              <Input placeholder="Bijvoorbeeld FA-2026-0042" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </FormField>
            <FormField label="Factuurdatum" htmlFor="collectiveInvoiceDate" required error={errors.invoiceDate}>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </FormField>
          </div>

          {commissionPercentage > 0 && totalExcl > 0 && (
            <Notice tone="info" title={`Commissie Bureau Vlieland: ${formatEuro(commissionAmount)}`}>
              <p>
                {commissionPercentage}% over {formatEuro(totalExcl)} excl. btw. U ontvangt hiervoor een aparte factuur van Bureau Vlieland.
              </p>
            </Notice>
          )}

          {isEmailMode && (
            <Notice tone="warning" title="U bevestigt dat u de factuur heeft gemaild">
              <p>
                Factuur {invoiceNumber.trim() ? invoiceNumber.trim() : "(vul het nummer hierboven in)"} is per e-mail verzonden naar{" "}
                <a href={`mailto:${PURCHASE_INVOICE_INBOX}`} className="font-medium underline">
                  {PURCHASE_INVOICE_INBOX}
                </a>
                . Wij koppelen de pdf vanuit de inbox aan deze registratie; hieronder uploaden hoeft dan niet.
              </p>
            </Notice>
          )}

          <FormField label="Pdf van de factuur" htmlFor="collectiveInvoicePdf" required={!isEmailMode} error={errors.file} help="Maximaal 10 MB.">
            <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </FormField>

          <FormField label="Opmerkingen" htmlFor="collectiveInvoiceNotes">
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>

          {errors.submit && (
            <Notice tone="danger" title="Niet geregistreerd">
              <p>{errors.submit}</p>
            </Notice>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Annuleren
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isEmailMode ? "Verzending bevestigen" : "Factuur registreren"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
