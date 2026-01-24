import { useState, useEffect } from "react";
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
import { Loader2 } from "lucide-react";

export interface BillingDetails {
  billing_company_name: string;
  billing_kvk_number: string;
  billing_vat_number: string;
  billing_address_street: string;
  billing_address_postal: string;
  billing_address_city: string;
  billing_contact_name: string;
  billing_contact_email: string;
  billing_reference: string;
}

interface BillingDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: BillingDetails) => Promise<boolean>;
  initialValues?: Partial<BillingDetails>;
}

const emptyBillingDetails: BillingDetails = {
  billing_company_name: "",
  billing_kvk_number: "",
  billing_vat_number: "",
  billing_address_street: "",
  billing_address_postal: "",
  billing_address_city: "",
  billing_contact_name: "",
  billing_contact_email: "",
  billing_reference: "",
};

export const BillingDetailsDialog = ({
  isOpen,
  onClose,
  onSave,
  initialValues = {},
}: BillingDetailsDialogProps) => {
  const [formData, setFormData] = useState<BillingDetails>({
    ...emptyBillingDetails,
    ...initialValues,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BillingDetails, string>>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...emptyBillingDetails,
        ...initialValues,
      });
      setErrors({});
    }
  }, [isOpen, initialValues]);

  const handleChange = (field: keyof BillingDetails, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof BillingDetails, string>> = {};

    // Required fields
    if (!formData.billing_company_name.trim()) {
      newErrors.billing_company_name = "Bedrijfsnaam is verplicht";
    }
    if (!formData.billing_address_street.trim()) {
      newErrors.billing_address_street = "Straat en huisnummer zijn verplicht";
    }
    if (!formData.billing_address_postal.trim()) {
      newErrors.billing_address_postal = "Postcode is verplicht";
    }
    if (!formData.billing_address_city.trim()) {
      newErrors.billing_address_city = "Plaats is verplicht";
    }
    if (!formData.billing_contact_name.trim()) {
      newErrors.billing_contact_name = "Contactpersoon is verplicht";
    }

    // KvK validation: 8 digits
    if (formData.billing_kvk_number && !/^\d{8}$/.test(formData.billing_kvk_number)) {
      newErrors.billing_kvk_number = "KvK-nummer moet 8 cijfers zijn";
    }

    // VAT validation: NL + 9 digits + B + 2 digits (optional)
    if (formData.billing_vat_number && !/^NL\d{9}B\d{2}$/i.test(formData.billing_vat_number)) {
      newErrors.billing_vat_number = "BTW-nummer formaat: NL123456789B01";
    }

    // Email validation (optional but must be valid if provided)
    if (formData.billing_contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.billing_contact_email)) {
      newErrors.billing_contact_email = "Ongeldig e-mailadres";
    }

    // Postal code validation (Dutch format)
    if (formData.billing_address_postal && !/^\d{4}\s?[A-Z]{2}$/i.test(formData.billing_address_postal)) {
      newErrors.billing_address_postal = "Postcode formaat: 1234 AB";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const success = await onSave(formData);
      if (success) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Facturatiegegevens</DialogTitle>
          <DialogDescription>
            Vul de gegevens in waarop de aanbieders en Bureau Vlieland kunnen factureren.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Company info */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Bedrijfsgegevens</h4>
            
            <div className="space-y-2">
              <Label htmlFor="billing_company_name">
                Bedrijfsnaam <span className="text-destructive">*</span>
              </Label>
              <Input
                id="billing_company_name"
                value={formData.billing_company_name}
                onChange={(e) => handleChange("billing_company_name", e.target.value)}
                placeholder="Acme B.V."
                className={errors.billing_company_name ? "border-destructive" : ""}
              />
              {errors.billing_company_name && (
                <p className="text-sm text-destructive">{errors.billing_company_name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billing_kvk_number">KvK-nummer</Label>
                <Input
                  id="billing_kvk_number"
                  value={formData.billing_kvk_number}
                  onChange={(e) => handleChange("billing_kvk_number", e.target.value)}
                  placeholder="12345678"
                  maxLength={8}
                  className={errors.billing_kvk_number ? "border-destructive" : ""}
                />
                {errors.billing_kvk_number && (
                  <p className="text-sm text-destructive">{errors.billing_kvk_number}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing_vat_number">BTW-nummer</Label>
                <Input
                  id="billing_vat_number"
                  value={formData.billing_vat_number}
                  onChange={(e) => handleChange("billing_vat_number", e.target.value.toUpperCase())}
                  placeholder="NL123456789B01"
                  className={errors.billing_vat_number ? "border-destructive" : ""}
                />
                {errors.billing_vat_number && (
                  <p className="text-sm text-destructive">{errors.billing_vat_number}</p>
                )}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4 pt-2">
            <h4 className="font-medium text-sm text-muted-foreground">Factuuradres</h4>
            
            <div className="space-y-2">
              <Label htmlFor="billing_address_street">
                Straat en huisnummer <span className="text-destructive">*</span>
              </Label>
              <Input
                id="billing_address_street"
                value={formData.billing_address_street}
                onChange={(e) => handleChange("billing_address_street", e.target.value)}
                placeholder="Hoofdstraat 1"
                className={errors.billing_address_street ? "border-destructive" : ""}
              />
              {errors.billing_address_street && (
                <p className="text-sm text-destructive">{errors.billing_address_street}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billing_address_postal">
                  Postcode <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="billing_address_postal"
                  value={formData.billing_address_postal}
                  onChange={(e) => handleChange("billing_address_postal", e.target.value.toUpperCase())}
                  placeholder="1234 AB"
                  className={errors.billing_address_postal ? "border-destructive" : ""}
                />
                {errors.billing_address_postal && (
                  <p className="text-sm text-destructive">{errors.billing_address_postal}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing_address_city">
                  Plaats <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="billing_address_city"
                  value={formData.billing_address_city}
                  onChange={(e) => handleChange("billing_address_city", e.target.value)}
                  placeholder="Amsterdam"
                  className={errors.billing_address_city ? "border-destructive" : ""}
                />
                {errors.billing_address_city && (
                  <p className="text-sm text-destructive">{errors.billing_address_city}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact person */}
          <div className="space-y-4 pt-2">
            <h4 className="font-medium text-sm text-muted-foreground">Factuurcontact</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billing_contact_name">
                  Contactpersoon <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="billing_contact_name"
                  value={formData.billing_contact_name}
                  onChange={(e) => handleChange("billing_contact_name", e.target.value)}
                  placeholder="Jan de Vries"
                  className={errors.billing_contact_name ? "border-destructive" : ""}
                />
                {errors.billing_contact_name && (
                  <p className="text-sm text-destructive">{errors.billing_contact_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing_contact_email">Factuur e-mail</Label>
                <Input
                  id="billing_contact_email"
                  type="email"
                  value={formData.billing_contact_email}
                  onChange={(e) => handleChange("billing_contact_email", e.target.value)}
                  placeholder="facturen@acme.nl"
                  className={errors.billing_contact_email ? "border-destructive" : ""}
                />
                {errors.billing_contact_email && (
                  <p className="text-sm text-destructive">{errors.billing_contact_email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Reference */}
          <div className="space-y-2 pt-2">
            <Label htmlFor="billing_reference">Referentie / kostplaats</Label>
            <Input
              id="billing_reference"
              value={formData.billing_reference}
              onChange={(e) => handleChange("billing_reference", e.target.value)}
              placeholder="Project X / Afdeling Y"
            />
            <p className="text-xs text-muted-foreground">
              Optioneel. Wordt vermeld op de factuur.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
