import erwinImage from "@/assets/erwin-profile.jpg";

export const AboutErwin = () => {
  return (
    <section id="over-erwin" className="py-16 sm:py-20 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
            Over Erwin Soolsma en Bureau Vlieland
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed mb-8">
            Ik ben geboren op Vlieland en werk al jaren op het snijvlak van ondernemen, evenementen, leefbaarheid en
            samenwerking op het eiland. Bureau Vlieland is mijn manier om groepen en projecten te verbinden met wat
            Vlieland echt te bieden heeft.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="md:col-span-1">
              <img
                src={erwinImage}
                alt="Erwin Soolsma, oprichter van Bureau Vlieland op het strand van Vlieland"
                className="w-full h-auto rounded-xl shadow-medium object-cover aspect-[3/4]"
                loading="lazy"
              />
            </div>
            <div className="md:col-span-2 bg-accent-soft rounded-xl border border-border p-8">
              <div className="grid grid-cols-1 gap-6 text-base text-foreground leading-relaxed">
                <p>
                  Door mijn werk voor ondernemers, de lokale krant, vrijwilligersinitiatieven en projecten rond
                  leefbaarheid heb ik een breed netwerk op Vlieland. Dat gebruik ik om programma's te maken die
                  passen bij het dorp, de natuur en de mensen die hier wonen.
                </p>
                <p>
                  Gasten die met Bureau Vlieland werken, dragen direct bij aan de leefbaarheid van het eiland:
                  lokale ondernemers verdienen mee, voorzieningen blijven bestaan en jonge eilanders zien dat er
                  toekomst is in werk en ondernemerschap op Vlieland.
                </p>
              </div>
            </div>
          </div>

          {/* Lokale betrokkenheid */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">Ondernemen op Vlieland</h3>
              <ul className="space-y-3 text-sm text-foreground">
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  <span>Oprichter en manager van lokale krant <a href="https://www.geitenbode.nl" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">De Geitenbode</a></span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  <span>Mede-eigenaar van <a href="https://olivavlieland.nl" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Trattoria Oliva</a> en <a href="https://cafeboven.nl" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Café Boven</a></span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  <span>Eigenaar softwarebedrijf <a href="https://mijnfietsverhuur.nl" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Mijn Fietsverhuur</a> - oplossingen voor fietsverhuurbedrijven</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  <span>Bestuurslid / voorzitter Ondernemersvereniging Vlieland</span>
                </li>
              </ul>
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">Publieksevenementen</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Bureau Vlieland helpt mee met de organisatie van grote publieksevenementen op het eiland:
              </p>
              <ul className="space-y-3 text-sm text-foreground">
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  <span><a href="https://vuurtorenloop.nl" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Vuurtorenloop</a> - Hardloopfeest door de duinen van Vlieland</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  <span><a href="https://www.amusetour.nl/destinations/vlieland/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Amusetour Vlieland</a> - Culinaire wandeling langs restaurants op het eiland</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
