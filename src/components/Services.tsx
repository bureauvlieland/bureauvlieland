import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const services = [
  {
    pill: "Programma & regie",
    title: "Maatwerkprogramma's met één regisseur",
    description: "We ontwerpen het programma, maken de planning en bewaken het geheel. Zo voorkomen we losse eindjes, te volle schema's en onnodige stress op de dag zelf.",
    items: [
      "Ontwerp van eendaagse en meerdaagse programma's",
      "Duidelijke draaiboeken voor alle betrokkenen",
      "Afstemming met locaties, activiteiten en vervoer",
      "Regie op locatie waar dat waarde toevoegt",
    ],
  },
  {
    pill: "Professionele inhoud",
    title: "Leiderschap, teams en mindset",
    description: "Voor de inhoud van programma's werken we samen met professionele partners van de vaste wal. Zo combineren we de kracht van Vlieland met diepgaande leer- en ontwikkelprogramma's.",
    items: [
      "Ervaringsgerichte leiderschaps- en teamtrainingen met RMD Trainingen",
      "Programma's rond mindset, talent en groei met Mindset22",
      "Koppeling tussen inhoud, locatie en programma-opbouw",
      "Een setting die uitnodigt tot reflectie én actie",
    ],
  },
  {
    pill: "Catering & gidsen",
    title: "Goede plekken, goed eten, lokale begeleiding",
    description: "Met een netwerk van horecapartners, cateraars en lokale gidsen zorgen we dat eten, locaties en activiteiten logisch in het programma vallen en bijdragen aan de beleving.",
    items: [
      "Catering op passende locaties op het eiland",
      "Lokale gidsen voor natuur, cultuur en buitenactiviteiten",
      "Programma's met realistisch tempo en ruimte",
      "Altijd afgestemd op seizoen, weer en capaciteit",
    ],
  },
];

export const Services = () => {
  return (
    <section id="wat-wij-doen" className="py-16 sm:py-20 lg:py-24 bg-background relative overflow-hidden">
      <div className="absolute top-20 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
        <div className="mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
            Wat wij doen voor groepen op Vlieland
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed">
            We helpen groepen die meer nodig hebben dan een paar losse reserveringen. Samen bouwen we aan een dag of weekend
            dat klopt: in inhoud, logistiek, beleving en rust. Of het nu gaat om een teamdag, heidag, retreat of een
            bijzonder programma voor een familie- of vriendengroep.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service, index) => (
            <Card key={index} className="border-border hover:shadow-soft transition-all duration-300">
              <CardHeader>
                <Badge className="w-fit mb-3 bg-accent-soft text-primary border-0 uppercase tracking-widest text-xs">
                  {service.pill}
                </Badge>
                <CardTitle className="text-xl mb-3">{service.title}</CardTitle>
                <p className="text-muted-foreground text-sm leading-relaxed">{service.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {service.items.map((item, idx) => (
                    <li key={idx} className="text-sm text-foreground pl-4 relative">
                      <span className="absolute left-0">–</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
