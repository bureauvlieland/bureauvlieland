import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Mail, Search, AlertTriangle, Eye, Send, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatNL, FMT_DAY_SHORT_YEAR_TIME } from "@/lib/dateFormat";
import { toast } from "sonner";

interface PartnerNotificationsCardProps {
  requestId: string;
  accommodationId?: string;
}


interface LogRow {
  id: string;
  email_type: string;
  subject: string;
  recipient_email: string;
  recipient_name: string | null;
  related_partner_id: string | null;
  related_item_id: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  bounced_at: string | null;
  blocked_at: string | null;
  open_count: number | null;
  metadata: Record<string, any> | null;
  mailjet_events: any[] | null;
  mailjet_message_id: string | null;
  sent_by: string | null;
}

const EMAIL_TYPE_LABEL: Record<string, string> = {
  program_request_partner: "Initiële aanvraag",
  partner_briefing_t3: "Briefing T-3",
  partner_activity_unconfirmed_t7: "Herinnering T-7",
  reminder_quote_pending: "Herinnering offerte",
  partner_missing_pdf_reminder: "Herinnering PDF",
  item_added_partner: "Onderdeel toegevoegd",
  item_changes_partner: "Wijziging onderdeel",
  date_change_partner: "Datumwijziging",
  status_confirmed: "Klant goedgekeurd",
  status_alternative: "Alternatief voorgesteld",
  counter_proposal_partner: "Tegenvoorstel",
  counter_proposal_response: "Reactie tegenvoorstel",
  booking_confirmed_partner: "Boeking bevestigd",
  cancellation_partner: "Annulering",
  partner_item_cancellation: "Annulering onderdeel",
  quote_expired_partner: "Offerte verlopen",
  accommodation_quote_request_partner: "Logies aanvraag",
  accommodation_quote_notification: "Logies notificatie",
  accommodation_quote_withdrawn: "Logies ingetrokken",
  accommodation_selected_partner: "Logies geselecteerd",
  accommodation_rejected_partner: "Logies afgewezen",
  accommodation_people_change: "Aantal personen gewijzigd",
  cancellation_accommodation_partner: "Logies annulering",
  partner_customer_message: "Bericht van klant",
  customer_accommodation_message: "Bericht aan klant",
  partner_invitation: "Partner uitnodiging",
  partner_password_reset: "Wachtwoord reset",
  partner_invoice_reminder_t1: "Inkoopfactuur herinnering",
  partner_invoice_reminder_t7: "Inkoopfactuur herinnering T+7",
  partner_invoice_registered_bureau: "Inkoopfactuur geregistreerd",
  purchase_invoice_forward: "Inkoopfactuur doorgestuurd",
  admin_project_email: "Handmatige e-mail",
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  sent: { label: "Verzonden", className: "bg-sky-100 text-sky-800 border-sky-200" },
  sent_unconfirmed: { label: "Verzonden (geen bevestiging)", className: "bg-amber-100 text-amber-800 border-amber-200" },
  delivered: { label: "Afgeleverd", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  opened: { label: "Geopend", className: "bg-violet-100 text-violet-800 border-violet-200" },
  clicked: { label: "Geklikt", className: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  pending: { label: "In wachtrij", className: "bg-amber-100 text-amber-800 border-amber-200" },
  failed: { label: "Mislukt", className: "bg-rose-100 text-rose-800 border-rose-200" },
  bounced: { label: "Bounced", className: "bg-rose-100 text-rose-800 border-rose-200" },
  blocked: { label: "Geblokkeerd", className: "bg-rose-100 text-rose-800 border-rose-200" },
  suppressed: { label: "Onderdrukt", className: "bg-slate-100 text-slate-700 border-slate-200" },
  dlq: { label: "Mislukt", className: "bg-rose-100 text-rose-800 border-rose-200" },
};

function effectiveStatus(row: LogRow): string {
  if (row.bounced_at) return "bounced";
  if (row.opened_at) return "opened";
  if (row.delivered_at) return "delivered";
  if (row.status === "sent") {
    const ts = row.sent_at || row.created_at;
    const ageMs = ts ? Date.now() - new Date(ts).getTime() : 0;
    if (!row.mailjet_message_id || (ageMs > 15 * 60 * 1000)) return "sent_unconfirmed";
  }
  return row.status;
}

export function PartnerNotificationsCard({ requestId, accommodationId }: PartnerNotificationsCardProps) {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [partnerFilter, setPartnerFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selected, setSelected] = useState<LogRow | null>(null);

  const [confirmResend, setConfirmResend] = useState<LogRow | null>(null);
  const [resending, setResending] = useState(false);

  const reload = async () => {
    const orClauses = [`related_request_id.eq.${requestId}`];
    if (accommodationId) orClauses.push(`related_accommodation_id.eq.${accommodationId}`);
    const { data, error } = await supabase
      .from("email_log")
      .select(
        "id,email_type,subject,recipient_email,recipient_name,related_partner_id,related_item_id,status,error_message,created_at,sent_at,delivered_at,opened_at,bounced_at,blocked_at,open_count,metadata,mailjet_events,mailjet_message_id,sent_by",
      )
      .or(orClauses.join(","))
      .not("related_partner_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(500);
    if (!error && data) setRows(data as LogRow[]);
  };

  const handleResend = async (row: LogRow) => {
    setResending(true);
    try {
      const { error } = await supabase.functions.invoke("resend-email", {
        body: { email_log_id: row.id, recipient_email: row.recipient_email },
      });
      if (error) throw error;
      toast.success(`E-mail opnieuw verstuurd naar ${row.recipient_email}`);
      setConfirmResend(null);
      setSelected(null);
      await reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Onbekende fout";
      toast.error(`Opnieuw versturen mislukt: ${msg}`);
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const orClauses = [`related_request_id.eq.${requestId}`];
      if (accommodationId) orClauses.push(`related_accommodation_id.eq.${accommodationId}`);
      const { data, error } = await supabase
        .from("email_log")
        .select(
          "id,email_type,subject,recipient_email,recipient_name,related_partner_id,related_item_id,status,error_message,created_at,sent_at,delivered_at,opened_at,bounced_at,blocked_at,open_count,metadata,mailjet_events,mailjet_message_id,sent_by",
        )
        .or(orClauses.join(","))
        .not("related_partner_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(500);
      if (!active) return;
      if (!error && data) setRows(data as LogRow[]);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [requestId, accommodationId]);

  const partnerOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      if (r.related_partner_id) {
        map.set(r.related_partner_id, r.recipient_name || r.related_partner_id);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const typeOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.email_type));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (partnerFilter !== "all" && r.related_partner_id !== partnerFilter) return false;
      if (typeFilter !== "all" && r.email_type !== typeFilter) return false;
      if (!q) return true;
      return (
        r.subject?.toLowerCase().includes(q) ||
        r.recipient_email?.toLowerCase().includes(q) ||
        r.recipient_name?.toLowerCase().includes(q) ||
        r.email_type?.toLowerCase().includes(q)
      );
    });
  }, [rows, search, partnerFilter, typeFilter]);

  const failedCount = useMemo(
    () => rows.filter((r) => ["failed", "bounced", "blocked", "dlq"].includes(effectiveStatus(r))).length,
    [rows],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificaties naar partners
          <Badge variant="outline" className="ml-2">{rows.length}</Badge>
          {failedCount > 0 && (
            <Badge className="bg-rose-100 text-rose-800 border-rose-200 gap-1">
              <AlertTriangle className="h-3 w-3" /> {failedCount} mislukt
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Overzicht van automatische en handmatige e-mails die naar partners zijn verstuurd voor dit project.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Zoek op partner, onderwerp of e-mail…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={partnerFilter} onValueChange={setPartnerFilter}>
            <SelectTrigger className="sm:w-56"><SelectValue placeholder="Partner" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle partners</SelectItem>
              {partnerOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="sm:w-56"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle types</SelectItem>
              {typeOptions.map((t) => (
                <SelectItem key={t} value={t}>{EMAIL_TYPE_LABEL[t] || t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Geen partner-notificaties gevonden voor dit project.</p>
          </div>
        ) : (
          <ul className="divide-y border rounded-md">
            {filtered.map((r) => {
              const status = effectiveStatus(r);
              const badge = STATUS_BADGE[status] || { label: status, className: "bg-slate-100 text-slate-700 border-slate-200" };
              return (
                <li key={r.id} className="p-3 flex flex-col sm:flex-row gap-2 sm:items-start sm:justify-between hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{r.recipient_name || r.related_partner_id}</span>
                      <Badge variant="outline" className="text-xs">
                        {EMAIL_TYPE_LABEL[r.email_type] || r.email_type}
                      </Badge>
                      <Badge className={`text-xs ${badge.className}`}>{badge.label}</Badge>
                      {(r.open_count ?? 0) > 0 && (
                        <span className="text-xs text-slate-500">{r.open_count}× geopend</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 mt-1 truncate">{r.subject}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{r.recipient_email}</p>
                    {r.error_message && (
                      <p className="text-xs text-rose-600 mt-1">{r.error_message}</p>
                    )}
                  </div>
                  <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0">
                    <div className="text-xs text-slate-500 sm:text-right">
                      {formatNL(new Date(r.created_at), FMT_DAY_SHORT_YEAR_TIME)}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setSelected(r)} className="gap-1">
                        <Eye className="h-3.5 w-3.5" /> Bekijk
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmResend(r)}
                        className="gap-1"
                        title="Opnieuw versturen"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Opnieuw
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <Mail className="h-4 w-4" />
              {selected ? EMAIL_TYPE_LABEL[selected.email_type] || selected.email_type : ""}
              {selected && (
                <Badge className={`text-xs ${(STATUS_BADGE[effectiveStatus(selected)] || { className: "bg-slate-100 text-slate-700" }).className}`}>
                  {(STATUS_BADGE[effectiveStatus(selected)] || { label: effectiveStatus(selected) }).label}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selected && formatNL(new Date(selected.created_at), FMT_DAY_SHORT_YEAR_TIME)}
              {selected?.sent_by && ` · door ${selected.sent_by}`}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5">
                  <span className="text-slate-500">Aan</span>
                  <span>{selected.recipient_name ? `${selected.recipient_name} <${selected.recipient_email}>` : selected.recipient_email}</span>
                  <span className="text-slate-500">Onderwerp</span>
                  <span className="font-medium">{selected.subject}</span>
                  <span className="text-slate-500">Type</span>
                  <span className="font-mono text-xs">{selected.email_type}</span>
                  {selected.mailjet_message_id && (
                    <>
                      <span className="text-slate-500">Mailjet ID</span>
                      <span className="font-mono text-xs">{selected.mailjet_message_id}</span>
                    </>
                  )}
                </div>

                {/* Timeline */}
                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-500 mb-1.5">Status verloop</h4>
                  <ul className="text-xs space-y-1">
                    {[
                      ["Aangemaakt", selected.created_at],
                      ["Verzonden", selected.sent_at],
                      ["Afgeleverd", selected.delivered_at],
                      ["Geopend", selected.opened_at],
                      ["Bounced", selected.bounced_at],
                      ["Geblokkeerd", selected.blocked_at],
                    ]
                      .filter(([, v]) => !!v)
                      .map(([label, v]) => (
                        <li key={label as string} className="flex justify-between">
                          <span className="text-slate-600">{label}</span>
                          <span className="text-slate-500">{formatNL(new Date(v as string), FMT_DAY_SHORT_YEAR_TIME)}</span>
                        </li>
                      ))}
                  </ul>
                </div>

                {selected.error_message && (
                  <div className="border border-rose-200 bg-rose-50 rounded-md p-3">
                    <h4 className="text-xs font-semibold uppercase text-rose-700 mb-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Foutmelding
                    </h4>
                    <p className="text-sm text-rose-800 whitespace-pre-wrap break-words">{selected.error_message}</p>
                  </div>
                )}

                {(selected.metadata?.body_preview || selected.metadata?.message_preview) && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-500 mb-1.5">Inhoud (preview)</h4>
                    <div className="bg-slate-50 border rounded-md p-3 whitespace-pre-wrap text-sm text-slate-800">
                      {selected.metadata?.body_preview || selected.metadata?.message_preview}
                    </div>
                  </div>
                )}

                <div className="rounded-md border bg-amber-50 border-amber-200 p-2 text-xs text-amber-900">
                  De volledige verzonden HTML-body wordt op dit moment niet bewaard in het log. Hieronder zie je alle context die wel is vastgelegd (template, ontvanger, status en metadata).
                </div>

                {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-500 mb-1.5">Metadata</h4>
                    <pre className="text-xs bg-slate-900 text-slate-100 rounded-md p-3 overflow-auto max-h-72">
{JSON.stringify(selected.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {Array.isArray(selected.mailjet_events) && selected.mailjet_events.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-500 mb-1.5">Mailjet events</h4>
                    <pre className="text-xs bg-slate-900 text-slate-100 rounded-md p-3 overflow-auto max-h-72">
{JSON.stringify(selected.mailjet_events, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          {selected && (
            <DialogFooter className="border-t pt-3">
              <Button
                variant="outline"
                onClick={() => setConfirmResend(selected)}
                className="gap-1"
              >
                <RefreshCw className="h-4 w-4" /> Opnieuw versturen
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmResend} onOpenChange={(o) => !o && !resending && setConfirmResend(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>E-mail opnieuw versturen?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  De partner ontvangt deze e-mail opnieuw. Er wordt een nieuwe regel in
                  het notificatielog vastgelegd met verwijzing naar de originele verzending.
                </p>
                {confirmResend && (
                  <div className="rounded-md border bg-slate-50 p-2 text-xs space-y-0.5">
                    <div><span className="text-slate-500">Aan: </span>{confirmResend.recipient_name ? `${confirmResend.recipient_name} <${confirmResend.recipient_email}>` : confirmResend.recipient_email}</div>
                    <div><span className="text-slate-500">Onderwerp: </span>{confirmResend.subject}</div>
                    <div><span className="text-slate-500">Type: </span>{EMAIL_TYPE_LABEL[confirmResend.email_type] || confirmResend.email_type}</div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resending}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              disabled={resending}
              onClick={(e) => {
                e.preventDefault();
                if (confirmResend) handleResend(confirmResend);
              }}
              className="gap-1"
            >
              <Send className="h-4 w-4" />
              {resending ? "Versturen…" : "Verstuur opnieuw"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
