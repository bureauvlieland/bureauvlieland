import { Card, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export function InvoicingModeSelector() {
  return (
    <Card>
      <CardContent className="p-4">
        <h4 className="font-medium text-sm mb-2">Facturatiemodel</h4>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span>Bureau Vlieland factureert de klant</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Partners factureren Bureau Vlieland (inkoop). Bureau Vlieland factureert de klant.
        </p>
      </CardContent>
    </Card>
  );
}
