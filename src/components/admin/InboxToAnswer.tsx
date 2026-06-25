import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Inbox,
  Reply,
  ExternalLink,
  CheckCircle2,
  Undo2,
  ChevronDown,
  ChevronRight,
  Mail,
  MessageSquare,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SendProjectEmailSheet } from "@/components/admin/SendProjectEmailSheet";
import { useAdminInbox, type InboxChatMessage, type InboxLiveChat } from "@/hooks/useAdminInbox";

interface InboundEmail {
  id: string;
  subject: string | null;
  content: string;
  contact_name: string | null;
  contact_email: string | null;
  communication_date: string;
  request_id: string | null;
  accommodation_id: string | null;
  answered_at: string | null;
  project_label: string | null;
}

async function fetchInboundEmails(): Promise<InboundEmail[]> {
  const { data, error } = await supabase
    .from("project_communications")
    .select(
      `id, subject, content, contact_name, contact_email, communication_date,
       request_id, accommodation_id, answered_at,
       request:program_requests(reference_number, customer_name),
       accommodation:accommodation_requests(reference_number, customer_name)`,
    )
    .eq("direction", "inbound")
    .order("communication_date", { ascending: false })
    .limit(200);

  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const proj = row.request ?? row.accommodation;
    const label = proj
      ? [proj.reference_number, proj.customer_name].filter(Boolean).join(" · ")
      : null;
    return {
      id: row.id,
      subject: row.subject,
      content: row.content ?? "",
      contact_name: row.contact_name,
      contact_email: row.contact_email,
      communication_date: row.communication_date,
      request_id: row.request_id,
      accommodation_id: row.accommodation_id,
      answered_at: row.answered_at,
      project_label: label,
    };
  });
}

function buildReplySubject(subject: string | null): string {
  const s = (subject ?? "").trim();
  if (!s) return "Re: uw bericht aan Bureau Vlieland";
  return /^re:/i.test(s) ? s : `Re: ${s}`;
}

function buildQuotedBody(email: InboundEmail): string {
  const date = format(new Date(email.communication_date), "d MMMM yyyy 'om' HH:mm", { locale: nl });
  const sender = email.contact_name || email.contact_email || "de afzender";
  const quoted = email.content
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n");
  return `\n\n\n------------------------------\nOp ${date} schreef ${sender}:\n\n${quoted}`;
}

interface InboxToAnswerProps {
  /** Open & highlight this message (vanuit de inbox-bel) */
  initialOpenId?: string | null;
}

