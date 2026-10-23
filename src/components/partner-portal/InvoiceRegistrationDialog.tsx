import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FactList, FormField, Notice, OptionCard, OptionGroup, SuccessScreen } from "@/components/system";
import { Building2, Euro, Loader2, Receipt, UserRound } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import type { PartnerItem } from "@/types/partner";
import { supabase } from "@/integrations/supabase/client";
import { useItemVatRates } from "@/hooks/useItemVatRates";
import { useAppSettings } from "@/hooks/useAppSettings";
import { isValidInvoiceNumberInput } from "@/lib/purchaseInvoiceConsistency";
import { looksLikeProjectReference } from "@/lib/purchaseInvoiceDuplicateRules";
import { PURCHASE_INVOICE_INBOX } from "@/lib/bureauContact";
import { getPartnerBillableAmount, isPartnerEstimatedAmount } from "@/lib/partnerBillableAmount";
import { defaultBilledToForProject, type InvoiceBilledTo } from "@/lib/invoiceBilledTo";
import { reportError } from "@/lib/errorReporting";
import { formatEuro } from "@/lib/formatEuro";

/**
 * Eén factuurdialoog voor een onderdeel en voor logies (partnerportaal fase
 * 3, besluit 9). Dezelfde velden, dezelfde controles en altijd een pdf:
 * factuurnummer, bedrag incl. btw, datum, pdf. De dialoog regelt de upload
 * en de registratie zelf en toont daarna de bevestiging; de pagina haalt de
 * gegevens opnieuw op via `onRegistered`.
 */
interface BillingDetails {
  billing_company_name?: string | null;
  billing_kvk_number?: string | null;
  billing_vat_number?: string | null;
  billing_address_street?: string | null;
  billing_address_postal?: string | null;
  billing_address_city?: string | null;
  billing_contact_name?: string | null;
  billing_contact_email?: string | null;
  billing_reference?: string | null;
}

export type InvoiceTarget =
  | { kind: "item"; item: PartnerItem; billingDetails?: BillingDetails | null }
  | {
      kind: "accommodation";
      quoteId: string;
      partnerId: string;
      requestId: string;
      accommodationName: string;
      customerLabel: string;
      stayLabel?: string;
      priceTotal: number;
      priceIncludesVat: boolean;
      vatRate: number;
      /** Facturatiewijze van het gekoppelde programma (bureau_central of partner_direct). */
      invoicingMode?: string | null;
      /** Het bureau haalde het logies van zijn factuur: de accommodatie rekent rechtstreeks met de gast af. */
      accommodationBilledDirectly?: boolean;
    };

interface InvoiceRegistrationDialogProps {
  target: InvoiceTarget | null;
  onClose: () => void;
  partnerToken: string;
  /** Het commissiepercentage voor dit soort: onderdelen of logies. */
  commissionPercentage: number;
  /** Na een geslaagde registratie; de pagina haalt de gegevens opnieuw op. */
  onRegistered: () => void | Promise<void>;
}

const MAX_PDF_BYTES = 10 * 1024 * 1024;

