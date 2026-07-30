/**
 * KeyFacts — compact, feitelijk samenvattingsblok bovenaan een landingspagina.
 *
 * Doel: AI-assistenten (ChatGPT, Claude, Perplexity) en Google's AI Overviews
 * citeren bij voorkeur korte, expliciete feitenlijstjes. Dit blok geeft per
 * pagina de kerngegevens (duur, prijs, seizoen, voor wie) in één oogopslag.
 */
import type { LucideIcon } from "lucide-react";

export type KeyFact = {
  icon: LucideIcon;
  label: string;
  value: string;
};

type KeyFactsProps = {
  /** Zichtbare kop boven het blok. */
  title?: string;
  facts: KeyFact[];
  /** Eén samenvattende zin die een AI letterlijk kan overnemen. */
  summary?: string;
};

export const KeyFacts = ({ title = "In het kort", facts, summary }: KeyFactsProps) => (
  <section
    aria-label={title}
    className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl -mt-8 relative z-20"
  >
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-foreground mb-4">{title}</h2>
      {summary && <p className="text-sm text-foreground mb-5 max-w-3xl">{summary}</p>}
      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
        {facts.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-3">
            <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
              <dd className="text-sm font-medium text-foreground">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  </section>
);
