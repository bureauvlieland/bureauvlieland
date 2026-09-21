/**
 * Filterbaar overzicht van de verdiepte activiteiten op /activiteiten-vlieland.
 *
 * Filters (seizoen, duur, geschiktheid) draaien volledig client-side over een
 * vaste, in de HTML aanwezige lijst; alle links blijven dus crawlbaar, ook
 * zonder interactie. Op het ontwerpsysteem sinds fase 4: Section, SectionHeader,
 * filterknoppen als op de andere catalogi, resultaten als LinkCard.
 */
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, LinkCard, Pill, Section, SectionHeader, type SectionTone } from "@/components/system";
import { featuredActivities } from "@/content/activityLinks";
import { renderRichText } from "@/lib/richText";
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

const FilterRow = <T extends string>({ label, options, labels, isActive, onToggle }: { label: string; options: T[]; labels: Record<T, string>; isActive: (v: T) => boolean; onToggle: (v: T) => void }) => (
  <div>
    <p className="mb-2 text-sm font-medium text-foreground" id={`filter-${label}`}>{label}</p>
    <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`filter-${label}`}>
      {options.map((value) => (
        <Button key={value} variant={isActive(value) ? "default" : "outline"} size="sm" aria-pressed={isActive(value)} onClick={() => onToggle(value)}>
          {labels[value]}
        </Button>
      ))}
    </div>
  </div>
);

export const ActivityFilter = ({ number, tone, eyebrow = "Activiteiten" }: { number: string; tone: SectionTone; eyebrow?: string }) => {
  const [season, setSeason] = useState<Season | null>(null);
  const [duration, setDuration] = useState<DurationBucket | null>(null);
  const [suitability, setSuitability] = useState<Suitability[]>([]);

  const toggleSuitability = (value: Suitability) =>
    setSuitability((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

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
    <Section tone={tone} id="activiteiten-filter" className="scroll-mt-24">
      <Container size="wide">
        <SectionHeader
          eyebrow={eyebrow}
          number={number}
          title="Vind snel de juiste activiteit"
          intro="Filter op seizoen, hoeveel tijd u heeft en voor wie het moet werken."
        />

        <div className="mt-8 space-y-5 rounded-lg border border-border bg-card p-5">
          <FilterRow label="Seizoen" options={SEASONS} labels={SEASON_LABELS} isActive={(s) => season === s} onToggle={(s) => setSeason(season === s ? null : s)} />
          <FilterRow label="Duur" options={DURATIONS} labels={DURATION_LABELS} isActive={(d) => duration === d} onToggle={(d) => setDuration(duration === d ? null : d)} />
          <FilterRow label="Geschikt voor" options={SUITABILITIES} labels={SUITABILITY_LABELS} isActive={(s) => suitability.includes(s)} onToggle={toggleSuitability} />
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
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
                <X aria-hidden="true" />
                Filters wissen
              </Button>
            )}
          </div>
        </div>

        {results.length > 0 ? (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Activiteiten die aan de filters voldoen">
            {results.map((activity) => {
              const facets = activityFacets[activity.slug];
              return (
                <li key={activity.slug}>
                  <LinkCard
                    title={activity.label}
                    text={activity.teaser}
                    to={`/activiteit/${activity.slug}`}
                    pills={
                      facets && (
                        <>
                          <Pill tone="brand">{DURATION_LABELS[facets.duration]}</Pill>
                          {facets.suitability.map((s) => (
                            <Pill key={s} tone="neutral">
                              {SUITABILITY_LABELS[s]}
                            </Pill>
                          ))}
                        </>
                      )
                    }
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-6 text-muted-foreground">
            {renderRichText("Geen activiteit past op deze combinatie. [Vraag ons om advies](/contact): wij kennen het eiland en de aanbieders.")}
          </p>
        )}
      </Container>
    </Section>
  );
};
