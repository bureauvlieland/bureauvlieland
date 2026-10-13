import type { ReactNode } from "react";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerPage } from "@/components/partner-portal/PartnerPage";
import { usePartnerContext } from "@/lib/partnerPortalContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Notice } from "@/components/system";
import { BedDouble, BookOpen, Calendar, ClipboardList, HelpCircle, MessageSquare, Package, Receipt, UserPlus } from "lucide-react";
import { GENERAL_CONTACT_EMAIL, PURCHASE_INVOICE_INBOX } from "@/lib/bureauContact";

/**
 * Handleidingen (partnerportaal fase 4): één lijst van onderwerpen met
 * uitklapbare vragen, op de koppen en de `Notice` van het ontwerpsysteem.
 * De tekst beschrijft het portaal zoals het nu is (werkbank, projecten,
 * aanbod, facturatie) in de u-vorm.
 */
interface Topic {
  id: string;
  title: string;
  intro: string;
  icon: ReactNode;
  items: { id: string; question: string; answer: ReactNode }[];
}

const Steps = ({ items }: { items: ReactNode[] }) => (
  <ol className="list-decimal space-y-1.5 pl-5">
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ol>
);

const Points = ({ items }: { items: ReactNode[] }) => (
  <ul className="list-disc space-y-1.5 pl-5">
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
);

