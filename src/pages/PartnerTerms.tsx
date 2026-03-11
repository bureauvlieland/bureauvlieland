import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export const PartnerTerms = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="py-16 sm:py-20 lg:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <Link to="/">
            <Button variant="ghost" className="mb-8">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Terug naar home
            </Button>
          </Link>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Standaardvoorwaarden Partneraanbod
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            Van toepassing indien Partner geen eigen algemene voorwaarden heeft gepubliceerd via het platform van Bureau Vlieland
          </p>
          
          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 1 – Toepasselijkheid</h2>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Deze voorwaarden zijn van toepassing op alle diensten die via het platform van Bureau Vlieland worden aangeboden en uitgevoerd door een Partner.</li>
                <li>De overeenkomst voor het betreffende onderdeel komt tot stand via bemiddeling door Bureau Vlieland.</li>
                <li>Bureau Vlieland treedt uitsluitend op als bemiddelaar en is geen partij bij de uitvoeringsovereenkomst tussen Partner en Eindklant.</li>
                <li>Indien de Partner eigen algemene voorwaarden hanteert en deze via het platform beschikbaar stelt, prevaleren die boven deze standaardvoorwaarden.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 2 – Totstandkoming van de overeenkomst</h2>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Een overeenkomst komt tot stand op het moment dat de Partner de aanvraag bevestigt via het platform van Bureau Vlieland.</li>
                <li>De overeenkomst wordt definitief en bindend op het moment dat de Eindklant de algemene voorwaarden digitaal ondertekent via het klantenportaal van Bureau Vlieland.</li>
                <li>Door digitale ondertekening verklaart de Eindklant kennis te hebben genomen van deze voorwaarden en hiermee akkoord te gaan.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 3 – Uitvoering van de dienst</h2>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>De Partner zal de overeengekomen dienst uitvoeren naar beste inzicht en vermogen en overeenkomstig de beschrijving zoals opgenomen in de bevestiging.</li>
                <li>De Partner is verantwoordelijk voor de correcte en veilige uitvoering van de dienst.</li>
                <li>De Eindklant dient alle door de Partner verstrekte instructies op te volgen.</li>
                <li>Indien de uitvoering afhankelijk is van weersomstandigheden, veiligheid of overheidsvoorschriften, kan de Partner de uitvoering aanpassen indien dit redelijkerwijs noodzakelijk is.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 4 – Aantallen en wijzigingen</h2>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Het overeengekomen aantal deelnemers geldt als definitief en vormt de minimale afnameverplichting.</li>
                <li>Verlaging van het aantal deelnemers geeft geen recht op vermindering van de overeengekomen prijs.</li>
                <li>Verhoging van het aantal deelnemers is uitsluitend mogelijk na voorafgaande schriftelijke bevestiging door de Partner.</li>
                <li>Wijzigingen in datum, tijdstip of inhoud gelden als wijzigingsverzoek en kunnen uitsluitend plaatsvinden na bevestiging door de Partner.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 5 – Prijs en facturatie</h2>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Tenzij anders overeengekomen factureert de Partner rechtstreeks aan de Eindklant.</li>
                <li>Indien Bureau Vlieland optreedt als centrale facturerende partij (het zogenoemde 'bureau_central'-model), factureert de Partner aan Bureau Vlieland. Bureau Vlieland draagt in dat geval zorg voor de facturatie aan de Eindklant.</li>
                <li>Het toepasselijke facturatiemodel wordt per project vastgesteld en is zichtbaar in het partnerportaal.</li>
                <li>Betaling vindt plaats volgens de betalingsvoorwaarden van de Partner zoals vermeld op de factuur.</li>
                <li>Tenzij anders vermeld zijn prijzen inclusief btw.</li>
                <li>Extra kosten die voortvloeien uit wijzigingen op verzoek van de Eindklant kunnen aanvullend in rekening worden gebracht.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 6 – Annulering</h2>
              <p className="text-foreground mb-4">Tenzij schriftelijk anders overeengekomen gelden de volgende annuleringsvoorwaarden:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                <li>Tot 30 dagen voor aanvang: kosteloos</li>
                <li>30 tot 14 dagen voor aanvang: 50% van de overeengekomen prijs</li>
                <li>14 tot 7 dagen voor aanvang: 75%</li>
                <li>Minder dan 7 dagen voor aanvang: 100%</li>
              </ul>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Annulering dient schriftelijk te geschieden.</li>
                <li>Wijziging van datum geldt als annulering van de oorspronkelijke boeking.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 7 – Aansprakelijkheid</h2>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>De Partner is aansprakelijk voor directe schade die het gevolg is van een toerekenbare tekortkoming in de uitvoering van de dienst.</li>
                <li>De aansprakelijkheid van de Partner is beperkt tot het factuurbedrag van het betreffende onderdeel, tenzij sprake is van opzet of grove nalatigheid.</li>
                <li>De Partner is niet aansprakelijk voor indirecte schade, gevolgschade of gederfde winst.</li>
                <li>Deelname aan activiteiten geschiedt op eigen risico, tenzij dwingend recht anders bepaalt.</li>
                <li>Bureau Vlieland is niet aansprakelijk voor de uitvoering van diensten door de Partner.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 8 – Overmacht</h2>
              <p className="text-foreground mb-4">
                Onder overmacht wordt verstaan iedere omstandigheid buiten de redelijke invloedssfeer van de Partner waardoor uitvoering tijdelijk of blijvend onmogelijk is.
              </p>
              <p className="text-foreground mb-2">In geval van overmacht kan de Partner:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                <li>een passend alternatief aanbieden;</li>
                <li>de uitvoering verplaatsen;</li>
                <li>de overeenkomst geheel of gedeeltelijk ontbinden.</li>
              </ul>
              <p className="text-foreground">
                Indien reeds kosten zijn gemaakt die niet kunnen worden teruggedraaid, mogen deze in redelijkheid in rekening worden gebracht.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 9 – Klachten</h2>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Klachten over de uitvoering dienen tijdens of direct na de uitvoering bij de Partner te worden gemeld, zodat een passende oplossing kan worden gezocht.</li>
                <li>Indien een klacht niet tijdig wordt gemeld, kan het recht op schadevergoeding vervallen.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 10 – Toepasselijk recht</h2>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Op de overeenkomst is Nederlands recht van toepassing.</li>
                <li>Geschillen worden voorgelegd aan de bevoegde rechter in het arrondissement waar de Partner is gevestigd, tenzij dwingend recht anders bepaalt.</li>
              </ul>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PartnerTerms;