export const InvoiceRegistrationDialog = ({ target, onClose, partnerToken, commissionPercentage, onRegistered }: InvoiceRegistrationDialogProps) => {
  const [amount, setAmount] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  // Aan wie de factuur gericht is: Bureau Vlieland (het bureau betaalt) of de
  // gast (die rekende rechtstreeks af; alleen commissie). Vooraf ingevuld
  // vanuit het project, altijd om te zetten.
  const [billedTo, setBilledTo] = useState<InvoiceBilledTo>("bureau");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState<{ commission: number } | null>(null);
  const { getSetting } = useAppSettings();

  const defaultBilledTo: InvoiceBilledTo = !target
    ? "bureau"
    : target.kind === "item"
      ? defaultBilledToForProject(target.item.program_requests, "item")
      : defaultBilledToForProject(
          { invoicing_mode: target.invoicingMode ?? null, excluded_fees: target.accommodationBilledDirectly ? ["accommodation"] : [] },
          "accommodation",
        );

  const item = target?.kind === "item" ? target.item : null;
  const { getItemVatRate } = useItemVatRates(item ? [{ block_id: item.block_id }] : []);
  const vatRate = target?.kind === "accommodation" ? Number(target.vatRate) || 0 : item ? getItemVatRate({ block_id: item.block_id }) : 21;

  // Bij openen: bedrag vooraf ingevuld met de prijsopgave (incl. btw).
  const targetKey = target ? (target.kind === "item" ? `item:${target.item.id}` : `quote:${target.quoteId}`) : null;
  useEffect(() => {
    if (!target) return;
    const prefill =
      target.kind === "item"
        ? getPartnerBillableAmount(target.item)
        : target.priceIncludesVat
          ? Number(target.priceTotal) || 0
          : Math.round((Number(target.priceTotal) || 0) * (1 + (Number(target.vatRate) || 0) / 100) * 100) / 100;
    setAmount(prefill > 0 ? prefill.toFixed(2).replace(".", ",") : "");
    setInvoiceNumber("");
    setInvoiceDate(format(new Date(), "yyyy-MM-dd"));
    setNotes("");
    setFile(null);
    setBilledTo(defaultBilledTo);
    setErrors({});
    setDone(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  if (!target) return null;

  const amountIncl = parseFloat(amount.replace(",", ".")) || 0;
  const amountExcl = vatRate > 0 ? Math.round((amountIncl / (1 + vatRate / 100)) * 100) / 100 : amountIncl;
  const vatAmount = Math.round((amountIncl - amountExcl) * 100) / 100;
  // Commissie gaat over het bedrag excl. btw (huisregel).
  const commission = Math.round(amountExcl * commissionPercentage) / 100;

  const subject = target.kind === "item" ? target.item.block_name : target.accommodationName;
  const customerLabel = target.kind === "item" ? target.item.program_requests.customer_company || target.item.program_requests.customer_name : target.customerLabel;
  const billsBureau = billedTo === "bureau";
  const customerPaid = billedTo === "customer";
  const billingDetails = target.kind === "item" ? target.billingDetails : null;

  const bureau = {
    name: getSetting<string>("bureau_legal_name", "") || getSetting<string>("bureau_company_name", "Bureau Vlieland"),
    address: [getSetting<string>("bureau_street", ""), [getSetting<string>("bureau_postal_code", ""), getSetting<string>("bureau_city", "")].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    kvk: getSetting<string>("bureau_kvk_number", ""),
    vat: getSetting<string>("bureau_vat_number", ""),
  };

  const facts =
    target.kind === "item"
      ? [
          { label: "Onderdeel", value: target.item.block_name },
          { label: "Klant", value: customerLabel },
          ...(target.item.proposed_date ? [{ label: "Datum", value: format(parseISO(target.item.proposed_date), "d MMMM yyyy", { locale: nl }) }] : []),
          { label: "Personen", value: `${target.item.program_requests.number_of_people}` },
          {
            label: isPartnerEstimatedAmount(target.item) ? "Inschatting van Bureau Vlieland" : "Uw prijsopgave",
            value: `${formatEuro(getPartnerBillableAmount(target.item))} incl. btw`,
          },
        ]
      : [
          { label: "Accommodatie", value: target.accommodationName },
          { label: "Klant", value: customerLabel },
          ...(target.stayLabel ? [{ label: "Verblijf", value: target.stayLabel }] : []),
          { label: "Offertebedrag", value: `${formatEuro(target.priceTotal)} ${target.priceIncludesVat ? "incl." : "excl."} btw` },
        ];

  const validate = () => {
    const next: Record<string, string> = {};
    if (amountIncl <= 0) next.amount = "Vul een geldig bedrag in.";
    if (!invoiceNumber.trim()) next.invoiceNumber = "Het factuurnummer is verplicht.";
    else if (!isValidInvoiceNumberInput(invoiceNumber)) next.invoiceNumber = "Vul het echte factuurnummer in: minimaal één cijfer, geen 'nvt' of '-'.";
    else if (looksLikeProjectReference(invoiceNumber)) next.invoiceNumber = "Dit is ons projectnummer, niet uw factuurnummer. Vul het nummer in dat op uw eigen factuur staat.";
    if (!invoiceDate) next.invoiceDate = "De factuurdatum is verplicht.";
    if (!file) next.file = "De pdf van de factuur is verplicht.";
    else if (file.type !== "application/pdf") next.file = "Alleen een pdf is toegestaan.";
    else if (file.size > MAX_PDF_BYTES) next.file = "Het bestand is te groot (maximaal 10 MB).";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !file) return;
    setIsSubmitting(true);
    try {
      // De map is altijd de partner zelf: de opslagregels staan alleen uploads in de eigen map toe.
      const filePath =
        target.kind === "item"
          ? `${target.item.provider_id}/${target.item.request_id}/${target.item.id}-${Date.now()}.pdf`
          : `${target.partnerId}/${target.requestId}/${target.quoteId}-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage.from("partner-invoices").upload(filePath, file);
      if (uploadError) throw new Error("De pdf kon niet worden geüpload.");

      if (target.kind === "item") {
        // De functie verwacht het bedrag excl. btw en berekent btw en commissie zelf.
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-partner-invoice`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({
            partnerToken,
            itemId: target.item.id,
            invoicedAmount: amountExcl,
            invoicedNumber: invoiceNumber.trim(),
            invoicedDate: invoiceDate,
            notes: notes.trim() || undefined,
            filePath,
            billedTo,
          }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}) as { error?: string });
          throw new Error(payload.error || "Kon de factuur niet registreren.");
        }
      } else {
        const { data, error } = await supabase.functions.invoke("register-accommodation-invoice", {
          body: { quoteId: target.quoteId, partnerToken, invoicedAmount: amountExcl, invoicedNumber: invoiceNumber.trim(), invoicedDate: invoiceDate, billedTo },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        // Het pad op de offerte is beschermd; de functie koppelt de pdf met het partnertoken.
        const { data: attach, error: attachError } = await supabase.functions.invoke("attach-accommodation-invoice-pdf", {
          body: { quoteId: target.quoteId, partnerToken, filePath },
        });
        if (attachError) throw attachError;
        if (attach?.error) throw new Error(attach.error);
      }

      setDone({ commission });
      await onRegistered();
    } catch (err) {
      reportError(err, { where: "InvoiceRegistrationDialog: registreren" });
      setErrors({ submit: err instanceof Error && err.message ? err.message : "Kon de factuur niet registreren. Probeer het opnieuw." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" aria-hidden="true" />
            {done ? "Factuur geregistreerd" : "Factuur registreren"}
          </DialogTitle>
          <DialogDescription>
            {subject} · {customerLabel}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <SuccessScreen
            title={`Factuur ${invoiceNumber.trim()} is geregistreerd`}
            intro={
              commissionPercentage > 0
                ? `Bureau Vlieland stuurt u een commissiefactuur van ${formatEuro(done.commission)} (${commissionPercentage}% over ${formatEuro(amountExcl)} excl. btw).${customerPaid ? " De gast heeft de factuur zelf betaald; het bureau betaalt u niets uit." : ""}`
                : customerPaid
                  ? "De factuur is vastgelegd. De gast heeft hem zelf betaald; het bureau betaalt u niets uit."
                  : "Bureau Vlieland verwerkt uw factuur."
            }
            primary={{ label: "Sluiten", onClick: onClose }}
            className="py-4"
          />
        ) : (
          <div className="space-y-4">
            <FactList title="Te factureren" items={facts} />

            <OptionGroup label="Aan wie is deze factuur gericht?" columns={2}>
              <OptionCard
                selected={billsBureau}
                onSelect={() => setBilledTo("bureau")}
                icon={<Building2 />}
                title="Bureau Vlieland"
                description="Het bureau betaalt uw factuur en stuurt u apart een commissiefactuur."
              />
              <OptionCard
                selected={customerPaid}
                onSelect={() => setBilledTo("customer")}
                icon={<UserRound />}
                title="De gast, rechtstreeks afgerekend"
                description="De gast heeft u al betaald. U ontvangt alleen een commissiefactuur."
              />
            </OptionGroup>

            {customerPaid ? (
              <Notice tone="info" title="Factuur aan de gast">
                <p>
                  De gast heeft rechtstreeks met u afgerekend; de boeking liep via Bureau Vlieland. Het bureau betaalt
                  deze factuur niet en stuurt u alleen een commissiefactuur over het bedrag excl. btw. Upload de pdf als
                  onderbouwing.
                </p>
              </Notice>
            ) : billsBureau ? (
              <Notice tone="info" title="Factureer aan Bureau Vlieland">
                <p>
                  {bureau.name}
                  {bureau.address ? `, ${bureau.address}` : ""}
                  {bureau.kvk ? ` · KvK ${bureau.kvk}` : ""}
                  {bureau.vat ? ` · btw ${bureau.vat}` : ""}
                </p>
                <p>
                  U factureert dezelfde geoffreerde prijs. Upload de pdf hieronder of mail hem naar{" "}
                  <a href={`mailto:${PURCHASE_INVOICE_INBOX}`} className="font-medium underline">
                    {PURCHASE_INVOICE_INBOX}
                  </a>
                  . Bureau Vlieland stuurt u apart een commissiefactuur.
                </p>
              </Notice>
            ) : billingDetails?.billing_company_name ? (
              <FactList
                title="Factureer aan"
                items={[
                  {
                    label: "Bedrijf",
                    value: [billingDetails.billing_company_name, billingDetails.billing_address_street, [billingDetails.billing_address_postal, billingDetails.billing_address_city].filter(Boolean).join(" ")].filter(Boolean).join(", "),
                  },
                  ...(billingDetails.billing_kvk_number || billingDetails.billing_vat_number
                    ? [{ label: "Registratie", value: [billingDetails.billing_kvk_number ? `KvK ${billingDetails.billing_kvk_number}` : null, billingDetails.billing_vat_number ? `btw ${billingDetails.billing_vat_number}` : null].filter(Boolean).join(" · ") }]
                    : []),
                  ...(billingDetails.billing_contact_name || billingDetails.billing_contact_email
                    ? [{ label: "Contact", value: [billingDetails.billing_contact_name, billingDetails.billing_contact_email].filter(Boolean).join(", ") }]
                    : []),
                  ...(billingDetails.billing_reference ? [{ label: "Referentie", value: billingDetails.billing_reference }] : []),
                ]}
              />
            ) : null}

            <FormField label="Factuurnummer" htmlFor="invoiceNumber" required error={errors.invoiceNumber} help="Het nummer dat op uw eigen factuur staat.">
              <Input placeholder="Bijvoorbeeld FA-2026-0042" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Bedrag incl. btw"
                htmlFor="invoiceAmount"
                required
                leading={<Euro />}
                error={errors.amount}
                help={amountIncl > 0 ? `${formatEuro(amountExcl)} excl. btw · btw ${vatRate}% ${formatEuro(vatAmount)}` : undefined}
              >
                <Input type="text" inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </FormField>
              <FormField label="Factuurdatum" htmlFor="invoiceDate" required error={errors.invoiceDate}>
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </FormField>
            </div>

            {commissionPercentage > 0 && amountIncl > 0 && (
              <Notice tone="info" title={`Commissie Bureau Vlieland: ${formatEuro(commission)}`}>
                <p>
                  {commissionPercentage}% over {formatEuro(amountExcl)} excl. btw. U ontvangt hiervoor een factuur van Bureau Vlieland.
                </p>
              </Notice>
            )}

            <FormField
              label="Pdf van de factuur"
              htmlFor="invoicePdf"
              required
              error={errors.file}
              help={customerPaid ? "De pdf is de onderbouwing van de commissie (maximaal 10 MB)." : "Bureau Vlieland stuurt de pdf direct door naar de boekhouding (maximaal 10 MB)."}
            >
              <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </FormField>

            {target.kind === "item" && (
              <FormField label="Opmerkingen" htmlFor="invoiceNotes">
                <Textarea placeholder="Eventuele opmerkingen over de facturatie." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </FormField>
            )}

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
                {isSubmitting ? "Bezig met registreren" : "Registreren"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
