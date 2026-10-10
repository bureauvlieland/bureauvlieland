import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, ResponsiveSheetContent } from "@/components/system";
import {
  BILLING_COUNTRIES,
  EMPTY_BILLING_DETAILS,
  billingCountryRules,
  normalizeBillingDetails,
  validateBillingDetails,
  validateBillingField,
  type BillingDetails,
  type BillingErrors,
  type BillingField,
} from "@/lib/billingDetails";

export type { BillingDetails } from "@/lib/billingDetails";

interface BillingDetailsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: BillingDetails) => Promise<boolean>;
  initialValues?: Partial<BillingDetails>;
}

/**
 * Facturatiegegevens van de klant (klantportaal fase 3a): op een telefoon
 * een sheet van onderen, verder van rechts. Velden op `FormField`, fouten
 * bij het veld zodra je het verlaat, en de vorm van postcode, btw- en
 * ondernemingsnummer volgt het gekozen land (`src/lib/billingDetails.ts`).
 */
export const BillingDetailsSheet = ({ isOpen, onClose, onSave, initialValues = {} }: BillingDetailsSheetProps) => {
  const [form, setForm] = useState<BillingDetails>({ ...EMPTY_BILLING_DETAILS, ...initialValues });
  const [errors, setErrors] = useState<BillingErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({ ...EMPTY_BILLING_DETAILS, ...initialValues });
      setErrors({});
    }
    // De beginwaarden komen uit het programma; alleen bij openen herladen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const rules = billingCountryRules(form.billing_country);

  const change = (field: BillingField, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const blur = (field: BillingField) => {
    setErrors((prev) => ({ ...prev, [field]: validateBillingField(form, field) }));
  };

  const changeCountry = (code: string) => {
    setForm((prev) => ({ ...prev, billing_country: code }));
    // Andere regels: oude meldingen over postcode en nummers gelden niet meer.
    setErrors((prev) => ({
      ...prev,
      billing_address_postal: undefined,
      billing_kvk_number: undefined,
      billing_vat_number: undefined,
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = normalizeBillingDetails(form);
    const found = validateBillingDetails(normalized);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = Object.keys(found)[0];
      document.getElementById(first)?.focus();
      return;
    }
    setIsSaving(true);
    try {
      const ok = await onSave(normalized);
      if (ok) onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const field = (name: BillingField, label: string, opts: { required?: boolean; help?: string; placeholder?: string; type?: string; autoComplete?: string } = {}) => (
    <FormField label={label} htmlFor={name} required={opts.required} help={opts.help} error={errors[name]}>
      <Input
        value={form[name]}
        type={opts.type ?? "text"}
        autoComplete={opts.autoComplete}
        placeholder={opts.placeholder}
        onChange={(e) => change(name, e.target.value)}
        onBlur={() => blur(name)}
      />
    </FormField>
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <ResponsiveSheetContent className="flex flex-col gap-0 overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <SheetHeader className="text-left">
            <SheetTitle>Facturatiegegevens</SheetTitle>
            <SheetDescription>
              Aan wie sturen Bureau Vlieland en de aanbieders de factuur? Velden met een * zijn nodig om te kunnen ondertekenen.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-6 py-5">
            <fieldset className="space-y-4">
              <legend className="text-sm font-medium text-muted-foreground">Bedrijf</legend>
              {field("billing_company_name", "Bedrijfsnaam", { required: true, placeholder: "Acme B.V.", autoComplete: "organization" })}
              <FormField label="Land" htmlFor="billing_country" required>
                <Select value={form.billing_country} onValueChange={changeCountry}>
                  <SelectTrigger id="billing_country" aria-label="Land">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                {field("billing_kvk_number", rules.registryLabel, { help: rules.registryHelp })}
                {field("billing_vat_number", "Btw-nummer", { placeholder: rules.vatPlaceholder })}
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-medium text-muted-foreground">Factuuradres</legend>
              {field("billing_address_street", "Straat en huisnummer", { required: true, placeholder: "Hoofdstraat 1", autoComplete: "street-address" })}
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                {field("billing_address_postal", "Postcode", { required: true, placeholder: rules.postalPlaceholder, autoComplete: "postal-code" })}
                {field("billing_address_city", "Plaats", { required: true, placeholder: "Amsterdam", autoComplete: "address-level2" })}
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-medium text-muted-foreground">Contact voor de factuur</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {field("billing_contact_name", "Contactpersoon", { required: true, placeholder: "Jan de Vries", autoComplete: "name" })}
                {field("billing_contact_email", "E-mailadres voor facturen", { type: "email", placeholder: "facturen@acme.nl", autoComplete: "email" })}
              </div>
              {field("billing_reference", "Referentie of kostenplaats", { help: "Komt op de factuur te staan.", placeholder: "Project X" })}
            </fieldset>
          </div>

          <SheetFooter className="gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Annuleren
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isSaving ? "Opslaan…" : "Opslaan"}
            </Button>
          </SheetFooter>
        </form>
      </ResponsiveSheetContent>
    </Sheet>
  );
};
