import { RatingStars } from "@/components/RatingStars";
import type { DisplayReview } from "@/lib/reviews";
import { cn } from "@/lib/utils";

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n).trimEnd() + "…" : s);

/**
 * Eén beoordeling als kaart (ontwerpsysteem): sterren alleen als er een
 * echte score is, het citaat in Fraunces, daaronder naam en organisatie of
 * de Google-herkomst. Gebruikt door de klantquotes op de homepage en het
 * reviewblok op landings- en activiteitpagina's.
 */
export const ReviewCard = ({ review, maxLength = 320, className }: { review: DisplayReview; maxLength?: number; className?: string }) => (
  <figure className={cn("flex h-full flex-col rounded-lg border border-border bg-card p-6", className)}>
    {review.rating !== null && <RatingStars value={review.rating} small />}
    <blockquote className="mt-3 flex-1 font-display text-lg font-light leading-snug text-foreground">{truncate(review.text, maxLength)}</blockquote>
    <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-4">
      {review.photo && <img src={review.photo} alt="" width={32} height={32} loading="lazy" className="h-8 w-8 rounded-full object-cover" />}
      <span>
        <span className="block text-sm font-medium text-foreground">{review.author}</span>
        {review.meta && <span className="block text-xs text-muted-foreground">{review.meta}</span>}
      </span>
    </figcaption>
  </figure>
);
