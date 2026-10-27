import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { BedDouble, Building2, Mail, MessageCircle, Phone, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/system";
import { EmptyState } from "@/components/system";
import { Skeleton } from "@/components/ui/skeleton";
import type { ConversationListItem, ConversationView } from "@/lib/conversationList";

const CHANNEL_ICON: Record<ConversationListItem["channel"], typeof Mail> = {
  email: Mail,
  customer_portal: User,
  partner_portal: Building2,
  whatsapp: Phone,
  website: MessageCircle,
};

const EMPTY: Record<ConversationView, { title: string; description: string }> = {
  open: { title: "Alles beantwoord", description: "Nieuwe e-mails en chatberichten verschijnen hier vanzelf." },
  all: { title: "Geen gesprekken", description: "Er zijn geen gesprekken in dit kanaal." },
  archive: { title: "Archief is leeg", description: "Gearchiveerde gesprekken komen hier te staan." },
};

interface ConversationListProps {
  items: ConversationListItem[];
  view: ConversationView;
  selectedId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
}

/**
 * De lijst van het Berichtencentrum: één rij per gesprek, e-mail en chat door
 * elkaar. Eerste regel wie en welk dossier, daaronder het onderwerp, rechts de
 * wachttijd; ongelezen vet.
 */
export function ConversationList({ items, view, selectedId, isLoading, onSelect }: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="p-3 space-y-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    const e = EMPTY[view];
    return (
      <div className="p-4">
        <EmptyState icon={<Mail />} title={e.title} description={e.description} />
      </div>
    );
  }
  return (
    <ul className="divide-y" role="listbox" aria-label="Gesprekken">
      {items.map((it) => {
        const Icon = CHANNEL_ICON[it.channel];
        const active = it.id === selectedId;
        const open = it.unread > 0;
        return (
          <li key={it.id}>
            <button
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onSelect(it.id)}
              className={cn(
                "w-full text-left px-3 py-2.5 transition-colors hover:bg-muted/60",
                active && "bg-accent-soft",
                open && !active && "bg-warning-soft/30",
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", open ? "text-foreground" : "text-muted-foreground")} aria-hidden />
                <span className={cn("text-sm truncate flex-1 min-w-0", open ? "font-semibold text-foreground" : "font-medium text-foreground")}>
                  {it.name}
                  {it.role && <span className="font-normal text-muted-foreground"> · {it.role}</span>}
                </span>
                <span
                  className={cn("text-[11px] flex-shrink-0", open ? "text-warning-ink font-medium" : "text-muted-foreground")}
                  title={format(new Date(it.waitingSince ?? it.lastAt), "d MMM yyyy HH:mm", { locale: nl })}
                >
                  {open && it.waitingSince
                    ? `wacht ${formatDistanceToNow(new Date(it.waitingSince), { locale: nl })}`
                    : formatDistanceToNow(new Date(it.lastAt), { addSuffix: true, locale: nl })}
                </span>
              </div>
              <p className={cn("mt-0.5 text-xs truncate", open ? "text-foreground" : "text-muted-foreground")}>{it.line}</p>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground">
                {it.dossier ? (
                  <span className="inline-flex items-center gap-1 font-mono">
                    {it.kind === "email" && it.dossier.startsWith("LOG") ? <BedDouble className="h-3 w-3" /> : null}
                    {it.dossier}
                  </span>
                ) : (
                  <span>{it.presales ? "zonder dossier" : ""}</span>
                )}
                {it.status && <Pill tone={it.status.tone}>{it.status.label}</Pill>}
                {it.unread > 1 && <Pill tone="warning">{it.unread} onbeantwoord</Pill>}
                {it.closed && <Pill tone="neutral">gesloten</Pill>}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
