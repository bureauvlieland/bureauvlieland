import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Euro, Plus, CheckCircle2, Clock, FileText } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useNavigate } from "react-router-dom";
import { useItemVatRates } from "@/hooks/useItemVatRates";
import { getItemLineTotal as centralLineTotal, isPerPersonItem } from "@/lib/portalPricing";
import { calculateExclVat, calculateVatAmount } from "@/lib/appSettings";
import type { BureauInvoice, InvoiceType } from "@/types/bureauInvoice";

interface FinancialItem {
  id: string;
  block_id?: string | null;
  block_name: string;
  block_type?: string;
  status: string;
  quoted_price: number | null;
  admin_price_override?: number | null;
  item_quote_status?: string | null;
  day_index: number;
  price_type?: string | null;
  override_people?: number | null;
}

interface FinancialOverviewCardProps {
  requestId: string;
  numberOfPeople: number;
  numberOfDays?: number;
  items: FinancialItem[];
  invoices: BureauInvoice[];
  onRegisterInvoice: () => void;
  isQuoteMode?: boolean;
  touristTax?: number;
  natureContribution?: number;
  centralSurcharge?: number;
  accommodationTotal?: number;
  accommodationName?: string;
}

// Wrappers to avoid type incompatibility with the full ProgramRequestItem
const getLineTotal = (item: FinancialItem, n: number, days: number = 1) => centralLineTotal(item as any, n, days);


