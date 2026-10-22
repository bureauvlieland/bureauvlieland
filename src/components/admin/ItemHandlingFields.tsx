import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BILLING_ROUTE_LABELS,
  BILLING_ROUTE_VALUES,
  PARTNER_HANDLING_LABELS,
  PARTNER_HANDLING_VALUES,
  type BillingRoute,
  type PartnerHandling,
} from "@/lib/itemHandling";

/**
 * De twee keuzes die bepalen hoe een onderdeel bij de partner landt:
 * afhandeling (offerte / bevestiging / mededeling) en facturatieroute
 * (via Bureau Vlieland / verblijfsnota partner / klant rechtstreeks).
 * Gedeeld door de sheets "Maatwerk-item toevoegen" en "Onderdeel bewerken".
 */
interface Props {
  handling: PartnerHandling;
  billingRoute: BillingRoute;
  onHandlingChange: (v: PartnerHandling) => void;
  onBillingRouteChange: (v: BillingRoute) => void;
  disabled?: boolean;
  idPrefix?: string;
}

export function ItemHandlingFields({ handling, billingRoute, onHandlingChange, onBillingRouteChange, disabled, idPrefix = "ih" }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-handling`}>Afhandeling door partner</Label>
        <Select value={handling} onValueChange={(v) => onHandlingChange(v as PartnerHandling)} disabled={disabled}>
          <SelectTrigger id={`${idPrefix}-handling`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PARTNER_HANDLING_VALUES.map((v) => (
              <SelectItem key={v} value={v}>
                {PARTNER_HANDLING_LABELS[v].admin}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{PARTNER_HANDLING_LABELS[handling].help}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-billing`}>Facturatie</Label>
        <Select value={billingRoute} onValueChange={(v) => onBillingRouteChange(v as BillingRoute)} disabled={disabled}>
          <SelectTrigger id={`${idPrefix}-billing`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BILLING_ROUTE_VALUES.map((v) => (
              <SelectItem key={v} value={v}>
                {BILLING_ROUTE_LABELS[v].admin}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{BILLING_ROUTE_LABELS[billingRoute].help}</p>
      </div>
    </div>
  );
}
