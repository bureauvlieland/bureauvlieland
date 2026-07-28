import { Link } from "react-router-dom";
import { LayoutGrid, Zap, MessageSquareHeart, UtensilsCrossed, BedDouble, ArrowRight, Clock, Sparkles } from "lucide-react";
import beachActivity from "@/assets/beach-activity.jpg";
import vlielandGroup from "@/assets/vlieland-group.jpg";
import sunsetDinner from "@/assets/sunset-dinner.jpg";


interface Route {
  title: string;
  href: string;
  duration: string;
  description: string;
  bestFor: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  image?: string;
  imageAlt?: string;
  imagePosition?: string;
}

const primaryRoutes: Route[] = [
  {
    title: "Losse activiteiten direct boeken",
    href: "/activiteiten-boeken",
    duration: "± 2 min",
    description: "Bekijk beschikbaarheid en boek activiteiten direct online.",
    bestFor: "Direct boeken, geen offerte",
    icon: Zap,
    image: beachActivity,
    imageAlt: "Activiteit op het strand van Vlieland",
  },
  {
    title: "Stel uw programma samen",
    href: "/programma-samenstellen",
    duration: "± 5–10 min",
    description: "Van één losse activiteit tot een compleet meerdaags programma — inclusief boot en fietsen.",
    bestFor: "Losse activiteit óf compleet programma",
    icon: LayoutGrid,
    highlight: true,
    image: vlielandGroup,
    imageAlt: "Groep geniet van een dag op Vlieland",
  },
  {
    title: "Programma op maat",
    href: "/programma-op-maat",
    duration: "Wij stellen samen",
    description: "U vertelt wat u zoekt, wij stellen het voor u samen.",
    bestFor: "Maatwerk, advies vooraf",
    icon: MessageSquareHeart,
    image: erwinProfile,
    imageAlt: "Erwin van Bureau Vlieland",
    imagePosition: "object-top",
  },
];

const secondaryRoutes: Route[] = [
  {
    title: "Catering aanvragen",
    href: "/catering-aanvragen",
    duration: "± 3 min",
    description: "Lunch, borrel, BBQ of diner — wij zijn dé cateraar op Vlieland.",
    bestFor: "Alleen eten & drinken",
    icon: UtensilsCrossed,
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

const RouteCard = ({ route }: { route: Route }) => {
  const Icon = route.icon;
  const hasImage = Boolean(route.image);
  return (
    <Link
      to={route.href}
      className={`group relative flex flex-col overflow-hidden rounded-lg border transition-all hover:shadow-lg hover:-translate-y-0.5 ${
        route.highlight
          ? "border-primary/40 bg-primary/[0.03] shadow-sm"
          : "border-border bg-card hover:border-primary/30"
      }`}
    >
      {route.highlight && (
        <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] uppercase tracking-wider font-semibold shadow-sm">
          Meest gekozen
        </span>
      )}

      {hasImage && (
        <div className="relative aspect-[16/9] overflow-hidden bg-muted">
          <img
            src={route.image}
            alt={route.imageAlt ?? ""}
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-cover ${route.imagePosition ?? ""} transition-transform duration-700 group-hover:scale-105`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          <span
            className={`absolute bottom-3 left-3 inline-flex h-10 w-10 items-center justify-center rounded-md backdrop-blur-sm shadow-sm ${
              route.highlight ? "bg-primary text-primary-foreground" : "bg-background/90 text-primary"
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-white bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
            <Clock className="h-3 w-3" />
            {route.duration}
          </span>
        </div>
      )}

      <div className="flex flex-col flex-1 p-6 lg:p-7">
        {!hasImage && (
          <div className="flex items-center justify-between mb-5">
            <span
              className={`inline-flex h-11 w-11 items-center justify-center rounded-md ${
                route.highlight ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
              }`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {route.duration}
            </span>
          </div>
        )}
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
      </div>
    </Link>
  );
};



export const RoutePicker = () => {
  return (
    <section id="routes" className="relative bg-background py-16 lg:py-24 scroll-mt-20">
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


        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {primaryRoutes.map((route) => (
              <RouteCard key={route.href} route={route} />
            ))}
          </div>
          <div className="pt-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              Losse onderdelen
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {secondaryRoutes.map((route) => (
                <RouteCard key={route.href} route={route} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
