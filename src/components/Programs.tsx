import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import teamActivity from "@/assets/team-activity.jpg";
import catering from "@/assets/catering.jpg";
import landscape from "@/assets/vlieland-landscape.jpg";

const programs = [
  {
    title: "Teamdag op het Strand",
    duration: "1 dag",
    image: teamActivity,
    description: "Een energieke dag vol teambuilding activiteiten op het strand, inclusief lunch en begeleiding.",
    highlights: ["Strandspellen", "Lokale lunch", "Professionele begeleiding"],
  },
  {
    title: "Culinair Weekend",
    duration: "2-3 dagen",
    image: catering,
    description: "Geniet van de lokale gastronomie met workshops, diners en proeverijen op verschillende locaties.",
    highlights: ["Kookworkshop", "3-gangen diner", "Lokale producten"],
  },
  {
    title: "Eiland Expeditie",
    duration: "1-2 dagen",
    image: landscape,
    description: "Verken Vlieland met een gids, fietstocht door de duinen en een unieke ervaring van het eilandleven.",
    highlights: ["Geleide tour", "Fietstocht", "Natuur ervaring"],
  },
];

export const Programs = () => {
  return (
    <section id="programmas" className="py-16 sm:py-20 lg:py-24 bg-accent-soft">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Voorbeeldprogramma's
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Inspiratie voor uw groepsevenement op Vlieland - volledig aanpasbaar aan uw wensen
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {programs.map((program, index) => (
            <Card key={index} className="overflow-hidden border-border hover:shadow-medium transition-all duration-300">
              <div className="relative h-56 overflow-hidden">
                <img
                  src={program.image}
                  alt={program.title}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
                <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">
                  {program.duration}
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-2xl mb-2">{program.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {program.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {program.highlights.map((highlight, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
