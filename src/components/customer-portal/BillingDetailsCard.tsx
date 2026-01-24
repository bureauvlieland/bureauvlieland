import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt, Building2, MapPin, User, FileText, Edit2 } from "lucide-react";
import { type ProgramRequest } from "@/types/programRequest";

interface BillingDetailsCardProps {
  program: ProgramRequest & {
    billing_company_name?: string | null;
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
  const hasAnyBillingData = !!(
    program.billing_company_name ||
    program.billing_kvk_number ||
    program.billing_address_street
  );

  const isComplete = !!(
    program.billing_company_name &&
    program.billing_address_street &&
    program.billing_address_postal &&
    program.billing_address_city &&
    program.billing_contact_name
  );

  const formatAddress = () => {
    const parts = [
      program.billing_address_street,
      [program.billing_address_postal, program.billing_address_city].filter(Boolean).join(" "),
    ].filter(Boolean);
    return parts.join(", ");
  };

  if (!hasAnyBillingData) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-3 rounded-full bg-muted">
              <Receipt className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Facturatiegegevens ontbreken</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Vul je facturatiegegevens in zodat aanbieders je kunnen factureren na bevestiging.
              </p>
            </div>
            <Button onClick={onEdit}>
              <Receipt className="h-4 w-4 mr-2" />
              Facturatiegegevens invullen
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Facturatiegegevens
          </CardTitle>
          <div className="flex items-center gap-2">
            {!isComplete && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                Incompleet
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-1" />
              Bewerken
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Company info */}
        <div className="flex items-start gap-3">
          <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">{program.billing_company_name || "—"}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {program.billing_kvk_number && (
                <span>KvK: {program.billing_kvk_number}</span>
              )}
              {program.billing_vat_number && (
                <span>BTW: {program.billing_vat_number}</span>
              )}
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start gap-3">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
          <p className="text-sm">
            {formatAddress() || <span className="text-muted-foreground">Geen adres ingevuld</span>}
          </p>
        </div>

        {/* Contact person */}
        <div className="flex items-start gap-3">
          <User className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="text-sm">
            <span>{program.billing_contact_name || <span className="text-muted-foreground">Geen contactpersoon</span>}</span>
            {program.billing_contact_email && (
              <span className="text-muted-foreground ml-2">({program.billing_contact_email})</span>
            )}
          </div>
        </div>

        {/* Reference */}
        {program.billing_reference && (
          <div className="flex items-start gap-3">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-sm">
              <span className="text-muted-foreground">Referentie:</span> {program.billing_reference}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
