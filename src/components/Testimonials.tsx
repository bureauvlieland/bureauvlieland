import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote: "Erwin heeft voor ons bedrijf een fantastisch driedaags programma op Vlieland georganiseerd. Door zijn lokale kennis en netwerk ervoer ons team het echte eilandleven. Alles was tot in de puntjes geregeld.",
    author: "Directeur, IT-bedrijf",
    company: "Amsterdam"
  },
  {
    quote: "Voor onze jaarlijkse managementdag zochten we een bijzondere locatie met goede begeleiding. Bureau Vlieland heeft ons verrast met een professioneel programma waarbij teambuilding en strategische sessies perfect werden gecombineerd.",
    author: "HR Manager",
    company: "Rotterdam"
  },
  {
    quote: "Als familie wilden we een speciaal weekend voor ons 25-jarig jubileum. Erwin regelde niet alleen een prachtig diner en excursies, maar zorgde ook dat we echt kennismaakten met het eiland en de mensen.",
    author: "Familiegroep",
    company: "Utrecht"
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-border bg-card">
              <CardContent className="pt-6">
                <Quote className="w-8 h-8 text-primary mb-4 opacity-50" />
                <blockquote className="text-sm text-foreground leading-relaxed mb-6">
                  "{testimonial.quote}"
                </blockquote>
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium text-foreground">{testimonial.author}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.company}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
