import { useEffect, useMemo, useRef, useState } from "react";
import { Container, EmptyState, PortalTabs } from "@/components/system";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar, Sparkles, MapPin as MapIcon, Info, BedDouble, Share2, ArrowLeft, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TodayView } from "@/components/customer-portal/TodayView";
import { ProgramMap } from "@/components/customer-portal/ProgramMap";
import { DayBar, type DayBarDay } from "@/components/customer-portal/DayBar";
import { ParticipantItemCard } from "@/components/customer-portal/ParticipantItemCard";
import { MobileBottomNav, type BottomNavView } from "@/components/customer-portal/MobileBottomNav";
import { sortItemsByTime } from "@/components/customer-portal/CustomerTimeline";
import type { ProgramRequestItem } from "@/types/programRequest";

type View = BottomNavView;

interface ParticipantViewProps {
  program: any;
  accommodation?: any;
  selectedDates: Date[];
  eventMode: { currentDayIndex: number; isUpcoming: boolean };
  showTitleBlock?: boolean;
  onExit?: () => void;
  onShare?: () => void;
  /** Deelnemers na afloop om een Google-review vragen (instelling, fase 4). */
  participantReview?: { enabled: boolean; google_url: string | null } | null;
  /** De laatste programmadag is voorbij. */
  isOver?: boolean;
}

/** De lijn waaronder een dagkop telt als "in beeld", net als in ProgramView. */
const SCROLL_LINE = 160;

