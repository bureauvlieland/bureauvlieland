import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, Building2, MapPin, User, FileText, Pencil } from "lucide-react";
import { EmptyState, Pill } from "@/components/system";
import { formatBillingAddress, isBillingComplete } from "@/lib/billingDetails";
import { type ProgramRequest } from "@/types/programRequest";

interface BillingDetailsCardProps {
  program: ProgramRequest & {
    billing_company_name?: string | null;
    billing_kvk_number?: string | null;
    billing_vat_number?: string | null;
    billing_address_street?: string | null;
    billing_address_postal?: string | null;
    billing_address_city?: string | null;
    billing_country?: string | null;
    billing_contact_name?: string | null;
    billing_contact_email?: string | null;
    billing_reference?: string | null;
  };
  onEdit: () => void;
}

/**
 * De facturatiegegevens zoals de klant ze heeft ingevuld (klantportaal
 * fase 3a): leeg als `EmptyState` met één primaire knop, anders een kaart
 * met de status uit de woordenlijst (Aanvullen / Compleet).
 */
export const BillingDetailsCard = ({ program, onEdit }: BillingDetailsCardProps) => {
  const hasAnyBillingData = !!(program.billing_company_name || program.billing_kvk_number || program.billing_address_street);
  const complete = isBillingComplete(program);

  if (!hasAnyBillingData) {
    return (
      <EmptyState
        icon={<Receipt aria-hidden="true" />}
        title="Nog geen facturatiegegevens"
        description="Vul in aan wie de factuur gericht is. Dat is nodig om de voorwaarden te kunnen ondertekenen."
        action={
          <Button onClick={onEdit}>
            <Receipt className="mr-2 h-4 w-4" aria-hidden="true" />
            Facturatiegegevens invullen
          </Button>
        }
      />
    );
  }

  const address = formatBillingAddress(program);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5" aria-hidden="true" />
            Facturatiegegevens
            <Pill tone={complete ? "success" : "warning"}>{complete ? "Compleet" : "Aanvullen"}</Pill>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-1 h-4 w-4" aria-hidden="true" />
            Bewerken
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-start gap-3">
          <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">{program.billing_company_name || "Bedrijfsnaam ontbreekt"}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              {program.billing_kvk_number && <span>Nummer {program.billing_kvk_number}</span>}
              {program.billing_vat_number && <span>Btw {program.billing_vat_number}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <p>{address || <span className="text-muted-foreground">Adres ontbreekt</span>}</p>
        </div>

        <div className="flex items-start gap-3">
          <User className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <p>
            {program.billing_contact_name || <span className="text-muted-foreground">Contactpersoon ontbreekt</span>}
            {program.billing_contact_email && <span className="ml-2 text-muted-foreground">({program.billing_contact_email})</span>}
          </p>
        </div>

        {program.billing_reference && (
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <p>
              <span className="text-muted-foreground">Referentie:</span> {program.billing_reference}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
