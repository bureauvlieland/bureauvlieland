import { Link } from "react-router-dom";
import { LayoutGrid, Zap, MessageSquareHeart, UtensilsCrossed, BedDouble, ArrowRight, Clock, Sparkles } from "lucide-react";


interface Route {
  title: string;
  href: string;
  duration: string;
  description: string;
  bestFor: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}

const routes: Route[] = [
  {
    title: "Losse activiteit(en)",
    href: "/snel-aanvragen",
    duration: "± 3 min",
    description: "U weet wat u wilt en heeft één of een paar losse onderdelen nodig.",
    bestFor: "Eén of meerdere activiteiten",
    icon: Zap,
  },
  {
    title: "Catering aanvragen",
    href: "/catering-aanvragen",
    duration: "± 3 min",
    description: "Lunch, borrel, BBQ of diner — wij zijn dé cateraar op Vlieland.",
    bestFor: "Alleen eten & drinken",
    icon: UtensilsCrossed,
  },
  {
    title: "Stel uw programma samen",
    href: "/programma-samenstellen",
    duration: "± 10 min",
    description: "Klik uw eigen dag of meerdaags programma bij elkaar.",
    bestFor: "Compleet programma, u kiest",
    icon: LayoutGrid,
    highlight: true,
  },
  {
    title: "Programma op maat",
    href: "/programma-op-maat",
    duration: "Wij stellen samen",
    description: "U vertelt wat u zoekt, wij stellen het voor u samen.",
    bestFor: "Maatwerk, advies vooraf",
    icon: MessageSquareHeart,
  },
  {
    title: "Logies aanvragen",
    href: "/logies-aanvragen",
    duration: "± 3 min",
    description: "Overnachten op Vlieland — wij benaderen de juiste hotels en groepsaccommodaties.",
    bestFor: "Alleen overnachting",
    icon: BedDouble,
  },
];


export const RoutePicker = () => {
  return (
    <section className="relative bg-background py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px]">
        <div className="text-center max-w-2xl mx-auto mb-10 lg:mb-14">
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-3 font-semibold">
            Welke route past bij u?
          </p>
          <h2 className="font-display text-3xl lg:text-4xl font-light text-foreground leading-tight">
            Vijf manieren om bij ons aan te kloppen.
          </h2>

          <p className="text-muted-foreground mt-3">
            Eén klein onderdeel, een compleet programma dat u zelf samenstelt, of volledig maatwerk — kies wat het beste past.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Geen idee waar te beginnen?</span>
            <Link
              to="/voorbeeldprogrammas"
              className="font-medium text-primary hover:underline underline-offset-4"
            >
              Bekijk onze voorbeeldprogramma's
              <ArrowRight className="inline h-3.5 w-3.5 ml-1 -mt-0.5" />
            </Link>
          </div>
        </div>


        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {routes.map((route) => {
            const Icon = route.icon;
            return (
              <Link
                key={route.href}
                to={route.href}
                className={`group relative flex flex-col rounded-lg border p-6 lg:p-7 transition-all hover:shadow-md hover:-translate-y-0.5 ${
                  route.highlight
                    ? "border-primary/40 bg-primary/[0.03] shadow-sm"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                {route.highlight && (
                  <span className="absolute -top-2.5 left-6 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] uppercase tracking-wider font-semibold">
                    Meest gekozen
                  </span>
                )}

                <div className="flex items-center justify-between mb-5">
                  <span className={`inline-flex h-11 w-11 items-center justify-center rounded-md ${
                    route.highlight ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {route.duration}
                  </span>
                </div>

                <h3 className="font-display text-xl font-semibold text-foreground mb-2 leading-tight">
                  {route.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                  {route.description}
                </p>

                <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">Voor:</span> {route.bestFor}
                  </span>
                  <ArrowRight className="h-4 w-4 text-primary translate-x-0 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
