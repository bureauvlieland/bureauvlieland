import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Euro, Plus, CheckCircle2, Clock, FileText } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useNavigate } from "react-router-dom";
import type { BureauInvoice, InvoiceType } from "@/types/bureauInvoice";

interface ProgramRequestItem {
  id: string;
  block_name: string;
  block_type: string;
  status: string;
  quoted_price: number | null;
  admin_price_override?: number | null;
  item_quote_status?: string | null;
  day_index: number;
  price_type?: string | null;
}

interface FinancialOverviewCardProps {
  requestId: string;
  numberOfPeople: number;
  items: ProgramRequestItem[];
  invoices: BureauInvoice[];
  onRegisterInvoice: () => void;
  isQuoteMode?: boolean; // Show preliminary prices for all items
}

export const FinancialOverviewCard = ({
  requestId,
  numberOfPeople,
  items,
  invoices,
  onRegisterInvoice,
  isQuoteMode = false,
}: FinancialOverviewCardProps) => {
  const { getCoordinationFee, getVatRate } = useAppSettings();
  const navigate = useNavigate();
  
  // Helper to get item price (admin override or quoted price)
  const getItemPrice = (item: ProgramRequestItem) => {
    return item.admin_price_override ?? item.quoted_price ?? 0;
  };

  // Calculate items to be invoiced by Bureau Vlieland (exclude overige kosten)
  const bureauItems = items.filter(
    (item) => item.block_type === "bureau" && item.status === "confirmed" && item.quoted_price && item.day_index !== -1
  );
  
  // Overige kosten (day_index = -1)
  const extraCostItems = items.filter(
    (item) => item.day_index === -1
  );
  
  // In quote mode, show all items with their preliminary prices (exclude overige kosten)
  const quoteItems = isQuoteMode 
    ? items.filter((item) => item.status !== "cancelled" && item.day_index !== -1)
    : [];

  // Calculate totals
  const itemsTotal = bureauItems.reduce((sum, item) => sum + (item.quoted_price || 0), 0);
  const extraCostsTotal = extraCostItems.reduce((sum, item) => sum + (item.admin_price_override ?? 0), 0);
  const coordinationFee = getCoordinationFee(numberOfPeople);
  const vatRate = getVatRate("standard");
  const vatMultiplier = 1 + vatRate / 100;
  
  // VAT for coordination fee
  const coordinationFeeExcl = coordinationFee / vatMultiplier;
  const coordinationFeeVat = coordinationFee - coordinationFeeExcl;

  // For simplicity, assume all bureau items are incl. VAT
  const itemsTotalExcl = itemsTotal / vatMultiplier;
  const itemsVat = itemsTotal - itemsTotalExcl;

  // Extra costs VAT
  const extraCostsExcl = extraCostsTotal / vatMultiplier;
  const extraCostsVat = extraCostsTotal - extraCostsExcl;

  const totalInclVat = itemsTotal + coordinationFee + extraCostsTotal;
  const totalExclVat = itemsTotalExcl + coordinationFeeExcl + extraCostsExcl;
  const totalVat = itemsVat + coordinationFeeVat + extraCostsVat;

  // Calculate invoiced amounts
  const invoicedInclVat = invoices
    .filter((inv) => inv.invoice_type !== "credit")
    .reduce((sum, inv) => sum + inv.amount_incl_vat, 0);
  
  const creditedInclVat = invoices
    .filter((inv) => inv.invoice_type === "credit")
    .reduce((sum, inv) => sum + inv.amount_incl_vat, 0);

  const netInvoicedInclVat = invoicedInclVat - creditedInclVat;
  const outstandingAmount = totalInclVat - netInvoicedInclVat;

  const formatCurrency = (amount: number) =>
    `€${amount.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const invoiceTypeLabelMap: Record<InvoiceType, string> = {
    partial: "Deelfactuur",
    final: "Eindfactuur",
    credit: "Creditnota",
  };

  // Helper to check if item price should be multiplied by number of people
  const isPerPerson = (item: ProgramRequestItem) => {
    return !item.price_type || item.price_type === "per_person";
  };

  // Calculate quote mode totals (preliminary)
  const quoteItemsTotal = quoteItems.reduce((sum, item) => {
    const price = getItemPrice(item);
    return sum + (isPerPerson(item) ? price * numberOfPeople : price);
  }, 0);
  const quoteSubtotalInclVat = quoteItemsTotal + coordinationFee;
  const quoteSubtotalExclVat = quoteSubtotalInclVat / vatMultiplier;
  const quoteVat = quoteSubtotalInclVat - quoteSubtotalExclVat;

  // Status badge helper for quote mode
  const getQuoteStatusBadge = (item: ProgramRequestItem) => {
    const status = item.item_quote_status;
    if (status === "bevestigd") return <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Bevestigd</Badge>;
    if (status === "optioneel") return <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">Optioneel</Badge>;
    return <Badge variant="outline" className="text-xs">Concept</Badge>;
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
        {/* Quote mode: Preliminary program costs */}
        {isQuoteMode && quoteItems.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">
              VOORLOPIGE PROGRAMMAKOSTEN
            </h4>
            <div className="space-y-1.5">
              {quoteItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getQuoteStatusBadge(item)}
                    <span className="truncate max-w-[180px]">{item.block_name}</span>
                  </div>
                  <span className="font-medium">
                    {getItemPrice(item) > 0 
                      ? `${formatCurrency(getItemPrice(item))}${isPerPerson(item) ? " p.p." : " totaal"}` 
                      : "Op aanvraag"
                    }
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm pt-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Coordinatiefee ({numberOfPeople} pers.)</span>
                </div>
                <span className="font-medium">{formatCurrency(coordinationFee)}</span>
              </div>
              {/* Extra costs in quote section */}
              {extraCostItems.length > 0 && extraCostItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Euro className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate max-w-[180px]">{item.block_name}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(item.admin_price_override ?? 0)} totaal</span>
                </div>
              ))}
            </div>
            <Separator className="my-3" />
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotaal excl. BTW (indicatief)</span>
                <span>{formatCurrency(quoteSubtotalExclVat)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">BTW (21%)</span>
                <span>{formatCurrency(quoteVat)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Totaal incl. BTW (indicatief)</span>
                <span>{formatCurrency(quoteSubtotalInclVat + extraCostsTotal)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              * Prijzen zijn onder voorbehoud en kunnen wijzigen na bevestiging door partners.
            </p>
          </div>
        )}

        {/* Regular mode or separator in quote mode */}
        {isQuoteMode && quoteItems.length > 0 && bureauItems.length > 0 && (
          <Separator />
        )}

        {/* Items to invoice (confirmed bureau items) */}
        {(!isQuoteMode || bureauItems.length > 0) && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">
              TE FACTUREREN DOOR BUREAU VLIELAND
            </h4>
            <div className="space-y-1.5">
              {bureauItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    <span>{item.block_name}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(item.quoted_price || 0)}</span>
                </div>
              ))}
              {bureauItems.length === 0 && extraCostItems.length === 0 && (
                <p className="text-sm text-slate-500">Geen bevestigde bureau items</p>
              )}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Coordinatiefee ({numberOfPeople} pers.)</span>
                </div>
                <span className="font-medium">{formatCurrency(coordinationFee)}</span>
              </div>
            </div>

            {/* Overige kosten */}
            {extraCostItems.length > 0 && (
              <>
                <Separator className="my-3" />
                <h4 className="text-sm font-semibold text-slate-700 mb-2">
                  OVERIGE KOSTEN
                </h4>
                <div className="space-y-1.5">
                  {extraCostItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Euro className="h-3.5 w-3.5 text-slate-400" />
                        <span>{item.block_name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(item.admin_price_override ?? 0)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <Separator className="my-3" />
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotaal excl. BTW</span>
                <span>{formatCurrency(totalExclVat)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">BTW (21%)</span>
                <span>{formatCurrency(totalVat)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Totaal incl. BTW</span>
                <span>{formatCurrency(totalInclVat)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Invoiced amounts */}
        {invoices.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">GEFACTUREERD</h4>
              <div className="space-y-2">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{invoice.invoice_number}</span>
                      <span className="text-slate-500">
                        ({format(new Date(invoice.invoice_date), "d MMM", { locale: nl })})
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {invoiceTypeLabelMap[invoice.invoice_type as InvoiceType] || invoice.invoice_type}
                      </Badge>
                    </div>
                    <span className={invoice.invoice_type === "credit" ? "text-red-600" : ""}>
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
        {totalInclVat > 0 && (
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
