import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const onlineServices = [
  {
    title: "Materiaalbeheer & Verhuur",
    url: "https://verhuur.bureauvlieland.nl/",
    description: "Huur professionele materialen en apparatuur voor uw evenement"
  },
  {
    title: "Fietsverhuur",
    url: "https://bureauvlieland.fietsreserveren.nl/",
    description: "Reserveer fietsen voor uw groep om het eiland te verkennen"
  },
  {
    title: "Linnenverhuur",
    url: "https://linnenverhuurvlieland.com/",
    description: "Complete linnenverhuur voor overnachtingen"
  },
  {
    title: "Losse Activiteiten",
    url: "https://boeking.mijnactiviteitenplanner.nl/activiteiten-vlieland",
    description: "Boek individuele activiteiten voor uw groep"
  }
];

const accommodations = [
  {
    title: "Vooronder Vlieland",
    url: "https://voorondervlieland.nl/",
    description: "Sfeervolle vakantiewoning in het hart van Vlieland"
  },
  {
    title: "Noordkaap Vlieland",
    url: "https://noordkaapvlieland.nl/",
    description: "Comfortabele vakantiewoning met modern comfort"
  }
];

export const ExtraServices = () => {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-accent-soft">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Extra Diensten
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Naast evenementenorganisatie bieden we ook verhuur, activiteiten en vakantiewoningen aan.
          </p>
        </div>

        <div className="mb-16">
          <h3 className="text-2xl font-semibold text-foreground mb-6">Online Boeken</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {onlineServices.map((service, index) => (
              <Card key={index} className="border-border bg-card hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <a 
                    href={service.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                        {service.title}
                      </h4>
                      <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-2" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {service.description}
                    </p>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-semibold text-foreground mb-6">Vakantiewoningen</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {accommodations.map((accommodation, index) => (
              <Card key={index} className="border-border bg-card hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <a 
                    href={accommodation.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                        {accommodation.title}
                      </h4>
                      <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-2" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {accommodation.description}
                    </p>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
