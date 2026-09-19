import type { ReactNode } from "react";
import { Bed, Building2, Calendar, Clock, Mail, MapPin, Phone, User, Users, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FormField, OptionCard, OptionGroup } from "@/components/system";
import {
  ICON_NAMES,
  PHOSPHOR_DUOTONE,
  PHOSPHOR_LIGHT,
  PHOSPHOR_REGULAR,
  TABLER,
  type IconName,
  type IconSample,
} from "./iconSamples";

/**
 * Iconensets naast elkaar, ter beoordeling (alleen op /ontwerp). Lucide is
 * de huidige set (384 bestanden); de andere staan hier als losse SVG's.
 */
const LUCIDE: Record<IconName, LucideIcon> = {
  user: User,
  mail: Mail,
  phone: Phone,
  users: Users,
  building: Building2,
  clock: Clock,
  calendar: Calendar,
  "map-pin": MapPin,
  bed: Bed,
};

const Svg = ({ sample, stroke, className }: { sample: IconSample; stroke?: number; className?: string }) =>
  stroke ? (
    <svg
      viewBox={sample.viewBox}
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: sample.body }}
    />
  ) : (
    <svg viewBox={sample.viewBox} className={className} aria-hidden="true" fill="currentColor" dangerouslySetInnerHTML={{ __html: sample.body }} />
  );

type Render = (name: IconName, className?: string) => ReactNode;

const SETS: { key: string; label: string; note: string; render: Render | null }[] = [
  { key: "none", label: "Zonder iconen in velden", note: "Het label zegt al wat het veld is; iconen alleen waar ze betekenis dragen.", render: null },
  {
    key: "lucide",
    label: "Lucide, zoals nu",
    note: "Lijn van 2px. Staat in 384 bestanden.",
    render: (n, c) => {
      const Icon = LUCIDE[n];
      return <Icon className={c} strokeWidth={2} aria-hidden="true" />;
    },
  },
  {
    key: "lucide-thin",
    label: "Lucide, dunner",
    note: "Zelfde set, lijn van 1,5px. Geen nieuw pakket nodig.",
    render: (n, c) => {
      const Icon = LUCIDE[n];
      return <Icon className={c} strokeWidth={1.5} aria-hidden="true" />;
    },
  },
  { key: "phosphor", label: "Phosphor, regular", note: "Ronder en met vulling; zes gewichten beschikbaar.", render: (n, c) => <Svg sample={PHOSPHOR_REGULAR[n]} className={c} /> },
  { key: "phosphor-light", label: "Phosphor, light", note: "Dunste variant die klein nog leesbaar is.", render: (n, c) => <Svg sample={PHOSPHOR_LIGHT[n]} className={c} /> },
  { key: "phosphor-duotone", label: "Phosphor, duotone", note: "Tweede tint op 20%, geeft wat meer gewicht.", render: (n, c) => <Svg sample={PHOSPHOR_DUOTONE[n]} className={c} /> },
  { key: "tabler", label: "Tabler", note: "Lijn van 2px, ronder dan Lucide; grootste set.", render: (n, c) => <Svg sample={TABLER[n]} stroke={2} className={c} /> },
  { key: "tabler-thin", label: "Tabler, dunner", note: "Lijn van 1,5px.", render: (n, c) => <Svg sample={TABLER[n]} stroke={1.5} className={c} /> },
];

// Tailwind leest klassen letterlijk uit de bron, dus geen sjabloonstrings.
const SIZE_CLASSES = ["[&_svg]:h-4 [&_svg]:w-4", "[&_svg]:h-5 [&_svg]:w-5", "[&_svg]:h-6 [&_svg]:w-6"];

export const IconSetComparison = () => (
  <div className="mt-10 space-y-8">
    {SETS.map((set) => {
      const render = set.render;
      return (
        <div key={set.key} className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium text-foreground">{set.label}</p>
            <p className="text-sm text-muted-foreground">{set.note}</p>
          </div>
          {render && (
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-foreground">
              {SIZE_CLASSES.map((sizeClass) => (
                <span key={sizeClass} className="flex items-center gap-2">
                  {ICON_NAMES.map((n) => (
                    <span key={n} className={`inline-flex ${sizeClass}`}>
                      {render(n)}
                    </span>
                  ))}
                </span>
              ))}
            </div>
          )}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="E-mailadres" htmlFor={`icons-${set.key}-mail`} required leading={render ? render("mail") : undefined}>
                <Input type="email" placeholder="uw@email.nl" />
              </FormField>
              <FormField label="Aantal personen" htmlFor={`icons-${set.key}-people`} required leading={render ? render("users") : undefined}>
                <Input type="number" defaultValue={20} />
              </FormField>
            </div>
            <OptionGroup name={`Type aanvraag, ${set.label}`} columns={2}>
              <OptionCard selected onSelect={() => undefined} title="Zakelijk" description="Bedrijfsuitje, heisessie" icon={render ? render("building") : undefined} />
              <OptionCard selected={false} onSelect={() => undefined} title="Logies" description="Hotel of vakantiewoning" icon={render ? render("bed") : undefined} />
            </OptionGroup>
          </div>
        </div>
      );
    })}
  </div>
);
