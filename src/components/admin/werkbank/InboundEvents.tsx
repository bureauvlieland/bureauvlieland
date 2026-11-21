/**
 * Sectie "Binnengekomen" bovenaan de Werkbank-inbox: gebeurtenissen van
 * buiten (partner reageert, klant geeft akkoord, klant tekent, mail in de
 * inbox), nieuwste eerst. Het bureau klikt ze weg met "Gezien".
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { BellRing, Check } from "lucide-react";
import {
  formatInboundAge,
  INBOUND_SECTION_ID,
  INBOUND_VISIBLE_MAX,
  type InboundEvent,
} from "@/lib/getInbox";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/system/Pill";

interface InboundEventsProps {
  events: InboundEvent[];
  busy: boolean;
  onSeen: (id: string) => void;
}

export function InboundEvents({ events, busy, onSeen }: InboundEventsProps) {
  const [showAll, setShowAll] = useState(false);
  if (events.length === 0) return null;
  const visible = showAll ? events : events.slice(0, INBOUND_VISIBLE_MAX);
  const hidden = events.length - visible.length;

  return (
    <section id={INBOUND_SECTION_ID} className="space-y-1.5" aria-label="Binnengekomen">
      <div className="flex items-center gap-2 px-1 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <BellRing className="h-3.5 w-3.5 text-success" aria-hidden />
        <span>Binnengekomen</span>
        <span className="rounded-full bg-muted px-1.5 text-[10px] font-normal normal-case tracking-normal">{events.length}</span>
      </div>
      <ul className="space-y-1">
        {visible.map((ev) => (
          <InboundRow key={ev.id} event={ev} busy={busy} onSeen={() => onSeen(ev.id)} />
        ))}
      </ul>
      {hidden > 0 && (
        <Button size="sm" variant="ghost" className="w-full" onClick={() => setShowAll(true)}>
          Toon alles ({hidden} meer)
        </Button>
      )}
      {showAll && events.length > INBOUND_VISIBLE_MAX && (
        <Button size="sm" variant="ghost" className="w-full" onClick={() => setShowAll(false)}>
          Toon minder
        </Button>
      )}
    </section>
  );
}

function InboundRow({ event, busy, onSeen }: { event: InboundEvent; busy: boolean; onSeen: () => void }) {
  const age = formatInboundAge(event.createdAt);
  const urgent = event.priority === "urgent" || event.priority === "high";
  return (
    <li className="group flex items-start gap-2 rounded-md border bg-background px-2 py-2 transition-colors hover:bg-muted/50">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium" title={event.title}>
          {event.title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          {event.projectId && event.projectLabel && (
            <Link
              to={`/admin/aanvragen/${event.projectId}`}
              className="font-mono text-foreground hover:underline"
              title="Open dossier"
            >
              {event.projectLabel}
            </Link>
          )}
          {age && (
            <Pill tone={urgent ? "warning" : "success"} title={event.createdAt ?? undefined}>
              {age}
            </Pill>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 gap-1"
        disabled={busy}
        onClick={onSeen}
        title="Markeer als gezien"
        aria-label={`Markeer als gezien: ${event.title}`}
      >
        <Check className="h-3.5 w-3.5" aria-hidden />
        Gezien
      </Button>
    </li>
  );
}
