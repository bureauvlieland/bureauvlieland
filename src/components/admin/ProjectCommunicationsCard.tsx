import { useMemo, useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  Mail,
  Send,
  Phone,
  FileText,
  MessageSquare,
  Trash2,
  ChevronDown,
  ChevronUp,
  Zap,
  Sparkles,
  Reply,
  MessagesSquare,
  Users,
  User,
} from "lucide-react";
import { useProjectCommunications } from "@/hooks/useProjectCommunications";
import { AddCommunicationSheet } from "./AddCommunicationSheet";
import { SendProjectEmailSheet } from "./SendProjectEmailSheet";
import { ProjectChatSheet } from "./ProjectChatSheet";
import {
  COMMUNICATION_TYPE_CONFIG,
  EMAIL_TYPE_LABELS,
  type CommunicationType,
} from "@/types/projectCommunication";
import { cn } from "@/lib/utils";

interface PartnerRecipient {
  name: string;
  email: string;
  partnerId: string;
}

interface ProjectCommunicationsCardProps {
  requestId?: string;
  accommodationId?: string;
  customerName?: string;
  customerEmail?: string;
  partnerRecipients?: PartnerRecipient[];
  onOpenStatusEmail?: () => void;
  highlightStatusEmail?: boolean;
}

const ALL_THREADS = "__all__";

