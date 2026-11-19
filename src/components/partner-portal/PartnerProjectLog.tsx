import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { ChevronDown, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { reportError } from "@/lib/errorReporting";
import { actorLabel, describeLogEntry, fetchPartnerProjectLog, logActor, type PartnerLogEntry } from "@/lib/partnerProjectLog";

interface PartnerProjectLogProps {
  partnerToken: string;
  requestId: string;
  /** Vooraf geladen regels (referentiepagina); dan wordt er niets opgehaald. */
  entries?: PartnerLogEntry[];
  /** Verandert als de partner zelf iets deed; dan halen we opnieuw op. */
  refreshKey?: string | number;
}

const actorTone: Record<ReturnType<typeof logActor>, string> = {
  klant: "bg-info",
  bureau: "bg-primary",
  u: "bg-success",
  systeem: "bg-muted-foreground",
};

/**
 * "Verloop": wat er bij dit project gebeurde, wanneer en door wie. Standaard
 * dicht, onder de onderdelen; het is naslag, geen actie. Alleen regels over de
 * eigen onderdelen en projectbrede zaken (zie lib/partnerProjectLog).
 */
export const PartnerProjectLog = ({ partnerToken, requestId, entries: preset, refreshKey }: PartnerProjectLogProps) => {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<PartnerLogEntry[] | null>(preset ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (preset) return;
    let cancelled = false;
    fetchPartnerProjectLog(partnerToken, requestId)
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((e) => {
        reportError(e, { where: "PartnerProjectLog" });
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [partnerToken, requestId, preset, refreshKey]);

  if (failed || (entries && entries.length === 0)) return null;
  const count = entries?.length ?? 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section className="rounded-lg border bg-card">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="flex h-auto w-full items-center justify-between rounded-lg px-4 py-3 text-left font-medium" aria-expanded={open}>
            <span className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Verloop
              {entries && <span className="text-xs font-normal text-muted-foreground">{count} gebeurtenissen</span>}
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ol className="divide-y border-t text-sm">
            {(entries ?? []).map((e) => {
              const who = logActor(e.actor);
              return (
                <li key={e.id} className="grid gap-x-3 gap-y-0.5 px-4 py-2.5 sm:grid-cols-[7.5rem_1fr]">
                  <time dateTime={e.created_at} className="text-xs tabular-nums text-muted-foreground sm:pt-0.5">
                    {format(parseISO(e.created_at), "d MMM yyyy HH:mm", { locale: nl })}
                  </time>
                  <div className="min-w-0">
                    <p className="flex items-start gap-2">
                      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", actorTone[who])} aria-hidden="true" />
                      <span>
                        <span className="font-medium">{actorLabel[who]}</span>
                        <span className="text-muted-foreground"> · </span>
                        {describeLogEntry(e)}
                      </span>
                    </p>
                    {e.item_name && <p className="pl-4 text-xs text-muted-foreground">{e.item_name}</p>}
                    {e.notes && e.action !== "status_changed" && <p className="pl-4 text-xs text-muted-foreground">{e.notes}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
};
