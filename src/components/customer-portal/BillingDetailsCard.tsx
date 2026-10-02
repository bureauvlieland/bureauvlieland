import { Building2, FileText, MapPin, Pencil, Receipt, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, Pill } from "@/components/system";
import { billingCountryLabel, billingCountryRules } from "@/lib/billingCountry";

interface BillingDetailsCardProps {
  program: {
    billing_company_name?: string | null;
    billing_country?: string | null;
    billing_kvk_number?: string | null;
    billing_vat_number?: string | null;
    billing_address_street?: string | null;
    billing_address_postal?: string | null;
    billing_address_city?: string | null;
    billing_contact_name?: string | null;
    billing_contact_email?: string | null;
    billing_reference?: string | null;
  };
  onEdit: () => void;
}

export const BillingDetailsCard = ({ program, onEdit }: BillingDetailsCardProps) => {
  const hasAnyBillingData = !!(program.billing_company_name || program.billing_kvk_number || program.billing_address_street);
  const isComplete = !!(
    program.billing_company_name &&
    program.billing_address_street &&
    program.billing_address_postal &&
    program.billing_address_city &&
    program.billing_contact_name
  );
  const country = program.billing_country && program.billing_country !== "NL" ? billingCountryLabel(program.billing_country) : null;
  const registryLabel = billingCountryRules(program.billing_country).registry.label;
  const address = [
    program.billing_address_street,
    [program.billing_address_postal, program.billing_address_city].filter(Boolean).join(" "),
    country,
  ]
    .filter(Boolean)
    .join(", ");

  if (!hasAnyBillingData) {
    return (
      <EmptyState
        icon={<Receipt />}
        title="Nog geen facturatiegegevens"
        description="Vul de gegevens in waarop Bureau Vlieland en de aanbieders factureren."
        action={
          <Button onClick={onEdit}>
            <Receipt className="h-4 w-4" aria-hidden="true" />
            Facturatiegegevens invullen
          </Button>
        }
      />
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4 text-primary" aria-hidden="true" />
            Facturatiegegevens
            {!isComplete && <Pill tone="warning">Aanvullen</Pill>}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Bewerken
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-start gap-3">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-medium">{program.billing_company_name || <span className="text-muted-foreground">Geen bedrijfsnaam</span>}</p>
            {(program.billing_kvk_number || program.billing_vat_number) && (
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                {program.billing_kvk_number && (
                  <span>
                    {registryLabel} {program.billing_kvk_number}
                  </span>
                )}
                {program.billing_vat_number && <span>btw-nummer {program.billing_vat_number}</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p>{address || <span className="text-muted-foreground">Geen adres ingevuld</span>}</p>
        </div>
        <div className="flex items-start gap-3">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p>
            {program.billing_contact_name || <span className="text-muted-foreground">Geen contactpersoon</span>}
            {program.billing_contact_email && <span className="text-muted-foreground"> ({program.billing_contact_email})</span>}
          </p>
        </div>
        {program.billing_reference && (
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p>
              <span className="text-muted-foreground">Referentie</span> {program.billing_reference}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
