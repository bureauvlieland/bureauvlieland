import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export const Terms = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="py-16 sm:py-20 lg:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-8">
            Algemene Voorwaarden
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-muted-foreground mb-8">
              Algemene Voorwaarden groepsuitjes en arrangementen
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 1. Inleidende bepalingen</h2>
              <p className="text-foreground mb-4">In deze reisvoorwaarden wordt verstaan onder:</p>
              <p className="text-foreground mb-2">
                <strong>Opdrachtnemer:</strong> Bureau Vlieland B.V. te Vlieland, ingeschreven bij de K.v.K. (88285774), nader te noemen Bureau Vlieland.
              </p>
              <p className="text-foreground mb-2">
                <strong>Opdrachtgever:</strong> de wederpartij, (rechts) persoon, die aan Bureau Vlieland een opdracht heeft verstrekt tot advisering over, organisatie van, samenstellen van, begeleiding van en uitvoering van een arrangement.
              </p>
              <p className="text-foreground">
                <strong>Arrangement:</strong> iedere activiteit, bedacht, samengesteld, georganiseerd en uitgevoerd door Bureau Vlieland, waaronder groepsuitjes, personeel-, relatie-, netwerk-, teambuildingsreizen/uitjes, incentives en evenementen, een- of meerdaags, in binnen- en buitenland.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 2: Toepasselijkheid</h2>
              <p className="text-foreground mb-2">2.1. Deze algemene voorwaarden maken deel uit van alle offertes en overeenkomsten tussen Bureau Vlieland en de opdrachtgever of derden. Onder derden wordt onder meer verstaan: deelnemers op uitnodiging van de opdrachtgever.</p>
              <p className="text-foreground mb-2">2.2. Tevens strekken deze voorwaarden ten behoeve van medewerkers van Bureau Vlieland en overige ondersteunende personen.</p>
              <p className="text-foreground mb-2">2.3. Afwijkende bedingen en eventuele algemene voorwaarden van opdrachtgever gelden slechts indien en voor zover deze uitdrukkelijk door Bureau Vlieland schriftelijk zijn aanvaard.</p>
              <p className="text-foreground mb-2">2.4. Indien het verzorgen van vervoer deel uitmaakt van de overeenkomst zijn de door de desbetreffende vervoerder gehanteerde voorwaarden, c.q. ter zake geldende internationale verdragen mede van toepassing.</p>
              <p className="text-foreground">2.5. Op de arrangementen is de reisbureauregeling van toepassing, tenzij anders vermeld.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 3: Prestatie en Zorgplicht Bureau Vlieland</h2>
              <p className="text-foreground mb-2">3.1. De omvang en de aard van de door de Bureau Vlieland te verrichten diensten worden uitsluitend bepaald door het door Bureau Vlieland schriftelijk uitgebrachte en door de opdrachtgever geaccepteerde aanbod (offerte). Eventuele wijzigingen behoeven de uitdrukkelijke schriftelijke toestemming van Bureau Vlieland.</p>
              <p className="text-foreground mb-2">3.2. Bureau Vlieland draagt geen verantwoordelijkheid voor foto's, folders en ander voorlichtingsmateriaal, voor zover onder verantwoordelijkheid van derden uitgegeven. Kennelijke fouten en vergissingen in de offerte binden Bureau Vlieland niet.</p>
              <p className="text-foreground mb-2">3.3. Bureau Vlieland zal bij de uitvoering van het arrangement de grootst mogelijke zorgvuldigheid in acht nemen wat betreft de selectie van derden waarvan bij uitvoering van de opdracht gebruik wordt gemaakt.</p>
              <p className="text-foreground">3.4. Bureau Vlieland is niet aansprakelijk voor de tekortkomingen van de betreffende derden, maar zal al hetgeen doen, dan wel de opdrachtgever alle medewerking verlenen die redelijkerwijs van haar gevraagd kan worden om in voorkomend geval een schadevergoeding van de betrokken derde te verkrijgen.</p>
            </section>

            
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 4: Totstandkoming overeenkomst</h2>
              <p className="text-foreground mb-2">4.1. Een overeenkomst tussen opdrachtgever en Bureau Vlieland komt tot stand door aanvaarding door de opdrachtgever van het aangeboden arrangement van Bureau Vlieland. Dit geschiedt altijd en uitsluitend door ondertekening van de opdrachtbevestiging van Bureau Vlieland door zowel opdrachtgever als Bureau Vlieland. De ondertekende opdrachtbevestiging geldt als officiële bindende overeenkomst die de opdrachtgever met Bureau Vlieland aangaat.</p>
              <p className="text-foreground mb-2">4.2. Het aanbod van en alle uitgebrachte offertes door Bureau Vlieland hebben een geldigheidsduur van 30 kalenderdagen, tenzij anders overeengekomen.</p>
              <p className="text-foreground mb-2">4.3. Voor alle verplichtingen die voor de opdrachtgever en voor de deelnemer(s) uit de overeenkomst voortvloeien is de opdrachtgever hoofdelijk aansprakelijk.</p>
              <p className="text-foreground">4.4. De opdrachtgever verstrekt na ondertekening van de opdrachtbevestiging zo spoedig mogelijk alle gegevens betreffende zichzelf en de andere deelnemer(s) die nodig zijn voor de goede uitvoering van de overeengekomen diensten.</p>
            </section>

            <div className="bg-accent-soft rounded-xl border border-border p-6 mt-12">
              <p className="text-sm text-muted-foreground">
                Voor de volledige algemene voorwaarden, neem contact op met Bureau Vlieland via{" "}
                <a href="mailto:hallo@bureauvlieland.nl" className="text-primary hover:underline">
                  hallo@bureauvlieland.nl
                </a>{" "}
                of bel <a href="tel:0562700208" className="text-primary hover:underline">0562 700 208</a>.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};
