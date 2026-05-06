import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { ArrowUpRight, CalendarDays, Users } from "lucide-react";
import { useAllMapActivities, type MapActivity } from "@/hooks/useMapActivities";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Enriched = MapActivity & {
  _partnerId?: string;
  _partnerName?: string;
  _image?: string | null;
};

export const UpcomingActivitiesFeed = () => {
  const today = format(new Date(), "yyyy-MM-dd");
  const end = format(addDays(new Date(), 14), "yyyy-MM-dd");
  const { data, isLoading } = useAllMapActivities(today, end);

  const upcoming = useMemo<Enriched[]>(() => {
    if (!data) return [];
    const now = Date.now();
    const sorted = (data as Enriched[])
      .filter((a) => {
        const t = new Date(a.Departure).getTime();
        return !isNaN(t) && t > now && a.RemainingSlots > 0 && !a.IsCancelled;
      })
      .sort((a, b) => new Date(a.Departure).getTime() - new Date(b.Departure).getTime());

    const seen = new Set<string>();
    const unique: Enriched[] = [];
    for (const a of sorted) {
      const key = `${a.ActivityTypeId}::${a._partnerId ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(a);
      if (unique.length === 4) break;
    }
    return unique;
  }, [data]);

  if (!isLoading && upcoming.length === 0) return null;

  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-widest text-muted-foreground mb-3">
              Live agenda
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-foreground mb-3">
              Eerstvolgende activiteiten
            </h2>
            <p className="text-muted-foreground text-lg">
              Direct online boekbaar bij onze eilandpartners — bekijk wanneer er nog plek is.
            </p>
          </div>
          <Button asChild variant="outline" size="lg" className="self-start md:self-end">
            <Link to="/activiteiten-boeken">
              Bekijk alle activiteiten
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
              ))
            : upcoming.map((a) => {
                const dep = new Date(a.Departure);
                return (
                  <Link
                    key={a.Id}
                    to="/activiteiten-boeken"
                    className="group block overflow-hidden rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-lg transition-all"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
                      {a._image ? (
                        <img
                          src={a._image}
                          alt={a.ActivityTypeName}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : null}
                      <Badge className="absolute top-3 right-3 bg-background/90 text-foreground hover:bg-background/90">
                        <Users className="h-3 w-3 mr-1" />
                        {a.RemainingSlots} {a.RemainingSlots === 1 ? "plek" : "plekken"}
                      </Badge>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span className="capitalize">
                          {format(dep, "EEE d MMM", { locale: nl })} · {format(dep, "HH:mm")}
                        </span>
                      </div>
                      <h3 className="font-display text-xl text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                        {a.ActivityTypeName}
                      </h3>
                      {a._partnerName && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {a._partnerName}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
        </div>
      </div>
    </section>
  );
};
