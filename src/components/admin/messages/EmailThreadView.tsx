import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isSameDay } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  BedDouble,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Inbox,
  Keyboard,
  Mail,
  MoreVertical,
  Reply,
  RotateCcw,
  User,
} from "lucide-react";
import { Pill } from "@/components/system";
import { EmailAttachments } from "@/components/admin/EmailAttachments";
import { EmailLogDetailDialog } from "@/components/admin/EmailLogDetailDialog";
import { SendProjectEmailSheet } from "@/components/admin/SendProjectEmailSheet";
import type { ProjectCommunication } from "@/types/projectCommunication";
import { emailTypeLabel, emailStatusLabel } from "@/lib/emailTypeLabels";
import { buildTimeline, bundleSummary, focusItemId, senderRole } from "@/lib/emailThreadTimeline";
import { stripSourcePrefix } from "@/lib/emailThreadArchive";
import {
  ORIGIN_LABEL,
  ORIGIN_TONE,
  statusTone,
  stripHtml,
  type EmailItem,
  type ThreadGroup,
} from "@/lib/emailThreads";
import { DERIVED_STATUS_LABEL, DERIVED_STATUS_PILL_TONE, isPastDate } from "@/lib/projectStatus";

export interface EmailThreadViewProps {
  group: ThreadGroup;
  /** ook gearchiveerde berichten tonen (weergave Archief) */
  showArchivedItems: boolean;
  onBack: () => void;
  onSetAnswered: (item: EmailItem, answered: boolean) => void;
  onSetThreadAnswered: (group: ThreadGroup, answered: boolean) => void;
  onArchiveItem: (item: EmailItem, archived: boolean) => void;
  onArchiveThread: (group: ThreadGroup, archived: boolean) => void;
  onArchiveDossier: (group: ThreadGroup, archived: boolean) => void;
  /** de composer; de pagina stuurt hem ook aan met de sneltoets r */
  replyOpen: boolean;
  onReplyOpenChange: (open: boolean) => void;
  onShowShortcuts: () => void;
}

/**
 * Eén e-mailgesprek: kop in de stijl van PortalHead, de tijdlijn met
 * berichten (kaarten) en systeemmail (regels, gebundeld), en onderaan één
 * primaire knop. Gehaald uit EmailPanel in fase 2.
 */
