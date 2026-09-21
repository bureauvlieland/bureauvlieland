import { Container, Pill, Section, SectionHeader, type SectionTone } from "@/components/system";

const CARDS = [
  {
    pill: "Verbinder",
    title: "Tussen eiland en beleid",
    text: "Erwin staat met één been in het dorp en één been in projecten en samenwerkingen rond de Waddeneilanden. Zo helpen wij partijen elkaar te vinden en ideeën te vertalen naar werkbare plannen op Vlieland.",
    points: [
      "Betrokken bij projecten als Het Wad Gaat Om, Waddentafel en Regiodeal Waddeneilanden",
      "Verbinding tussen overheden, organisaties en lokale ondernemers",
      "Lokale vertaling van beleidsplannen naar haalbare acties",
      "Begeleiding van initiatieven die bijdragen aan de leefbaarheid van Vlieland",
    ],
  },
  {
    pill: "Programma's die versterken",
    title: "Niet alleen organiseren, maar ook bijdragen",
    text: "Voor ons is een goed programma meer dan een strak schema. Het moet kloppen voor de groep én voor het eiland. Daarom kiezen wij voor programma's die rust, respect voor natuur en eerlijke samenwerking met lokale partijen centraal zetten.",
    points: [
      "Programma's die de schaal en het ritme van Vlieland respecteren",
      "Ruimte voor natuur, cultuur en het echte eilandleven",
      "Samenwerking met lokale gidsen, ondernemers en organisaties",
    ],
  },
];

/** De rol van Bureau Vlieland als verbinder, op de pagina Over ons. */
export const Verbinder = ({ number, tone }: { number: string; tone: SectionTone }) => (
  <Section id="verbinder" tone={tone}>
    <Container size="wide">
      <SectionHeader
        eyebrow="Over ons"
        number={number}
        title="Verbinder en liaison voor projecten op Vlieland"
        intro="Naast programma's voor groepen werkt Bureau Vlieland ook als verbinder en liaison voor overheden, organisaties en initiatieven die iets op Vlieland willen realiseren. In die rol werkt Erwin op het snijvlak van eiland en beleid."
      />
      <div className="mt-12 grid gap-4 lg:grid-cols-2">
        {CARDS.map((card) => (
          <div key={card.title} className="rounded-lg border border-border bg-card p-6 md:p-8">
            <Pill tone="brand">{card.pill}</Pill>
            <h3 className="mt-4 font-display text-display-md font-medium text-foreground">{card.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.text}</p>
            <ul className="mt-5 space-y-2 text-sm text-foreground">
              {card.points.map((point) => (
                <li key={point} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Container>
  </Section>
);
