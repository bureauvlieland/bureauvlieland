import { Container, Section, SectionHeader, type SectionTone } from "@/components/system";
import { RatingStars } from "@/components/RatingStars";
import { REVIEW_LINK_FALLBACK, useGoogleReviewsCache } from "@/hooks/useGoogleReviewsCache";
import { usePublishedReviews } from "@/hooks/usePublishedReviews";
import { mergeWithGoogle, selectReviews, toDisplay, type ReviewScope } from "@/lib/reviews";
import { cn } from "@/lib/utils";
import { ReviewCard } from "./ReviewCard";

/**
 * Beoordelingen op een landings- of activiteitpagina (fase 2 van
 * docs/plan-reviews-oogsten.md). Eigen gepubliceerde beoordelingen die bij
 * de pagina passen komen eerst; met `fallbackToGoogle` vullen Google-reviews
 * aan en staat de Google-score erbij. Zonder passende beoordelingen en
 * zonder Google-aanvulling verdwijnt het blok helemaal.
 */
interface ReviewsBlockProps {
  scope?: ReviewScope;
  limit?: number;
  /** Google-reviews als aanvulling (landingspagina's); uit op activiteitpagina's. */
  fallbackToGoogle?: boolean;
  title?: string;
  /** Intro als er alleen Google-reviews staan; met eigen beoordelingen komt er een eigen intro. */
  subtitle?: string;
  number?: string;
  tone?: SectionTone;
  className?: string;
}

export const ReviewsBlock = ({
  scope = {},
  limit = 3,
  fallbackToGoogle = true,
  title = "Wat klanten zeggen",
  subtitle = "Recente Google-reviews over Bureau Vlieland.",
  number,
  tone,
  className,
}: ReviewsBlockProps) => {
  const { data: eigen = [] } = usePublishedReviews();
  const { data: google } = useGoogleReviewsCache();

  const gekozen = selectReviews(eigen, scope, { limit, strict: !fallbackToGoogle });
  const items = fallbackToGoogle ? mergeWithGoogle(gekozen, google?.reviews ?? [], limit) : gekozen.map(toDisplay);
  if (items.length === 0) return null;

  const toonGoogle = fallbackToGoogle && Boolean(google?.rating && google.review_count > 0);
  const intro =
    gekozen.length > 0
      ? fallbackToGoogle
        ? "Ervaringen van groepen die met ons op Vlieland waren, aangevuld met recente Google-reviews."
        : "Ervaringen van groepen die deze activiteit bij ons deden."
      : subtitle;

  return (
    <Section tone={tone} className={className}>
      <Container size="wide">
        <SectionHeader as="h2" eyebrow="Ervaringen" number={number} title={title} intro={intro} align="center" />
        {toonGoogle && google?.rating && (
          <p className="mt-6 flex items-center justify-center gap-2">
            <RatingStars value={google.rating} />
            <span className="font-medium text-foreground">{google.rating.toFixed(1).replace(".", ",")}</span>
            <span className="text-sm text-muted-foreground">· {google.review_count} Google-reviews</span>
          </p>
        )}
        <div
          className={cn(
            "mt-10 grid gap-4",
            items.length >= 3 ? "md:grid-cols-3" : items.length === 2 ? "md:mx-auto md:max-w-4xl md:grid-cols-2" : "md:mx-auto md:max-w-xl",
          )}
        >
          {items.map((r) => (
            <ReviewCard key={r.key} review={r} maxLength={260} />
          ))}
        </div>
        {toonGoogle && (
          <p className="mt-8 text-center">
            <a
              href={google?.place_url || REVIEW_LINK_FALLBACK}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-4 hover:text-ocean-deep"
            >
              Bekijk alle reviews op Google
            </a>
          </p>
        )}
      </Container>
    </Section>
  );
};
