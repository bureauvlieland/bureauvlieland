/**
 * Filterbaar overzicht van de verdiepte activiteiten op /activiteiten-vlieland.
 *
 * Filters (seizoen, duur, geschiktheid) draaien volledig client-side over een
 * vaste, in de HTML aanwezige lijst — alle links blijven dus crawlbaar,
 * ook zonder interactie.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { featuredActivities } from "@/content/activityLinks";
import {
  activityFacets,
  DURATION_LABELS,
  SEASON_LABELS,
  SUITABILITY_LABELS,
  type DurationBucket,
  type Season,
  type Suitability,
} from "@/content/activityFacets";

const SEASONS = Object.keys(SEASON_LABELS) as Season[];
const DURATIONS = Object.keys(DURATION_LABELS) as DurationBucket[];
const SUITABILITIES = Object.keys(SUITABILITY_LABELS) as Suitability[];

type FilterChipProps = {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

const FilterChip = ({ active, onClick, children }: FilterChipProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
    }`}
  >
    {children}
  </button>
);

export const ActivityFilter = () => {
  const [season, setSeason] = useState<Season | null>(null);
  const [duration, setDuration] = useState<DurationBucket | null>(null);
  const [suitability, setSuitability] = useState<Suitability[]>([]);

  const toggleSuitability = (value: Suitability) =>
    setSuitability((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );

  const hasFilters = season !== null || duration !== null || suitability.length > 0;

  const results = useMemo(
    () =>
      featuredActivities.filter((activity) => {
        const facets = activityFacets[activity.slug];
        if (!facets) return false;
        if (season && !facets.seasons.includes(season)) return false;
        if (duration && facets.duration !== duration) return false;
        if (suitability.some((s) => !facets.suitability.includes(s))) return false;
        return true;
      }),
    [season, duration, suitability],
  );

  return (
    <section className="bg-muted/30 py-16" id="activiteiten-filter">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <div className="flex items-start gap-3 mb-6">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <SlidersHorizontal className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
              Vind snel de juiste activiteit
            </h2>
            <p className="text-muted-foreground mt-1">
              Filter op seizoen, hoeveel tijd u heeft en voor wie het moet werken.
            </p>
          </div>
        </div>

        <div className="space-y-5 rounded-xl border border-border bg-background p-5">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Seizoen</p>
            <div className="flex flex-wrap gap-2">
              {SEASONS.map((s) => (
                <FilterChip
                  key={s}
                  active={season === s}
                  onClick={() => setSeason(season === s ? null : s)}
                >
                  {SEASON_LABELS[s]}
                </FilterChip>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-2">Duur</p>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <FilterChip
                  key={d}
                  active={duration === d}
                  onClick={() => setDuration(duration === d ? null : d)}
                >
                  {DURATION_LABELS[d]}
                </FilterChip>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-2">Geschikt voor</p>
            <div className="flex flex-wrap gap-2">
              {SUITABILITIES.map((s) => (
                <FilterChip
                  key={s}
                  active={suitability.includes(s)}
                  onClick={() => toggleSuitability(s)}
                >
                  {SUITABILITY_LABELS[s]}
                </FilterChip>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {results.length} van {featuredActivities.length} activiteiten
            </p>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSeason(null);
                  setDuration(null);
                  setSuitability([]);
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Filters wissen
              </Button>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {results.map((activity) => {
            const facets = activityFacets[activity.slug];
            return (
              <Link key={activity.slug} to={`/activiteit/${activity.slug}`} className="group">
                <Card className="h-full transition-colors hover:border-primary/50">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-display font-semibold text-foreground">
                        {activity.label}
                      </h3>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-sm text-muted-foreground">{activity.teaser}</p>
                    {facets && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        <Badge variant="secondary" className="font-normal">
                          {DURATION_LABELS[facets.duration]}
                        </Badge>
                        {facets.suitability.map((s) => (
                          <Badge key={s} variant="outline" className="font-normal">
                            {SUITABILITY_LABELS[s]}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {results.length === 0 && (
          <p className="mt-6 text-muted-foreground">
            Geen activiteit past op deze combinatie.{" "}
            <Link to="/contact" className="text-primary underline underline-offset-2">
              Vraag ons om advies
            </Link>{" "}
            — we kennen het eiland en de aanbieders.
          </p>
        )}
      </div>
    </section>
  );
};
