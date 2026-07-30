import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://bureauvlieland.nl";

/** Routes waar structured data niet gewenst is (noindex / afgeschermd). */
const EXCLUDED_PREFIXES = [
  "/admin",
  "/partner",
  "/mijn-programma",
  "/mijn-logies",
  "/programma/",
  "/programma-deelnemers",
  "/logies/",
  "/concept/",
  "/links",
];

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Bureau Vlieland",
  legalName: "Bureau Vlieland",
  url: SITE_URL,
  logo: `${SITE_URL}/og-image.png`,
  image: `${SITE_URL}/og-image.png`,
  description:
    "Bureau Vlieland is het lokale boekingskantoor en programmabureau voor Vlieland. Wij regelen activiteiten, catering, logies en de overtocht voor groepen — één aanspreekpunt, één factuur.",
  email: "hallo@bureauvlieland.nl",
  telephone: "+31562700208",
  founder: { "@type": "Person", name: "Erwin Soolsma" },
  address: {
    "@type": "PostalAddress",
    streetAddress: "Sikkelduin 11",
    postalCode: "8899 CG",
    addressLocality: "Vlieland",
    addressCountry: "NL",
  },
  areaServed: { "@type": "Place", name: "Vlieland, Nederland" },
  sameAs: [
    "https://www.instagram.com/bureau_vlieland/",
    "https://www.facebook.com/bureauvlieland/",
  ],
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "hallo@bureauvlieland.nl",
      telephone: "+31562700208",
      availableLanguage: ["nl", "en"],
      areaServed: "NL",
    },
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "Bureau Vlieland",
  url: SITE_URL,
  inLanguage: "nl-NL",
  publisher: { "@id": `${SITE_URL}/#organization` },
};

/**
 * Sitewide Organization + WebSite JSON-LD.
 * Wordt één keer in App gemount en injecteert op elke publieke pagina.
 * De homepage heeft een uitgebreider LocalBusiness-schema (StructuredData),
 * daar slaan we deze over om dubbele entiteiten te voorkomen.
 */
export const SiteStructuredData = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const isExcluded =
      pathname === "/" ||
      EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    if (isExcluded) return;

    const schemas = [organizationSchema, websiteSchema];
    const nodes = schemas.map((schema, index) => {
      const id = `site-schema-${index}`;
      document.getElementById(id)?.remove();
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = id;
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
      return script;
    });

    return () => {
      nodes.forEach((node) => node.remove());
    };
  }, [pathname]);

  return null;
};