/**
 * De deelnemersweergave (klantportaal fase 3c): dezelfde tabbalk, dagbalk
 * en onderdeelkaart als de klant ziet, zonder prijzen, status en acties.
 * Op een telefoon schakelt de onderbalk de weergave; vanaf `md` de tabbalk
 * bovenaan.
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
}: ParticipantViewProps) => {
  const [view, setView] = useState<View>("today");
  const items: ProgramRequestItem[] = useMemo(
    () => (program?.items ?? []).filter((i: ProgramRequestItem) => i.status !== "cancelled" && (i.day_index ?? -1) >= 0),
    [program?.items],
  );
  const dayCount = Math.max(selectedDates.length, items.reduce((max, i) => Math.max(max, (i.day_index ?? 0) + 1), 0), 1);
  const todayIndex = eventMode.currentDayIndex >= 0 ? eventMode.currentDayIndex : null;

  const days = useMemo(
    () =>
      Array.from({ length: dayCount }, (_, index) => {
        const dayItems = sortItemsByTime(items.filter((i) => Math.min(i.day_index ?? 0, dayCount - 1) === index));
        return { index, date: selectedDates[index] ?? null, items: dayItems };
      }),
    [items, dayCount, selectedDates],
  );
  const dayBarDays: DayBarDay[] = days
    .filter((d): d is typeof d & { date: Date } => !!d.date)
    .map((d) => ({
      index: d.index,
      date: d.date,
      count: d.items.length,
      status: d.items.length > 0 ? "done" : "empty",
      openCount: 0,
      waitingCount: 0,
      isToday: todayIndex === d.index,
    }));

  // De dagbalk volgt het scrollen: de laatste dagkop boven de lijn is de actieve dag.
  const [activeDayIndex, setActiveDayIndex] = useState(() => todayIndex ?? 0);
  const timelineRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (view !== "program" || dayCount <= 1) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const sections = timelineRef.current?.querySelectorAll<HTMLElement>("[data-day-section]");
      if (!sections?.length) return;
      let current = 0;
      sections.forEach((el) => {
        if (el.getBoundingClientRect().top <= SCROLL_LINE) current = Number(el.dataset.daySection);
      });
      setActiveDayIndex(current);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [view, dayCount]);

  const scrollToDay = (index: number) => {
    setActiveDayIndex(index);
    document.getElementById(`deelnemers-dag-${index}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const changeView = (next: View) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const dateRange =
    selectedDates.length === 0
      ? ""
      : selectedDates.length === 1
        ? format(selectedDates[0], "EEEE d MMMM yyyy", { locale: nl })
        : `${format(selectedDates[0], "d MMM", { locale: nl })} tot ${format(selectedDates[selectedDates.length - 1], "d MMM yyyy", { locale: nl })}`;

  const tabs = [
    { key: "today", label: "Vandaag", icon: <Sparkles aria-hidden="true" /> },
    { key: "program", label: "Programma", icon: <Calendar aria-hidden="true" /> },
    { key: "map", label: "Kaart", icon: <MapIcon aria-hidden="true" /> },
    { key: "practical", label: "Praktisch", icon: <Info aria-hidden="true" /> },
  ];

  return (
    <>
      {showTitleBlock && (
        <section className="border-b bg-muted/30">
          <Container size="content" className="py-4 sm:py-6">
            {(onExit || onShare) && (
              <div className="mb-3 flex items-center justify-between gap-2">
                {onExit ? (
                  <Button size="sm" variant="ghost" onClick={onExit} className="-ml-2">
                    <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Terug naar het volledige programma</span>
                    <span className="sm:hidden">Volledig programma</span>
                  </Button>
                ) : (
                  <span />
                )}
                {onShare && (
                  <Button size="sm" variant="outline" onClick={onShare}>
                    <Share2 className="h-4 w-4 sm:mr-1" aria-hidden="true" />
                    <span className="hidden sm:inline">Delen met deelnemers</span>
                  </Button>
                )}
              </div>
            )}
            <p className="text-xs font-medium text-muted-foreground">Deelnemersweergave</p>
            <h1 className="mt-1 font-display text-display-md font-medium text-foreground">{program.customer_company || program.customer_name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {dateRange} · {program.number_of_people} personen
            </p>
          </Container>
        </section>
      )}

      <div className="hidden md:block">
        <PortalTabs tabs={tabs} current={view} onChange={(key) => changeView(key as View)} label="Deelnemersweergave" />
      </div>

      <Container as="main" size="content" className="py-6 pb-24 md:pb-6">
        {view === "today" && (
          <TodayView
            selectedDates={selectedDates}
            items={program.items as never}
            currentDayIndex={eventMode.currentDayIndex}
            isUpcoming={eventMode.isUpcoming}
            numberOfPeople={program.number_of_people}
            customerCompany={program.customer_company}
            customerName={program.customer_name}
          />
        )}

        {view === "program" && (
          <div className="space-y-6">
            {isOver && participantReview?.enabled && participantReview.google_url && (
              <Card>
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">Hoe was het?</p>
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

            {items.length === 0 ? (
              <EmptyState icon={<Calendar aria-hidden="true" />} title="Nog geen onderdelen gepland" />
            ) : (
              <>
                {dayBarDays.length > 1 && (
                  <DayBar days={dayBarDays} activeIndex={activeDayIndex} onSelect={scrollToDay} className="sticky top-0 z-30 -mx-4 bg-background/95 px-4 backdrop-blur md:top-14" />
                )}
                <div ref={timelineRef} className="space-y-8">
                  {days.map((day) => {
                    if (day.items.length === 0 && dayCount > 1) return null;
                    const label = day.date ? format(day.date, "EEEE d MMMM", { locale: nl }) : `Dag ${day.index + 1}`;
                    return (
                      <section key={day.index} id={`deelnemers-dag-${day.index}`} data-day-section={day.index} className="scroll-mt-28 md:scroll-mt-40">
                        <h2 className="mb-3 font-display text-xl font-medium capitalize text-foreground">
                          {label}
                          <span className="ml-2 text-sm font-normal normal-case text-muted-foreground">
                            {dayCount > 1 && `dag ${day.index + 1} van ${dayCount} · `}
                            {day.items.length} {day.items.length === 1 ? "onderdeel" : "onderdelen"}
                          </span>
                        </h2>
                        {day.items.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nog niets gepland.</p>
                        ) : (
                          <div className="space-y-3">
                            {day.items.map((item) => (
                              <ParticipantItemCard key={item.id} item={item} numberOfPeople={program.number_of_people} />
                            ))}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {view === "map" && (
          <ProgramMap
            items={program.items as never}
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
                      <p className="text-xs font-medium text-muted-foreground">Verblijf</p>
                      <p className="font-medium text-foreground">{accommodation.partner_name || "Logies"}</p>
                      {accommodation.location_address && <p className="mt-0.5 text-sm text-muted-foreground">{accommodation.location_address}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="space-y-2 py-4 text-sm">
                <p className="font-medium text-foreground">Goed om te weten</p>
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  <li>De tijden in het programma zijn de startmomenten.</li>
                  <li>Op het eiland reist u het makkelijkst per fiets.</li>
                  <li>Kleed u naar het weer en kijk vóór vertrek naar wind en regen.</li>
                </ul>
                <p className="pt-2 text-xs text-muted-foreground">Vragen? Neem contact op met de organisator van dit programma.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </Container>

      <MobileBottomNav active={view} onChange={changeView} />
    </>
  );
};
