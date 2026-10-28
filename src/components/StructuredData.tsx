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

/**
 * Score, aantal en reviews komen uitsluitend uit de Google-reviewcache. Is
 * die leeg, dan laten we ze weg: structured data met verzonnen beoordelingen
 * is tegen de richtlijnen van Google en schaadt het vertrouwen als het
 * zichtbaar wordt (de oude fallback had drie bedachte namen met een 4,9).
 */
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
    const hasLive = Boolean(cache && cache.rating && cache.review_count > 0);
    const reviewsForSchema: CachedReview[] = hasLive
      ? (cache!.reviews || []).filter(r => (r.rating ?? 0) >= 4).slice(0, 5)
      : [];

    const localBusiness: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": "Bureau Vlieland",
      "description": "Specialist in teambuilding, incentives en evenementen op Vlieland. Wij verzorgen unieke arrangementen en groepsuitjes op het prachtige Waddeneiland.",
      "url": "https://bureauvlieland.nl",
      "logo": "https://bureauvlieland.nl/og-image.jpg",
      "image": "https://bureauvlieland.nl/og-image.jpg",
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
      "founder": { "@type": "Person", "name": "Erwin Soolsma" },
      "sameAs": [
        "https://www.instagram.com/bureau_vlieland/",
        "https://www.facebook.com/bureauvlieland/",
        "https://www.linkedin.com/company/bureau-vlieland/"
      ],
      "areaServed": { "@type": "Place", "name": "Nederland" },
    };
    if (hasLive) {
      localBusiness.aggregateRating = {
        "@type": "AggregateRating",
        "ratingValue": String(cache!.rating),
        "reviewCount": String(cache!.review_count),
      };
    }

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

    const website = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Bureau Vlieland",
      "url": "https://bureauvlieland.nl",
      "inLanguage": "nl-NL",
      "publisher": { "@type": "Organization", "name": "Bureau Vlieland" },
    };

    const schemas = [localBusiness, website, ...services, ...reviews];


    schemas.forEach((schema, index) => {
      // De geprerenderde HTML bevat deze scripts al; vervangen, niet verdubbelen.
      document.getElementById(`structured-data-${index}`)?.remove();
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
