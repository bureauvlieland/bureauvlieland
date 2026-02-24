import { useEffect } from 'react';

export const StructuredData = () => {
  useEffect(() => {
    // LocalBusiness Schema
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
      "areaServed": {
        "@type": "Place",
        "name": "Nederland"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": "3"
      }
    };

    // Service Schemas
    const services = [
      {
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": "Team Building",
        "provider": {
          "@type": "LocalBusiness",
          "name": "Bureau Vlieland"
        },
        "areaServed": {
          "@type": "Place",
          "name": "Nederland"
        },
        "description": "Op maat gemaakte teambuilding activiteiten op Vlieland. Van actieve uitdagingen tot creatieve workshops."
      },
      {
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": "Incentive Reizen",
        "provider": {
          "@type": "LocalBusiness",
          "name": "Bureau Vlieland"
        },
        "areaServed": {
          "@type": "Place",
          "name": "Nederland"
        },
        "description": "Beloon uw team met een uniek incentive arrangement op Vlieland. Complete verzorging van programma en accommodatie."
      },
      {
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": "Evenementen Organisatie",
        "provider": {
          "@type": "LocalBusiness",
          "name": "Bureau Vlieland"
        },
        "areaServed": {
          "@type": "Place",
          "name": "Nederland"
        },
        "description": "Organisatie van bedrijfsfeesten, netwerkevents en andere zakelijke bijeenkomsten op Vlieland."
      }
    ];

    // Reviews Schema
    const reviews = [
      {
        "@context": "https://schema.org",
        "@type": "Review",
        "itemReviewed": {
          "@type": "LocalBusiness",
          "name": "Bureau Vlieland"
        },
        "author": {
          "@type": "Person",
          "name": "Mark de Vries"
        },
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": "5",
          "bestRating": "5"
        },
        "reviewBody": "Een fantastische ervaring! Het team van Bureau Vlieland heeft ons bedrijfsuitje tot in de puntjes verzorgd."
      },
      {
        "@context": "https://schema.org",
        "@type": "Review",
        "itemReviewed": {
          "@type": "LocalBusiness",
          "name": "Bureau Vlieland"
        },
        "author": {
          "@type": "Person",
          "name": "Linda van der Berg"
        },
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": "5",
          "bestRating": "5"
        },
        "reviewBody": "Professionele organisatie en geweldige begeleiding. Onze teambuilding was een groot succes!"
      },
      {
        "@context": "https://schema.org",
        "@type": "Review",
        "itemReviewed": {
          "@type": "LocalBusiness",
          "name": "Bureau Vlieland"
        },
        "author": {
          "@type": "Person",
          "name": "Peter Janssen"
        },
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": "5",
          "bestRating": "5"
        },
        "reviewBody": "Creatieve programma's en uitstekende service. Aanrader voor elk bedrijf dat een uniek uitje zoekt."
      }
    ];

    // Insert all schemas
    const schemas = [localBusiness, ...services, ...reviews];
    
    schemas.forEach((schema, index) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = `structured-data-${index}`;
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
    });

    // Cleanup
    return () => {
      schemas.forEach((_, index) => {
        const script = document.getElementById(`structured-data-${index}`);
        if (script) {
          document.head.removeChild(script);
        }
      });
    };
  }, []);

  return null;
};
