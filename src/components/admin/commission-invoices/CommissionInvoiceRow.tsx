import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar, ChevronDown, Download, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Pill } from "@/components/system";
import { supabase } from "@/integrations/supabase/client";
import { commissionInvoiceActions, commissionInvoiceLabel } from "@/lib/commissionInvoiceStatus";
import {
  STATUS_PILL_TONE,
  daysOverdue,
  nextInvoiceAction,
  statusLabel,
  type CommissionInvoiceLineView,
  type CommissionInvoiceView,
} from "@/lib/commissionInvoiceView";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

const formatDate = (value: string | null) =>
  value ? format(parseISO(value), "d MMM yyyy", { locale: nl }) : "–";

const formatDateTime = (value: string | null) =>
  value ? format(parseISO(value), "d MMM yyyy HH:mm", { locale: nl }) : "–";

export interface CommissionInvoiceRowHandlers {
  onEdit: (invoice: CommissionInvoiceView) => void;
  onFinalize: (invoice: CommissionInvoiceView) => void;
  onDelete: (invoice: CommissionInvoiceView) => void;
  onSend: (invoice: CommissionInvoiceView) => void;
  onForward: (invoice: CommissionInvoiceView) => void;
  onMarkPaid: (invoice: CommissionInvoiceView) => void;
  onCredit: (invoice: CommissionInvoiceView) => void;
  onOpenPdf: (invoice: CommissionInvoiceView) => void;
  onRegeneratePdf: (invoice: CommissionInvoiceView) => void;
}

interface Props extends CommissionInvoiceRowHandlers {
  invoice: CommissionInvoiceView;
  busy: boolean;
  /** Nummer van factuur-id, voor "Creditnota bij …". */
  numberById: Map<string, string>;
  /** Nummer van de creditnota per gecrediteerde factuur. */
  creditNoteByOriginal: Map<string, string>;
}

interface SourceLink {
  key: string;
  label: string;
  to: string | null;
}

interface MailRow {
  id: string;
  sent_at: string | null;
  recipient_email: string;
  email_type: string;
  status: string;
  opened_at: string | null;
  delivered_at: string | null;
  bounced_at: string | null;
}

const MAIL_TYPE_LABELS: Record<string, string> = {
  commission_invoice_sent: "Naar partner",
  commission_invoice_forward: "Naar Snelstart",
};

