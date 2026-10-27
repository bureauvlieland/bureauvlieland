import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { useSearchParams } from "react-router-dom";
import { Mail } from "lucide-react";
import { EmptyState } from "@/components/system";
import { MessagesWorkspace } from "@/components/admin/messages/MessagesWorkspace";
import { EmailThreadView } from "@/components/admin/messages/EmailThreadView";
import { ChatConversationView } from "@/components/admin/messages/ChatConversationView";
import { chatToItem, countByView, emailGroupToItem, filterConversations, type ChannelFilter, type ConversationView } from "@/lib/conversationList";
import {
  DEMO_CHAT,
  DEMO_CHAT_MESSAGES,
  DEMO_CHAT_WEBSITE,
  DEMO_EMAIL_GROUP,
  DEMO_EMAIL_GROUP_KREEFT,
  DEMO_PROJECT_REFS,
  DEMO_UNREAD,
  DEMO_UNREAD_SINCE,
} from "@/content/demoBerichtencentrum";

/**
 * Referentie van het Berichtencentrum met verzonnen gesprekken
 * (src/content/demoBerichtencentrum.ts). Bestaat alleen buiten productie,
 * net als /ontwerp en de portalen, en is de bron voor de visuele
 * regressietest: `?scherm=lijst` (alle gesprekken, niets geopend),
 * `email` (het e-mailgesprek) of `chat` (de klantchat). Acties doen niets.
 */
const SCHERMEN = ["lijst", "email", "chat"] as const;
type Scherm = (typeof SCHERMEN)[number];

const noop = () => undefined;
const asyncNoop = async () => undefined;

const OntwerpBerichtencentrum = () => {
  const [params] = useSearchParams();
  const gevraagd = params.get("scherm") ?? "lijst";
  const scherm: Scherm = (SCHERMEN as readonly string[]).includes(gevraagd) ? (gevraagd as Scherm) : "lijst";

  const [view, setView] = useState<ConversationView>(scherm === "lijst" ? "all" : "open");
  const [channel, setChannel] = useState<ChannelFilter>("all");
  const [replyOpen, setReplyOpen] = useState(false);

  const items = useMemo(
    () => [
      emailGroupToItem(DEMO_EMAIL_GROUP),
      emailGroupToItem(DEMO_EMAIL_GROUP_KREEFT),
      ...[DEMO_CHAT, DEMO_CHAT_WEBSITE].map((c) =>
        chatToItem({
          conversation: c,
          unread: DEMO_UNREAD.get(c.id) ?? 0,
          unreadSince: DEMO_UNREAD_SINCE.get(c.id) ?? null,
          projectRef: DEMO_PROJECT_REFS[c.id],
        }),
      ),
    ],
    [],
  );
  const filtered = useMemo(() => filterConversations(items, view, channel), [items, view, channel]);
  const counts = useMemo(() => countByView(items, channel), [items, channel]);
  const selectedId = scherm === "email" ? `email:${DEMO_EMAIL_GROUP.key}` : scherm === "chat" ? `chat:${DEMO_CHAT.id}` : null;

  return (
    <div className="min-h-screen bg-background" data-surface="portal">
      <Helmet>
        <title>Ontwerpsysteem – berichtencentrum</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <MessagesWorkspace
        view={view}
        channel={channel}
        counts={counts}
        items={filtered}
        selectedId={selectedId}
        isLoading={false}
        chatOnline
        onSelect={noop}
        onViewChange={setView}
        onChannelChange={setChannel}
        onChatOnlineChange={noop}
        onShowShortcuts={noop}
      >
        {scherm === "email" ? (
          <EmailThreadView
            group={DEMO_EMAIL_GROUP}
            showArchivedItems={false}
            onBack={noop}
            onSetAnswered={noop}
            onSetThreadAnswered={noop}
            onArchiveItem={noop}
            onArchiveThread={noop}
            onArchiveDossier={noop}
            replyOpen={replyOpen}
            onReplyOpenChange={setReplyOpen}
            onShowShortcuts={noop}
          />
        ) : scherm === "chat" ? (
          <ChatConversationView
            conversation={DEMO_CHAT}
            messages={DEMO_CHAT_MESSAGES}
            projectRef={DEMO_PROJECT_REFS[DEMO_CHAT.id]}
            onBack={noop}
            sendMessage={asyncNoop}
            closeConversation={asyncNoop}
            archiveConversation={asyncNoop}
            saveChatToProject={async () => true}
            onShowShortcuts={noop}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <EmptyState icon={<Mail />} title="Kies een gesprek" description="Met j en k loop je door de lijst, Enter opent het gesprek, r beantwoordt het." />
          </div>
        )}
      </MessagesWorkspace>
    </div>
  );
};

export default OntwerpBerichtencentrum;
