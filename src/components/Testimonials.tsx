import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Container, Section, SectionHeader } from "@/components/system";
import { RatingStars } from "@/components/RatingStars";
import { REVIEW_LINK_FALLBACK, useGoogleReviewsCache } from "@/hooks/useGoogleReviewsCache";

interface TestimonialItem {
  quote: string;
  author: string;
  company?: string;
  rating?: number;
  source: "manual" | "google";
  author_photo?: string | null;
  relative_time?: string | null;
}

const manualTestimonials: TestimonialItem[] = [
  {
    quote: "Op het oostelijke buureiland circuleren nog weleens verhalen over 'die Vlielanders' of - erger - 'Vliebiza', maar met Erwin Soolsma en kornuiten van Bureau Vlieland was ik het snel eens over de organisatie van een stoer zakelijk event op de eilanden. Snelle ribs, parachutespringen op de Vliehors en picknicken tussen de tanks - waar kan dat nou anders dan bij ons op de Wadden? Ja, zelfs de Chablis en de oesters waren uitstekend.",
    author: "Jort Kelder",
    company: "Journalist en presentator",
    source: "manual",
  },
  {
    quote: "Na 6 maanden in het geheim samen een planning maken, dingen regelen en zorgen maken over het weer, was het dan eindelijk zo ver... Vanaf het moment dat wij op onze boot zaten, klaar om richting Vlieland te varen was daar het moment aangebroken om alles los te laten want deze jongens hadden het allemaal onder controle! Alles liep perfect, geweldige hotels, activiteiten en feestavond! Hartelijk dank Bureau Vlieland, wij hebben genoten!",
    author: "Ilona Norbart",
    company: "Districon Group",
    source: "manual",
  },
  {
    quote: "Vanaf de allereerste bespreking om invulling te geven aan een culinair, sportief en avontuurlijk weekend op Vlieland, tot en met het afscheid bij de terminal 2 dagen later in Harlingen, heeft het team van Bureau Vlieland dit weekend tot in detail onvergetelijk gemaakt voor een ieder!",
    author: "Peter-Paul van de Kar",
    company: "Tradekar International BV",
    source: "manual",
  },
  {
    quote: "Erwin van Bureau Vlieland heeft een top arrangement voor ons in elkaar gezet. Erg plezierig contact, goede begeleiding en heel ontspannen dag gehad op Vlieland. Aanrader voor groepen die een leuke dag willen hebben met een super sfeertje. Lunch in de natuur, BBQ op strand, rib boot tocht, activiteit op strand en ook lekker een terrasje pakken! Voor herhaling vatbaar zou ik zegge",
    author: "Rients",
    company: "Raethuis Accountants Heerenveen",
    source: "manual",
  },
];

const normalizeName = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "").trim();

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n).trimEnd() + "…" : s);

/**
 * Klantquotes op de homepage: de Google-reviews uit de cache plus een paar
 * vaste citaten, in een carrousel omdat het er meer dan drie zijn. Sinds
 * fase 4 deel 3 op het ontwerpsysteem: zandsectie, genummerde kop, kaarten
 * van het systeem, sterren alleen bij een Google-review.
 */
export const Testimonials = ({ number }: { number: string }) => {
  const { data: google } = useGoogleReviewsCache();

  const googleItems: TestimonialItem[] = (google?.reviews || [])
    .filter((r) => (r.rating ?? 0) >= 4 && r.text)
    .map((r) => ({
      quote: r.text,
      author: r.author_name,
      rating: r.rating,
      source: "google" as const,
      author_photo: r.author_photo,
      relative_time: r.relative_time,
    }));

  const googleNames = new Set(googleItems.map((g) => normalizeName(g.author)));
  const googleContentFingerprints = new Set(googleItems.map((g) => normalizeName(g.quote).slice(0, 80)));
  const manualDedup = manualTestimonials.filter((m) => {
    if (googleNames.has(normalizeName(m.author))) return false;
    return !googleContentFingerprints.has(normalizeName(m.quote).slice(0, 80));
  });

  const testimonials = [...googleItems, ...manualDedup];
  const hasRating = Boolean(google?.rating && google.review_count > 0);
  const placeUrl = google?.place_url || REVIEW_LINK_FALLBACK;

  return (
    <Section id="testimonials" tone="sand">
      <Container size="wide">
        <SectionHeader
          eyebrow="Ervaringen"
          number={number}
          title="Wat klanten zeggen"
          intro="Bureau Vlieland werkt voor uiteenlopende groepen en organisaties. Dit vertellen zij over hun ervaring."
          align="center"
        />
        {hasRating && google?.rating && (
          <p className="mt-6 flex items-center justify-center gap-2">
            <RatingStars value={google.rating} />
            <span className="font-medium text-foreground">{google.rating.toFixed(1).replace(".", ",")}</span>
            <span className="text-sm text-muted-foreground">· {google.review_count} Google-reviews</span>
          </p>
        )}

        <Carousel opts={{ align: "start", loop: true }} className="mx-auto mt-12 w-full">
          <CarouselContent>
            {testimonials.map((t, index) => (
              <CarouselItem key={`${t.source}-${index}`} className="md:basis-1/2 lg:basis-1/3">
                <figure className="flex h-full flex-col rounded-lg border border-border bg-card p-6">
                  {t.source === "google" && t.rating ? <RatingStars value={t.rating} small /> : null}
                  <blockquote className="mt-3 flex-1 font-display text-lg font-light leading-snug text-foreground">
                    {truncate(t.quote, 320)}
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                    {t.author_photo && (
                      <img src={t.author_photo} alt="" width={32} height={32} loading="lazy" className="h-8 w-8 rounded-full object-cover" />
                    )}
                    <span>
                      <span className="block text-sm font-medium text-foreground">{t.author}</span>
                      <span className="block text-xs text-muted-foreground">
                        {t.source === "google" ? `Google-review${t.relative_time ? ` · ${t.relative_time}` : ""}` : t.company}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>

        {hasRating && (
          <p className="mt-8 text-center">
            <a href={placeUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-4 hover:text-ocean-deep">
              Bekijk alle reviews op Google
            </a>
          </p>
        )}
      </Container>
    </Section>
  );
};
