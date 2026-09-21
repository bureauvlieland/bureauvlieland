import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { renderRichText } from "@/lib/richText";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Container, Section, SectionHeader, type SectionTone } from "@/components/system";
import type { LandingFeature, LandingSection } from "@/content/landings/types";

/**
 * De sectiesoorten uit een inhoudsbestand (`prose`, `features`, `gallery`,
 * `split`), gedeeld door de landingspagina en de activiteitpagina.
 */
export const Paragraphs = ({ items, className }: { items: string[]; className?: string }) => (
  <div className={cn("space-y-5 text-lg leading-relaxed text-muted-foreground", className)}>
    {items.map((p, i) => (
      <p key={i}>{renderRichText(p)}</p>
    ))}
  </div>
);

export const Checklist = ({ items }: { items: string[] }) => (
  <ul className="space-y-3">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-3 text-foreground">
        <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <span>{renderRichText(item)}</span>
      </li>
    ))}
  </ul>
);

export const Closing = ({ text }: { text?: string }) =>
  text ? <p className="mt-8 text-lg font-medium leading-relaxed text-foreground">{renderRichText(text)}</p> : null;

/** Raster van korte punten met icoon (de `features`-sectie). */
export const FeatureGrid = ({ items, columns, className }: { items: LandingFeature[]; columns?: 2 | 3; className?: string }) => (
  <div className={cn("grid gap-4 sm:grid-cols-2", columns === 3 && "lg:grid-cols-3", className)}>
    {items.map((item) => {
      const Icon = item.icon;
      return (
        <div key={item.title} className="flex gap-4 rounded-lg border border-border bg-card p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-medium text-foreground">{item.title}</h3>
            {item.text && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.text}</p>}
          </div>
        </div>
      );
    })}
  </div>
);

export const BodySection = ({ section, tone, eyebrow, number }: { section: LandingSection; tone: SectionTone; eyebrow: string; number: string }) => {
  switch (section.kind) {
    case "prose":
      return (
        <Section tone={tone} spacing={section.spacing ?? "default"}>
          <Container size="content">
            <SectionHeader eyebrow={eyebrow} number={number} title={section.title} align={section.align} />
            <div className={cn("mt-8 max-w-3xl", section.align === "center" && "mx-auto text-center")}>
              <Paragraphs items={section.paragraphs} />
              {section.checklist && (
                <div className="mt-8">
                  <Checklist items={section.checklist} />
                </div>
              )}
              <Closing text={section.closing} />
            </div>
          </Container>
        </Section>
      );
    case "features":
      return (
        <Section tone={tone}>
          <Container size="wide">
            <SectionHeader eyebrow={eyebrow} number={number} title={section.title} intro={section.intro} align="center" />
            <FeatureGrid items={section.items} columns={section.columns} className="mt-12" />
            {section.closing && (
              <p className="mx-auto mt-10 max-w-2xl text-center text-lg font-medium text-foreground">{renderRichText(section.closing)}</p>
            )}
            {section.notes && section.notes.length > 0 && (
              <div className="mx-auto mt-8 max-w-2xl space-y-2 text-center text-sm text-muted-foreground">
                {section.notes.map((note) => (
                  <p key={note}>{renderRichText(note)}</p>
                ))}
              </div>
            )}
          </Container>
        </Section>
      );
    case "gallery": {
      const Aside = section.aside?.icon;
      // Drie tegels passen op één rij; vier vormen een blok van twee bij twee.
      const tiles = section.images.length + (section.aside ? 1 : 0);
      return (
        <Section tone={tone}>
          <Container size="wide">
            <SectionHeader eyebrow={eyebrow} number={number} title={section.title} intro={section.intro} align="center" />
            <div className={cn("mt-12 grid gap-4", tiles === 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
              {section.images.map((img) => (
                <figure key={img.src + img.alt} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                  <img src={img.src} alt={img.alt} className="h-full w-full object-cover" loading="lazy" />
                  {(img.title || img.text) && (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ocean-deep/90 to-transparent p-5 pt-16 text-primary-foreground">
                      {img.title && <p className="font-display text-display-md font-medium">{img.title}</p>}
                      {img.text && <p className="mt-1 text-sm text-sand/90">{img.text}</p>}
                    </figcaption>
                  )}
                </figure>
              ))}
              {section.aside && Aside && (
                <div className="flex flex-col justify-center rounded-lg border border-border bg-card p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-primary">
                    <Aside className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-display text-display-md font-medium text-foreground">{section.aside.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{section.aside.text}</p>
                  <p className="mt-4">{renderRichText(`[${section.aside.link.label}](${section.aside.link.to})`, "font-medium text-primary underline underline-offset-4 hover:text-ocean-deep")}</p>
                </div>
              )}
            </div>
          </Container>
        </Section>
      );
    }
    case "split":
      return (
        <Section tone={tone}>
          <Container size="wide">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <SectionHeader eyebrow={eyebrow} number={number} title={section.title} />
                <Paragraphs items={section.paragraphs} className="mt-6" />
                {section.checklist && (
                  <div className="mt-8">
                    <Checklist items={section.checklist} />
                  </div>
                )}
                {(section.cta || section.secondary) && (
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    {section.cta && (
                      <Button asChild size="lg">
                        <Link to={section.cta.to}>
                          {section.cta.label}
                          <ArrowRight aria-hidden="true" />
                        </Link>
                      </Button>
                    )}
                    {section.secondary && (
                      <Button asChild size="lg" variant="outline">
                        <Link to={section.secondary.to}>{section.secondary.label}</Link>
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <figure className={cn("aspect-[4/3] overflow-hidden rounded-lg bg-muted", section.imagePosition === "left" && "lg:order-first")}>
                <img src={section.image.src} alt={section.image.alt} className="h-full w-full object-cover" loading="lazy" />
              </figure>
            </div>
          </Container>
        </Section>
      );
  }
};
