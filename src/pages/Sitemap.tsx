import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

interface SitemapSection {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}

const sections: SitemapSection[] = [
  {
    title: "Start",
    links: [
      { label: "Home", href: "/" },
      { label: "Stel zelf uw programma samen", href: "/programma-samenstellen" },
      { label: "Programma op maat", href: "/programma-op-maat" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Programma's & aanbod",
    links: [
      { label: "Voorbeeldprogramma's", href: "/voorbeeldprogrammas" },
      { label: "Alle bouwstenen", href: "/bouwstenen" },
      { label: "Catering", href: "/catering" },
      { label: "Evenementen", href: "/evenementen" },
      { label: "Activiteiten boeken", href: "/activiteiten-boeken" },
    ],
  },
  {
    title: "Overnachten",
    links: [
      { label: "Logies op Vlieland", href: "/logies-vlieland" },
      { label: "Logies aanvragen", href: "/logies-aanvragen" },
    ],
  },
  {
    title: "Voor bedrijven",
    links: [
      { label: "Bedrijfsuitje Vlieland", href: "/bedrijfsuitje-vlieland" },
      { label: "Meerdaags bedrijfsuitje", href: "/meerdaags-bedrijfsuitje-vlieland" },
      { label: "Teambuilding", href: "/teamuitje-vlieland" },
      { label: "Heisessie", href: "/heisessie-vlieland" },
      { label: "Zakelijk evenement", href: "/zakelijk-evenement-vlieland" },
      { label: "Incentive reis", href: "/incentive-reis-vlieland" },
      { label: "Bedrijfsuitje ideeën", href: "/bedrijfsuitje-ideeen-vlieland" },
    ],
  },
  {
    title: "Voor privé",
    links: [
      { label: "Trouwen op Vlieland", href: "/trouwen-op-vlieland" },
      { label: "Groepsweekend", href: "/groepsweekend-vlieland" },
      { label: "Jubileum vieren", href: "/jubileum-vlieland" },
      { label: "Familieweekend", href: "/familieweekend-vlieland" },
    ],
  },
  {
    title: "Over ons",
    links: [
      { label: "Over Bureau Vlieland", href: "/over-ons" },
      { label: "Onze werkwijze", href: "/diensten" },
      { label: "Voor wie", href: "/voor-wie" },
      { label: "Aangesloten partners", href: "/partners" },
      { label: "Samenwerken", href: "/samenwerken" },
    ],
  },
  {
    title: "Online boeken",
    links: [
      { label: "Materiaalbeheer & verhuur", href: "https://verhuur.bureauvlieland.nl/", external: true },
      { label: "Fietsverhuur", href: "https://bureauvlieland.fietsreserveren.nl/", external: true },
      { label: "Café Boven", href: "https://cafeboven.nl", external: true },
      { label: "Oliva Vlieland", href: "https://olivavlieland.nl", external: true },
    ],
  },
  {
    title: "Juridisch & partners",
    links: [
      { label: "Algemene voorwaarden", href: "/algemene-voorwaarden" },
      { label: "Partnervoorwaarden", href: "/partner-voorwaarden" },
      { label: "Partner login", href: "/partner/login" },
    ],
  },
];

const Sitemap = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Sitemap – Bureau Vlieland</title>
        <meta
          name="description"
          content="Overzicht van alle pagina's op de website van Bureau Vlieland."
        />
        <link rel="canonical" href="https://bureauvlieland.nl/sitemap" />
      </Helmet>
      <Navigation />
      <main id="main-content" className="flex-1">
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-12 lg:py-16">
          <header className="mb-10">
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">Sitemap</h1>
            <p className="text-muted-foreground max-w-2xl">
              Vind in één oogopslag alle pagina's van Bureau Vlieland. Op zoek naar
              iets specifieks? Begin bij <Link to="/programma-samenstellen" className="text-primary underline">uw programma samenstellen</Link> of
              neem direct <Link to="/contact" className="text-primary underline">contact</Link> op.
            </p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {sections.map((section) => (
              <div key={section.title}>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  {section.title}
                </h2>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground hover:text-primary transition-colors"
                        >
                          {link.label} ↗
                        </a>
                      ) : (
                        <Link
                          to={link.href}
                          className="text-foreground hover:text-primary transition-colors"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Sitemap;
