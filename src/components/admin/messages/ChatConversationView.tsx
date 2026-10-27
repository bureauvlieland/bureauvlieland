import { useEffect, useRef, useState, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { isSameDay, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatNL } from "@/lib/dateFormat";
import { getWhatsappWindowState } from "@/lib/whatsappWindow";
import { readChatDraft, saveChatDraft, sendChatDraft } from "@/lib/chatDraft";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Building2,
  ExternalLink,
  FilePlus2,
  FileText,
  Keyboard,
  MessageCircle,
  MoreVertical,
  Phone,
  Save,
  Send,
  X,
} from "lucide-react";
import { Pill } from "@/components/system";
import { Notice } from "@/components/system";
import { ChatMessageBubble } from "@/components/admin/chat/ChatMessageBubble";
import type { ChatMessage } from "@/hooks/useChat";
import type { AdminChatConversation } from "@/hooks/useAdminChat";
import type { ConversationProjectRef } from "@/hooks/useConversationProjects";
import { CHANNEL_LABEL, chatChannel } from "@/lib/conversationList";

export interface ChatConversationViewProps {
  conversation: AdminChatConversation;
  messages: ChatMessage[];
  projectRef?: ConversationProjectRef;
  onBack: () => void;
  sendMessage: (content: string) => Promise<void>;
  closeConversation: (id: string) => Promise<void>;
  archiveConversation: (id: string, archived: boolean) => Promise<void>;
  saveChatToProject: (id: string) => Promise<boolean>;
  /** de pagina zet hier de focus met de sneltoets r */
  composerRef?: RefObject<HTMLTextAreaElement>;
  onShowShortcuts: () => void;
}

/**
 * Eén chatgesprek (klantportaal, partnerportaal, WhatsApp of website): kop in
 * de stijl van PortalHead, de bubbels, en de composer onderaan. Gehaald uit
 * ChatPanel in fase 2.
 */
