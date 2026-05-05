import { useLocation, Navigate, Link } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Sparkles, LayoutGrid, Mail } from "lucide-react";

// Map old URLs to new destinations for SEO-friendly redirects
const getRedirectDestination = (pathname: string): string | null => {
  const path = pathname.toLowerCase().replace(/\/$/, ''); // normalize: lowercase, remove trailing slash

  // Contact pages
  if (path === '/contact') return '/contact';
  if (path === '/offerteformulier') return '/contact';

  // Diensten
  if (path === '/duurzame-zakenevents') return '/samenwerken';
  if (path === '/activiteiten') return '/bouwstenen';
  if (path === '/catering-op-vlieland') return '/catering';
  if (path === '/culinaire-ontdekkingen') return '/bouwstenen';
  if (path === '/overnachten') return '/bouwstenen';

  // Oude programmas URL redirect
  if (path === '/programmas') return '/samenwerken';

  // Activiteiten wildcard
  if (path.startsWith('/activiteiten-op-vlieland')) return '/bouwstenen';

  // Product pages wildcard
  if (path.startsWith('/product')) return '/bouwstenen';

  // Voor wie pages - redirect oude URLs naar nieuwe landingspagina's
  if (path === '/bedrijfsuitje-naar-vlieland-2') return '/bedrijfsuitje-vlieland';
  if (path === '/incentive-op-vlieland-2') return '/incentive-reis-vlieland';
  if (path === '/vergaderen-op-vlieland-2') return '/heisessie-vlieland';
  if (path === '/teambuilding-op-vlieland') return '/teamuitje-vlieland';
  if (path === '/trouwen-op-vlieland-2') return '/trouwen-op-vlieland';
  if (path === '/schoolreis-naar-vlieland') return '/voor-wie';

  // Team/Over ons
  if (path === '/team') return '/over-ons';

  // Testimonials
  if (path === '/klanten-aan-het-woord') return '/over-ons';

  // Algemene voorwaarden - has its own page
  if (path === '/algemene-voorwaarden') return '/algemene-voorwaarden';

  return null;
};

const QUICK_LINKS = [
  {
    to: "/programma-samenstellen",
    title: "Stel uw programma samen",
    desc: "Bouw zelf uw dag uit losse activiteiten, catering en boot.",
    icon: Sparkles,
  },
  {
    to: "/programma-op-maat",
    title: "Programma op maat",
    desc: "Wij denken mee en bouwen een programma rond uw groep.",
    icon: LayoutGrid,
  },
  {
    to: "/voorbeeldprogrammas",
    title: "Voorbeeldprogramma's",
    desc: "Laat u inspireren door onze kant-en-klare programma's.",
    icon: LayoutGrid,
  },
  {
    to: "/contact",
    title: "Contact",
    desc: "Liever even sparren? Stuur ons een bericht.",
    icon: Mail,
  },
];

const NotFound = () => {
  const location = useLocation();

  const redirectTo = useMemo(() => getRedirectDestination(location.pathname), [location.pathname]);

  useEffect(() => {
    if (!redirectTo) {
      console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }
  }, [location.pathname, redirectTo]);

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-20">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Pagina niet gevonden – Bureau Vlieland</title>
      </Helmet>

      <div className="max-w-3xl w-full">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.3em] text-sunset font-medium mb-4">
            · 404 — Pagina niet gevonden
          </div>
          <h1 className="font-display font-light text-foreground leading-[0.95] text-[clamp(2.5rem,6vw,5rem)] mb-6">
            Hier waait <span className="italic text-sunset">geen pagina</span>.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            De pagina die u zocht bestaat niet (meer). Geen probleem — hieronder vindt u de meest gevraagde routes.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.history.back()}
              className="rounded-sm h-12"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Terug naar vorige pagina
            </Button>
            <Link to="/">
              <Button size="lg" className="rounded-sm h-12">
                <Home className="mr-2 h-4 w-4" />
                Naar de homepage
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {QUICK_LINKS.map(({ to, title, desc, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group block rounded-sm border border-border bg-card p-6 hover:border-sunset hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 h-10 w-10 rounded-sm bg-sunset/10 text-sunset flex items-center justify-center group-hover:bg-sunset group-hover:text-sunset-foreground transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl text-foreground font-light mb-1">
                    {title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
