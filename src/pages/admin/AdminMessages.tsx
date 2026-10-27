import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Keyboard, Mail, MoreVertical, Send, Settings } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/system";
import { cn } from "@/lib/utils";
import { useEmailThreads } from "@/hooks/useEmailThreads";
import { useAdminChat } from "@/hooks/useAdminChat";
import { useConversationProjects } from "@/hooks/useConversationProjects";
import { ConversationList } from "@/components/admin/messages/ConversationList";
import { EmailThreadView } from "@/components/admin/messages/EmailThreadView";
import { ChatConversationView } from "@/components/admin/messages/ChatConversationView";
import { EmailShortcutsDialog } from "@/components/admin/EmailShortcutsDialog";
import {
  CHANNEL_LABEL,
  VIEW_LABEL,
  chatToItem,
  countByView,
  emailGroupToItem,
  filterConversations,
  parseConversationParam,
  viewFor,
  type ChannelFilter,
  type ConversationView,
} from "@/lib/conversationList";

const VIEWS: ConversationView[] = ["open", "all", "archive"];
const CHANNELS: ChannelFilter[] = ["all", "email", "customer_portal", "partner_portal", "whatsapp", "website"];

function parseView(v: string | null): ConversationView {
  return v === "all" || v === "archive" ? v : "open";
}
function parseChannel(v: string | null): ChannelFilter {
  return (CHANNELS as string[]).includes(v ?? "") ? (v as ChannelFilter) : "all";
}

/**
 * Berichtencentrum (fase 2): één lijst voor e-mail en chat met drie
 * weergaven (Te beantwoorden, Alle gesprekken, Archief) en het kanaal als
 * filter. Rechts het gesprek: e-mail als tijdlijn met composer, chat als
 * bubbels. De URL draagt weergave, kanaal en het open gesprek
 * (`?weergave=&kanaal=&gesprek=`); oude links met `inbox=` en
 * `conversation=` blijven werken.
 */
