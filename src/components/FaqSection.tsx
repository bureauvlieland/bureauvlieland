import { useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  /** Sectie-kop boven de FAQ. */
  title?: string;
  /** Optionele intro-paragraaf. */
  intro?: string;
  items: FaqItem[];
  /** Unieke id voor het JSON-LD script, voorkomt botsing met andere pagina's. */
  schemaId: string;
  /** Absolute URL van de pagina; koppelt de FAQPage aan de juiste URL. */
  pageUrl?: string;
}

/**
 * Visuele FAQ-sectie + bijbehorende FAQPage JSON-LD.
 * Google geeft alleen rich-snippets als de antwoorden ook zichtbaar
 * op de pagina staan — vandaar de visuele accordion.
 */
export const FaqSection = ({
  title = "Veelgestelde vragen",
  intro,
  items,
  schemaId,
  pageUrl,
}: FaqSectionProps) => {
  useEffect(() => {
    if (!items || items.length === 0) return;

    const url =
      pageUrl ?? (typeof window !== "undefined" ? window.location.href.split("?")[0] : undefined);

    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      ...(url ? { "@id": `${url}#faq`, url, mainEntityOfPage: url } : {}),
      inLanguage: "nl-NL",
      name: title,
      mainEntity: items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    };


    const elementId = `faq-schema-${schemaId}`;
    const existing = document.getElementById(elementId);
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = elementId;
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById(elementId);
      if (el) el.remove();
    };
  }, [items, schemaId]);

  if (!items || items.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            {title}
          </h2>
          {intro && (
            <p className="text-lg text-muted-foreground mb-8">{intro}</p>
          )}
          <Accordion type="single" collapsible className="w-full">
            {items.map((item, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
                <AccordionTrigger className="text-left text-base md:text-lg font-medium">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
