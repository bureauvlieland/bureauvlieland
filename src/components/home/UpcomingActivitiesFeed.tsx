import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { ArrowRight } from "lucide-react";
import { useAllMapActivities, type MapActivity } from "@/hooks/useMapActivities";
import { Button } from "@/components/ui/button";
import { Container, LoadingState, MediaCard, Pill, Section, SectionHeader } from "@/components/system";

type Enriched = MapActivity & {
  _partnerId?: string;
  _partnerName?: string;
  _partnerSlug?: string;
  _image?: string | null;
};

/** Link naar de boekpagina met de activiteit, aanbieder en dag voorgeselecteerd. */
const bookingLink = (a: Enriched) => {
  const params = new URLSearchParams({ type: String(a.ActivityTypeId) });
  if (a._partnerSlug) params.set("partner", a._partnerSlug);
  const date = a.Departure.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) params.set("date", date);
  return `/activiteiten-boeken?${params.toString()}`;
};

/**
 * De eerstvolgende direct boekbare activiteiten uit de boekmodule. Bewust
 * zonder sectienummer: het is een live blok dat soms leeg is, geen
 * hoofdstuk van de pagina.
 */
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
    <Section tone="muted">
      <Container size="wide">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeader
            eyebrow="Live agenda"
            title="Eerstvolgende activiteiten"
            intro="Direct online boekbaar bij onze eilandpartners. Bekijk wanneer er nog plek is."
          />
          <Button asChild variant="outline" size="lg" className="self-start md:self-end">
            <Link to="/activiteiten-boeken">
              Bekijk alle activiteiten
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <LoadingState label="Agenda laden…" className="mt-10" />
        ) : (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Eerstvolgende activiteiten">
            {upcoming.map((a) => {
              const dep = new Date(a.Departure);
              const slots = a.RemainingSlots;
              return (
                <li key={a.Id}>
                  <MediaCard
                    image={a._image ?? null}
                    alt={a.ActivityTypeName}
                    badge={
                      <Pill tone={slots <= 3 ? "warning" : "neutral"} className={slots <= 3 ? undefined : "bg-card"}>
                        {slots} {slots === 1 ? "plek" : "plekken"}
                      </Pill>
                    }
                    meta={`${format(dep, "EEE d MMM", { locale: nl })} · ${format(dep, "HH:mm")}`}
                    title={a.ActivityTypeName}
                    text={a._partnerName ?? undefined}
                    to={bookingLink(a)}
                    linkLabel="Bekijk tijden"
                    className="h-full"
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Container>
    </Section>
  );
};
