import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Keyboard, MoreVertical, Send, Settings } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { ConversationList } from "@/components/admin/messages/ConversationList";
import {
  CHANNELS,
  CHANNEL_LABEL,
  VIEWS,
  VIEW_LABEL,
  type ChannelFilter,
  type ConversationListItem,
  type ConversationView,
} from "@/lib/conversationList";

export interface MessagesWorkspaceProps {
  view: ConversationView;
  channel: ChannelFilter;
  counts: Record<ConversationView, number>;
  items: ConversationListItem[];
  selectedId: string | null;
  isLoading: boolean;
  chatOnline: boolean;
  onSelect: (id: string | null) => void;
  onViewChange: (view: ConversationView) => void;
  onChannelChange: (channel: ChannelFilter) => void;
  onChatOnlineChange: (online: boolean) => void;
  onShowShortcuts: () => void;
  /** het geopende gesprek, of de lege staat */
  children: ReactNode;
}

/**
 * De schil van het Berichtencentrum zonder data: kop, de drie weergaven,
 * het kanaalfilter, links de lijst en rechts het gesprek. AdminMessages
 * voedt hem met echte data, /ontwerp/berichtencentrum met verzonnen data
 * voor de visuele regressietest.
 */
export function MessagesWorkspace({
  view,
  channel,
  counts,
  items,
  selectedId,
  isLoading,
  chatOnline,
  onSelect,
  onViewChange,
  onChannelChange,
  onChatOnlineChange,
  onShowShortcuts,
  children,
}: MessagesWorkspaceProps) {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display-md font-medium text-foreground">Berichten</h1>
          <p className="text-muted-foreground mt-1 text-sm">E-mail en chat met klanten en partners, op één plek.</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <label className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span>{chatOnline ? "Chat online" : "Chat offline"}</span>
            <Switch checked={chatOnline} onCheckedChange={onChatOnlineChange} aria-label="Chat online" />
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
              <DropdownMenuItem onClick={onShowShortcuts}>
                <Keyboard className="h-4 w-4 mr-2" /> Sneltoetsen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={view} onValueChange={(v) => onViewChange(v as ConversationView)}>
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
              onClick={() => onChannelChange(c)}
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
          <ConversationList items={items} view={view} selectedId={selectedId} isLoading={isLoading} onSelect={onSelect} />
        </div>
        <div className={cn("flex-1 min-w-0 min-h-0 flex-col overflow-hidden", selectedId ? "flex" : "hidden lg:flex")}>{children}</div>
      </div>
    </div>
  );
}
