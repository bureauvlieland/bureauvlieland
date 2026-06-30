import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Mail, Search, AlertTriangle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatNL, FMT_DAY_SHORT_YEAR_TIME } from "@/lib/dateFormat";

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
  return row.status;
}

export function PartnerNotificationsCard({ requestId, accommodationId }: PartnerNotificationsCardProps) {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [partnerFilter, setPartnerFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const orClauses = [`related_request_id.eq.${requestId}`];
      if (accommodationId) orClauses.push(`related_accommodation_id.eq.${accommodationId}`);
      const { data, error } = await supabase
        .from("email_log")
        .select(
          "id,email_type,subject,recipient_email,recipient_name,related_partner_id,related_item_id,status,error_message,created_at,sent_at,delivered_at,opened_at,bounced_at,open_count",
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
                  <div className="text-xs text-slate-500 shrink-0 sm:text-right">
                    {formatNL(new Date(r.created_at), FMT_DAY_SHORT_YEAR_TIME)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
