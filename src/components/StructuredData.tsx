import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CachedReview {
  author_name: string;
  rating: number;
  text: string;
}

interface CacheRow {
  rating: number | null;
  review_count: number;
  reviews: CachedReview[];
}

const FALLBACK_RATING = "4.9";
const FALLBACK_COUNT = "3";

const FALLBACK_REVIEWS: CachedReview[] = [
  { author_name: "Mark de Vries", rating: 5, text: "Een fantastische ervaring! Het team van Bureau Vlieland heeft ons bedrijfsuitje tot in de puntjes verzorgd." },
  { author_name: "Linda van der Berg", rating: 5, text: "Professionele organisatie en geweldige begeleiding. Onze teambuilding was een groot succes!" },
  { author_name: "Peter Janssen", rating: 5, text: "Creatieve programma's en uitstekende service. Aanrader voor elk bedrijf dat een uniek uitje zoekt." },
];

export const StructuredData = () => {
  const [cache, setCache] = useState<CacheRow | null>(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from("google_reviews_cache")
      .select("rating, review_count, reviews")
      .eq("id", "singleton")
      .maybeSingle()
      .then(({ data }) => {
        if (alive && data) setCache(data as unknown as CacheRow);
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const hasLive = cache && cache.rating && cache.review_count > 0;
    const ratingValue = hasLive ? String(cache!.rating) : FALLBACK_RATING;
    const reviewCount = hasLive ? String(cache!.review_count) : FALLBACK_COUNT;
    const reviewsForSchema: CachedReview[] = hasLive
      ? (cache!.reviews || []).filter(r => (r.rating ?? 0) >= 4).slice(0, 5)
      : FALLBACK_REVIEWS;

    const localBusiness = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": "Bureau Vlieland",
      "description": "Specialist in teambuilding, incentives en evenementen op Vlieland. Wij verzorgen unieke arrangementen en groepsuitjes op het prachtige Waddeneiland.",
      "url": "https://bureauvlieland.nl",
      "logo": "https://bureauvlieland.nl/og-image.png",
      "image": "https://bureauvlieland.nl/og-image.png",
      "telephone": "+31562700208",
      "email": "hallo@bureauvlieland.nl",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Sikkelduin 11",
        "postalCode": "8899 CG",
        "addressLocality": "Vlieland",
        "addressCountry": "NL"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "53.2944",
        "longitude": "5.0639"
      },
      "priceRange": "€€",
      "areaServed": { "@type": "Place", "name": "Nederland" },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": ratingValue,
        "reviewCount": reviewCount
      }
    };

    const services = [
      { serviceType: "Team Building", description: "Op maat gemaakte teambuilding activiteiten op Vlieland. Van actieve uitdagingen tot creatieve workshops." },
      { serviceType: "Incentive Reizen", description: "Beloon uw team met een uniek incentive arrangement op Vlieland. Complete verzorging van programma en accommodatie." },
      { serviceType: "Evenementen Organisatie", description: "Organisatie van bedrijfsfeesten, netwerkevents en andere zakelijke bijeenkomsten op Vlieland." },
    ].map(s => ({
      "@context": "https://schema.org",
      "@type": "Service",
      "serviceType": s.serviceType,
      "provider": { "@type": "LocalBusiness", "name": "Bureau Vlieland" },
      "areaServed": { "@type": "Place", "name": "Nederland" },
      "description": s.description,
    }));

    const reviews = reviewsForSchema.map(r => ({
      "@context": "https://schema.org",
      "@type": "Review",
      "itemReviewed": { "@type": "LocalBusiness", "name": "Bureau Vlieland" },
      "author": { "@type": "Person", "name": r.author_name },
      "reviewRating": { "@type": "Rating", "ratingValue": String(r.rating), "bestRating": "5" },
      "reviewBody": r.text,
    }));

    const schemas = [localBusiness, ...services, ...reviews];

    schemas.forEach((schema, index) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = `structured-data-${index}`;
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
    });

    return () => {
      schemas.forEach((_, index) => {
        const script = document.getElementById(`structured-data-${index}`);
        if (script) document.head.removeChild(script);
      });
    };
  }, [cache]);

  return null;
};
