import { useEffect, useMemo } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet";
import { ArrowLeft, ArrowRight, BookOpen, Mail, MessageSquareHeart, PenLine } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Container, PageHero, Section, SectionHeader } from "@/components/system";

// Oude adressen naar de nieuwe bestemming, zodat oude links blijven werken.
const getRedirectDestination = (pathname: string): string | null => {
  const path = pathname.toLowerCase().replace(/\/$/, "");

  if (path === "/contact") return "/contact";
  if (path === "/offerteformulier") return "/contact";

  if (path === "/duurzame-zakenevents") return "/samenwerken";
  if (path === "/activiteiten") return "/bouwstenen";
  if (path === "/catering-op-vlieland") return "/catering";
  if (path === "/culinaire-ontdekkingen") return "/bouwstenen";
  if (path === "/overnachten") return "/bouwstenen";

  if (path === "/programmas") return "/samenwerken";

  if (path.startsWith("/activiteiten-op-vlieland")) return "/bouwstenen";
  if (path.startsWith("/product")) return "/bouwstenen";

  if (path === "/bedrijfsuitje-naar-vlieland-2") return "/bedrijfsuitje-vlieland";
  if (path === "/incentive-op-vlieland-2") return "/incentive-reis-vlieland";
  if (path === "/vergaderen-op-vlieland-2") return "/heisessie-vlieland";
  if (path === "/teambuilding-op-vlieland") return "/teamuitje-vlieland";
  if (path === "/schoolreis-naar-vlieland") return "/voor-wie";

  if (path === "/team") return "/over-ons";
  if (path === "/klanten-aan-het-woord") return "/over-ons";
  if (path === "/algemene-voorwaarden") return "/algemene-voorwaarden";

  return null;
};

const QUICK_LINKS = [
  { to: "/programma-samenstellen", title: "Stel uw programma samen", desc: "Bouw zelf uw dag uit losse activiteiten, catering en boot.", icon: PenLine },
  { to: "/programma-op-maat", title: "Programma op maat", desc: "Wij denken mee en bouwen een programma rond uw groep.", icon: MessageSquareHeart },
  { to: "/voorbeeldprogrammas", title: "Voorbeeldprogramma's", desc: "Laat u inspireren door kant-en-klare programma's van eerdere groepen.", icon: BookOpen },
  { to: "/contact", title: "Contact", desc: "Liever even sparren? Stuur ons een bericht.", icon: Mail },
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
    <div className="min-h-screen bg-background">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Pagina niet gevonden – Bureau Vlieland</title>
      </Helmet>
      <Navigation />
      <main id="main-content">
        <PageHero
          eyebrow="404"
          title={
            <>
              Hier waait <span className="italic">geen pagina</span>.
            </>
          }
          intro="De pagina die u zocht bestaat niet (meer). Geen probleem: hieronder vindt u de meest gevraagde routes."
          cta={{ label: "Naar de homepage", to: "/" }}
        />
        <Section>
          <Container size="content">
            <SectionHeader eyebrow="Verder" title="Waar wilt u heen?" />
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {QUICK_LINKS.map(({ to, title, desc, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="group flex h-full gap-4 rounded-lg border border-border bg-card p-5 transition-colors duration-base hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block font-display text-display-md font-medium text-foreground">{title}</span>
                      <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{desc}</span>
                      <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                        Bekijk
                        <ArrowRight className="h-4 w-4 transition-transform duration-fast group-hover:translate-x-0.5" aria-hidden="true" />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button variant="outline" size="lg" onClick={() => window.history.back()}>
                <ArrowLeft aria-hidden="true" />
                Terug naar de vorige pagina
              </Button>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
