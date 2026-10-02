import { useEffect, useMemo, useRef, useState } from "react";
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
  validateBillingDetails,
  type BillingDetails,
} from "@/lib/billingCountry";

export type { BillingDetails } from "@/lib/billingCountry";

interface BillingDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: BillingDetails) => Promise<boolean>;
  initialValues?: Partial<BillingDetails>;
}

type Field = keyof BillingDetails;

/**
 * Facturatiegegevens als sheet met `FormField`s (klantportaal fase 3): van
 * onderen op een telefoon, van rechts op desktop. Het land stuurt de labels
 * en de controle van postcode, btw-nummer en registratienummer; elk veld
 * wordt gecontroleerd zodra u het verlaat.
 */
export const BillingDetailsDialog = ({ isOpen, onClose, onSave, initialValues = {} }: BillingDetailsDialogProps) => {
  const initialRef = useRef(initialValues);
  initialRef.current = initialValues;
  const [formData, setFormData] = useState<BillingDetails>({ ...EMPTY_BILLING_DETAILS, ...initialValues });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...EMPTY_BILLING_DETAILS, ...initialRef.current, billing_country: initialRef.current.billing_country || "NL" });
      setTouched({});
      setSubmitted(false);
    }
  }, [isOpen]);

  const errors = useMemo(() => validateBillingDetails(formData), [formData]);
  const rules = billingCountryRules(formData.billing_country);
  const errorFor = (field: Field) => (submitted || touched[field] ? errors[field] : undefined);
  const set = (field: Field, value: string) => setFormData((prev) => ({ ...prev, [field]: value }));
  const blur = (field: Field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const handleSubmit = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    setIsSaving(true);
    try {
      const ok = await onSave({
        ...formData,
        billing_company_name: formData.billing_company_name.trim(),
        billing_kvk_number: formData.billing_kvk_number.trim(),
        billing_vat_number: formData.billing_vat_number.trim().replace(/\s/g, "").toUpperCase(),
        billing_address_street: formData.billing_address_street.trim(),
        billing_address_postal: formData.billing_address_postal.trim().toUpperCase(),
        billing_address_city: formData.billing_address_city.trim(),
        billing_contact_name: formData.billing_contact_name.trim(),
        billing_contact_email: formData.billing_contact_email.trim(),
        billing_reference: formData.billing_reference.trim(),
      });
      if (ok) onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const text = (field: Field, props: { autoComplete?: string; placeholder?: string; type?: string; inputMode?: "email" | "text" | "numeric" } = {}) => (
    <Input
      id={field}
      value={formData[field]}
      onChange={(e) => set(field, e.target.value)}
      onBlur={() => blur(field)}
      type={props.type}
      inputMode={props.inputMode}
      autoComplete={props.autoComplete}
      placeholder={props.placeholder}
    />
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <ResponsiveSheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
        <SheetHeader className="text-left">
          <SheetTitle>Facturatiegegevens</SheetTitle>
          <SheetDescription>De gegevens waarop Bureau Vlieland en de aanbieders factureren.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <section className="space-y-4" aria-labelledby="fact-bedrijf">
            <h3 id="fact-bedrijf" className="text-eyebrow font-medium uppercase text-muted-foreground">
              Bedrijf
            </h3>
            <FormField label="Bedrijfsnaam" htmlFor="billing_company_name" required error={errorFor("billing_company_name")}>
              {text("billing_company_name", { autoComplete: "organization", placeholder: "Bedrijfsnaam B.V." })}
            </FormField>
            <FormField label="Land" htmlFor="billing_country" help="Bepaalt de vorm van postcode, btw-nummer en registratienummer.">
              <Select value={formData.billing_country} onValueChange={(value) => set("billing_country", value)}>
                <SelectTrigger id="billing_country">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={rules.registry.label} htmlFor="billing_kvk_number" error={errorFor("billing_kvk_number")}>
                {text("billing_kvk_number", { placeholder: rules.registry.example || undefined })}
              </FormField>
              <FormField label="Btw-nummer" htmlFor="billing_vat_number" error={errorFor("billing_vat_number")}>
                {text("billing_vat_number", { placeholder: rules.vatExample || undefined })}
              </FormField>
            </div>
          </section>

          <section className="space-y-4" aria-labelledby="fact-adres">
            <h3 id="fact-adres" className="text-eyebrow font-medium uppercase text-muted-foreground">
              Factuuradres
            </h3>
            <FormField label="Straat en huisnummer" htmlFor="billing_address_street" required error={errorFor("billing_address_street")}>
              {text("billing_address_street", { autoComplete: "street-address", placeholder: "Hoofdstraat 1" })}
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Postcode" htmlFor="billing_address_postal" required error={errorFor("billing_address_postal")}>
                {text("billing_address_postal", { autoComplete: "postal-code", placeholder: rules.postalExample || undefined })}
              </FormField>
              <FormField label="Plaats" htmlFor="billing_address_city" required error={errorFor("billing_address_city")}>
                {text("billing_address_city", { autoComplete: "address-level2", placeholder: "Amsterdam" })}
              </FormField>
            </div>
          </section>

          <section className="space-y-4" aria-labelledby="fact-contact">
            <h3 id="fact-contact" className="text-eyebrow font-medium uppercase text-muted-foreground">
              Factuurcontact
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Contactpersoon" htmlFor="billing_contact_name" required error={errorFor("billing_contact_name")}>
                {text("billing_contact_name", { autoComplete: "name", placeholder: "Jan de Vries" })}
              </FormField>
              <FormField label="E-mail voor facturen" htmlFor="billing_contact_email" error={errorFor("billing_contact_email")}>
                {text("billing_contact_email", { type: "email", inputMode: "email", autoComplete: "email", placeholder: "facturen@bedrijf.nl" })}
              </FormField>
            </div>
            <FormField label="Referentie of kostenplaats" htmlFor="billing_reference" help="Komt op de factuur te staan.">
              {text("billing_reference", { placeholder: "Project X of afdeling Y" })}
            </FormField>
          </section>
        </div>

        <SheetFooter className="mt-6 gap-2 sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Opslaan
          </Button>
        </SheetFooter>
      </ResponsiveSheetContent>
    </Sheet>
  );
};
