import { useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapActivityCard, type BundledTime } from "@/components/map/MapActivityCard";
import { useAllMapActivities, type MapActivity } from "@/hooks/useMapActivities";
import { Search, CalendarDays, Ticket } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

type EnrichedActivity = MapActivity & {
  _partnerId?: string;
  _partnerName?: string;
  _partnerSlug?: string;
  _image?: string | null;
};

interface BundledActivity {
  representative: EnrichedActivity;
  times: BundledTime[];
  totalSlotsLeft: number;
}

const ActiviteitenBoeken = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [search, setSearch] = useState("");

  const dateStart = selectedDate
    ? format(selectedDate, "yyyy-MM-dd")
    : format(new Date(), "yyyy-MM-dd");
  const dateEnd = selectedDate
    ? format(selectedDate, "yyyy-MM-dd")
    : format(addDays(new Date(), 30), "yyyy-MM-dd");

  const { data: activities, isLoading } = useAllMapActivities(dateStart, dateEnd);

  const filtered = useMemo<EnrichedActivity[]>(() => {
    if (!activities) return [];
    const q = search.toLowerCase();
    const now = Date.now();
    return (activities as EnrichedActivity[]).filter((a) => {
      const departure = new Date(a.Departure).getTime();
      if (!isNaN(departure) && departure <= now) return false;
      return (
        a.ActivityTypeName?.toLowerCase().includes(q) ||
        a._partnerName?.toLowerCase().includes(q) ||
        a.Description?.toLowerCase().includes(q)
      );
    });
  }, [activities, search]);

  // Group by date, then bundle by activity type + partner
  const grouped = useMemo<Array<[string, BundledActivity[]]>>(() => {
    const byDate = new Map<string, Map<string, BundledActivity>>();

    for (const a of filtered) {
      const dateKey = format(new Date(a.Departure), "yyyy-MM-dd");
      const groupKey = `${a.ActivityTypeId}::${a._partnerId ?? "unknown"}`;

      if (!byDate.has(dateKey)) byDate.set(dateKey, new Map());
      const dayBundles = byDate.get(dateKey)!;

      const time: BundledTime = {
        id: a.Id,
        time: format(new Date(a.Departure), "HH:mm"),
        slotsLeft: a.RemainingSlots,
      };

      const existing = dayBundles.get(groupKey);
      if (existing) {
        existing.times.push(time);
        existing.totalSlotsLeft += a.RemainingSlots;
        // Keep earliest as representative
        if (new Date(a.Departure) < new Date(existing.representative.Departure)) {
          existing.representative = a;
        }
      } else {
        dayBundles.set(groupKey, {
          representative: a,
          times: [time],
          totalSlotsLeft: a.RemainingSlots,
        });
      }
    }

    // Sort times within each bundle, sort bundles by earliest time, sort dates
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, bundles]) => {
        const list = Array.from(bundles.values()).map((b) => ({
          ...b,
          times: b.times.sort((x, y) => x.time.localeCompare(y.time)),
        }));
        list.sort((x, y) =>
          (x.times[0]?.time ?? "").localeCompare(y.times[0]?.time ?? "")
        );
        return [dateKey, list] as [string, BundledActivity[]];
      });
  }, [filtered]);

  return (
    <>
      <Helmet>
        <title>Activiteiten boeken | Bureau Vlieland</title>
        <meta
          name="description"
          content="Boek direct activiteiten op Vlieland via Bureau Vlieland. Beschikbaarheid in real-time, eenvoudig reserveren."
        />
      </Helmet>
      <Navigation />

      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="bg-primary/5 border-b">
          <div className="container mx-auto px-4 py-12 md:py-16">
            <div className="max-w-2xl">
              <Badge variant="secondary" className="mb-4">
                <Ticket className="h-3.5 w-3.5 mr-1.5" />
                Direct boekbaar
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                Activiteiten op Vlieland
              </h1>
              <p className="text-muted-foreground text-lg">
                Ontdek en boek direct beschikbare activiteiten bij onze partners.
                U boekt rechtstreeks bij de aanbieder.
              </p>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar filters */}
            <aside className="lg:w-72 flex-shrink-0 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Datum kiezen
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={nl}
                    disabled={{ before: new Date() }}
                    className="rounded-md"
                  />
                  {selectedDate && (
                    <button
                      onClick={() => setSelectedDate(undefined)}
                      className="text-xs text-primary hover:underline mt-2"
                    >
                      Alle data tonen
                    </button>
                  )}
                </CardContent>
              </Card>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek activiteit of aanbieder..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </aside>

            {/* Results */}
            <div className="flex-1 space-y-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-40 w-full rounded-lg" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">Geen activiteiten gevonden</p>
                    <p className="text-sm mt-1">
                      Probeer een andere datum of zoekterm.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                grouped.map(([dateKey, bundles]) => (
                  <div key={dateKey}>
                    <h2 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-1">
                      {format(new Date(dateKey), "EEEE d MMMM yyyy", { locale: nl })}
                    </h2>
                    <div className="space-y-3">
                      {bundles.map((bundle) => (
                        <MapActivityCard
                          key={`${bundle.representative.ActivityTypeId}-${bundle.representative._partnerId}-${dateKey}`}
                          activity={bundle.representative}
                          times={bundle.times}
                          totalSlotsLeft={bundle.totalSlotsLeft}
                          showPartner
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default ActiviteitenBoeken;
