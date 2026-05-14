import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCustomerProgram } from "@/hooks/useCustomerProgram";
import { useEventMode } from "@/hooks/useEventMode";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import {
  ArrowLeft,
  AlertCircle,
  Calendar,
  Sparkles,
  MapPin as MapIcon,
  Info,
  Users,
  BedDouble,
  Navigation,
} from "lucide-react";
import logoImage from "@/assets/logo.png";
import { TodayView } from "@/components/customer-portal/TodayView";
import { ProgramMap } from "@/components/customer-portal/ProgramMap";
import { CustomerTimeline } from "@/components/customer-portal/CustomerTimeline";
import { cn } from "@/lib/utils";

type View = "today" | "program" | "map" | "practical";

const ParticipantProgram = () => {
  const { token } = useParams<{ token: string }>();
  const [view, setView] = useState<View>("today");

  const {
    program,
    isLoading,
    error,
    accommodation,
  } = useCustomerProgram(token || "");

  const selectedDates = useMemo(() => {
    if (!program?.selected_dates) return [] as Date[];
    const parsed = (program.selected_dates as string[]).map((d) => {
      try {
        return parseISO(d);
      } catch {
        return new Date(d);
      }
    });
    if (program?.items) {
      const maxDayIndex = Math.max(
        ...program.items
          .filter((i: any) => i.status !== "cancelled")
          .map((i: any) => i.day_index),
        -1
      );
      while (parsed.length <= maxDayIndex && parsed.length > 0) {
        const last = parsed[parsed.length - 1];
        const next = new Date(last);
        next.setDate(next.getDate() + 1);
        parsed.push(next);
      }
    }
    return parsed;
  }, [program?.selected_dates, program?.items]);

  const eventMode = useEventMode(selectedDates, token ? `bv:event-mode:${token}:share` : undefined);

  const itemsByDay = useMemo(() => {
    if (!program?.items) return [] as Array<{ day: number; items: typeof program.items }>;
    const byDay = new Map<number, typeof program.items>();
    program.items
      .filter((i: any) => i.status !== "cancelled" && (i.day_index ?? -1) >= 0)
      .forEach((i: any) => {
        const d = i.day_index ?? 0;
        if (!byDay.has(d)) byDay.set(d, [] as any);
        (byDay.get(d) as any).push(i);
      });
    return Array.from(byDay.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, items]) => ({ day, items }));
  }, [program?.items]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <img src={logoImage} alt="Bureau Vlieland" className="h-8" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-12 max-w-3xl">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-64 mb-8" />
          <Skeleton className="h-32 w-full mb-6" />
          <Skeleton className="h-48 w-full" />
        </main>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-12 max-w-2xl text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Programma niet gevonden</h1>
          <p className="text-muted-foreground mb-6">
            {error || "Dit programma bestaat niet of is verlopen."}
          </p>
          <Link to="/">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Terug naar home
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  const dateRange =
    selectedDates.length === 0
      ? ""
      : selectedDates.length === 1
      ? format(selectedDates[0], "EEEE d MMMM yyyy", { locale: nl })
      : `${format(selectedDates[0], "d MMM", { locale: nl })} – ${format(
          selectedDates[selectedDates.length - 1],
          "d MMM yyyy",
          { locale: nl }
        )}`;

  const tabs: { id: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "today", label: "Vandaag", icon: Sparkles },
    { id: "program", label: "Programma", icon: Calendar },
    { id: "map", label: "Kaart", icon: MapIcon },
    { id: "practical", label: "Praktisch", icon: Info },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Programma | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={logoImage} alt="Bureau Vlieland" className="h-8" />
          </Link>
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            Deelnemersweergave
          </Badge>
        </div>
      </header>

      {/* Title block */}
      <section className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Programma
          </p>
          <h1 className="text-2xl font-semibold mt-1">
            {(program as any).customer_company || program.customer_name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {dateRange} · {program.number_of_people} personen
          </p>
        </div>
      </section>

      {/* Tabs */}
      <nav className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center gap-1 py-2 overflow-x-auto">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = view === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setView(t.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {view === "today" && (
          <TodayView
            selectedDates={selectedDates}
            items={program.items as any}
            currentDayIndex={eventMode.currentDayIndex}
            isUpcoming={eventMode.isUpcoming}
            numberOfPeople={program.number_of_people}
            customerCompany={(program as any).customer_company}
            customerName={program.customer_name}
          />
        )}

        {view === "program" && (
          <div className="space-y-6">
            {itemsByDay.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Nog geen activiteiten gepland.
                </CardContent>
              </Card>
            ) : (
              itemsByDay.map(({ day, items }) => {
                const date = selectedDates[day];
                return (
                  <div key={day}>
                    <div className="mb-3 flex items-baseline gap-3">
                      <h2 className="text-lg font-semibold">
                        Dag {day + 1}
                      </h2>
                      {date && (
                        <span className="text-sm text-muted-foreground">
                          {format(date, "EEEE d MMMM", { locale: nl })}
                        </span>
                      )}
                    </div>
                    <CustomerTimeline items={items as any} showTimeColumn>
                      {(item) => (
                        <Card>
                          <CardContent className="py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="font-medium leading-snug">
                                  {item.block_name}
                                </h3>
                                {item.provider_name && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {item.provider_name}
                                  </p>
                                )}
                                {item.location_address && (
                                  <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                                    <MapIcon className="h-3 w-3 mt-0.5 shrink-0" />
                                    <span>{item.location_address}</span>
                                  </p>
                                )}
                              </div>
                              {item.location_address && (
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                                    item.location_address
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="shrink-0"
                                >
                                  <Button size="sm" variant="outline" className="h-7 text-xs">
                                    <Navigation className="h-3 w-3 mr-1" />
                                    Route
                                  </Button>
                                </a>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </CustomerTimeline>
                  </div>
                );
              })
            )}
          </div>
        )}

        {view === "map" && (
          <ProgramMap
            items={program.items as any}
            selectedDates={selectedDates}
            accommodationLabel={(accommodation as any)?.partner_name || "Logies"}
            accommodationLat={(accommodation as any)?.location_lat ?? null}
            accommodationLng={(accommodation as any)?.location_lng ?? null}
            accommodationAddress={(accommodation as any)?.location_address ?? null}
          />
        )}

        {view === "practical" && (
          <div className="space-y-4">
            {accommodation && (
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <BedDouble className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Verblijf
                      </p>
                      <p className="font-medium">
                        {(accommodation as any).partner_name || "Logies"}
                      </p>
                      {(accommodation as any).location_address && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {(accommodation as any).location_address}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="py-4 space-y-2 text-sm">
                <p className="font-medium">Goed om te weten</p>
                <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                  <li>Volg de tijden in het programma; ze gelden als startmoment.</li>
                  <li>Op het eiland reis je het makkelijkst per fiets.</li>
                  <li>Kleed je op het weer; controleer wind & regen vóór vertrek.</li>
                </ul>
                <p className="text-xs text-muted-foreground pt-2">
                  Vragen? Neem contact op met de organisator van dit programma.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

    </div>
  );
};

export default ParticipantProgram;