export function EmailThreadView({
  group,
  showArchivedItems,
  onBack,
  onSetAnswered,
  onSetThreadAnswered,
  onArchiveItem,
  onArchiveThread,
  onArchiveDossier,
  replyOpen,
  onReplyOpenChange,
  onShowShortcuts,
}: EmailThreadViewProps) {
  const navigate = useNavigate();
  const [detailComm, setDetailComm] = useState<ProjectCommunication | null>(null);
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(() => new Set());
  const threadScrollRef = useRef<HTMLDivElement>(null);

  const visibleItems = useMemo(
    () => (showArchivedItems || group.threadArchived ? group.items : group.items.filter((e) => !e.archived_at)),
    [group, showArchivedItems],
  );

  // Open op het eerste onbeantwoorde bericht; anders op het laatste bericht
  // van een mens; anders onderaan.
  useEffect(() => {
    const id = focusItemId(visibleItems);
    const frame = requestAnimationFrame(() => {
      const el = id ? document.getElementById(`email-msg-${id}`) : null;
      const box = threadScrollRef.current;
      if (el && box) {
        box.scrollTop = Math.max(0, el.offsetTop - box.offsetTop - 12);
      } else if (box) {
        box.scrollTop = box.scrollHeight;
      }
    });
    return () => cancelAnimationFrame(frame);
    // Alleen bij het wisselen van gesprek, niet bij elke refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.key]);

  /** Opent de volledige inhoud van een automatisch verzonden mail. */
  const openLogDetail = async (item: EmailItem) => {
    if (item.source !== "email_log") return;
    const { data, error } = await supabase
      .from("email_log")
      .select(
        "id, email_type, subject, recipient_email, recipient_name, html_body, text_body, from_email, reply_to, status, sent_at, created_at, related_request_id, related_accommodation_id",
      )
      .eq("id", stripSourcePrefix(item.id))
      .maybeSingle();
    if (error || !data) {
      toast.error("Kon de e-mail niet laden");
      return;
    }
    setDetailComm({
      id: `log-${data.id}`,
      email_log_id: data.id,
      request_id: data.related_request_id,
      accommodation_id: data.related_accommodation_id,
      communication_type: "email_out",
      direction: "outbound",
      subject: data.subject,
      content: data.text_body ?? "",
      html_body: data.html_body,
      text_body: data.text_body,
      from_email: data.from_email,
      reply_to: data.reply_to,
      contact_name: data.recipient_name,
      contact_email: data.recipient_email,
      logged_by: null,
      logged_at: data.created_at,
      communication_date: data.sent_at ?? data.created_at,
      metadata: { status: item.status ?? data.status },
      created_at: data.created_at,
      updated_at: data.created_at,
      source: "email_log",
      email_type: data.email_type,
    });
  };

  const toggleBundle = (key: string) =>
    setExpandedBundles((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Composer: antwoord aan de laatste inkomende afzender, met Re:-onderwerp.
  const lastInbound = [...group.items].reverse().find((e) => e.origin === "inbound") ?? null;
  const replySubject = lastInbound?.subject ?? group.items[group.items.length - 1]?.subject ?? null;
  const recipients = lastInbound?.contact_email
    ? [
        {
          label: lastInbound.contact_name || lastInbound.contact_email,
          email: lastInbound.contact_email,
          name: lastInbound.contact_name || lastInbound.contact_email,
          type: "customer" as const,
        },
      ]
    : [];

  const first = group.items[0];
  const reference = first?.request_ref ?? first?.accommodation_ref ?? null;
  const customer = first?.request_customer ?? first?.accommodation_customer ?? group.contactName ?? group.contactEmail ?? "Onbekend";
  const dossierHref =
    group.kind === "program" && group.id
      ? `/admin/aanvragen/${group.id}`
      : group.kind === "accommodation" && group.id
        ? `/admin/logies/${group.id}`
        : null;
  const archived = group.threadArchived || group.projectArchived;

  return (
    <div className="flex-1 min-h-0 flex flex-col min-w-0 bg-muted/30">
      <div className="px-4 py-3 bg-card border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 flex-shrink-0" onClick={onBack} aria-label="Terug naar de lijst">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <p className="text-eyebrow font-medium uppercase text-primary flex items-center gap-1.5 min-w-0">
                {group.kind === "accommodation" ? <BedDouble className="h-3.5 w-3.5 flex-shrink-0" /> : group.kind === "program" ? <FileText className="h-3.5 w-3.5 flex-shrink-0" /> : <Mail className="h-3.5 w-3.5 flex-shrink-0" />}
                <span className="truncate">{reference ?? (group.kind === "contact" ? "Zonder dossier" : "Dossier")}</span>
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="min-w-0 truncate font-display text-lg font-medium text-foreground">{customer}</h2>
                {group.projectStatus && (
                  <Pill tone={DERIVED_STATUS_PILL_TONE[group.projectStatus]} size="md">
                    {DERIVED_STATUS_LABEL[group.projectStatus]}
                  </Pill>
                )}
              </div>
              <ul className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <li>{visibleItems.length} {visibleItems.length === 1 ? "bericht" : "berichten"}</li>
                {group.projectDate && (
                  <li className={cn("inline-flex items-center gap-1", isPastDate(new Date(group.projectDate)) && "text-destructive-ink font-medium")}>
                    <CalendarDays className="h-3.5 w-3.5" />
                    {format(new Date(group.projectDate), "d MMM yyyy", { locale: nl })}
                  </li>
                )}
                {group.unread > 0 && <li><Pill tone="warning">{group.unread} onbeantwoord</Pill></li>}
                {group.threadArchived && <li><Pill tone="neutral">gearchiveerd gesprek</Pill></li>}
                {group.projectArchived && <li><Pill tone="neutral">gearchiveerd dossier</Pill></li>}
              </ul>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {dossierHref && (
              <Button variant="outline" size="sm" onClick={() => navigate(dossierHref)} aria-label="Naar het dossier">
                <ExternalLink className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Dossier</span>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Meer acties">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onClick={() => onSetThreadAnswered(group, true)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Gesprek afgehandeld
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSetThreadAnswered(group, false)}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Weer open zetten
                </DropdownMenuItem>
                {group.threadArchived ? (
                  <DropdownMenuItem onClick={() => onArchiveThread(group, false)}>
                    <ArchiveRestore className="h-4 w-4 mr-2" /> Gesprek uit archief
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onArchiveThread(group, true)}>
                    <Archive className="h-4 w-4 mr-2" /> Gesprek archiveren
                  </DropdownMenuItem>
                )}
                {group.kind !== "contact" && group.id && (
                  group.projectArchived ? (
                    <DropdownMenuItem onClick={() => onArchiveDossier(group, false)}>
                      <ArchiveRestore className="h-4 w-4 mr-2" /> Dossier terughalen uit archief
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem className="text-warning-ink" onClick={() => onArchiveDossier(group, true)}>
                      <Archive className="h-4 w-4 mr-2" /> Ook het hele dossier archiveren
                    </DropdownMenuItem>
                  )
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onShowShortcuts}>
                  <Keyboard className="h-4 w-4 mr-2" /> Sneltoetsen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

            <div ref={threadScrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              {buildTimeline(visibleItems).map((entry, idx, all) => {
                const entryDate = entry.kind === "bundle" ? entry.date : entry.item.date;
                const prevEntry = idx > 0 ? all[idx - 1] : null;
                const prevDate = prevEntry ? (prevEntry.kind === "bundle" ? prevEntry.date : prevEntry.item.date) : null;
                const showDate = !prevDate || !isSameDay(new Date(entryDate), new Date(prevDate));
                const dateRow = showDate ? (
                  <div className="flex items-center gap-3 my-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(entryDate), "EEEE d MMMM yyyy", { locale: nl })}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                ) : null;

                if (entry.kind === "bundle") {
                  const open = expandedBundles.has(entry.key);
                  const lastId = entry.items[entry.items.length - 1].id;
                  return (
                    <div key={entry.key} id={`email-msg-${lastId}`}>
                      {dateRow}
                      <button
                        type="button"
                        onClick={() => toggleBundle(entry.key)}
                        className="w-full flex items-center gap-2 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-muted/60 text-left"
                        aria-expanded={open}
                      >
                        {open ? (
                          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                        )}
                        <span className="tabular-nums flex-shrink-0">
                          {format(new Date(entry.date), "HH:mm", { locale: nl })}
                        </span>
                        <span className="text-foreground font-medium flex-shrink-0">
                          {emailTypeLabel(entry.emailType)}
                        </span>
                        <span className="truncate">{bundleSummary(entry.items)}</span>
                      </button>
                      {open && (
                        <div className="ml-4 pl-2 border-l space-y-0.5 mt-0.5">
                          {entry.items.map((it) => (
                            <AutomaticMailRow key={it.id} item={it} onOpen={() => openLogDetail(it)} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                if (entry.kind === "event") {
                  return (
                    <div key={entry.item.id} id={`email-msg-${entry.item.id}`}>
                      {dateRow}
                      <AutomaticMailRow item={entry.item} onOpen={() => openLogDetail(entry.item)} />
                    </div>
                  );
                }

                const email = entry.item;
                const isInbound = email.origin === "inbound";
                const OriginIcon = isInbound ? Inbox : User;
                const role = isInbound
                  ? senderRole(email.contact_email, group.customerEmail, group.partnerEmails)
                  : null;
                const unanswered = isInbound && email.source === "communication" && !email.answered_at && !email.archived_at;
                return (
                  <div key={email.id} id={`email-msg-${email.id}`}>
                    {dateRow}
                    <div
                      className={cn(
                        "rounded-lg border p-3 bg-card shadow-soft border-l-4",
                        isInbound ? "border-l-primary" : "border-l-success",
                        unanswered && "ring-1 ring-warning/40",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <Pill tone={ORIGIN_TONE[email.origin]}>
                              <OriginIcon className="h-3 w-3 mr-1" />
                              {ORIGIN_LABEL[email.origin]}
                            </Pill>
                            <p className="text-xs text-muted-foreground truncate">
                              {isInbound ? "van " : "naar "}
                              {email.contact_name || email.contact_email || "Onbekend"}
                              {role ? ` (${role})` : ""}
                            </p>
                            {unanswered && <Pill tone="warning">onbeantwoord</Pill>}
                          </div>
                          <p className="text-sm font-semibold truncate">{email.subject || "(geen onderwerp)"}</p>
                        </div>
                        <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {format(new Date(email.date), "d MMM HH:mm", { locale: nl })}
                        </div>
                      </div>
                      <div className="text-sm whitespace-pre-wrap text-foreground/90 max-h-96 overflow-y-auto">
                        {stripHtml(email.content)}
                      </div>
                      {email.source === "communication" && <EmailAttachments metadata={email.metadata} />}
                      <div className="flex items-center gap-1 mt-2">
                        {unanswered && (
                          <Button variant="ghost" size="sm" onClick={() => onSetAnswered(email, true)}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Markeer als beantwoord
                          </Button>
                        )}
                        {email.source === "communication" && (
                          email.archived_at ? (
                            <Button variant="ghost" size="sm" onClick={() => onArchiveItem(email, false)}>
                              <ArchiveRestore className="h-3.5 w-3.5 mr-1" /> Uit archief
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => onArchiveItem(email, true)}>
                              <Archive className="h-3.5 w-3.5 mr-1" /> Archiveer bericht
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

      <div className="border-t bg-card px-3 py-2 flex flex-wrap items-center gap-2">
        <Button onClick={() => onReplyOpenChange(true)}>
          <Reply className="h-4 w-4 mr-1" /> Beantwoorden
        </Button>
        {group.unread > 0 && (
          <Button variant="ghost" onClick={() => onSetThreadAnswered(group, true)}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Afgehandeld
          </Button>
        )}
        {archived ? (
          <Button variant="ghost" onClick={() => onArchiveThread(group, false)}>
            <ArchiveRestore className="h-4 w-4 mr-1" /> Uit archief
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => onArchiveThread(group, true)}>
            <Archive className="h-4 w-4 mr-1" /> Archiveer
          </Button>
        )}
        <span className="ml-auto hidden md:inline text-[11px] text-muted-foreground">
          <kbd className="px-1 rounded border bg-muted font-mono">r</kbd> beantwoorden ·{" "}
          <kbd className="px-1 rounded border bg-muted font-mono">m</kbd> afgehandeld ·{" "}
          <kbd className="px-1 rounded border bg-muted font-mono">e</kbd> archiveren
        </span>
      </div>

      <SendProjectEmailSheet
        open={replyOpen}
        onOpenChange={onReplyOpenChange}
        requestId={group.kind === "program" ? group.id ?? undefined : undefined}
        accommodationId={group.kind === "accommodation" ? group.id ?? undefined : undefined}
        recipients={recipients}
        defaultSelectedEmails={lastInbound?.contact_email ? [lastInbound.contact_email] : undefined}
        defaultSubject={replySubject ? (replySubject.toLowerCase().startsWith("re:") ? replySubject : `Re: ${replySubject}`) : undefined}
        onEmailSent={() => {
          // Een verstuurd antwoord handelt het gesprek af.
          onSetThreadAnswered(group, true);
        }}
      />

      <EmailLogDetailDialog
        open={!!detailComm}
        onOpenChange={(o) => {
          if (!o) setDetailComm(null);
        }}
        communication={detailComm}
      />
    </div>
  );
}

function AutomaticMailRow({ item, onOpen }: { item: EmailItem; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Open de verstuurde mail"
      className="w-full flex items-center gap-2 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-muted/60 text-left"
    >
      <Bot className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
      <span className="tabular-nums flex-shrink-0">{format(new Date(item.date), "HH:mm", { locale: nl })}</span>
      <span className="text-foreground flex-shrink-0">{emailTypeLabel(item.email_type)}</span>
      <span className="truncate">
        naar {item.contact_name || item.contact_email || "onbekend"}
        {item.item_label ? ` · ${item.item_label}` : ""}
      </span>
      {item.status && (
        <Pill tone={statusTone(item.status)} className="ml-auto flex-shrink-0">
          {emailStatusLabel(item.status)}
        </Pill>
      )}
    </button>
  );
}