export function InboxToAnswer({ initialOpenId }: InboxToAnswerProps) {
  const queryClient = useQueryClient();
  const [showAnswered, setShowAnswered] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(initialOpenId ?? null);
  const [replyEmail, setReplyEmail] = useState<InboundEmail | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const scrolledRef = useRef(false);

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["inbox-to-answer"],
    queryFn: fetchInboundEmails,
    refetchInterval: 60_000,
  });

  // Realtime updates
  useEffect(() => {
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-to-answer"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-unanswered-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-inbox"] });
    };
    const ch = supabase
      .channel("inbox-to-answer")
      .on("postgres_changes", { event: "*", schema: "public", table: "project_communications" }, invalidate)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [queryClient]);

  // If the highlighted message is already answered, show answered items so it's visible
  useEffect(() => {
    if (!initialOpenId || emails.length === 0) return;
    const target = emails.find((e) => e.id === initialOpenId);
    if (target?.answered_at) setShowAnswered(true);
  }, [initialOpenId, emails]);

  // Scroll the highlighted message into view once
  useEffect(() => {
    if (!initialOpenId || scrolledRef.current || emails.length === 0) return;
    const el = document.getElementById(`inbox-email-${initialOpenId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      scrolledRef.current = true;
    }
  }, [initialOpenId, emails]);

  const markAnswered = useMutation({
    mutationFn: async ({ id, answered }: { id: string; answered: boolean }) => {
      let userId: string | null = null;
      if (answered) {
        const { data: auth } = await supabase.auth.getUser();
        userId = auth.user?.id ?? null;
      }
      const { error } = await supabase
        .from("project_communications")
        .update({
          answered_at: answered ? new Date().toISOString() : null,
          answered_by: answered ? userId : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["inbox-to-answer"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-unanswered-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-inbox"] });
      toast.success(vars.answered ? "Gemarkeerd als beantwoord" : "Markering ongedaan gemaakt");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Markeren mislukt");
    },
  });

  const visible = emails.filter((e) => (showAnswered ? true : !e.answered_at));
  const unansweredCount = emails.filter((e) => !e.answered_at).length;

  const openReply = (email: InboundEmail) => {
    setReplyEmail(email);
    setReplyOpen(true);
  };

  const projectHref = (e: InboundEmail) =>
    e.request_id
      ? `/admin/projecten/${e.request_id}?tab=communicatie`
      : e.accommodation_id
        ? `/admin/projecten/${e.accommodation_id}?tab=communicatie`
        : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Inbox className="h-4 w-4" />
          <span>
            {unansweredCount === 0
              ? "Alles beantwoord 🎉"
              : `${unansweredCount} ${unansweredCount === 1 ? "e-mail wacht" : "e-mails wachten"} op antwoord`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="show-answered" checked={showAnswered} onCheckedChange={setShowAnswered} />
          <Label htmlFor="show-answered" className="text-sm text-slate-600 cursor-pointer">
            Toon beantwoord
          </Label>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-slate-500">
            <Mail className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p className="font-medium">Geen e-mails te beantwoorden</p>
            <p className="text-sm mt-1">Nieuwe inkomende e-mails verschijnen hier automatisch.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visible.map((email) => {
            const isExpanded = expandedId === email.id;
            const isHighlighted = initialOpenId === email.id;
            const href = projectHref(email);
            const answered = !!email.answered_at;

            return (
              <Card
                key={email.id}
                id={`inbox-email-${email.id}`}
                className={cn(
                  "transition-colors",
                  isHighlighted && "ring-2 ring-blue-400",
                  answered && "opacity-70",
                )}
              >
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : email.id)}
                    className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 mt-1 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mt-1 text-slate-400 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-medium text-slate-900 truncate">
                          {email.subject || "(geen onderwerp)"}
                        </p>
                        <span className="text-xs text-slate-400 shrink-0" title={format(new Date(email.communication_date), "d MMM yyyy HH:mm", { locale: nl })}>
                          {formatDistanceToNow(new Date(email.communication_date), { addSuffix: true, locale: nl })}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="text-sm text-slate-600">
                          {email.contact_name || email.contact_email || "Onbekende afzender"}
                        </span>
                        {email.project_label && (
                          <Badge variant="outline" className="text-[11px] font-normal">
                            {email.project_label}
                          </Badge>
                        )}
                        {answered && (
                          <Badge className="bg-green-100 text-green-800 text-[11px]" variant="secondary">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Beantwoord {email.answered_at && format(new Date(email.answered_at), "d MMM HH:mm", { locale: nl })}
                          </Badge>
                        )}
                      </div>
                      {!isExpanded && (
                        <p className="text-sm text-slate-500 line-clamp-2 mt-1">
                          {email.content.replace(/\s+/g, " ").trim()}
                        </p>
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pl-11 space-y-4">
                      <div className="rounded-lg border bg-slate-50/60 p-4">
                        <p className="text-sm text-slate-800 whitespace-pre-wrap break-words">
                          {email.content.trim()}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" onClick={() => openReply(email)}>
                          <Reply className="h-4 w-4 mr-2" />
                          Beantwoorden
                        </Button>
                        {href && (
                          <Button size="sm" variant="outline" asChild>
                            <Link to={href}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Naar project
                            </Link>
                          </Button>
                        )}
                        {answered ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={markAnswered.isPending}
                            onClick={() => markAnswered.mutate({ id: email.id, answered: false })}
                          >
                            <Undo2 className="h-4 w-4 mr-2" />
                            Toch niet beantwoord
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={markAnswered.isPending}
                            onClick={() => markAnswered.mutate({ id: email.id, answered: true })}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Markeer als beantwoord
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {replyEmail && (
        <SendProjectEmailSheet
          open={replyOpen}
          onOpenChange={(open) => {
            setReplyOpen(open);
            if (!open) setReplyEmail(null);
          }}
          requestId={replyEmail.request_id ?? undefined}
          accommodationId={replyEmail.accommodation_id ?? undefined}
          recipients={
            replyEmail.contact_email
              ? [
                  {
                    label: replyEmail.contact_name || replyEmail.contact_email,
                    email: replyEmail.contact_email,
                    name: replyEmail.contact_name || "",
                    type: "customer",
                  },
                ]
              : []
          }
          defaultSelectedEmails={replyEmail.contact_email ? [replyEmail.contact_email] : []}
          defaultSubject={buildReplySubject(replyEmail.subject)}
          defaultBody={buildQuotedBody(replyEmail)}
          onEmailSent={() => {
            markAnswered.mutate({ id: replyEmail.id, answered: true });
            setReplyOpen(false);
            setReplyEmail(null);
          }}
        />
      )}
    </div>
  );
}
