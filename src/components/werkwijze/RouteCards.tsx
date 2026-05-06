import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Compass, CheckCircle2 } from "lucide-react";

const routes = [
  {
    pill: "Direct online",
    icon: Sparkles,
    title: "Zelf uw programma samenstellen",
    description:
      "U weet ongeveer wat u wilt? Stel uw programma direct samen uit onze bouwstenen. Live prijzen, transparant en in een paar minuten klaar.",
    points: [
      "Direct inzicht in beschikbaarheid en prijzen",
      "Bouwstenen-catalogus met alle eilandpartners",
      "Bevestiging binnen één werkdag",
      "Aanpassen kan altijd in overleg",
    ],
    cta: { label: "Stel uw programma samen", to: "/programma-samenstellen" },
    accent: "from-primary/10 to-primary/5",
  },
  {
    pill: "Met persoonlijk advies",
    icon: Compass,
    title: "Programma op maat",
    description:
      "Complexere wens, groot gezelschap of liever sparren? Wij denken met u mee en stellen binnen 1-3 werkdagen een voorstel op maat samen.",
    points: [
      "Persoonlijk gesprek met een eilandkenner",
      "Voorstel op basis van uw doel en sfeer",
      "Volledige flexibiliteit in opzet",
      "Eén vast aanspreekpunt gedurende het traject",
    ],
    cta: { label: "Vraag maatwerk aan", to: "/programma-op-maat" },
    accent: "from-accent/10 to-accent/5",
  },
];

export const RouteCards = () => {
  return (
    <section className="py-16 sm:py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
            Twee manieren om met ons te starten
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Of u nu direct aan de slag wilt of liever met ons meedenkt — beide routes leiden tot één compleet programma met één factuur.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {routes.map((route, idx) => {
            const Icon = route.icon;
            return (
              <Card
                key={idx}
                className="relative overflow-hidden border-border hover:shadow-elegant hover:border-primary/30 transition-all duration-300"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${route.accent} pointer-events-none`} />
                <div className="relative">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <Badge className="bg-accent-soft text-primary border-0 uppercase tracking-widest text-xs">
                        {route.pill}
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl mb-3">{route.title}</CardTitle>
                    <p className="text-muted-foreground leading-relaxed">{route.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ul className="space-y-3">
                      {route.points.map((p, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5 text-primary" />
                          <span className="text-sm text-foreground">{p}</span>
                        </li>
                      ))}
                    </ul>
                    <Link to={route.cta.to} className="block">
                      <Button className="w-full group" size="lg">
                        {route.cta.label}
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
