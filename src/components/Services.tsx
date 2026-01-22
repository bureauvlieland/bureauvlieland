import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Utensils, CheckCircle2 } from "lucide-react";

const services = [
  {
    pill: "Programma & regie",
    icon: Calendar,
    title: "Eén aanspreekpunt, volledig ontzorgd",
    description: "Waar activiteitenaanbieders losse onderdelen leveren, regelen wij het complete plaatje. Van planning tot uitvoering – jullie hebben één contactpersoon die alles coördineert.",
    items: [
      "Eendaagse en meerdaagse programma's op maat",
      "Coördinatie van alle betrokken partijen op het eiland",
      "Professionele begeleiding op de dag zelf",
      "Flexibel schakelen bij veranderend weer of wensen",
    ],
  },
  {
    pill: "Samenwerking",
    icon: Users,
    title: "Jullie inhoud, onze uitvoering",
    description: "Hebben jullie een eigen trainer, coach of spreker? Wij ondersteunen met de lokale logistiek zodat zij zich kunnen focussen op de inhoud. Geen eigen trainer? We verbinden jullie met ervaren partners.",
    items: [
      "Ondersteuning voor externe trainers en coaches",
      "Samenwerking met RMD Trainingen en Mindset22",
      "Locaties en faciliteiten afgestemd op jullie programma",
      "De ideale omgeving voor reflectie én actie",
    ],
  },
  {
    pill: "Lokaal netwerk",
    icon: Utensils,
    title: "Kennis van het eiland",
    description: "Anders dan bureaus van buiten kennen wij elke horecapartner, locatie en gids persoonlijk. We weten wat werkt en kunnen snel schakelen – ook als plannen veranderen. Of het weer omslaat.",
    items: [
      "Catering op bijzondere locaties op het eiland",
      "Lokale gidsen voor natuur en buitenactiviteiten",
      "Directe lijnen met alle eilandpartners",
      "Altijd afgestemd op seizoen en capaciteit",
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
                        <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5 text-primary" />
                        <span className="text-sm text-foreground">
                          {item}
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
