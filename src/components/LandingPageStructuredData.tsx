import { useEffect } from "react";

interface LandingPageStructuredDataProps {
  serviceName: string;
  serviceDescription: string;
  canonicalUrl: string;
  breadcrumbItems: Array<{
    name: string;
    url: string;
  }>;
}

export const LandingPageStructuredData = ({
  serviceName,
  serviceDescription,
  canonicalUrl,
  breadcrumbItems,
}: LandingPageStructuredDataProps) => {
  useEffect(() => {
    // Service schema
    const serviceSchema = {
      "@context": "https://schema.org",
      "@type": "Service",
      name: serviceName,
      description: serviceDescription,
      provider: {
        "@type": "LocalBusiness",
        name: "Bureau Vlieland",
        url: "https://bureauvlieland.nl",
        telephone: "+31562700208",
        email: "hallo@bureauvlieland.nl",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Dorpsstraat 99",
          addressLocality: "Oost-Vlieland",
          postalCode: "8899 AB",
          addressCountry: "NL"
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: 53.2958,
          longitude: 5.0645
        },
        areaServed: {
          "@type": "Country",
          name: "Nederland"
        }
      },
      areaServed: {
        "@type": "Country",
        name: "Nederland"
      },
      serviceType: "Evenementenorganisatie",
      url: canonicalUrl
    };

    // BreadcrumbList schema
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbItems.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url
      }))
    };

    // Create and inject script elements
    const serviceScript = document.createElement("script");
    serviceScript.type = "application/ld+json";
    serviceScript.text = JSON.stringify(serviceSchema);
    serviceScript.id = "landing-service-schema";

    const breadcrumbScript = document.createElement("script");
    breadcrumbScript.type = "application/ld+json";
    breadcrumbScript.text = JSON.stringify(breadcrumbSchema);
    breadcrumbScript.id = "landing-breadcrumb-schema";

    document.head.appendChild(serviceScript);
    document.head.appendChild(breadcrumbScript);

    return () => {
      const existingServiceScript = document.getElementById("landing-service-schema");
      const existingBreadcrumbScript = document.getElementById("landing-breadcrumb-schema");
      if (existingServiceScript) existingServiceScript.remove();
      if (existingBreadcrumbScript) existingBreadcrumbScript.remove();
    };
  }, [serviceName, serviceDescription, canonicalUrl, breadcrumbItems]);

  return null;
};