export const PartnerGuidesContent = () => {
  const { partner } = usePartnerContext();
  const isActivityPartner = partner.partner_type === "activity_provider" || partner.partner_type === "both" || !partner.partner_type;
  const isAccommodationPartner = partner.partner_type === "accommodation" || partner.partner_type === "both";
  const activityCommission = `${partner.commission_percentage ?? 10}%`;
  const accommodationCommission = `${partner.accommodation_commission_percentage ?? 10}%`;

  const topics: Topic[] = [
    {
      id: "start",
      title: "Aan de slag",
      intro: "De eerste stappen om uw account in te richten.",
      icon: <UserPlus />,
      items: [
        {
          id: "activeren",
          question: "Account activeren",
          answer: (
            <>
              <p>U kunt op twee manieren voor het eerst inloggen.</p>
              <Points
                items={[
                  <>
                    <strong>Direct inloggen</strong> met het e-mailadres en het wachtwoord dat u van Bureau Vlieland heeft gekregen. Uw account wordt bij de eerste login geactiveerd.
                  </>,
                  <>
                    <strong>Via de activatielink</strong> in de uitnodigingsmail, waarmee u zelf een wachtwoord kiest.
                  </>,
                ]}
              />
              <Notice tone="info">
                <p>De activatielink is 24 uur geldig. Direct inloggen kan altijd.</p>
              </Notice>
            </>
          ),
        },
        {
          id: "voorwaarden",
          question: "Algemene voorwaarden instellen",
          answer: (
            <>
              <p>Voordat klanten uw aanbod boeken, kiest u onder Instellingen hoe uw voorwaarden worden getoond.</p>
              <Points
                items={[
                  <>
                    <strong>Eigen voorwaarden</strong>: upload een pdf.
                  </>,
                  <>
                    <strong>Standaardvoorwaarden</strong> van Bureau Vlieland voor partneraanbod.
                  </>,
                ]}
              />
              <Notice tone="info" title="Waarom dit belangrijk is">
                <p>Bij elke boeking gaat de klant akkoord met uw voorwaarden. Dat is een bindende afspraak en wordt vastgelegd.</p>
              </Notice>
            </>
          ),
        },
        {
          id: "wachtwoord",
          question: "Wachtwoord vergeten of wijzigen",
          answer: (
            <>
              <p>Een nieuw wachtwoord kiest u onder Instellingen. Bent u het kwijt, dan vraagt u op de inlogpagina een nieuwe aan.</p>
              <Steps items={["Ga naar de inlogpagina.", "Vul uw e-mailadres in.", 'Kies "Wachtwoord vergeten?".', "U ontvangt een e-mail met een link om een nieuw wachtwoord in te stellen."]} />
              <Notice tone="info">
                <p>De link in de e-mail is een uur geldig.</p>
              </Notice>
            </>
          ),
        },
        {
          id: "gegevens",
          question: "Bedrijfsgegevens bijwerken",
          answer: (
            <>
              <p>Houd uw gegevens bij voor een juiste facturatie. Dat doet u onder Instellingen.</p>
              <Points items={["Adres, voor de correspondentie en de commissiefacturen.", "KvK-nummer en IBAN, die Bureau Vlieland voor u beheert.", "Tenaamstelling van uw bankrekening.", "Contactpersoon voor boekingen, als dat iemand anders is."]} />
            </>
          ),
        },
      ],
    },
    {
      id: "werkbank",
      title: "Werkbank en projecten",
      intro: "Waar u ziet wat er van u wordt verwacht.",
      icon: <ClipboardList />,
      items: [
        {
          id: "werkbank",
          question: "De werkbank",
          answer: (
            <>
              <p>De werkbank begint met de belangrijkste volgende stap en zet daaronder uw taken per fase bij elkaar.</p>
              <Points
                items={[
                  <>
                    <strong>Beoordelen</strong>: aanvragen die op uw reactie wachten.
                  </>,
                  <>
                    <strong>Wijzigingen</strong>: een klant die een andere tijd voorstelt.
                  </>,
                  <>
                    <strong>Inplannen</strong>: bevestigde onderdelen die eraan komen.
                  </>,
                  <>
                    <strong>Factureren</strong>: uitgevoerde onderdelen zonder factuur.
                  </>,
                ]}
              />
              <p>Is alles gedaan, dan ziet u dat ook.</p>
            </>
          ),
        },
        {
          id: "projecten",
          question: "Projecten",
          answer: (
            <>
              <p>Onder Projecten staan al uw aanvragen, gesorteerd op de eerstvolgende datum, met de status in uw woorden: wacht op uw reactie, wacht op de klant, bevestigd, te factureren, gefactureerd. Zoeken kan op naam, bedrijf of referentie; afgeronde en geannuleerde projecten staan in het archief.</p>
            </>
          ),
        },
        {
          id: "referentie",
          question: "Referentienummer en versie",
          answer: (
            <>
              <p>Elk project heeft een referentienummer als BV-2601-0001. Vermeld het op uw factuur; zo verwerken wij hem snel. Wijzigt de klant iets, dan ziet u een versienummer bij het onderdeel.</p>
            </>
          ),
        },
        {
          id: "planning",
          question: "Planning",
          answer: <p>Onder Planning staan de onderdelen van Bureau Vlieland per week naast de boekingen uit uw eigen agenda in MijnActiviteitenplanner, als die gekoppeld is.</p>,
        },
      ],
    },
    {
      id: "aanvragen",
      title: "Aanvragen beantwoorden",
      intro: "Hoe u reageert op een onderdeel in een programma.",
      icon: <MessageSquare />,
      items: [
        {
          id: "nieuw",
          question: "Een nieuwe aanvraag",
          answer: (
            <>
              <p>Zet Bureau Vlieland uw aanbod in een programma, dan krijgt u een e-mail en staat het onderdeel op uw werkbank onder Beoordelen, met datum, gewenste tijd, aantal personen en de wensen van de klant.</p>
            </>
          ),
        },
        {
          id: "bevestigen",
          question: "Bevestigen",
          answer: (
            <>
              <p>Open het onderdeel en kies Bevestigen. U vult in:</p>
              <Points
                items={[
                  <>
                    <strong>Totaalprijs incl. btw</strong> voor het aantal personen, als die afwijkt van de inschatting.
                  </>,
                  <>
                    <strong>Tijd</strong>, als u een ander tijdstip voorstelt.
                  </>,
                  <>
                    <strong>Toelichting</strong> voor de klant.
                  </>,
                ]}
              />
              <p>De klant ziet uw bevestiging in zijn programma. De verwachte commissie ({activityCommission}) staat er vast bij.</p>
              <Notice tone="warning">
                <p>Na bevestiging wijzigt u de datum of tijd niet meer zelf; neem daarvoor contact op met Bureau Vlieland.</p>
              </Notice>
            </>
          ),
        },
        {
          id: "alternatief",
          question: "Een andere tijd of prijs voorstellen",
          answer: (
            <>
              <p>Past het gevraagde tijdstip niet, kies dan Andere tijd of prijs en vul uw voorstel in. De klant kan het aannemen of een tegenvoorstel doen; u hoort het op de werkbank onder Wijzigingen.</p>
            </>
          ),
        },
        {
          id: "niet-beschikbaar",
          question: "Niet beschikbaar melden",
          answer: (
            <>
              <p>Kies Niet beschikbaar en geef kort de reden. Bureau Vlieland zoekt dan een alternatief voor de klant.</p>
              <Notice tone="info" title="Tip">
                <p>Blokkeer periodes waarin u er niet bent onder Instellingen; dan krijgt u in die periode geen aanvragen.</p>
              </Notice>
            </>
          ),
        },
      ],
    },
    {
      id: "beschikbaarheid",
      title: "Beschikbaarheid",
      intro: "Periodes waarin u geen aanvragen wilt.",
      icon: <Calendar />,
      items: [
        {
          id: "periodes",
          question: "Een periode blokkeren",
          answer: (
            <>
              <Steps items={["Ga naar Instellingen, onderdeel Niet beschikbaar.", "Kies Periode toevoegen.", "Kies de begin- en einddatum en geef eventueel een reden, zoals vakantie.", "Sla de periode op."]} />
              <p>In die periode stuurt Bureau Vlieland u geen aanvragen. Verwijderen kan met het prullenbakje.</p>
            </>
          ),
        },
      ],
    },
    ...(isActivityPartner
      ? [
          {
            id: "aanbod",
            title: "Aanbod",
            intro: "Wat u aanbiedt en hoe het in de programma's komt.",
            icon: <Package />,
            items: [
              {
                id: "overzicht",
                question: "Uw aanbod",
                answer: <p>Onder Aanbod staat alles wat u aanbiedt, in drie groepen: gepubliceerd, goedgekeurd en wacht op goedkeuring. Klik op een regel om de gegevens te bewerken.</p>,
              },
              {
                id: "toevoegen",
                question: "Een activiteit voorstellen",
                answer: (
                  <>
                    <Steps items={["Kies Nieuwe activiteit.", "Vul naam, beschrijving, duur en het aantal personen in.", "Vul de prijs in: per persoon, per persoon per dag, een totaalprijs of een staffel op groepsgrootte, incl. of excl. btw.", "Dien het voorstel in; na het opslaan kunt u een foto toevoegen."]} />
                    <Notice tone="warning">
                      <p>Een nieuwe activiteit wacht eerst op goedkeuring van Bureau Vlieland en is tot die tijd niet zichtbaar voor klanten.</p>
                    </Notice>
                  </>
                ),
              },
              {
                id: "status",
                question: "De status van uw aanbod",
                answer: (
                  <Points
                    items={[
                      <>
                        <strong>Wacht op goedkeuring</strong>: Bureau Vlieland beoordeelt uw voorstel.
                      </>,
                      <>
                        <strong>Goedgekeurd</strong>: beschikbaar voor maatwerk en offertes, nog niet op de site.
                      </>,
                      <>
                        <strong>Gepubliceerd</strong>: zichtbaar voor klanten op de site. Publiceren doet Bureau Vlieland; de inhoud blijft van u.
                      </>,
                    ]}
                  />
                ),
              },
              {
                id: "map",
                question: "Koppelen aan MijnActiviteitenplanner",
                answer: <p>Werkt u met MijnActiviteitenplanner, dan ziet u onder uw aanbod ook de activiteiten uit die agenda. Koppel ze aan een activiteit bij Bureau Vlieland: dan is het aanbod direct boekbaar en volgen foto, tekst en duur elke nacht uw agenda. De prijs voor groepen blijft van u.</p>,
              },
            ],
          } satisfies Topic,
        ]
      : []),
    {
      id: "facturatie",
      title: "Facturatie",
      intro: "Aan wie u factureert en hoe de commissie werkt.",
      icon: <Receipt />,
      items: [
        {
          id: "model",
          question: "Aan wie stuur ik mijn factuur?",
          answer: (
            <>
              <p>Altijd aan Bureau Vlieland, nooit rechtstreeks aan de klant. Bureau Vlieland factureert de klant en verrekent de commissie met u.</p>
              <Steps
                items={[
                  <>
                    Registreer uw factuur onder Facturatie met de pdf, of mail de pdf naar <strong>{PURCHASE_INVOICE_INBOX}</strong>.
                  </>,
                  "Bureau Vlieland factureert de klant en stuurt u een commissiefactuur.",
                ]}
              />
            </>
          ),
        },
        {
          id: "commissie",
          question: "Commissie",
          answer: (
            <>
              <p>
                Bureau Vlieland rekent commissie over het gefactureerde bedrag <strong>excl. btw</strong>: {isActivityPartner ? `${activityCommission} op onderdelen` : ""}
                {isActivityPartner && isAccommodationPartner ? " en " : ""}
                {isAccommodationPartner ? `${accommodationCommission} op logies` : ""}. De verwachte commissie ziet u al zodra u een prijs opgeeft.
              </p>
            </>
          ),
        },
        {
          id: "registreren",
          question: "Een factuur registreren",
          answer: (
            <>
              <Steps items={["Ga naar Facturatie, tabblad Nog te factureren.", "Kies bij het project Factuur registreren; meerdere onderdelen van één project gaan op één verzamelfactuur.", "Vul het factuurnummer, het bedrag incl. btw en de datum in en voeg de pdf toe.", "Heeft u de factuur al gemaild, kies dan Gefactureerd via e-mail."]} />
              <Notice tone="info" title="Tip">
                <p>Vermeld het referentienummer van het project op uw factuur.</p>
              </Notice>
            </>
          ),
        },
        {
          id: "overzicht",
          question: "Het overzicht",
          answer: <p>Onder Facturatie ziet u in het kort wat u heeft gefactureerd, wat nog openstaat en welke commissie Bureau Vlieland rekende, met de omzet per maand en de commissiefacturen van het bureau aan u met pdf.</p>,
        },
        {
          id: "betaling",
          question: "Commissiefacturen van Bureau Vlieland",
          answer: <p>Bureau Vlieland stuurt u per e-mail een commissiefactuur over uw gefactureerde onderdelen, met een betaaltermijn van veertien dagen. De factuur staat ook onder Facturatie, tabblad Commissiefacturen.</p>,
        },
      ],
    },
    ...(isAccommodationPartner
      ? [
          {
            id: "logies",
            title: "Logies",
            intro: "Offertes voor groepen die overnachten.",
            icon: <BedDouble />,
            items: [
              {
                id: "offerte",
                question: "Een offerte indienen",
                answer: (
                  <>
                    <Steps items={["Open de aanvraag onder Logies, tabblad Offerte gevraagd.", "Kies Offerte indienen.", "Kies de kamers, de verzorging en de prijs, en wat er is inbegrepen.", "Verstuur de offerte; Bureau Vlieland beoordeelt hem en stuurt hem door naar de klant."]} />
                  </>
                ),
              },
              {
                id: "wijzigen",
                question: "Een offerte aanpassen of verlengen",
                answer: <p>Zolang de klant nog niet heeft gekozen, kunt u de offerte aanpassen onder Wacht op de klant. Is de geldigheid verstreken, dan verlengt u hem onder Verlopen.</p>,
              },
              {
                id: "kamersoorten",
                question: "Kamersoorten",
                answer: (
                  <>
                    <p>Leg uw kamersoorten één keer vast onder Kamersoorten: naam, oppervlakte, bedden, maximaal personen, faciliteiten, foto's en een richtprijs. In een offerte voegt u ze dan met één klik toe.</p>
                  </>
                ),
              },
              {
                id: "extras",
                question: "Logies-extra's",
                answer: <p>Onder Logies-extra's legt u vaste extra's vast, zoals lunch, diner of parkeren, met prijs per persoon of een vast bedrag en het btw-tarief. Over extra's geldt dezelfde commissie als over logies ({accommodationCommission}).</p>,
              },
            ],
          } satisfies Topic,
        ]
      : []),
    {
      id: "vragen",
      title: "Veelgestelde vragen",
      intro: "Wat partners ons vaak vragen.",
      icon: <HelpCircle />,
      items: [
        {
          id: "per-ongeluk",
          question: "Ik heb per ongeluk een aanvraag afgewezen",
          answer: (
            <p>
              Neem direct contact op via <a href={`mailto:${GENERAL_CONTACT_EMAIL}`} className="font-medium text-primary underline">{GENERAL_CONTACT_EMAIL}</a>. Vaak kan de afwijzing nog worden teruggedraaid, afhankelijk van of de klant al bericht heeft gehad.
            </p>
          ),
        },
        {
          id: "percentage",
          question: "Kan mijn commissiepercentage worden aangepast?",
          answer: <p>Het percentage spreekt u af met Bureau Vlieland. Neem contact op als u erover wilt praten.</p>,
        },
        {
          id: "annulering",
          question: "Wat gebeurt er als de klant annuleert?",
          answer: <Points items={["U krijgt direct een e-mail.", "Het onderdeel krijgt de status Geannuleerd.", "Eventuele annuleringskosten lopen via Bureau Vlieland.", "Over geannuleerde boekingen rekenen wij geen commissie."]} />,
        },
        {
          id: "wijziging",
          question: "Kan een bevestigde boeking nog worden gewijzigd?",
          answer: (
            <p>
              Wijzigingen na bevestiging lopen via Bureau Vlieland. Mail naar <a href={`mailto:${GENERAL_CONTACT_EMAIL}`} className="font-medium text-primary underline">{GENERAL_CONTACT_EMAIL}</a> of bel 0562 700 208.
            </p>
          ),
        },
        {
          id: "maatwerk",
          question: "Wat is een maatwerkprogramma?",
          answer: <p>Naast programma's die klanten zelf samenstellen, maakt Bureau Vlieland ook programma's op maat. Voor u werkt het hetzelfde: u krijgt een aanvraag in het portaal en reageert zoals altijd.</p>,
        },
      ],
    },
  ];

  return (
      <PartnerPage title="Handleidingen" icon={<BookOpen />} size="content" description="Alles wat u moet weten over het werken met het partnerportaal van Bureau Vlieland.">
        {topics.map((topic) => (
          <section key={topic.id} aria-labelledby={`hulp-${topic.id}`} className="rounded-lg border bg-card p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-soft text-primary [&_svg]:h-5 [&_svg]:w-5" aria-hidden="true">
                {topic.icon}
              </span>
              <div>
                <h2 id={`hulp-${topic.id}`} className="font-display text-xl font-medium">
                  {topic.title}
                </h2>
                <p className="text-sm text-muted-foreground">{topic.intro}</p>
              </div>
            </div>
            <Accordion type="single" collapsible className="mt-2 w-full">
              {topic.items.map((item) => (
                <AccordionItem key={item.id} value={item.id}>
                  <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                  <AccordionContent className="space-y-3 text-muted-foreground [&_strong]:text-foreground">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}

        <Notice tone="info" title="Nog vragen?">
          <p>
            Mail naar <a href={`mailto:${GENERAL_CONTACT_EMAIL}`} className="font-medium underline">{GENERAL_CONTACT_EMAIL}</a> of bel <a href="tel:0562700208" className="font-medium underline">0562 700 208</a>.
          </p>
        </Notice>
      </PartnerPage>
  );
};

const PartnerGuides = () => (
  <PartnerLayout>
    <PartnerGuidesContent />
  </PartnerLayout>
);

export default PartnerGuides;