export function ChatConversationView({
  conversation: conv,
  messages,
  projectRef,
  onBack,
  sendMessage,
  closeConversation,
  archiveConversation,
  saveChatToProject,
  composerRef,
  onShowShortcuts,
}: ChatConversationViewProps) {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessage(readChatDraft(conv.id));
  }, [conv.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || isSending) return;
    const text = message.trim();
    setIsSending(true);
    try {
      await sendChatDraft({ conversationId: conv.id, content: text, send: sendMessage });
      setMessage("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Versturen mislukt", {
        duration: 10000,
        description: "Uw tekst is als concept bewaard en kan opnieuw worden verzonden.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleSaveToProject = async () => {
    setSaving(true);
    const success = await saveChatToProject(conv.id);
    setSaving(false);
    if (success) toast.success("Chatgeschiedenis opgeslagen bij project");
    else toast.error("Kon chatgeschiedenis niet opslaan");
  };

  // WhatsApp: vrije antwoorden mogen alleen binnen 24 uur na het laatste klantbericht.
  const lastInboundAt = [...messages].reverse().find((m) => m.sender_type === "customer")?.created_at ?? null;
  const whatsappWindow = getWhatsappWindowState(lastInboundAt);

  const getDateLabel = (date: Date): string => {
    if (isToday(date)) return "Vandaag";
    if (isYesterday(date)) return "Gisteren";
    return formatNL(date, "EEEE d MMMM yyyy");
  };

  const channel = chatChannel(conv.source);
  const isWhatsapp = channel === "whatsapp";
  const dossierLabel = projectRef?.program?.reference ?? projectRef?.accommodation?.label ?? null;
  const dossierHref = projectRef?.program
    ? `/admin/aanvragen/${projectRef.program.id}`
    : projectRef?.accommodation
      ? `/admin/logies/${projectRef.accommodation.id}`
      : null;
  const canCreateRequest = !conv.request_id && (conv.source === "presales" || conv.source === "whatsapp");
  const closed = conv.status === "closed";

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-muted/30">
      <div className="px-4 py-3 bg-card border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 flex-shrink-0" onClick={onBack} aria-label="Terug naar de lijst">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <p className="text-eyebrow font-medium uppercase text-primary flex items-center gap-1.5">
                {projectRef?.accommodation && !projectRef.program ? <BedDouble className="h-3.5 w-3.5" /> : dossierLabel ? <FileText className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
                {dossierLabel ?? "Zonder dossier"} · {CHANNEL_LABEL[channel]}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="min-w-0 truncate font-display text-lg font-medium text-foreground">
                  {conv.visitor_name || conv.phone_number || "Bezoeker"}
                </h2>
                {closed && <Pill tone="neutral" size="md">Gesloten</Pill>}
                {conv.archived && <Pill tone="neutral" size="md">Gearchiveerd</Pill>}
              </div>
              <ul className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <li className="inline-flex items-center gap-1">
                  {isWhatsapp ? <Phone className="h-3.5 w-3.5" /> : null}
                  {isWhatsapp ? conv.phone_number || "WhatsApp" : conv.visitor_email}
                </li>
                <li>{messages.length} {messages.length === 1 ? "bericht" : "berichten"}</li>
              </ul>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {dossierHref && (
              <Button variant="outline" size="sm" onClick={() => navigate(dossierHref)}>
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Dossier
              </Button>
            )}
            {conv.source_partner_id && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/admin/partners/${conv.source_partner_id}`)}>
                <Building2 className="h-3.5 w-3.5 mr-1" /> Partner
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Meer acties">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {canCreateRequest && (
                  <DropdownMenuItem
                    onClick={() => {
                      const params = new URLSearchParams({ chat: conv.id });
                      if (conv.visitor_name) params.set("naam", conv.visitor_name);
                      if (conv.visitor_email) params.set("email", conv.visitor_email);
                      if (conv.phone_number) params.set("telefoon", conv.phone_number);
                      navigate(`/admin/programma-nieuw?${params.toString()}`);
                    }}
                  >
                    <FilePlus2 className="h-4 w-4 mr-2" /> Aanvraag aanmaken uit dit gesprek
                  </DropdownMenuItem>
                )}
                {!closed && (
                  <DropdownMenuItem onClick={() => closeConversation(conv.id)}>
                    <X className="h-4 w-4 mr-2" /> Gesprek sluiten
                  </DropdownMenuItem>
                )}
                {conv.archived_at ? (
                  <DropdownMenuItem
                    onClick={async () => {
                      await archiveConversation(conv.id, false);
                      toast.success("Gesprek teruggehaald uit archief");
                    }}
                  >
                    <ArchiveRestore className="h-4 w-4 mr-2" /> Uit archief
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={async () => {
                      await archiveConversation(conv.id, true);
                      toast.success("Gesprek gearchiveerd");
                    }}
                  >
                    <Archive className="h-4 w-4 mr-2" /> Archiveren
                  </DropdownMenuItem>
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, idx) => {
          const msgDate = new Date(msg.created_at);
          const prevDate = idx > 0 ? new Date(messages[idx - 1].created_at) : null;
          const showDateSep = !prevDate || !isSameDay(msgDate, prevDate);
          return (
            <div key={msg.id}>
              {showDateSep && (
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] text-muted-foreground">{getDateLabel(msgDate)}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              <ChatMessageBubble message={msg} />
            </div>
          );
        })}
      </div>

      <div className="border-t bg-card p-3">
        {closed ? (
          <p className="text-xs text-muted-foreground">Dit gesprek is gesloten.</p>
        ) : (
          <>
            {isWhatsapp && !whatsappWindow.isOpen && (
              <Notice tone="warning" className="mb-2">
                Het WhatsApp 24-uursvenster is verlopen. Meta blokkeert vrije antwoorden tot de klant opnieuw een
                bericht stuurt.
              </Notice>
            )}
            {isWhatsapp && whatsappWindow.isOpen && (
              <p className="mb-2 text-[11px] text-muted-foreground">Antwoordvenster sluit over {whatsappWindow.remainingLabel}</p>
            )}
            <div className="flex gap-2 items-end">
              <Textarea
                ref={composerRef}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  saveChatDraft(conv.id, e.target.value);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Typ je antwoord…"
                className="min-h-[40px] max-h-[120px] resize-none text-sm"
                rows={1}
                disabled={isSending}
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || isSending}
                className="flex-shrink-0"
                aria-label={isSending ? "Bericht wordt verzonden" : "Bericht verzenden"}
              >
                <Send className={cn("h-4 w-4 mr-1", isSending && "animate-pulse")} /> Versturen
              </Button>
              {conv.request_id && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={saving} title="Chat opslaan bij project" aria-label="Chat opslaan bij project">
                      <Save className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Chat opslaan bij project?</AlertDialogTitle>
                      <AlertDialogDescription>
                        De volledige chatgeschiedenis wordt opgeslagen als notitie bij het project
                        {projectRef?.program && <> ({projectRef.program.reference})</>}. Dit is zichtbaar in de
                        projecttijdlijn.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuleren</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSaveToProject}>Opslaan</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
