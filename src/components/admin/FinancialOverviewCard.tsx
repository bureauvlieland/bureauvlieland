import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Euro, Plus, CheckCircle2, Clock, FileText, Mail, ArrowRight, X, RotateCcw, HelpCircle } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useInvoiceCustomerSendStatus } from "@/hooks/useInvoiceCustomerSendStatus";
import { isPerPersonItem } from "@/lib/portalPricing";
import { resolveItemVatRate } from "@/lib/itemVatRate";
import type { BureauInvoice, InvoiceType } from "@/types/bureauInvoice";
import { EXCLUDABLE_FEE_LABELS, type ExcludableFeeKey } from "@/lib/excludedFees";
import type { ProjectInvoiceSpec, SpecLine } from "@/lib/projectInvoiceSpec";
import { AdminItemBillingLinesEditor } from "@/components/admin/AdminItemBillingLinesEditor";

/** Exacte btw-uitsplitsing van het projecttotaal, zoals getoond in het
 *  Financieel Overzicht. Gaat mee naar de registratiedialoog zodat de
 *  prefill niet hoeft terug te rekenen met een vlakke 21%. */
export interface InvoiceVatSuggestion {
  totalExclVat: number;
  totalVat: number;
  grandTotalInclVat: number;
  vatGroups: { rate: number; exclVat: number; vatAmount: number }[];
}

interface FinancialOverviewCardProps {
  requestId: string;
  /** De ene berekening van het project (`projectInvoiceSpec`). */
  spec: ProjectInvoiceSpec;
  invoices: BureauInvoice[];
  /** Btw-tarief per bouwsteen, voor de regeleditor van onderdelen zonder prijs. */
  blockVatRates?: Record<string, number>;
  onRegisterInvoice: (vatSuggestion?: InvoiceVatSuggestion) => void;
  onForwardInvoice?: (invoice: BureauInvoice) => void;
  isQuoteMode?: boolean;
  /** Per-project uitgesloten automatische kostenposten. */
  excludedFees?: string[];
  /** Callback wanneer admin een kostenpost in-/uitsluit van de factuur. */
  onToggleFee?: (key: ExcludableFeeKey, nextExcluded: boolean) => void;
}

