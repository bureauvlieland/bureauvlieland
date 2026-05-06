import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Helmet } from "react-helmet";

const faqs = [
  {
    q: "Wanneer kies ik voor zelf samenstellen en wanneer voor maatwerk?",
    a: "Heeft u een redelijk helder beeld van wat u wilt en is uw groep tot circa 30 personen? Dan komt u met de configurator snel uit. Bij grotere groepen, complexere wensen of als u liever even sparren wilt, is maatwerk fijner. Wij denken graag met u mee.",
  },
  {
    q: "Wie is mijn aanspreekpunt?",
    a: "Vanaf het moment dat u contact opneemt heeft u één vast aanspreekpunt bij Bureau Vlieland. Tijdens uw verblijf op het eiland staat er bovendien een lokale contactpersoon klaar voor de praktische zaken.",
  },
  {
    q: "Wat regelen jullie wel — en wat niet?",
    a: "Wij ontwikkelen het programma en boeken alle eilandpartners (activiteiten, gidsen, catering, vervoer en eventueel logies) voor u. U krijgt één factuur. Inhoudelijke onderdelen die u zelf wilt verzorgen (een trainer, eigen spreker, eigen materialen) blijven uw verantwoordelijkheid — wij stemmen praktisch met u af.",
  },
  {
    q: "Hoe zit het met aanbetaling en annulering?",
    a: "Voor de meeste programma's vragen wij een aanbetaling bij bevestiging. De annuleringsvoorwaarden vindt u in onze algemene voorwaarden en worden vóór akkoord altijd transparant met u gedeeld.",
  },
  {
    q: "Kan ik later nog wijzigingen doorgeven?",
    a: "Ja. We snappen dat aantallen en wensen kunnen schuiven. Tot kort voor uw bezoek is er ruimte om bij te sturen — afhankelijk van wat de eilandpartners aankunnen. Hoe eerder u het laat weten, hoe meer er mogelijk is.",
  },
];

export const WerkwijzeFaq = () => {
  return (
    <section className="py-16 sm:py-20 bg-background">
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          })}
        </script>
      </Helmet>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
            Veelgestelde vragen
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            Antwoord op de vragen die we het vaakst krijgen.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`}>
              <AccordionTrigger className="text-left font-display font-semibold">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