export const FinancialOverviewCard = ({
  requestId,
  numberOfPeople,
  numberOfDays = 1,
  items,
  invoices,
  onRegisterInvoice,
  isQuoteMode = false,
  touristTax = 0,
  natureContribution = 0,
  centralSurcharge = 0,
  accommodationTotal = 0,
  accommodationName,
}: FinancialOverviewCardProps) => {
  const { getCoordinationFee, getVatRate } = useAppSettings();
  const navigate = useNavigate();
  const { getItemVatRate } = useItemVatRates(items as any);

  const programItems = items.filter(
    (item) => item.status !== "cancelled" && item.day_index !== -1
  );
  const extraCostItems = items.filter((item) => item.day_index === -1);

  const coordinationFee = getCoordinationFee(numberOfPeople);
  const coordVatRate = getVatRate("standard");

  const formatCurrency = (amount: number) =>
    `€${amount.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatItemPrice = (item: FinancialItem) => {
    const lineTotal = getLineTotal(item, numberOfPeople, numberOfDays);
    if (lineTotal == null) return "Op aanvraag";

    // admin_price_override + per person → show unit price and total
    if (
      item.quoted_price == null &&
      item.admin_price_override != null &&
      isPerPersonItem(item) &&
      numberOfPeople > 1
    ) {
      const suffix = item.price_type === "per_person_per_day" ? "p.p.p.d." : "p.p.";
      return `${formatCurrency(item.admin_price_override)} ${suffix}`;
    }

    // quoted_price or flat admin override → show as group total
    return `${formatCurrency(lineTotal)} totaal`;
  };

  const getStatusBadge = (item: FinancialItem) => {
    if (item.status === "confirmed" || item.status === "executed")
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
    if (item.status === "pending")
      return <Clock className="h-3.5 w-3.5 text-amber-500" />;
    if (item.status === "alternative")
      return <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Alternatief</Badge>;
    return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const programTotal = programItems.reduce(
    (sum, item) => sum + (getLineTotal(item, numberOfPeople) ?? 0), 0
  );
  const extraCostsTotal = extraCostItems.reduce(
    (sum, item) => sum + (item.admin_price_override ?? 0), 0
  );

  // Accommodation VAT (9%)
  const accommodationVatRate = 9;

  const grandTotalInclVat = programTotal + coordinationFee + extraCostsTotal
    + touristTax + natureContribution + centralSurcharge + accommodationTotal;

  const programVatBreakdown = programItems.reduce(
    (acc, item) => {
      const lineTotal = getLineTotal(item, numberOfPeople) ?? 0;
      const vatRate = getItemVatRate(item as any);
      acc.exclVat += calculateExclVat(lineTotal, vatRate);
      acc.vatAmount += calculateVatAmount(lineTotal, vatRate);
      return acc;
    },
    { exclVat: 0, vatAmount: 0 }
  );

  const coordExcl = calculateExclVat(coordinationFee + centralSurcharge, coordVatRate);
  const coordVat = calculateVatAmount(coordinationFee + centralSurcharge, coordVatRate);
  const extraExcl = calculateExclVat(extraCostsTotal, coordVatRate);
  const extraVat = calculateVatAmount(extraCostsTotal, coordVatRate);
  const accommExcl = accommodationTotal > 0 ? calculateExclVat(accommodationTotal, accommodationVatRate) : 0;
  const accommVat = accommodationTotal > 0 ? calculateVatAmount(accommodationTotal, accommodationVatRate) : 0;
  // Tourist tax & nature contribution = 0% VAT (levies)
  const leviesExcl = touristTax + natureContribution;

  const totalExclVat = programVatBreakdown.exclVat + coordExcl + extraExcl + accommExcl + leviesExcl;
  const totalVat = programVatBreakdown.vatAmount + coordVat + extraVat + accommVat;

  const invoicedInclVat = invoices
    .filter((inv) => inv.invoice_type !== "credit")
    .reduce((sum, inv) => sum + inv.amount_incl_vat, 0);
  const creditedInclVat = invoices
    .filter((inv) => inv.invoice_type === "credit")
    .reduce((sum, inv) => sum + inv.amount_incl_vat, 0);
  const netInvoicedInclVat = invoicedInclVat - creditedInclVat;
  const outstandingAmount = grandTotalInclVat - netInvoicedInclVat;

  const invoiceTypeLabelMap: Record<InvoiceType, string> = {
    partial: "Deelfactuur",
    final: "Eindfactuur",
    credit: "Creditnota",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Euro className="h-5 w-5" />
          Financieel Overzicht
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* All program items */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">
            {isQuoteMode ? "PROGRAMMAKOSTEN (INDICATIEF)" : "PROGRAMMAKOSTEN"}
          </h4>
          <div className="space-y-1.5">
            {programItems.length === 0 && (
              <p className="text-sm text-muted-foreground">Geen programma-items</p>
            )}
            {programItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {getStatusBadge(item)}
                  <span className="truncate max-w-[200px]">{item.block_name}</span>
                </div>
                <span className="font-medium whitespace-nowrap ml-2">
                  {formatItemPrice(item)}
                </span>
              </div>
            ))}

            {/* Coordination fee */}
            <div className="flex items-center justify-between text-sm pt-1">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Coördinatiefee ({numberOfPeople} pers.)</span>
              </div>
              <span className="font-medium">{formatCurrency(coordinationFee)}</span>
            </div>

            {/* Extra costs inline */}
            {extraCostItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate max-w-[200px]">{item.block_name}</span>
                </div>
                <span className="font-medium">
                  {formatCurrency(item.admin_price_override ?? 0)}
                </span>
              </div>
            ))}

            {/* Accommodation */}
            {accommodationTotal > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate max-w-[200px]">Logies{accommodationName ? `: ${accommodationName}` : ""}</span>
                </div>
                <span className="font-medium">{formatCurrency(accommodationTotal)}</span>
              </div>
            )}

            {/* Tourist tax */}
            {touristTax > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Toeristenbelasting ({numberOfPeople} pers. × {numberOfDays} dgn)</span>
                </div>
                <span className="font-medium">{formatCurrency(touristTax)}</span>
              </div>
            )}

            {/* Nature contribution */}
            {natureContribution > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Natuurbijdrage ({numberOfPeople} pers.)</span>
                </div>
                <span className="font-medium">{formatCurrency(natureContribution)}</span>
              </div>
            )}

            {/* Central surcharge */}
            {centralSurcharge > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Opslag centrale facturatie ({numberOfPeople} pers.)</span>
                </div>
                <span className="font-medium">{formatCurrency(centralSurcharge)}</span>
              </div>
            )}
          </div>

          {/* Totals */}
          <Separator className="my-3" />
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotaal excl. BTW</span>
              <span>{formatCurrency(totalExclVat)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">BTW</span>
              <span>{formatCurrency(totalVat)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Totaal incl. BTW{isQuoteMode ? " (indicatief)" : ""}</span>
              <span>{formatCurrency(grandTotalInclVat)}</span>
            </div>
          </div>
          {isQuoteMode && (
            <p className="text-xs text-muted-foreground mt-2">
              * Prijzen zijn onder voorbehoud en kunnen wijzigen na bevestiging door partners.
            </p>
          )}
        </div>

        {/* Invoiced amounts */}
        {invoices.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">GEFACTUREERD</h4>
              <div className="space-y-2">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{invoice.invoice_number}</span>
                      <span className="text-muted-foreground">
                        ({format(new Date(invoice.invoice_date), "EEE d MMM", { locale: nl })})
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {invoiceTypeLabelMap[invoice.invoice_type as InvoiceType] || invoice.invoice_type}
                      </Badge>
                    </div>
                    <span className={invoice.invoice_type === "credit" ? "text-destructive" : ""}>
                      {invoice.invoice_type === "credit" ? "-" : ""}
                      {formatCurrency(invoice.amount_incl_vat)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Outstanding amount */}
        <Separator />
        <div className="flex items-center justify-between">
          <span className="font-semibold text-lg">Openstaand</span>
          <span className={`font-bold text-lg ${outstandingAmount > 0 ? "text-amber-600" : "text-green-600"}`}>
            {formatCurrency(Math.max(0, outstandingAmount))}
          </span>
        </div>

        {/* Invoice buttons */}
        {grandTotalInclVat > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate(`/admin/aanvragen/${requestId}/factuur`)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Factuur Maken
            </Button>
            <Button onClick={onRegisterInvoice} className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Factuur Registreren
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
