import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Euro, Plus, CheckCircle2, Clock, FileText, Mail, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useNavigate } from "react-router-dom";
import { useItemVatRates } from "@/hooks/useItemVatRates";
import { useInvoiceCustomerSendStatus } from "@/hooks/useInvoiceCustomerSendStatus";
import { getItemLineTotal as centralLineTotal, isPerPersonItem } from "@/lib/portalPricing";
import { calculateExclVat, calculateVatAmount } from "@/lib/appSettings";
import type { BureauInvoice, InvoiceType } from "@/types/bureauInvoice";
import type { ProgramItemBillingLine } from "@/types/programItemBillingLine";
import { calculateExtraTotal, type AccommodationQuoteExtra } from "@/types/accommodationExtras";

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
  onForwardInvoice?: (invoice: BureauInvoice) => void;
  isQuoteMode?: boolean;
  touristTax?: number;
  natureContribution?: number;
  centralSurcharge?: number;
  accommodationTotal?: number;
  accommodationBaseTotal?: number;
  accommodationExtras?: AccommodationQuoteExtra[];
  accommodationName?: string;
  linesByItem?: Record<string, ProgramItemBillingLine[]>;
}

// Wrappers to avoid type incompatibility with the full ProgramRequestItem
const getLineTotal = (item: FinancialItem, n: number, days: number = 1) => centralLineTotal(item as any, n, days);

const sumBillingLines = (lines: ProgramItemBillingLine[]) =>
  lines.reduce((sum, l) => sum + Number(l.amount_incl_vat || 0), 0);

