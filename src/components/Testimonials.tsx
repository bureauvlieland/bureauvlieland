import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const testimonials = [
  {
    quote: "Na 6 maanden in het geheim samen een planning maken, dingen regelen en zorgen maken over het weer, was het dan eindelijk zo ver... Vanaf het moment dat wij op onze boot zaten, klaar om richting Vlieland te varen was daar het moment aangebroken om alles los te laten want deze jongens hadden het allemaal onder controle! Alles liep perfect, geweldige hotels, activiteiten en feestavond! Hartelijk dank Bureau Vlieland, wij hebben genoten!",
    author: "Ilona Norbart",
    company: "Districon Group 2019"
  },
  {
    quote: "Op het oostelijke buureiland circuleren nog weleens verhalen over 'die Vlielanders' of - erger - 'Vliebiza', maar met Erwin Soolsma en kornuiten van Bureau Vlieland was ik het snel eens over de organisatie van een stoer zakelijk event op de eilanden. Snelle ribs, parachutespringen op de Vliehors en picknicken tussen de tanks - waar kan dat nou anders dan bij ons op de Wadden? Ja, zelfs de Chablis en de oesters waren uitstekend.",
    author: "Jort Kelder",
    company: "Amsterdam"
  },
  {
    quote: "Bureau Vlieland heeft voor ons de meest sprookjesachtige- met festivalgevoel- strand en relaxte bruiloft aller tijden georganiseerd. Erwin voelde precies aan wat wij wilden en creëerde een hele relaxte sfeer van elke locatie waar wij waren. Wij zijn getrouwd tijdens corona maatregelen en daardoor was planning enorm lastig. Ook kwam er net een versoepeling twee weken voor de bruiloft waardoor er meer mogelijk was, maar voor Erwin en zijn crew geen probleem. Gewoon ook een heel avond programma gefixed. Heb er geen woorden voor hoe relaxed de samenwerking was. Mocht je ooit 'iets' willen organiseren op Vlieland. Boek deze gasten, want ze creeren van niks echt alles wat je wilt! Gewoon doen!",
    author: "Daan en Nine",
    company: "Bruidspaar"
  },
  {
    quote: "Vanaf de allereerste bespreking om invulling te geven aan een culinair, sportief en avontuurlijk weekend op Vlieland, tot en met het afscheid bij de terminal 2 dagen later in Harlingen, heeft het team van Bureau Vlieland dit weekend tot in detail onvergetelijk gemaakt voor een ieder!",
    author: "Peter-Paul van de Kar",
    company: "Tradekar International BV"
  },
  {
    quote: "Erwin van Bureau Vlieland heeft een top arrangement voor ons in elkaar gezet. Erg plezierig contact, goede begeleiding en heel ontspannen dag gehad op Vlieland. Aanrader voor groepen die een leuke dag willen hebben met een super sfeertje. Lunch in de natuur, BBQ op strand, rib boot tocht, activiteit op strand en ook lekker een terrasje pakken! Voor herhaling vatbaar zou ik zegge",
    author: "Rients",
    company: "Raethuis Accountants Heerenveen"
  }
];

export const Testimonials = () => {
  return (
    <section id="testimonials" className="py-16 sm:py-20 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Wat klanten zeggen
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Bureau Vlieland werkt voor diverse groepen en organisaties. Dit is wat zij over hun ervaring vertellen.
          </p>
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full max-w-6xl mx-auto"
        >
          <CarouselContent>
            {testimonials.map((testimonial, index) => (
              <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                <div className="p-1">
                  <Card className="border-border bg-card h-full">
                    <CardContent className="pt-6 flex flex-col h-full">
                      <Quote className="w-8 h-8 text-primary mb-4 opacity-50" />
                      <blockquote className="text-sm text-foreground leading-relaxed mb-6 flex-grow">
                        "{testimonial.quote}"
                      </blockquote>
                      <div className="border-t border-border pt-4 mt-auto">
                        <p className="text-sm font-medium text-foreground">{testimonial.author}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.company}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>
      </div>
    </section>
  );
};
