import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Utensils, CheckCircle2 } from "lucide-react";

const services = [
  {
    pill: "Programma & regie",
    icon: Calendar,
    title: "Complete programma's met één regisseur",
    description: "Wij ontwerpen jullie programma van A tot Z en houden op de dag zelf de regie. Zo loopt alles soepel en kunnen jullie je focussen op de inhoud.",
    items: [
      { text: "Eendaagse en meerdaagse programma's op maat", highlight: true },
      { text: "Heldere draaiboeken voor iedereen betrokken", highlight: false },
      { text: "Afstemming met locaties, activiteiten en vervoer", highlight: false },
      { text: "Professionele begeleiding op de dag zelf", highlight: true },
    ],
  },
  {
    pill: "Inhoud & ontwikkeling",
    icon: Users,
    title: "Trainingen en teamontwikkeling",
    description: "Voor inhoudelijke programma's werken we samen met ervaren trainers. Zo combineren we de unieke setting van Vlieland met professionele leer- en ontwikkeltrajecten.",
    items: [
      { text: "Leiderschaps- en teamtrainingen met RMD Trainingen", highlight: true },
      { text: "Mindset- en talentprogramma's met Mindset22", highlight: true },
      { text: "Koppeling tussen inhoud en programma-opbouw", highlight: false },
      { text: "Een omgeving die uitnodigt tot reflectie én actie", highlight: false },
    ],
  },
  {
    pill: "Catering & begeleiding",
    icon: Utensils,
    title: "Lokale partners, goede plekken",
    description: "Met ons netwerk van horecapartners en eilandgidsen zorgen we dat eten, locaties en activiteiten naadloos in het programma passen.",
    items: [
      { text: "Catering op bijzondere locaties op het eiland", highlight: true },
      { text: "Lokale gidsen voor natuur en buitenactiviteiten", highlight: false },
      { text: "Flexibel inspelen op weer en groepsdynamiek", highlight: false },
      { text: "Altijd afgestemd op seizoen en capaciteit", highlight: false },
    ],
  },
];

export const Services = () => {
  return (
    <section id="wat-wij-doen" className="py-16 sm:py-20 lg:py-24 bg-background relative overflow-hidden">
      <div className="absolute top-20 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
        <div className="mb-12 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
            Wat wij voor jullie regelen
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Van eerste idee tot afsluitende borrel: wij nemen de organisatie uit handen zodat jullie 
            je kunnen richten op wat écht telt – de inhoud en elkaar.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <Card key={index} className="border-border hover:shadow-soft hover:border-primary/20 transition-all duration-300 group">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <Badge className="bg-accent-soft text-primary border-0 uppercase tracking-widest text-xs">
                      {service.pill}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl mb-3">{service.title}</CardTitle>
                  <p className="text-muted-foreground text-sm leading-relaxed">{service.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {service.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className={`h-5 w-5 flex-shrink-0 mt-0.5 ${item.highlight ? 'text-primary' : 'text-muted-foreground/50'}`} />
                        <span className={`text-sm ${item.highlight ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {item.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
