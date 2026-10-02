import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ArrowLeft, BedDouble, Calendar, ExternalLink, Info, MapPin as MapIcon, Share2, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Container, EmptyState, Pill, PortalHead, PortalTabs, type PortalHeadFact, type PortalTab } from "@/components/system";
import { TodayView } from "./TodayView";
import { ProgramMap } from "./ProgramMap";
import { DayBar, type DayBarDay } from "./DayBar";
import { ProgramItemCard } from "./ProgramItemCard";
import { byEffectiveTime } from "./timelineUtils";
import { useActiveDay } from "./useActiveDay";
import { cn } from "@/lib/utils";
import { greetingName } from "@/lib/greetingName";
import type { ProgramRequestItem } from "@/types/programRequest";

export type ParticipantViewKey = "today" | "program" | "map" | "practical";

interface ParticipantViewProps {
  program: any;
  accommodation?: any;
  selectedDates: Date[];
  eventMode: { currentDayIndex: number | null; isUpcoming: boolean };
  showTitleBlock?: boolean;
  onExit?: () => void;
  onShare?: () => void;
  /** Deelnemers na afloop om een Google-review vragen (instelling, fase 4). */
  participantReview?: { enabled: boolean; google_url: string | null } | null;
  /** De laatste programmadag is voorbij. */
  isOver?: boolean;
  /** Van buiten gestuurd (de onderbalk op een telefoon); anders eigen toestand. */
  view?: ParticipantViewKey;
  onViewChange?: (view: ParticipantViewKey) => void;
  /** De onderbalk neemt het schakelen over op een telefoon. */
  hideTabsOnMobile?: boolean;
}

