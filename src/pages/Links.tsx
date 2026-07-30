import { useEffect, useMemo } from "react";
import { Helmet } from "react-helmet";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import {
  CalendarDays,
  Compass,
  MessageCircle,
  Sparkles,
  UtensilsCrossed,
  Waves,
  BedDouble,
  HelpCircle,
} from "lucide-react";

const links = [
  {
    to: "/programma-samenstellen",
    label: "Stel uw programma samen",
    description: "Online configurator — boot, fietsen en activiteiten in één keer",
    icon: Compass,
    highlight: true,
  },
  {
    to: "/voorbeeldprogrammas",
    label: "Voorbeeldprogramma's",
    description: "Kant-en-klare dagindelingen als inspiratie",
    icon: Sparkles,
  },
  {
    to: "/activiteiten-vlieland",
    label: "Activiteiten op Vlieland",
    description: "Van zeehondentocht tot Vliehors Expres",
    icon: Waves,
  },
  {
    to: "/catering",
    label: "Catering",
    description: "Lunch, borrel en diner van eilandpartners",
    icon: UtensilsCrossed,
  },
  {
    to: "/logies-vlieland",
    label: "Logies voor groepen",
    description: "Overnachten op het eiland",
    icon: BedDouble,
  },
  {
    to: "/evenementen",
    label: "Agenda & evenementen",
    description: "Vuurtorenloop, Amusetour en meer",
    icon: CalendarDays,
  },
  {
    to: "/veelgestelde-vragen",
    label: "Veelgestelde vragen",
    description: "Boot, kosten, groepsgrootte en boeken",
    icon: HelpCircle,
  },
  {
    to: "/contact",
    label: "Contact",
    description: "Even sparren met Erwin",
    icon: MessageCircle,
  },
];

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

/** Plakt de binnenkomende UTM-parameters op een interne route. */
const withUtm = (to: string, params: URLSearchParams) => {
  const utm = UTM_KEYS.filter((k) => params.get(k)).map((k) => `${k}=${encodeURIComponent(params.get(k)!)}`);
  if (utm.length === 0) return to;
  return `${to}${to.includes("?") ? "&" : "?"}${utm.join("&")}`;
};

const Links = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Instagram-CTA's linken naar /links?to=/doelpad — direct doorsturen met behoud van UTM's.
  const redirectTo = searchParams.get("to");
  const target = useMemo(
    () => (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : null),
    [redirectTo],
  );

  useEffect(() => {
    if (target) navigate(withUtm(target, searchParams), { replace: true });
  }, [target, navigate, searchParams]);

  return (

    <div className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background">
      <Helmet>
        <title>Bureau Vlieland – alle links</title>
        <meta
          name="description"
          content="Alle links van Bureau Vlieland op één plek: programma samenstellen, activiteiten, catering, logies en contact."
        />
        <link rel="canonical" href="https://bureauvlieland.nl/links" />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <main className="mx-auto flex w-full max-w-md flex-col items-center px-5 py-12">
        <img
          src="/email-logo.png"
          alt="Bureau Vlieland"
          className="h-20 w-20 rounded-full bg-card object-contain p-2 shadow-md"
          width={80}
          height={80}
        />
        <h1 className="mt-5 text-center font-display text-2xl font-bold text-foreground">
          Bureau Vlieland
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Uw lokale specialist voor groepsbezoek aan Vlieland. Eén partij, één factuur.
        </p>

        <nav aria-label="Belangrijke links" className="mt-8 w-full space-y-3">
          {links.map(({ to, label, description, icon: Icon, highlight }) => (
            <Link
              key={to}
              to={withUtm(to, searchParams)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                highlight
                  ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border-border bg-card text-foreground hover:bg-accent"
              }`}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{label}</span>
                <span
                  className={`block text-xs ${
                    highlight ? "text-primary-foreground/80" : "text-muted-foreground"
                  }`}
                >
                  {description}
                </span>
              </span>
            </Link>
          ))}
        </nav>

        <div className="mt-8 flex flex-col items-center gap-2 text-sm">
          <a href="tel:+31562700208" className="text-primary underline-offset-4 hover:underline">
            +31 562 700208
          </a>
          <a
            href="mailto:hallo@bureauvlieland.nl"
            className="text-primary underline-offset-4 hover:underline"
          >
            hallo@bureauvlieland.nl
          </a>
        </div>
      </main>
    </div>
  );
};

export default Links;
