import { useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapActivityCard } from "@/components/map/MapActivityCard";
import { MapBookingDialog } from "@/components/map/MapBookingDialog";
import { useAllMapActivities, type MapActivity } from "@/hooks/useMapActivities";
import { Search, CalendarDays, Ticket } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

const ActiviteitenBoeken = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [bookingActivity, setBookingActivity] = useState<
    (MapActivity & { _partnerId?: string; _partnerSlug?: string; _partnerName?: string }) | null
  >(null);

  const dateStart = selectedDate
    ? format(selectedDate, "yyyy-MM-dd")
    : format(new Date(), "yyyy-MM-dd");
  const dateEnd = selectedDate
    ? format(selectedDate, "yyyy-MM-dd")
    : format(addDays(new Date(), 30), "yyyy-MM-dd");

  const { data: activities, isLoading } = useAllMapActivities(dateStart, dateEnd);

  const filtered = useMemo(() => {
    if (!activities) return [];
    const q = search.toLowerCase();
    return activities.filter(
      (a: any) =>
        a.ActivityTypeName?.toLowerCase().includes(q) ||
        a._partnerName?.toLowerCase().includes(q) ||
        a.Description?.toLowerCase().includes(q)
    );
  }, [activities, search]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const a of filtered) {
      const key = format(new Date(a.Departure), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
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
                Alle prijzen zijn inclusief coördinatie door Bureau Vlieland.
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
                grouped.map(([dateKey, items]) => (
                  <div key={dateKey}>
                    <h2 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-1">
                      {format(new Date(dateKey), "EEEE d MMMM yyyy", { locale: nl })}
                    </h2>
                    <div className="space-y-3">
                      {items.map((activity: any) => (
                        <MapActivityCard
                          key={`${activity.Id}-${activity.Departure}`}
                          activity={activity}
                          onBook={setBookingActivity}
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

      <MapBookingDialog
        activity={bookingActivity}
        open={!!bookingActivity}
        onOpenChange={(open) => !open && setBookingActivity(null)}
      />
    </>
  );
};

export default ActiviteitenBoeken;
