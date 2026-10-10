import { useState } from "react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { ChevronDown, ChevronUp, FileText, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, Pill } from "@/components/system";
import {
  partnerInvoiceStatus,
  sortPartnerInvoices,
  type PartnerCommissionInvoice,
} from "@/lib/partnerCommissionInvoices";

const money = (amount: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);

const day = (value: string | null) => (value ? format(parseISO(value), "d MMM yyyy", { locale: nl }) : null);

/**
 * De commissiefacturen van het bureau aan deze partner (fase 3 van
 * docs/plan-commissiefacturen.md): per factuur nummer, datum, status in
 * partnertaal, bedrag, de PDF en uitklapbaar de regels waar de commissie
 * over gaat. Geen acties: betalen gebeurt buiten het portaal om.
 */
export const PartnerCommissionInvoiceList = ({ invoices }: { invoices: PartnerCommissionInvoice[] }) => {
  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={<Receipt aria-hidden="true" />}
        title="Nog geen commissiefacturen"
        description="Zodra Bureau Vlieland commissie aan u factureert, staat de factuur hier met PDF."
      />
    );
  }

  return (
    <div className="space-y-3">
      {sortPartnerInvoices(invoices).map((invoice) => (
        <PartnerCommissionInvoiceRow key={invoice.id} invoice={invoice} />
      ))}
    </div>
  );
};

const PartnerCommissionInvoiceRow = ({ invoice }: { invoice: PartnerCommissionInvoice }) => {
  const [open, setOpen] = useState(false);
  const status = partnerInvoiceStatus(invoice);
  const lineCount = invoice.lines.length;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-medium text-foreground">{invoice.invoice_number ?? "Factuur"}</h3>
              <Pill tone={status.tone}>{status.label}</Pill>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Factuurdatum {day(invoice.invoice_date)}
              {invoice.due_date && status.label !== "Betaald" && !invoice.credits_invoice_id && (
                <> · vervalt {day(invoice.due_date)}</>
              )}
              {invoice.paid_at && <> · betaald op {day(invoice.paid_at)}</>}
              {invoice.credit_reason && <> · {invoice.credit_reason}</>}
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <div className="text-right">
              <p className="font-semibold tabular-nums text-foreground">{money(Number(invoice.amount_incl_vat) || 0)}</p>
              <p className="text-xs text-muted-foreground">
                {money(Number(invoice.amount_excl_vat) || 0)} excl. {invoice.vat_rate}% btw
              </p>
            </div>
            <div className="flex items-center gap-1">
              {invoice.pdfUrl && (
                <Button asChild size="sm" variant="outline">
                  <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                    <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                    PDF
                  </a>
                </Button>
              )}
              {lineCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setOpen((value) => !value)}
                  aria-expanded={open}
                  aria-label={open ? "Regels verbergen" : "Regels tonen"}
                >
                  {lineCount} {lineCount === 1 ? "regel" : "regels"}
                  {open ? (
                    <ChevronUp className="ml-1 h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="ml-1 h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {open && lineCount > 0 && (
          <ul className="mt-4 divide-y divide-border border-t border-border text-sm">
            {invoice.lines.map((line) => (
              <li key={line.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-foreground">{line.description ?? line.block_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[line.customer_label, line.reference_number, day(line.event_date)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <p className="shrink-0 tabular-nums text-muted-foreground">
                  {line.commission_percentage}% van {money(Number(line.invoiced_amount_excl_vat) || 0)} ={" "}
                  <span className="font-medium text-foreground">{money(Number(line.commission_amount) || 0)}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
