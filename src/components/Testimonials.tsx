import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Container, Section, SectionHeader } from "@/components/system";
import { RatingStars } from "@/components/RatingStars";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { REVIEW_LINK_FALLBACK, useGoogleReviewsCache } from "@/hooks/useGoogleReviewsCache";
import { usePublishedReviews } from "@/hooks/usePublishedReviews";
import { mergeWithGoogle } from "@/lib/reviews";

/**
 * Klantquotes op de homepage: de eigen gepubliceerde beoordelingen (nieuwste
 * eerst, inclusief de citaten van vóór de beoordelingspagina) aangevuld met
 * de Google-reviews uit de cache, in een carrousel omdat het er meer dan
 * drie zijn. Sterren alleen bij een echte score.
 */
export const Testimonials = ({ number }: { number: string }) => {
  const { data: google } = useGoogleReviewsCache();
  const { data: eigen = [] } = usePublishedReviews();

  const testimonials = mergeWithGoogle(eigen, google?.reviews ?? [], 12);
  const hasRating = Boolean(google?.rating && google.review_count > 0);
  const placeUrl = google?.place_url || REVIEW_LINK_FALLBACK;

  if (testimonials.length === 0) return null;

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
            {testimonials.map((t) => (
              <CarouselItem key={t.key} className="md:basis-1/2 lg:basis-1/3">
                <ReviewCard review={t} />
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