/** Waar de bronnen van de regels te vinden zijn: project, logiesaanvraag of inkoopfactuur. */
async function loadSourceLinks(lines: CommissionInvoiceLineView[]): Promise<SourceLink[]> {
  const itemIds = lines.map((l) => l.item_id).filter((id): id is string => !!id);
  const quoteIds = lines.map((l) => l.quote_id).filter((id): id is string => !!id);
  const invoiceIds = lines.map((l) => l.purchase_invoice_id).filter((id): id is string => !!id);

  const [items, quotes, purchaseInvoices] = await Promise.all([
    itemIds.length
      ? supabase.from("program_request_items").select("id, request_id, block_name").in("id", itemIds)
      : Promise.resolve({ data: [], error: null }),
    quoteIds.length
      ? supabase.from("accommodation_quotes").select("id, request_id, accommodation_name").in("id", quoteIds)
      : Promise.resolve({ data: [], error: null }),
    invoiceIds.length
      ? supabase.from("partner_purchase_invoices").select("id, invoice_number").in("id", invoiceIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (items.error) throw items.error;
  if (quotes.error) throw quotes.error;
  if (purchaseInvoices.error) throw purchaseInvoices.error;

  const itemById = new Map((items.data ?? []).map((i) => [i.id, i]));
  const quoteById = new Map((quotes.data ?? []).map((q) => [q.id, q]));
  const invoiceById = new Map((purchaseInvoices.data ?? []).map((p) => [p.id, p]));

  const links: SourceLink[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    if (line.item_id) {
      const item = itemById.get(line.item_id);
      const key = `item-${line.item_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({
        key,
        label: `${line.reference_number ?? "Project"} · ${item?.block_name ?? line.block_name}`,
        to: item?.request_id ? `/admin/aanvragen/${item.request_id}` : null,
      });
    } else if (line.quote_id) {
      const quote = quoteById.get(line.quote_id);
      const key = `quote-${line.quote_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({
        key,
        label: `${line.reference_number ?? "Logies"} · ${quote?.accommodation_name ?? line.block_name}`,
        to: quote?.request_id ? `/admin/logies/${quote.request_id}` : null,
      });
    } else if (line.purchase_invoice_id) {
      const purchase = invoiceById.get(line.purchase_invoice_id);
      const key = `pi-${line.purchase_invoice_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const number = purchase?.invoice_number ?? null;
      links.push({
        key,
        label: `Inkoopfactuur ${number ?? ""}`.trim(),
        to: number ? `/admin/inkoopfacturen?search=${encodeURIComponent(number)}` : "/admin/inkoopfacturen",
      });
    }
  }
  return links;
}

function mailOutcome(mail: MailRow): { tone: "success" | "info" | "danger" | "neutral"; label: string } {
  if (mail.bounced_at || mail.status === "failed" || mail.status === "bounced") {
    return { tone: "danger", label: "Niet aangekomen" };
  }
  if (mail.opened_at) return { tone: "success", label: `Geopend ${formatDateTime(mail.opened_at)}` };
  if (mail.delivered_at) return { tone: "info", label: "Afgeleverd" };
  return { tone: "neutral", label: mail.status === "sent" ? "Verstuurd" : mail.status };
}

/**
 * Eén commissiefactuur in het overzicht: nummer, partner, data, bedrag,
 * status, tekstknoppen voor wat er nu kan, en een uitklapper met de regels,
 * de bronnen, de mails en de Snelstart-status.
 */
export const CommissionInvoiceRow = ({
  invoice,
  busy,
  numberById,
  creditNoteByOriginal,
  onEdit,
  onFinalize,
  onDelete,
  onSend,
  onForward,
  onMarkPaid,
  onCredit,
  onOpenPdf,
  onRegeneratePdf,
}: Props) => {
  const [open, setOpen] = useState(false);
  const actions = commissionInvoiceActions(invoice.status);
  const next = nextInvoiceAction(invoice);
  const overdue = daysOverdue(invoice);
  const isCreditNote = !!invoice.credits_invoice_id;

  const { data: sources, isLoading: sourcesLoading } = useQuery({
    queryKey: ["commission-invoice-sources", invoice.id],
    queryFn: () => loadSourceLinks(invoice.lines),
    enabled: open,
  });

  const { data: mails, isLoading: mailsLoading } = useQuery<MailRow[]>({
    queryKey: ["commission-invoice-mails", invoice.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_log")
        .select("id, sent_at, recipient_email, email_type, status, opened_at, delivered_at, bounced_at")
        .eq("metadata->>commissionInvoiceId", invoice.id)
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MailRow[];
    },
    enabled: open && invoice.status !== "draft",
  });

  const variantFor = (action: NonNullable<typeof next>) => (next === action ? "secondary" : "outline");

  return (
    <Card>
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-foreground">{commissionInvoiceLabel(invoice)}</h3>
              <Pill tone={STATUS_PILL_TONE[invoice.status]}>{statusLabel(invoice.status)}</Pill>
              {isCreditNote && <Pill tone="neutral">Creditnota bij {numberById.get(invoice.credits_invoice_id!) ?? "factuur"}</Pill>}
              {overdue !== null && (
                <Pill tone="danger">
                  Te laat · {overdue} {overdue === 1 ? "dag" : "dagen"}
                </Pill>
              )}
              {!invoice.pdf_path && invoice.invoice_number && <Pill tone="warning">Geen PDF</Pill>}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <Link to={`/admin/partners/${invoice.partner_id}`} className="font-medium text-foreground hover:underline">
                {invoice.partner?.name || invoice.recipient_name}
              </Link>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                {formatDate(invoice.invoice_date)}
              </span>
              {invoice.due_date && invoice.status !== "draft" && <span>vervalt {formatDate(invoice.due_date)}</span>}
              {invoice.status === "credited" && (
                <span>
                  Gecrediteerd{creditNoteByOriginal.has(invoice.id) ? ` met ${creditNoteByOriginal.get(invoice.id)}` : ""}
                  {invoice.credit_reason ? ` · ${invoice.credit_reason}` : ""}
                </span>
              )}
            </div>
          </div>

          <div className="shrink-0 sm:text-right">
            <p className="text-xs text-muted-foreground">{isCreditNote ? "Creditnota incl. btw" : "Totaal incl. btw"}</p>
            <p className="text-2xl font-semibold tabular-nums text-foreground">{formatCurrency(invoice.amount_incl_vat)}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(invoice.amount_excl_vat)} excl. btw</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Bezig" />}
          {actions.edit && (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => onEdit(invoice)}>
              Bewerken
            </Button>
          )}
          {actions.finalize && (
            <Button variant={variantFor("finalize")} size="sm" disabled={busy} onClick={() => onFinalize(invoice)}>
              Definitief maken
            </Button>
          )}
          {actions.send && (
            <Button
              variant={variantFor("send")}
              size="sm"
              disabled={busy || !invoice.pdf_path}
              title={invoice.pdf_path ? undefined : "Maak eerst de PDF opnieuw"}
              onClick={() => onSend(invoice)}
            >
              {invoice.status === "sent" ? "Opnieuw versturen" : "Versturen"}
            </Button>
          )}
          {actions.forward && (
            <Button variant={variantFor("forward")} size="sm" disabled={busy} onClick={() => onForward(invoice)}>
              Doorsturen naar Snelstart
            </Button>
          )}
          {actions.markPaid && !isCreditNote && (
            <Button variant={variantFor("markPaid")} size="sm" disabled={busy} onClick={() => onMarkPaid(invoice)}>
              Betaald
            </Button>
          )}
          {invoice.pdf_path && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => onOpenPdf(invoice)}>
              <Download className="h-4 w-4" />
              PDF
            </Button>
          )}
          {!invoice.pdf_path && invoice.invoice_number && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => onRegeneratePdf(invoice)}>
              <RefreshCw className="h-4 w-4" />
              PDF opnieuw maken
            </Button>
          )}
          <div className="ml-auto flex items-center gap-1">
            {actions.credit && !isCreditNote && (
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => onCredit(invoice)}>
                Crediteren
              </Button>
            )}
            {actions.delete && (
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => onDelete(invoice)}>
                Verwijderen
              </Button>
            )}
          </div>
        </div>

        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground">
              <ChevronDown className={`h-4 w-4 transition-transform duration-fast ${open ? "rotate-180" : ""}`} />
              Details ({invoice.lines.length} regel{invoice.lines.length === 1 ? "" : "s"})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            {/* Regels */}
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left font-medium">Regel</th>
                    <th className="p-2 text-right font-medium">Grondslag</th>
                    <th className="p-2 text-right font-medium">%</th>
                    <th className="p-2 text-right font-medium">Commissie</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line) => (
                    <tr key={line.id} className="border-t">
                      <td className="p-2">
                        <div className="text-foreground">{line.description ?? line.block_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {[line.reference_number, line.customer_label, line.event_date ? formatDate(line.event_date) : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </td>
                      <td className="p-2 text-right tabular-nums">{formatCurrency(line.invoiced_amount_excl_vat)}</td>
                      <td className="p-2 text-right tabular-nums">{line.commission_percentage}%</td>
                      <td className="p-2 text-right tabular-nums font-medium">{formatCurrency(line.commission_amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/30 text-sm">
                  <tr>
                    <td className="p-2 text-muted-foreground" colSpan={3}>
                      Excl. btw · btw {invoice.vat_rate}% {formatCurrency(invoice.vat_amount)} · incl. btw
                    </td>
                    <td className="p-2 text-right tabular-nums font-medium">
                      {formatCurrency(invoice.amount_excl_vat)} · {formatCurrency(invoice.amount_incl_vat)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Bronnen */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Bronnen</p>
                {sourcesLoading && <p className="text-sm text-muted-foreground">Laden…</p>}
                {!sourcesLoading && (sources ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {isCreditNote ? "Een creditnota heeft geen bronkoppeling." : "Geen bronnen gevonden."}
                  </p>
                )}
                {(sources ?? []).map((source) => (
                  <div key={source.key} className="text-sm">
                    {source.to ? (
                      <Link to={source.to} className="inline-flex items-center gap-1 text-primary hover:underline">
                        {source.label}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    ) : (
                      <span>{source.label}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Mails en Snelstart */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Mails en boekhouding</p>
                {invoice.status === "draft" && <p className="text-sm text-muted-foreground">Nog niets verstuurd.</p>}
                {mailsLoading && <p className="text-sm text-muted-foreground">Laden…</p>}
                {!mailsLoading && invoice.status !== "draft" && (mails ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Nog geen mail verstuurd.</p>
                )}
                {(mails ?? []).map((mail) => {
                  const outcome = mailOutcome(mail);
                  return (
                    <div key={mail.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-foreground">{MAIL_TYPE_LABELS[mail.email_type] ?? mail.email_type}</span>
                      <span className="text-muted-foreground">
                        {mail.recipient_email} · {formatDateTime(mail.sent_at)}
                      </span>
                      <Pill tone={outcome.tone}>{outcome.label}</Pill>
                    </div>
                  );
                })}
                <p className="text-sm text-muted-foreground">
                  Snelstart:{" "}
                  {invoice.forwarded_to_accounting_at
                    ? `doorgestuurd ${formatDateTime(invoice.forwarded_to_accounting_at)}`
                    : "nog niet doorgestuurd"}
                  {invoice.paid_at &&
                    ` · betaald ${formatDate(invoice.paid_at)}${invoice.bank_line_id ? " (gematcht op bankafschrift)" : ""}`}
                </p>
                {invoice.notes && <p className="text-sm text-muted-foreground">Opmerking: {invoice.notes}</p>}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
