import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Utensils, Tent } from "lucide-react";

const services = [
  {
    icon: Calendar,
    title: "Eendaagse Programma's",
    description: "Dynamische dagprogramma's met activiteiten, lunch en begeleiding op locatie.",
  },
  {
    icon: Users,
    title: "Meerdaagse Events",
    description: "Complete arrangementen inclusief accommodatie, catering en uitgebreide programma's.",
  },
  {
    icon: Utensils,
    title: "Lokale Catering",
    description: "Authentieke Vlielandse gerechten bereid met lokale producten en verse ingrediënten.",
  },
  {
    icon: Tent,
    title: "Teambuilding Activiteiten",
    description: "Van strandactiviteiten tot creatieve workshops, alles voor een sterker team.",
  },
];

export const Services = () => {
  return (
    <section id="diensten" className="py-16 sm:py-20 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Onze Diensten
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Bureau Vlieland biedt complete evenementenorganisatie op maat voor uw groep
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {services.map((service, index) => (
            <Card
              key={index}
              className="border-border hover:shadow-medium transition-all duration-300 hover:-translate-y-1"
            >
              <CardHeader>
                <div className="w-14 h-14 rounded-lg bg-accent-soft flex items-center justify-center mb-4">
                  <service.icon className="w-7 h-7 text-primary" />
                </div>
                <CardTitle className="text-xl mb-2">{service.title}</CardTitle>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  {service.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
