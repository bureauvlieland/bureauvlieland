import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Euro, Plus, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useAppSettings } from "@/hooks/useAppSettings";
import type { BureauInvoice, InvoiceType } from "@/types/bureauInvoice";

interface ProgramRequestItem {
  id: string;
  block_name: string;
  block_type: string;
  status: string;
  quoted_price: number | null;
}

interface FinancialOverviewCardProps {
  numberOfPeople: number;
  items: ProgramRequestItem[];
  invoices: BureauInvoice[];
  onRegisterInvoice: () => void;
}

export const FinancialOverviewCard = ({
  numberOfPeople,
  items,
  invoices,
  onRegisterInvoice,
}: FinancialOverviewCardProps) => {
  const { getCoordinationFee, getVatRate } = useAppSettings();
  
  // Calculate items to be invoiced by Bureau Vlieland
  const bureauItems = items.filter(
    (item) => item.block_type === "bureau" && item.status === "confirmed" && item.quoted_price
  );

  // Calculate totals
  const itemsTotal = bureauItems.reduce((sum, item) => sum + (item.quoted_price || 0), 0);
  const coordinationFee = getCoordinationFee(numberOfPeople);
  const vatRate = getVatRate("standard");
  const vatMultiplier = 1 + vatRate / 100;
  
  // VAT for coordination fee
  const coordinationFeeExcl = coordinationFee / vatMultiplier;
  const coordinationFeeVat = coordinationFee - coordinationFeeExcl;

  // For simplicity, assume all bureau items are incl. VAT
  const itemsTotalExcl = itemsTotal / vatMultiplier;
  const itemsVat = itemsTotal - itemsTotalExcl;

  const totalInclVat = itemsTotal + coordinationFee;
  const totalExclVat = itemsTotalExcl + coordinationFeeExcl;
  const totalVat = itemsVat + coordinationFeeVat;

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Euro className="h-5 w-5" />
          Financieel Overzicht
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items to invoice */}
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
            {bureauItems.length === 0 && (
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

        {/* Register invoice button */}
        {totalInclVat > 0 && (
          <Button onClick={onRegisterInvoice} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Factuur Registreren
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