export const FinancialOverviewCard = ({
  requestId,
  numberOfPeople,
  numberOfDays = 1,
  items,
  invoices,
  onRegisterInvoice,
  onForwardInvoice,
  isQuoteMode = false,
  touristTax = 0,
  natureContribution = 0,
  centralSurcharge = 0,
  accommodationTotal = 0,
  accommodationBaseTotal,
  accommodationExtras = [],
  accommodationName,
  linesByItem = {},
}: FinancialOverviewCardProps) => {
  const { getCoordinationFee, getVatRate } = useAppSettings();
  const navigate = useNavigate();
  const { getItemVatRate } = useItemVatRates(items as any);
  const { data: customerSendMap = {} } = useInvoiceCustomerSendStatus(
    requestId,
    invoices.map((i) => i.id),
  );

  const programItems = items.filter(
    (item) => item.status !== "cancelled" && item.day_index !== -1
  );
  const extraCostItems = items.filter((item) => item.day_index === -1);

  const coordinationFee = getCoordinationFee(numberOfPeople);
  const coordVatRate = getVatRate("standard");
  const accommodationExtrasTotal = accommodationExtras.reduce(
    (sum, extra) => sum + calculateExtraTotal(extra),
    0,
  );
  const resolvedAccommodationBaseTotal = Math.max(
    0,
    accommodationBaseTotal ?? (accommodationTotal - accommodationExtrasTotal),
  );
  const accommodationGrandTotal = resolvedAccommodationBaseTotal + accommodationExtrasTotal;

  const formatCurrency = (amount: number) =>
    `€${amount.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const hasBillingLines = (item: FinancialItem) =>
    Array.isArray(linesByItem[item.id]) && linesByItem[item.id].length > 0;

  const getEffectiveItemTotal = (item: FinancialItem): number | null => {
    if (hasBillingLines(item)) return sumBillingLines(linesByItem[item.id]);
    return getLineTotal(item, numberOfPeople, numberOfDays);
  };

  const formatItemPrice = (item: FinancialItem) => {
    if (hasBillingLines(item)) {
      return `${formatCurrency(sumBillingLines(linesByItem[item.id]))} totaal`;
    }
    const lineTotal = getLineTotal(item, numberOfPeople, numberOfDays);
    if (lineTotal == null) return "Op aanvraag";

    if (
      item.quoted_price == null &&
      item.admin_price_override != null &&
      isPerPersonItem(item) &&
      numberOfPeople > 1
    ) {
      const suffix = item.price_type === "per_person_per_day" ? "p.p.p.d." : "p.p.";
      return `${formatCurrency(item.admin_price_override)} ${suffix}`;
    }

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
    (sum, item) => sum + (getEffectiveItemTotal(item) ?? 0), 0
  );
  const extraCostsTotal = extraCostItems.reduce(
    (sum, item) => sum + (getEffectiveItemTotal(item) ?? item.admin_price_override ?? 0), 0
  );

  // Accommodation VAT (9%)
  const accommodationVatRate = 9;

  const grandTotalInclVat = programTotal + coordinationFee + extraCostsTotal
    + touristTax + natureContribution + centralSurcharge + accommodationGrandTotal;

  // Aggregate VAT per rate. For items with billing lines we sum exact excl/vat amounts (no rounding loss).
  const vatGroups: Record<number, { exclVat: number; vatAmount: number }> = {};
  const addToGroup = (rate: number, exclVat: number, vatAmount: number) => {
    const key = Number(rate);
    if (!vatGroups[key]) vatGroups[key] = { exclVat: 0, vatAmount: 0 };
    vatGroups[key].exclVat += exclVat;
    vatGroups[key].vatAmount += vatAmount;
  };

  programItems.forEach((item) => {
    if (hasBillingLines(item)) {
      linesByItem[item.id].forEach((bl) => {
        addToGroup(Number(bl.vat_rate), Number(bl.amount_excl_vat), Number(bl.vat_amount));
      });
    } else {
      const lineTotal = getLineTotal(item, numberOfPeople, numberOfDays) ?? 0;
      const vatRate = getItemVatRate(item as any);
      addToGroup(vatRate, calculateExclVat(lineTotal, vatRate), calculateVatAmount(lineTotal, vatRate));
    }
  });

  // Coordination fee + central surcharge → standard VAT
  addToGroup(
    coordVatRate,
    calculateExclVat(coordinationFee + centralSurcharge, coordVatRate),
    calculateVatAmount(coordinationFee + centralSurcharge, coordVatRate),
  );

  // Extra costs: prefer billing lines if any, otherwise standard rate
  extraCostItems.forEach((item) => {
    if (hasBillingLines(item)) {
      linesByItem[item.id].forEach((bl) => {
        addToGroup(Number(bl.vat_rate), Number(bl.amount_excl_vat), Number(bl.vat_amount));
      });
    } else {
      const total = item.admin_price_override ?? 0;
      addToGroup(coordVatRate, calculateExclVat(total, coordVatRate), calculateVatAmount(total, coordVatRate));
    }
  });

  // Accommodation base
  if (resolvedAccommodationBaseTotal > 0) {
    addToGroup(
      accommodationVatRate,
      calculateExclVat(resolvedAccommodationBaseTotal, accommodationVatRate),
      calculateVatAmount(resolvedAccommodationBaseTotal, accommodationVatRate),
    );
  }

  // Accommodation extras use their own configured VAT rates
  accommodationExtras.forEach((extra) => {
    const extraTotal = calculateExtraTotal(extra);
    const extraVatRate = Number(extra.vat_rate ?? accommodationVatRate);
    addToGroup(
      extraVatRate,
      calculateExclVat(extraTotal, extraVatRate),
      calculateVatAmount(extraTotal, extraVatRate),
    );
  });
  // Tourist tax & nature contribution = 0% VAT
  if (touristTax + natureContribution > 0) {
    addToGroup(0, touristTax + natureContribution, 0);
  }

  const sortedVatGroups = Object.entries(vatGroups)
    .map(([rate, v]) => ({ rate: Number(rate), ...v }))
    .sort((a, b) => a.rate - b.rate);

  const totalExclVat = sortedVatGroups.reduce((s, g) => s + g.exclVat, 0);
  const totalVat = sortedVatGroups.reduce((s, g) => s + g.vatAmount, 0);

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
            {programItems.map((item) => {
              const billingLines = linesByItem[item.id];
              const isFinal = billingLines && billingLines.length > 0;
              return (
                <div key={item.id}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      {getStatusBadge(item)}
                      <span className="truncate max-w-[180px]">{item.block_name}</span>
                      {isFinal && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 bg-green-50 text-green-700 border-green-200">
                          definitief
                        </Badge>
                      )}
                    </div>
                    <span className="font-medium whitespace-nowrap ml-2 tabular-nums">
                      {formatItemPrice(item)}
                    </span>
                  </div>
                  {isFinal && (
                    <div className="ml-6 mt-0.5 mb-1 space-y-0.5">
                      {billingLines.map((bl) => (
                        <div key={bl.id} className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="truncate max-w-[200px]">
                            {bl.description || "Regel"}
                            <span className="ml-1 text-[10px] opacity-70">({bl.vat_rate}%)</span>
                          </span>
                          <span className="tabular-nums">{formatCurrency(Number(bl.amount_incl_vat))}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Coordination fee */}
            <div className="flex items-center justify-between text-sm pt-1">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Coördinatiefee ({numberOfPeople} pers.)</span>
              </div>
              <span className="font-medium tabular-nums">{formatCurrency(coordinationFee)}</span>
            </div>

            {/* Extra costs inline */}
            {extraCostItems.map((item) => {
              const billingLines = linesByItem[item.id];
              const isFinal = billingLines && billingLines.length > 0;
              const total = isFinal ? sumBillingLines(billingLines) : (item.admin_price_override ?? 0);
              return (
                <div key={item.id}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate max-w-[180px]">{item.block_name}</span>
                      {isFinal && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 bg-green-50 text-green-700 border-green-200">
                          definitief
                        </Badge>
                      )}
                    </div>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(total)}
                    </span>
                  </div>
                  {isFinal && (
                    <div className="ml-6 mt-0.5 mb-1 space-y-0.5">
                      {billingLines.map((bl) => (
                        <div key={bl.id} className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="truncate max-w-[200px]">
                            {bl.description || "Regel"}
                            <span className="ml-1 text-[10px] opacity-70">({bl.vat_rate}%)</span>
                          </span>
                          <span className="tabular-nums">{formatCurrency(Number(bl.amount_incl_vat))}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Accommodation */}
            {(resolvedAccommodationBaseTotal > 0 || accommodationExtras.length > 0) && (
              <>
                {resolvedAccommodationBaseTotal > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate max-w-[200px]">Logies{accommodationName ? `: ${accommodationName}` : ""}</span>
                    </div>
                    <span className="font-medium tabular-nums">{formatCurrency(resolvedAccommodationBaseTotal)}</span>
                  </div>
                )}
                {accommodationExtras.map((extra) => (
                  <div key={extra.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate max-w-[200px]">Logies extra: {extra.name}</span>
                    </div>
                    <span className="font-medium tabular-nums">{formatCurrency(calculateExtraTotal(extra))}</span>
                  </div>
                ))}
              </>
            )}

            {/* Tourist tax */}
            {touristTax > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Toeristenbelasting ({numberOfPeople} pers. × {numberOfDays} dgn)</span>
                </div>
                <span className="font-medium tabular-nums">{formatCurrency(touristTax)}</span>
              </div>
            )}

            {/* Nature contribution */}
            {natureContribution > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Natuurbijdrage ({numberOfPeople} pers.)</span>
                </div>
                <span className="font-medium tabular-nums">{formatCurrency(natureContribution)}</span>
              </div>
            )}

            {/* Central surcharge */}
            {centralSurcharge > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Opslag centrale facturatie ({numberOfPeople} pers.)</span>
                </div>
                <span className="font-medium tabular-nums">{formatCurrency(centralSurcharge)}</span>
              </div>
            )}
          </div>

          {/* Totals */}
          <Separator className="my-3" />
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotaal excl. BTW</span>
              <span className="tabular-nums">{formatCurrency(totalExclVat)}</span>
            </div>
            {sortedVatGroups
              .filter((g) => g.vatAmount > 0)
              .map((g) => (
                <div key={g.rate} className="flex justify-between text-xs text-muted-foreground">
                  <span>BTW {g.rate}% over {formatCurrency(g.exclVat)}</span>
                  <span className="tabular-nums">{formatCurrency(g.vatAmount)}</span>
                </div>
              ))}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Totaal BTW</span>
              <span className="tabular-nums">{formatCurrency(totalVat)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Totaal incl. BTW{isQuoteMode ? " (indicatief)" : ""}</span>
              <span className="tabular-nums">{formatCurrency(grandTotalInclVat)}</span>
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
                {invoices.map((invoice) => {
                  const isForwarded =
                    invoice.status === "forwarded" || !!invoice.forwarded_to_accounting_at;
                  const customerSentAt = customerSendMap[invoice.id];
                  return (
                    <div key={invoice.id} className="flex items-start justify-between text-sm gap-2">
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{invoice.invoice_number}</span>
                          <span className="text-muted-foreground whitespace-nowrap">
                            ({format(new Date(invoice.invoice_date), "EEE d MMM", { locale: nl })})
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {invoiceTypeLabelMap[invoice.invoice_type as InvoiceType] || invoice.invoice_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {customerSentAt ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 px-1 bg-green-50 text-green-700 border-green-200"
                              title={`Verstuurd op ${format(new Date(customerSentAt), "d MMM yyyy HH:mm", { locale: nl })}`}
                            >
                              <Mail className="h-2.5 w-2.5 mr-0.5" />
                              Naar klant {format(new Date(customerSentAt), "d MMM", { locale: nl })}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 bg-muted text-muted-foreground">
                              Niet naar klant verstuurd
                            </Badge>
                          )}
                          {isForwarded ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 px-1 bg-blue-50 text-blue-700 border-blue-200"
                              title={
                                invoice.forwarded_to_accounting_at
                                  ? `Doorgestuurd op ${format(new Date(invoice.forwarded_to_accounting_at), "d MMM yyyy HH:mm", { locale: nl })}`
                                  : "Doorgestuurd naar Snelstart"
                              }
                            >
                              <ArrowRight className="h-2.5 w-2.5 mr-0.5" />
                              Snelstart{invoice.forwarded_to_accounting_at ? ` ${format(new Date(invoice.forwarded_to_accounting_at), "d MMM", { locale: nl })}` : ""}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 bg-muted text-muted-foreground">
                              Nog niet doorgestuurd
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`tabular-nums ${invoice.invoice_type === "credit" ? "text-destructive" : ""}`}>
                          {invoice.invoice_type === "credit" ? "-" : ""}
                          {formatCurrency(invoice.amount_incl_vat)}
                        </span>
                        {onForwardInvoice && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() => onForwardInvoice(invoice)}
                            title={isForwarded
                              ? "Opnieuw doorsturen naar Snelstart"
                              : "Doorsturen naar Snelstart (bureauvlieland@boekhouding.nl)"}
                          >
                            <Mail className="h-3 w-3 mr-1" />
                            {isForwarded ? "Opnieuw doorsturen" : "Doorsturen"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Outstanding amount */}
        <Separator />
        <div className="flex items-center justify-between">
          <span className="font-semibold text-lg">Openstaand</span>
          <span className={`font-bold text-lg tabular-nums ${outstandingAmount > 0 ? "text-amber-600" : "text-green-600"}`}>
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