interface DayData extends DayBarDay {
  items: ProgramRequestItem[];
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const TABS: PortalTab[] = [
  { key: "today", label: "Vandaag", icon: <Sparkles /> },
  { key: "program", label: "Programma", icon: <Calendar /> },
  { key: "map", label: "Kaart", icon: <MapIcon /> },
  { key: "practical", label: "Praktisch", icon: <Info /> },
];

/**
 * De deelnemersweergave (klantportaal fase 3): dezelfde kop, tabbalk, dagbalk
 * en onderdeelkaart als het portaal, zonder prijzen en acties. Op een
 * telefoon schakelt de onderbalk dezelfde weergave.
 */
export const ParticipantView = ({
  program,
  accommodation,
  selectedDates,
  eventMode,
  showTitleBlock = true,
  onExit,
  onShare,
  participantReview = null,
  isOver = false,
  view: controlledView,
  onViewChange,
  hideTabsOnMobile = false,
}: ParticipantViewProps) => {
  const [internalView, setInternalView] = useState<ParticipantViewKey>("today");
  const view = controlledView ?? internalView;
  const setView = (next: ParticipantViewKey) => {
    if (onViewChange) onViewChange(next);
    else setInternalView(next);
  };
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  const items: ProgramRequestItem[] = program?.items ?? [];
  const dayCount = Math.max(selectedDates.length, 1);
  const todayIndex = eventMode.isUpcoming ? null : eventMode.currentDayIndex;
  const days: DayData[] = useMemo(() => {
    const timeline = items.filter((i) => i.status !== "cancelled" && (i.day_index ?? -1) >= 0);
    return Array.from({ length: dayCount }, (_, index) => {
      const dayItems = timeline.filter((i) => Math.min(i.day_index, dayCount - 1) === index).sort(byEffectiveTime);
      return {
        index,
        date: selectedDates[index] ?? null,
        count: dayItems.length,
        status: "empty" as const,
        openCount: 0,
        waitingCount: 0,
        isToday: todayIndex === index,
        items: dayItems,
      };
    });
  }, [items, dayCount, selectedDates, todayIndex]);
  const hasItems = days.some((d) => d.count > 0);

  const timelineRef = useRef<HTMLDivElement>(null);
  const { activeDayIndex, scrollToDay } = useActiveDay(timelineRef, dayCount, todayIndex, view === "program");

  const dateRange =
    selectedDates.length === 0
      ? null
      : selectedDates.length === 1
        ? format(selectedDates[0], "EEEE d MMMM yyyy", { locale: nl })
        : `${format(selectedDates[0], "d MMM", { locale: nl })} t/m ${format(selectedDates[selectedDates.length - 1], "d MMM yyyy", { locale: nl })}`;
  const facts: PortalHeadFact[] = [];
  if (dateRange) facts.push({ key: "datum", icon: <Calendar />, label: dateRange });
  if (program.number_of_people) facts.push({ key: "personen", icon: <Users />, label: `${program.number_of_people} personen` });

  return (
    <>
      {showTitleBlock && (
        <div className="border-b bg-muted/30">
          <Container size="content" className="py-4 sm:py-6">
            <PortalHead
              eyebrow="Deelnemersweergave"
              title={program.customer_company?.trim() || greetingName(program.customer_name) || program.customer_name}
              facts={facts}
              actions={
                onExit || onShare ? (
                  <>
                    {onExit && (
                      <Button size="sm" variant="ghost" onClick={onExit}>
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Volledig programma
                      </Button>
                    )}
                    {onShare && (
                      <Button size="sm" variant="outline" onClick={onShare}>
                        <Share2 className="h-4 w-4" aria-hidden="true" />
                        Delen
                      </Button>
                    )}
                  </>
                ) : undefined
              }
            />
          </Container>
        </div>
      )}

      <PortalTabs
        tabs={TABS}
        current={view}
        onChange={(key) => setView(key as ParticipantViewKey)}
        label="Deelnemersweergave"
        sticky
        className={cn(hideTabsOnMobile && "hidden md:block")}
      />

      <Container as="main" id="main-content" size="content" className="py-6">
        {view === "today" && (
          <TodayView
            selectedDates={selectedDates}
            items={items as any}
            currentDayIndex={eventMode.currentDayIndex}
            isUpcoming={eventMode.isUpcoming}
            numberOfPeople={program.number_of_people}
            customerCompany={program.customer_company}
            customerName={greetingName(program.customer_name) || program.customer_name}
          />
        )}

        {view === "program" && (
          <div className="space-y-6">
            {isOver && participantReview?.enabled && participantReview.google_url && (
              <Card>
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">Hoe was het?</p>
                    <p className="text-sm text-muted-foreground">Deel uw ervaring op Google; dat helpt andere groepen bij hun keuze.</p>
                  </div>
                  <Button asChild variant="outline" className="shrink-0">
                    <a href={participantReview.google_url} target="_blank" rel="noopener noreferrer">
                      Plaats een review op Google
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}

            {!hasItems ? (
              <EmptyState icon={<Calendar />} title="Nog geen activiteiten gepland" description="Zodra het programma rond is, staat het hier." />
            ) : (
              <>
                <DayBar days={days} activeIndex={activeDayIndex} onSelect={scrollToDay} className={cn(hideTabsOnMobile && "top-0 md:top-14")} />
                <div ref={timelineRef} className="space-y-8">
                  {days.map((day) => (
                    <section key={day.index} id={`dag-${day.index}`} data-day-section={day.index} className="scroll-mt-36" aria-labelledby={`dag-${day.index}-kop`}>
                      <header className="mb-3 border-b pb-2">
                        <h2 id={`dag-${day.index}-kop`} className="font-display text-xl font-medium leading-tight">
                          {day.date ? capitalize(format(day.date, "EEEE d MMMM", { locale: nl })) : "Programma"}
                        </h2>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
                          {dayCount > 1 && (
                            <>
                              <span>
                                dag {day.index + 1} van {dayCount}
                              </span>
                              <span aria-hidden="true">·</span>
                            </>
                          )}
                          <span>
                            {day.count} onderde{day.count === 1 ? "el" : "len"}
                          </span>
                          {day.isToday && <Pill tone="brand">vandaag</Pill>}
                        </p>
                      </header>
                      {day.items.length === 0 ? (
                        <EmptyState className="py-6" title="Nog niets op deze dag" />
                      ) : (
                        <div className="space-y-3">
                          {day.items.map((item) => (
                            <ProgramItemCard
                              key={item.id}
                              item={item}
                              selectedDates={selectedDates}
                              onUpdate={() => undefined}
                              onRemove={() => undefined}
                              allItems={items}
                              numberOfPeople={program.number_of_people}
                              readOnly
                              audience="participant"
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {view === "map" && (
          <ProgramMap
            items={items as any}
            selectedDates={selectedDates}
            accommodationLabel={accommodation?.partner_name || "Logies"}
            accommodationLat={accommodation?.location_lat ?? null}
            accommodationLng={accommodation?.location_lng ?? null}
            accommodationAddress={accommodation?.location_address ?? null}
          />
        )}

        {view === "practical" && (
          <div className="space-y-4">
            {accommodation && (
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <BedDouble className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-eyebrow uppercase text-muted-foreground">Verblijf</p>
                      <p className="font-medium">{accommodation.partner_name || "Logies"}</p>
                      {accommodation.location_address && <p className="mt-0.5 text-sm text-muted-foreground">{accommodation.location_address}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardContent className="space-y-2 py-4 text-sm">
                <p className="font-medium">Goed om te weten</p>
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  <li>Volg de tijden in het programma; ze gelden als startmoment.</li>
                  <li>Op het eiland reist u het makkelijkst per fiets.</li>
                  <li>Kleed u naar het weer en controleer wind en regen voor vertrek.</li>
                </ul>
                <p className="pt-2 text-xs text-muted-foreground">Vragen? Neem contact op met de organisator van dit programma.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </Container>
    </>
  );
};