export function ProjectCommunicationsCard({
  requestId,
  accommodationId,
  customerName,
  customerEmail,
  partnerRecipients = [],
  onOpenStatusEmail,
  highlightStatusEmail = false,
}: ProjectCommunicationsCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [emailSheetOpen, setEmailSheetOpen] = useState(false);
  const [chatSheetOpen, setChatSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeThread, setActiveThread] = useState<string>(ALL_THREADS);

  // Composer presets
  const [composerDefaults, setComposerDefaults] = useState<{
    subject?: string;
    body?: string;
    selectedEmails?: string[];
  }>({});

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const {
    communications,
    isLoading,
    deleteCommunication,
    isDeleting,
  } = useProjectCommunications({ requestId, accommodationId });

  // Build full recipient list (klant + alle partners)
  const allRecipients = useMemo(() => {
    const list = [
      ...(customerEmail
        ? [{
            label: `Klant${customerName ? ` — ${customerName}` : ""}`,
            email: customerEmail,
            name: customerName || "",
            type: "customer" as const,
          }]
        : []),
      ...partnerRecipients.map((p) => ({
        label: `Partner — ${p.name}`,
        email: p.email,
        name: p.name,
        type: "partner" as const,
        partnerId: p.partnerId,
      })),
    ];
    return list;
  }, [customerEmail, customerName, partnerRecipients]);

  // Build unique thread chips from communication contact_email values
  const threads = useMemo(() => {
    const map = new Map<string, { email: string; label: string; count: number }>();
    communications.forEach((c) => {
      const email = (c.contact_email || "").toLowerCase().trim();
      if (!email) return;
      const existing = map.get(email);
      if (existing) {
        existing.count++;
      } else {
        // Try to find a friendly label
        const recipient = allRecipients.find((r) => r.email.toLowerCase() === email);
        const label = recipient?.label || c.contact_name || email;
        map.set(email, { email, label, count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [communications, allRecipients]);

  const filteredCommunications = useMemo(() => {
    if (activeThread === ALL_THREADS) return communications;
    return communications.filter(
      (c) => (c.contact_email || "").toLowerCase().trim() === activeThread
    );
  }, [communications, activeThread]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCommunication(deleteId);
      toast.success("Communicatie verwijderd");
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting communication:", error);
      toast.error("Fout bij verwijderen");
    }
  };

  const getIcon = (type: CommunicationType) => {
    switch (type) {
      case "email_in":
        return <Mail className="h-4 w-4" />;
      case "email_out":
        return <Send className="h-4 w-4" />;
      case "phone":
        return <Phone className="h-4 w-4" />;
      case "note":
        return <FileText className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const isInbound = (comm: any) =>
    comm.communication_type === "email_in" || comm.direction === "inbound";

  const getEmailTypeLabel = (emailType?: string) => {
    if (!emailType) return null;
    return EMAIL_TYPE_LABELS[emailType] || emailType;
  };

  const displayCount = expanded ? filteredCommunications.length : 5;
  const visibleCommunications = filteredCommunications.slice(0, displayCount);
  const hasMore = filteredCommunications.length > 5;

  // Helpers to open composer with presets
  const openCustomerEmail = () => {
    setComposerDefaults({
      selectedEmails: customerEmail ? [customerEmail] : [],
    });
    setEmailSheetOpen(true);
  };
  const openPartnerEmail = (email: string) => {
    setComposerDefaults({ selectedEmails: [email] });
    setEmailSheetOpen(true);
  };
  const openReply = (comm: any) => {
    const replyTo = comm.contact_email;
    if (!replyTo) {
      toast.error("Geen e-mailadres bekend voor dit bericht");
      return;
    }
    const subject = comm.subject
      ? comm.subject.toLowerCase().startsWith("re:")
        ? comm.subject
        : `Re: ${comm.subject}`
      : "";
    setComposerDefaults({ selectedEmails: [replyTo], subject });
    setEmailSheetOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              Communicatie
              {communications.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {communications.length}
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              {onOpenStatusEmail && (
                <Button
                  size="sm"
                  variant={highlightStatusEmail ? "default" : "outline"}
                  onClick={onOpenStatusEmail}
                  className={cn(
                    highlightStatusEmail &&
                      "ring-2 ring-primary ring-offset-2 animate-pulse"
                  )}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  Status update
                </Button>
              )}

              {customerEmail && (
                <Button size="sm" variant="default" onClick={openCustomerEmail}>
                  <Mail className="h-4 w-4 mr-1" />
                  Mail klant
                </Button>
              )}

              {partnerRecipients.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Users className="h-4 w-4 mr-1" />
                      Mail partner
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Betrokken partners</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {partnerRecipients.map((p) => (
                      <DropdownMenuItem
                        key={p.partnerId}
                        onClick={() => openPartnerEmail(p.email)}
                      >
                        <User className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {requestId && customerEmail && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setChatSheetOpen(true)}
                  title="Chat met de klant in de klantenomgeving"
                >
                  <MessagesSquare className="h-4 w-4 mr-1" />
                  Chat
                </Button>
              )}

              <Button size="sm" variant="ghost" onClick={() => setSheetOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Loggen
              </Button>
            </div>
          </div>

          {/* Thread filter chips */}
          {threads.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-xs text-muted-foreground mr-1">Thread:</span>
              <Button
                size="sm"
                variant={activeThread === ALL_THREADS ? "secondary" : "ghost"}
                className="h-7 text-xs"
                onClick={() => setActiveThread(ALL_THREADS)}
              >
                Alle ({communications.length})
              </Button>
              {threads.map((t) => (
                <Button
                  key={t.email}
                  size="sm"
                  variant={activeThread === t.email ? "secondary" : "ghost"}
                  className="h-7 text-xs"
                  onClick={() => setActiveThread(t.email)}
                >
                  {t.label} ({t.count})
                </Button>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : filteredCommunications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {activeThread === ALL_THREADS
                  ? "Nog geen communicatie gelogd"
                  : "Geen berichten in deze thread"}
              </p>
              <p className="text-xs mt-1">
                Mail of chat met de klant of een partner via de knoppen hierboven.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleCommunications.map((comm) => {
                const config = COMMUNICATION_TYPE_CONFIG[comm.communication_type as CommunicationType];
                const isFromEmailLog = comm.source === "email_log";
                const emailTypeLabel = isFromEmailLog ? getEmailTypeLabel(comm.email_type) : null;
                const canReply = !!comm.contact_email;

                return (
                  <div
                    key={comm.id}
                    className="group relative border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("mt-0.5", config?.color || "text-slate-600")}>
                        {getIcon(comm.communication_type as CommunicationType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {emailTypeLabel || config?.label || comm.communication_type}
                          </span>
                          {isFromEmailLog && (
                            <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">
                              <Zap className="h-3 w-3 mr-0.5" />
                              Automatisch
                            </Badge>
                          )}
                          {isInbound(comm) && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              Inkomend
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comm.communication_date), "d MMM yyyy, HH:mm", {
                              locale: nl,
                            })}
                          </span>
                        </div>
                        {comm.subject && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {comm.subject}
                          </p>
                        )}
                        {comm.contact_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {comm.contact_name}
                            {comm.contact_email && ` (${comm.contact_email})`}
                          </p>
                        )}
                        {!comm.contact_name && comm.contact_email && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {comm.contact_email}
                          </p>
                        )}
                        {comm.content && (
                          <>
                            <p className={cn("text-sm mt-1 whitespace-pre-wrap", !expandedIds.has(comm.id) && "line-clamp-3")}>
                              {comm.content}
                            </p>
                            {comm.content.length > 150 && (
                              <button
                                type="button"
                                className="text-xs text-primary hover:underline mt-1"
                                onClick={() => toggleExpanded(comm.id)}
                              >
                                {expandedIds.has(comm.id) ? "Minder tonen" : "Meer lezen"}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canReply && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => openReply(comm)}
                            title="Beantwoorden"
                          >
                            <Reply className="h-4 w-4" />
                          </Button>
                        )}
                        {!isFromEmailLog && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteId(comm.id)}
                            title="Verwijderen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Minder tonen
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Toon alle {filteredCommunications.length} berichten
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AddCommunicationSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        requestId={requestId}
        accommodationId={accommodationId}
        defaultContactName={customerName}
        defaultContactEmail={customerEmail}
      />

      <SendProjectEmailSheet
        open={emailSheetOpen}
        onOpenChange={(o) => {
          setEmailSheetOpen(o);
          if (!o) setComposerDefaults({});
        }}
        requestId={requestId}
        accommodationId={accommodationId}
        recipients={allRecipients}
        defaultSubject={composerDefaults.subject}
        defaultBody={composerDefaults.body}
        defaultSelectedEmails={composerDefaults.selectedEmails}
      />

      {requestId && (
        <ProjectChatSheet
          open={chatSheetOpen}
          onOpenChange={setChatSheetOpen}
          requestId={requestId}
          customerName={customerName}
          customerEmail={customerEmail}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Communicatie verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze communicatie wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
