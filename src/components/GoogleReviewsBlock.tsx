import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Container, Section, SectionHeader } from "@/components/system";
import { RatingStars } from "@/components/RatingStars";

interface GoogleReview {
  author_name: string;
  author_uri?: string | null;
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
  fetched_at: string;
}

interface Props {
  /** Hoeveel reviews maximaal tonen (overschrijft setting). */
  limit?: number;
  /** Toon alleen reviews met deze sterren of meer. Default 4. */
  minRating?: number;
  className?: string;
  /** Headline tekst. */
  title?: string;
  /** Optionele intro onder de headline. */
  subtitle?: string;
}

const REVIEW_LINK_FALLBACK = "https://g.page/r/bureauvlieland/review";

export const GoogleReviewsBlock = ({
  limit,
  minRating = 4,
  className = "",
  title = "Wat klanten zeggen",
  subtitle = "Recente Google-reviews over Bureau Vlieland",
}: Props) => {
  const [data, setData] = useState<CacheRow | null>(null);
  const [showCount, setShowCount] = useState<number>(3);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: cache }, { data: setting }] = await Promise.all([
        supabase
          .from("google_reviews_cache")
          .select("rating, review_count, reviews, place_url, fetched_at")
          .eq("id", "singleton")
          .maybeSingle(),
        supabase
          .from("app_settings")
          .select("value")
          .eq("id", "google_reviews_show_count")
          .maybeSingle(),
      ]);
      if (!alive) return;
      if (cache) setData(cache as unknown as CacheRow);
      const n = Number(setting?.value ?? 3);
      if (!Number.isNaN(n) && n > 0) setShowCount(n);
    })();
    return () => { alive = false; };
  }, []);

  if (!data || !data.rating || data.review_count === 0) return null;

  const filtered = (data.reviews || []).filter((r) => (r.rating ?? 0) >= minRating);
  const max = limit ?? showCount;
  const visible = filtered.slice(0, Math.min(max, 5));
  const writeUrl = data.place_url ? `${data.place_url}` : REVIEW_LINK_FALLBACK;

  return (
    <Section className={className}>
      <Container size="wide">
        <div className="mb-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <RatingStars value={data.rating} />
            <span className="text-lg font-medium text-foreground">
              {data.rating.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">
              · {data.review_count} Google-reviews
            </span>
          </div>
          <SectionHeader as="h2" title={title} intro={subtitle} align="center" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {visible.map((r, i) => (
            <article
              key={i}
              className="flex flex-col rounded-lg border border-border bg-card p-6"
            >
              <RatingStars value={r.rating} small />
              <p className="mt-3 text-foreground leading-relaxed flex-1">
                {truncate(r.text, 260)}
              </p>
              <footer className="mt-4 flex items-center gap-3">
                {r.author_photo && (
                  <img
                    src={r.author_photo}
                    alt=""
                    width={32}
                    height={32}
                    loading="lazy"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <div className="text-sm">
                  <div className="font-medium text-foreground">{r.author_name}</div>
                  {r.relative_time && (
                    <div className="text-muted-foreground">{r.relative_time}</div>
                  )}
                </div>
              </footer>
            </article>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href={writeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-medium text-primary underline underline-offset-4 hover:text-ocean-deep"
          >
            Bekijk alle reviews op Google
          </a>
        </div>
      </Container>
    </Section>
  );
};

const truncate = (s: string, n: number) =>
  s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