const formatCurrency = (amount: number) =>
  `€${amount.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const invoiceTypeLabelMap: Record<InvoiceType, string> = {
  partial: "Deelfactuur",
  final: "Eindfactuur",
  credit: "Creditnota",
};

const StatusIcon = ({ status }: { status: string | undefined }) => {
  if (status === "confirmed" || status === "executed") return <CheckCircle2 className="h-3.5 w-3.5 text-success-ink" />;
  if (status === "pending") return <Clock className="h-3.5 w-3.5 text-warning-ink" />;
  if (status === "alternative")
    return <Badge variant="outline" className="text-xs">Alternatief</Badge>;
  return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
};

const RemoveButton = ({ title, onClick }: { title: string; onClick: () => void }) => (
  <Button
    variant="ghost"
    size="icon"
    className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
    title={title}
    onClick={onClick}
  >
    <X className="h-3 w-3" />
  </Button>
);

const SubLines = ({ line }: { line: SpecLine }) =>
  line.subLines && line.subLines.length > 0 ? (
    <div className="ml-6 mt-0.5 mb-1 space-y-0.5">
      {line.subLines.map((sub, idx) => (
        <div key={sub.id ?? idx} className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate max-w-[200px]">
            {sub.description || "Regel"}
            <span className="ml-1 text-[10px] opacity-70">({sub.vatRate}%)</span>
          </span>
          <span className="tabular-nums">{formatCurrency(sub.amountInclVat)}</span>
        </div>
      ))}
    </div>
  ) : null;

/**
 * Financieel overzicht van een project: toont de specificatie uit
 * `projectInvoiceSpec` (regels, btw-groepen, totaal), de geregistreerde
 * facturen en het openstaande bedrag. Het rekent zelf niets meer uit.
 */
export const FinancialOverviewCard = ({
  requestId,
  spec,
  invoices,
  blockVatRates = {},
  onRegisterInvoice,
  onForwardInvoice,
  isQuoteMode = false,
  excludedFees = [],
  onToggleFee,
}: FinancialOverviewCardProps) => {
  const navigate = useNavigate();
  const { data: customerSendMap = {} } = useInvoiceCustomerSendStatus(
    requestId,
    invoices.map((i) => i.id),
  );

  const programLines = spec.lines.filter((l) => l.kind === "program");
  const extraCostLines = spec.lines.filter((l) => l.kind === "extra_cost");
  const lodgingLines = spec.lines.filter((l) => l.kind === "lodging");
  const lodgingExtraLines = spec.lines.filter((l) => l.kind === "lodging_extra");
  const feeLines = spec.lines.filter((l) => l.kind === "fee" || l.kind === "revision");
  const { totals, vatGroups, numberOfPeople, numberOfDays } = spec;

  const itemPriceLabel = (line: SpecLine) => {
    if (line.subLines && line.subLines.length > 0) return `${formatCurrency(line.amountInclVat)} totaal`;
    const item = line.item;
    if (
      item &&
      line.isPreliminary &&
      item.admin_price_override != null &&
      isPerPersonItem(item) &&
      numberOfPeople > 1
    ) {
      return `${formatCurrency(item.admin_price_override)} ${item.price_type === "per_person_per_day" ? "p.p.p.d." : "p.p."}`;
    }
    return `${formatCurrency(line.amountInclVat)} totaal`;
  };

  const feeLabel = (line: SpecLine) => {
    switch (line.feeKey) {
      case "coordination_fee":
        return `Coördinatiefee (${numberOfPeople} pers.)`;
      case "tourist_tax":
        return `Toeristenbelasting (${numberOfPeople} pers. × ${numberOfDays} dgn)`;
      case "nature_contribution":
        return `Natuurbijdrage (${numberOfPeople} pers.)`;
      case "central_surcharge":
        return `Opslag centrale facturatie (${numberOfPeople} pers.)`;
      default:
        return line.kind === "revision" ? "Programmawijzigingen" : line.description;
    }
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
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">
            {isQuoteMode ? "PROGRAMMAKOSTEN (INDICATIEF)" : "PROGRAMMAKOSTEN"}
          </h4>
          <div className="space-y-1.5">
            {programLines.length === 0 && spec.unpricedItems.length === 0 && (
              <p className="text-sm text-muted-foreground">Geen programma-items</p>
            )}
            {programLines.map((line) => {
              const isFinal = Boolean(line.subLines && line.subLines.length > 0);
              return (
                <div key={line.key}>
                  <div className="flex items-center justify-between text-sm gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <StatusIcon status={line.item?.status} />
                      <span className="truncate max-w-[180px]">{line.description}</span>
                      {isFinal && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 text-success-ink">
                          definitief
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <span className="font-medium whitespace-nowrap tabular-nums">{itemPriceLabel(line)}</span>
                      {line.itemId && (
                        <AdminItemBillingLinesEditor
                          itemId={line.itemId}
                          itemName={line.description}
                          suggestedAmount={line.amountInclVat}
                          defaultVatRate={line.vatRate}
                          requestId={requestId}
                        />
                      )}
                    </div>
                  </div>
                  <SubLines line={line} />
                </div>
              );
            })}

            {spec.unpricedItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate max-w-[180px]">{item.block_name}</span>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <span className="text-muted-foreground whitespace-nowrap">Op aanvraag</span>
                  <AdminItemBillingLinesEditor
                    itemId={item.id}
                    itemName={item.block_name}
                    suggestedAmount={null}
                    defaultVatRate={resolveItemVatRate(item, blockVatRates)}
                    requestId={requestId}
                  />
                </div>
              </div>
            ))}

            {extraCostLines.map((line) => {
              const isFinal = Boolean(line.subLines && line.subLines.length > 0);
              return (
                <div key={line.key}>
                  <div className="flex items-center justify-between text-sm gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate max-w-[180px]">{line.description}</span>
                      {isFinal && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 text-success-ink">
                          definitief
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium tabular-nums">{formatCurrency(line.amountInclVat)}</span>
                      {line.itemId && (
                        <AdminItemBillingLinesEditor
                          itemId={line.itemId}
                          itemName={line.description}
                          suggestedAmount={line.amountInclVat}
                          defaultVatRate={line.vatRate}
                          requestId={requestId}
                        />
                      )}
                    </div>
                  </div>
                  <SubLines line={line} />
                </div>
              );
            })}

            {lodgingLines.map((line) => (
              <div key={line.key} className="flex items-center justify-between text-sm group">
                <div className="flex items-center gap-2">
                  <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate max-w-[200px]">Logies: {line.description}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium tabular-nums">{formatCurrency(line.amountInclVat)}</span>
                  {onToggleFee && (
                    <RemoveButton
                      title="Verwijder van factuur (de accommodatie factureert rechtstreeks aan de klant)"
                      onClick={() => onToggleFee("accommodation", true)}
                    />
                  )}
                </div>
              </div>
            ))}
            {lodgingExtraLines.map((line) => (
              <div key={line.key} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate max-w-[260px]">
                    Logies extra: {line.description}
                    {(line.bundleCount ?? 1) > 1 && (
                      <span className="ml-1 text-xs text-muted-foreground">× {line.bundleCount}</span>
                    )}
                  </span>
                </div>
                <span className="font-medium tabular-nums">{formatCurrency(line.amountInclVat)}</span>
              </div>
            ))}

            {feeLines.map((line) => (
              <div key={line.key} className="flex items-center justify-between text-sm group">
                <div className="flex items-center gap-2">
                  {line.feeKey === "coordination_fee" ? (
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span>{feeLabel(line)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium tabular-nums">{formatCurrency(line.amountInclVat)}</span>
                  {onToggleFee && line.feeKey && (
                    <RemoveButton title="Verwijder van factuur" onClick={() => onToggleFee(line.feeKey!, true)} />
                  )}
                </div>
              </div>
            ))}

            {onToggleFee && excludedFees.length > 0 && (
              <div className="pt-2 mt-2 border-t border-dashed">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Uitgesloten van factuur</p>
                <div className="flex flex-wrap gap-1">
                  {(excludedFees as ExcludableFeeKey[]).map((key) => (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs gap-1 text-muted-foreground"
                      onClick={() => onToggleFee(key, false)}
                      title="Terugzetten op factuur"
                    >
                      <RotateCcw className="h-3 w-3" />
                      {EXCLUDABLE_FEE_LABELS[key] ?? key}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator className="my-3" />
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotaal excl. BTW</span>
              <span className="tabular-nums">{formatCurrency(totals.exclVat)}</span>
            </div>
            {vatGroups
              .filter((g) => g.vatAmount > 0)
              .map((g) => (
                <div key={g.rate} className="flex justify-between text-xs text-muted-foreground">
                  <span>BTW {g.rate}% over {formatCurrency(g.exclVat)}</span>
                  <span className="tabular-nums">{formatCurrency(g.vatAmount)}</span>
                </div>
              ))}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Totaal BTW</span>
              <span className="tabular-nums">{formatCurrency(totals.vat)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Totaal incl. BTW{isQuoteMode ? " (indicatief)" : ""}</span>
              <span className="tabular-nums">{formatCurrency(totals.inclVat)}</span>
            </div>
          </div>
          {isQuoteMode && (
            <p className="text-xs text-muted-foreground mt-2">
              * Prijzen zijn onder voorbehoud en kunnen wijzigen na bevestiging door partners.
            </p>
          )}
        </div>

        {invoices.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">GEFACTUREERD</h4>
              <div className="space-y-2">
                {invoices.map((invoice) => {
                  const isForwarded =
                    invoice.status === "forwarded" || !!invoice.forwarded_to_accounting_at;
                  const customerSentAt = customerSendMap[invoice.id] ?? customerSendMap[`number:${invoice.invoice_number}`];
                  return (
                    <div key={invoice.id} className="flex items-start justify-between text-sm gap-2">
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            className="font-medium text-left underline decoration-dotted underline-offset-2 hover:text-primary hover:decoration-solid focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                            onClick={() =>
                              navigate(
                                `/admin/aanvragen/${requestId}/factuur?invoiceId=${invoice.id}`,
                              )
                            }
                            title="Open factuur preview"
                          >
                            {invoice.invoice_number}
                          </button>
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
                              className="text-[10px] h-4 px-1 text-success-ink"
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
                              className="text-[10px] h-4 px-1 text-info-ink"
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
                          <div className="flex flex-col items-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() =>
                                navigate(
                                  `/admin/aanvragen/${requestId}/factuur?action=send&invoiceId=${invoice.id}`,
                                )
                              }
                              title={customerSentAt ? "Opnieuw naar klant versturen" : "Naar klant versturen"}
                            >
                              <Mail className="h-3 w-3 mr-1" />
                              {customerSentAt ? "Opnieuw naar klant" : "Naar klant"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() => onForwardInvoice(invoice)}
                              title={isForwarded
                                ? "Opnieuw doorsturen naar Snelstart"
                                : "Doorsturen naar Snelstart (bureauvlieland@boekhouding.nl)"}
                            >
                              <ArrowRight className="h-3 w-3 mr-1" />
                              {isForwarded ? "Opnieuw Snelstart" : "Snelstart"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <Separator />
        <div className="flex items-center justify-between">
          <span className="font-semibold text-lg">Openstaand</span>
          <span className={`font-bold text-lg tabular-nums ${totals.outstanding > 0 ? "text-warning-ink" : "text-success-ink"}`}>
            {formatCurrency(totals.outstanding)}
          </span>
        </div>

        {totals.inclVat > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                const hasPrior = invoices.length > 0;
                const hasOutstanding = totals.outstanding > 0.005;
                const qs = hasPrior && hasOutstanding ? "?new=1&mode=slot" : "";
                navigate(`/admin/aanvragen/${requestId}/factuur${qs}`);
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Factuur Maken
            </Button>
            <Button
              onClick={() =>
                onRegisterInvoice({
                  totalExclVat: totals.exclVat,
                  totalVat: totals.vat,
                  grandTotalInclVat: totals.inclVat,
                  vatGroups: vatGroups.map((g) => ({ rate: g.rate, exclVat: g.exclVat, vatAmount: g.vatAmount })),
                })
              }
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              {totals.invoiced > 0 ? "Restant Registreren" : "Factuur Registreren"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