const AdminMessages = () => {
  const [params, setParams] = useSearchParams();
  const view = parseView(params.get("weergave"));
  const channel = parseChannel(params.get("kanaal"));
  const selectedId = parseConversationParam(params.get("gesprek"));
  const legacyTab = params.get("tab");
  const legacyInbox = params.get("inbox");
  const legacyConversation = params.get("conversation");

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true });
  };
  const select = (id: string | null) => update({ gesprek: id, inbox: null, conversation: null, tab: null });
  const setView = (v: ConversationView) => update({ weergave: v === "open" ? null : v });
  const setChannel = (c: ChannelFilter) => update({ kanaal: c === "all" ? null : c });

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const chatComposerRef = useRef<HTMLTextAreaElement>(null);
  /** Een gesprek uit een link openen we in de weergave waar het thuishoort. */
  const alignViewFor = useRef<string | null>(selectedId ?? (legacyInbox || legacyConversation ? "pending" : null));

  const email = useEmailThreads({
    onThreadGone: (key) => {
      if (selectedId === `email:${key}`) select(null);
    },
  });
  const chat = useAdminChat();
  const projectRefs = useConversationProjects(chat.conversations);

  // Oude links: ?inbox=<bericht-id> en ?conversation=<gesprek-id>.
  useEffect(() => {
    if (legacyConversation) {
      alignViewFor.current = `chat:${legacyConversation}`;
      select(`chat:${legacyConversation}`);
      return;
    }
    if (legacyInbox && email.groups.length) {
      const g = email.groups.find((grp) => grp.items.some((it) => it.id === `c:${legacyInbox}` || it.id === legacyInbox));
      if (g) {
        alignViewFor.current = `email:${g.key}`;
        select(`email:${g.key}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legacyInbox, legacyConversation, email.groups]);

  // Het actieve chatgesprek volgt de selectie; de hook laadt de berichten en
  // zet ze op gelezen.
  useEffect(() => {
    chat.setActiveConversationId(selectedId?.startsWith("chat:") ? selectedId.slice(5) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const items = useMemo(
    () => [
      ...email.groups.map(emailGroupToItem),
      ...chat.conversations.map((c) =>
        chatToItem({
          conversation: c,
          unread: chat.unreadByConversation.get(c.id) ?? 0,
          unreadSince: chat.unreadSinceByConversation.get(c.id) ?? null,
          projectRef: projectRefs[c.id],
        }),
      ),
    ],
    [email.groups, chat.conversations, chat.unreadByConversation, chat.unreadSinceByConversation, projectRefs],
  );
  const filtered = useMemo(() => filterConversations(items, view, channel), [items, view, channel]);
  const counts = useMemo(() => countByView(items, channel), [items, channel]);

  // Weergave uitlijnen op een gesprek dat via een link geopend is.
  useEffect(() => {
    if (!selectedId || alignViewFor.current !== selectedId) return;
    const it = items.find((i) => i.id === selectedId);
    if (!it) return;
    alignViewFor.current = null;
    const target = viewFor(it);
    if (target !== view) setView(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, items]);

  const selectedGroup = selectedId?.startsWith("email:")
    ? email.groups.find((g) => `email:${g.key}` === selectedId) ?? null
    : null;
  const selectedChat = selectedId?.startsWith("chat:")
    ? chat.conversations.find((c) => c.id === selectedId.slice(5)) ?? null
    : null;

  // ---- Sneltoetsen ----
  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const el = ev.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      if (replyOpen || shortcutsOpen) {
        if (ev.key === "?") setShortcutsOpen(true);
        return;
      }
      const idx = filtered.findIndex((i) => i.id === selectedId);
      const move = (delta: number) => {
        if (!filtered.length) return;
        const next = idx < 0 ? 0 : Math.min(filtered.length - 1, Math.max(0, idx + delta));
        select(filtered[next].id);
      };
      switch (ev.key) {
        case "j":
        case "ArrowDown":
          ev.preventDefault();
          move(1);
          break;
        case "k":
        case "ArrowUp":
          ev.preventDefault();
          move(-1);
          break;
        case "Enter":
          if (idx < 0 && filtered.length) select(filtered[0].id);
          break;
        case "Escape":
          select(null);
          break;
        case "r":
          if (selectedGroup) {
            ev.preventDefault();
            setReplyOpen(true);
          } else if (selectedChat) {
            ev.preventDefault();
            chatComposerRef.current?.focus();
          }
          break;
        case "e":
          if (selectedGroup) {
            ev.preventDefault();
            void email.archiveThread(selectedGroup, !selectedGroup.threadArchived);
          } else if (selectedChat) {
            ev.preventDefault();
            void chat.archiveConversation(selectedChat.id, !selectedChat.archived_at);
          }
          break;
        case "m":
          if (selectedGroup) {
            ev.preventDefault();
            void email.setThreadAnswered(selectedGroup, true);
          }
          break;
        case "u":
          if (selectedGroup) {
            ev.preventDefault();
            void email.setThreadAnswered(selectedGroup, false);
          }
          break;
        case "1":
          setView("open");
          break;
        case "2":
          setView("all");
          break;
        case "3":
          setView("archive");
          break;
        case "a":
          ev.preventDefault();
          setView(view === "archive" ? "open" : "archive");
          break;
        case "?":
          setShortcutsOpen(true);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, selectedId, selectedGroup, selectedChat, replyOpen, shortcutsOpen, view]);

  if (legacyTab === "verzonden") {
    return <Navigate to="/admin/berichten/templates?tab=verzendlog" replace />;
  }

  const isLoading = email.isLoading && chat.conversations.length === 0;

  return (
    <>
      <Helmet>
        <title>Berichten | Admin | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AdminLayout>
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Berichten</h1>
              <p className="text-muted-foreground mt-1">E-mail en chat met klanten en partners, op één plek.</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <label className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <span>{chat.isOnline ? "Chat online" : "Chat offline"}</span>
                <Switch checked={chat.isOnline} onCheckedChange={(v) => chat.updatePresence(v)} aria-label="Chat online" />
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Meer">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to="/admin/berichten/templates">
                      <Settings className="h-4 w-4 mr-2" /> E-mailtemplates
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/berichten/templates?tab=verzendlog">
                      <Send className="h-4 w-4 mr-2" /> Verzendlog
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>
                    <Keyboard className="h-4 w-4 mr-2" /> Sneltoetsen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={view} onValueChange={(v) => setView(parseView(v))}>
              <TabsList>
                {VIEWS.map((v) => (
                  <TabsTrigger key={v} value={v} className="gap-2">
                    {VIEW_LABEL[v]}
                    {v !== "archive" && counts[v] > 0 && (
                      <span
                        className={cn(
                          "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                          v === "open" ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {counts[v]}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Kanaal">
              {CHANNELS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChannel(c)}
                  aria-pressed={channel === c}
                  className={cn(
                    "px-2.5 py-1 rounded-sm text-xs border transition-colors",
                    channel === c
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:bg-muted",
                  )}
                >
                  {CHANNEL_LABEL[c]}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[calc(100vh-240px)] min-h-[420px] flex border rounded-lg overflow-hidden bg-card">
            <div className={cn("w-full lg:w-96 border-r flex-col overflow-y-auto", selectedId ? "hidden lg:flex" : "flex")}>
              <ConversationList items={filtered} view={view} selectedId={selectedId} isLoading={isLoading} onSelect={select} />
            </div>
            <div className={cn("flex-1 min-w-0 flex-col", selectedId ? "flex" : "hidden lg:flex")}>
              {selectedGroup ? (
                <EmailThreadView
                  group={selectedGroup}
                  showArchivedItems={view === "archive"}
                  onBack={() => select(null)}
                  onSetAnswered={email.setAnswered}
                  onSetThreadAnswered={email.setThreadAnswered}
                  onArchiveItem={email.archiveItem}
                  onArchiveThread={email.archiveThread}
                  onArchiveDossier={email.archiveDossier}
                  replyOpen={replyOpen}
                  onReplyOpenChange={setReplyOpen}
                  onShowShortcuts={() => setShortcutsOpen(true)}
                />
              ) : selectedChat ? (
                <ChatConversationView
                  conversation={selectedChat}
                  messages={chat.messages}
                  projectRef={projectRefs[selectedChat.id]}
                  onBack={() => select(null)}
                  sendMessage={chat.sendMessage}
                  closeConversation={chat.closeConversation}
                  archiveConversation={chat.archiveConversation}
                  saveChatToProject={chat.saveChatToProject}
                  composerRef={chatComposerRef}
                  onShowShortcuts={() => setShortcutsOpen(true)}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center p-6">
                  <EmptyState
                    icon={<Mail />}
                    title={selectedId ? "Gesprek wordt geladen…" : "Kies een gesprek"}
                    description={
                      selectedId
                        ? undefined
                        : "Met j en k loop je door de lijst, Enter opent het gesprek, r beantwoordt het."
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <EmailShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      </AdminLayout>
    </>
  );
};

export default AdminMessages;
