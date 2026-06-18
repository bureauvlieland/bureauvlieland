import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Quote, Star } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";

interface GoogleReview {
  author_name: string;
  author_photo?: string | null;
  rating: number;
  text: string;
  relative_time?: string | null;
  publish_time?: string | null;
}

interface CacheRow {
  rating: number | null;
  review_count: number;
  reviews: GoogleReview[];
  place_url: string | null;
}

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
    company: "Journalist & presentator",
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
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();

const truncate = (s: string, n: number) =>
  s.length > n ? s.slice(0, n).trimEnd() + "…" : s;

export const Testimonials = () => {
  const [google, setGoogle] = useState<CacheRow | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("google_reviews_cache")
        .select("rating, review_count, reviews, place_url")
        .eq("id", "singleton")
        .maybeSingle();
      if (alive && data) setGoogle(data as unknown as CacheRow);
    })();
    return () => {
      alive = false;
    };
  }, []);

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
  const googleContentFingerprints = new Set(
    googleItems.map((g) => normalizeName(g.quote).slice(0, 80))
  );
  const manualDedup = manualTestimonials.filter((m) => {
    if (googleNames.has(normalizeName(m.author))) return false;
    const fp = normalizeName(m.quote).slice(0, 80);
    return !googleContentFingerprints.has(fp);
  });

  const testimonials = [...googleItems, ...manualDedup];

  const placeUrl = google?.place_url || "https://g.page/r/bureauvlieland/review";

  return (
    <section id="testimonials" className="py-16 sm:py-20 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
            Wat klanten zeggen
          </h2>
          {google?.rating && google.review_count > 0 ? (
            <div className="flex items-center justify-center gap-2 mb-3">
              <RatingStars value={google.rating} />
              <span className="text-base font-semibold text-foreground">
                {google.rating.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">
                · {google.review_count} Google-reviews
              </span>
            </div>
          ) : null}
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Bureau Vlieland werkt voor diverse groepen en organisaties. Dit is wat zij over hun ervaring vertellen.
          </p>
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full max-w-6xl mx-auto"
        >
          <CarouselContent>
            {testimonials.map((t, index) => (
              <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                <div className="p-1">
                  <Card className="border-border bg-card h-full">
                    <CardContent className="pt-6 flex flex-col h-full">
                      {t.source === "google" && t.rating ? (
                        <RatingStars value={t.rating} small />
                      ) : (
                        <Quote className="w-8 h-8 text-primary mb-4 opacity-50" />
                      )}
                      <blockquote className="text-sm text-foreground leading-relaxed mb-6 mt-3 flex-grow">
                        "{truncate(t.quote, 320)}"
                      </blockquote>
                      <div className="border-t border-border pt-4 mt-auto flex items-center gap-3">
                        {t.author_photo && (
                          <img
                            src={t.author_photo}
                            alt=""
                            width={32}
                            height={32}
                            loading="lazy"
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{t.author}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.source === "google"
                              ? `Google review${t.relative_time ? ` · ${t.relative_time}` : ""}`
                              : t.company}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>

        {google?.rating && google.review_count > 0 && (
          <div className="mt-8 text-center">
            <a
              href={placeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              Bekijk alle reviews op Google →
            </a>
          </div>
        )}
      </div>
    </section>
  );
};

const RatingStars = ({ value, small = false }: { value: number; small?: boolean }) => {
  const size = small ? "w-4 h-4" : "w-5 h-5";
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <div className="inline-flex items-center" aria-label={`${value} van 5 sterren`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full || (i === full && half);
        return (
          <Star
            key={i}
            className={`${size} ${filled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`}
          />
        );
      })}
    </div>
  );
};
