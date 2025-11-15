import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export const Terms = () => {
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
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-8">
            Algemene Voorwaarden
          </h1>
          
          <div className="prose prose-lg max-w-none space-y-8">
            <p className="text-muted-foreground text-lg">
              Algemene Voorwaarden groepsuitjes en arrangementen
            </p>

            <section>
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

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 2: Toepasselijkheid</h2>
              <p className="text-foreground mb-2">2.1. Deze algemene voorwaarden maken deel uit van alle offertes en overeenkomsten tussen Bureau Vlieland en de opdrachtgever of derden. Onder derden wordt onder meer verstaan: deelnemers op uitnodiging van de opdrachtgever.</p>
              <p className="text-foreground mb-2">2.2. Tevens strekken deze voorwaarden ten behoeve van medewerkers van Bureau Vlieland en overige ondersteunende personen.</p>
              <p className="text-foreground mb-2">2.3. Afwijkende bedingen en eventuele algemene voorwaarden van opdrachtgever gelden slechts indien en voor zover deze uitdrukkelijk door Bureau Vlieland schriftelijk zijn aanvaard.</p>
              <p className="text-foreground mb-2">2.4. Indien het verzorgen van vervoer deel uitmaakt van de overeenkomst zijn de door de desbetreffende vervoerder gehanteerde voorwaarden, c.q. ter zake geldende internationale verdragen mede van toepassing.</p>
              <p className="text-foreground">2.5. Op de arrangementen is de reisbureauregeling van toepassing, tenzij anders vermeld.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 3: Prestatie en Zorgplicht Bureau Vlieland</h2>
              <p className="text-foreground mb-2">3.1. De omvang en de aard van de door de Bureau Vlieland te verrichten diensten worden uitsluitend bepaald door het door Bureau Vlieland schriftelijk uitgebrachte en door de opdrachtgever geaccepteerde aanbod (offerte). Eventuele wijzigingen behoeven de uitdrukkelijke schriftelijke toestemming van Bureau Vlieland.</p>
              <p className="text-foreground mb-2">3.2. Bureau Vlieland draagt geen verantwoordelijkheid voor foto's, folders en ander voorlichtingsmateriaal, voor zover onder verantwoordelijkheid van derden uitgegeven. Kennelijke fouten en vergissingen in de offerte binden Bureau Vlieland niet.</p>
              <p className="text-foreground mb-2">3.3. Bureau Vlieland zal bij de uitvoering van het arrangement de grootst mogelijke zorgvuldigheid in acht nemen wat betreft de selectie van derden waarvan bij uitvoering van de opdracht gebruik wordt gemaakt.</p>
              <p className="text-foreground">3.4. Bureau Vlieland is niet aansprakelijk voor de tekortkomingen van de betreffende derden, maar zal al hetgeen doen, dan wel de opdrachtgever alle medewerking verlenen die redelijkerwijs van haar gevraagd kan worden om in voorkomend geval een schadevergoeding van de betrokken derde te verkrijgen.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 4: Totstandkoming overeenkomst</h2>
              <p className="text-foreground mb-2">4.1. Een overeenkomst tussen opdrachtgever en Bureau Vlieland komt tot stand door aanvaarding door de opdrachtgever van het aangeboden arrangement van Bureau Vlieland. Dit geschiedt altijd en uitsluitend door ondertekening van de opdrachtbevestiging van Bureau Vlieland door zowel opdrachtgever als Bureau Vlieland. De ondertekende opdrachtbevestiging geldt als officiële bindende overeenkomst die de opdrachtgever met Bureau Vlieland aangaat.</p>
              <p className="text-foreground mb-2">4.2. Het aanbod van en alle uitgebrachte offertes door Bureau Vlieland hebben een geldigheidsduur van 30 kalenderdagen, tenzij anders overeengekomen.</p>
              <p className="text-foreground mb-2">4.3. Voor alle verplichtingen die voor de opdrachtgever en voor de deelnemer(s) uit de overeenkomst voortvloeien is de opdrachtgever hoofdelijk aansprakelijk.</p>
              <p className="text-foreground">4.4. De opdrachtgever verstrekt na ondertekening van de opdrachtbevestiging zo spoedig mogelijk alle gegevens betreffende zichzelf en de andere deelnemer(s) die nodig zijn voor de goede uitvoering van de overeengekomen diensten.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 5: Prijs</h2>
              <p className="text-foreground mb-2">5.1. De genoemde prijs geldt per persoon in euro's, tenzij anders vermeld. De prijs is gecalculeerd op basis van het bij de offerte overgelegde programmavoorstel.</p>
              <p className="text-foreground mb-2">5.2. Eventuele onvoorziene (extra) uitgaven worden naderhand, in overleg met de opdrachtgever, op basis van nacalculatie gefactureerd.</p>
              <p className="text-foreground mb-2">5.3. De arrangementsprijs is gebaseerd op de geldende prijzen, wisselkoersen, en belastingtarieven, zoals deze bij Bureau Vlieland bekend waren bij het uitbrengen van de offerte. Alle prijzen zijn inclusief BTW, tenzij anders vermeld.</p>
              <p className="text-foreground">5.4. Bureau Vlieland is gerechtigd om wijzigingen welke zich nadien in wisselkoersen, heffingen en/of belastingen voor mochten doen aan de opdrachtgever in rekening te brengen in aanvulling op de in de opdrachtbevestiging vermelde prijs of prijzen. Hetzelfde geldt voor brandstoftoeslagen en andere heffingen waarvan ten tijde van het opmaken van het opdrachtformulier niet voorzienbaar was dat deze ten tijde van de uitvoering van de opdracht verschuldigd mochten zijn. Bureau Vlieland zal daarbij aangeven op welke wijze de verhoging is berekend.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 6: Betalingsvoorwaarden</h2>
              <p className="text-foreground mb-4">6.1. Bureau Vlieland dient zich tijdig te binden aan de uitvoerende dienstverleners zoals vervoerders en accommodatieverschaffers. Teneinde de dienstverlening veilig te stellen dient Bureau Vlieland zich aan de door dezen gehanteerde betalings- en annuleringsvoorwaarden te onderwerpen. Derhalve gelden de volgende betalingstermijnen voor de opdrachtgever:</p>
              <p className="text-foreground mb-2">6.1.a. 50% van het in de offerte bepaalde totaalbedrag dient direct na ondertekening van de offerte, en in ieder geval binnen 8 werkdagen, voldaan te worden, mits anders aangegeven.</p>
              <p className="text-foreground mb-2">6.1.b. 50% van het dan nog verschuldigde totaalbedrag dient uiterlijk 6 weken voor vertrekdatum te zijn voldaan, mits anders aangegeven.</p>
              <p className="text-foreground mb-2">6.2. Alle betalingen dienen te geschieden door overboeking naar de bankrekening als vermeld op de facturen van Bureau Vlieland.</p>
              <p className="text-foreground">6.3. Bureau Vlieland kan bij niet tijdige betaling de overeenkomst na sommatie ontbinden, waarbij reeds betaalde bedragen niet worden gerestitueerd en bovendien de annuleringsvoorwaarden van artikel 8 van toepassing zijn.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 7: Wijzigingen en verzoeken door opdrachtgever</h2>
              <p className="text-foreground mb-2">7.1. Eventuele wijzigingen en verzoeken in onderdelen van het arrangement of het programma zullen voor zover mogelijk op verzoek van de opdrachtgever door Bureau Vlieland worden uitgevoerd. Eventuele meerkosten die met de wijziging gepaard gaan, worden doorberekend aan de opdrachtgever.</p>
              <p className="text-foreground">7.2. Veranderingen in het aantal deelnemers kan gevolgen hebben voor de prijsstelling. Vermindering van het aantal deelnemers wordt gezien als een deelannulering, waarbij de annuleringsvoorwaarden van artikel 8 van toepassing zijn.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 8: Annulering door opdrachtgever</h2>
              <h3 className="text-xl font-semibold text-foreground mb-3 mt-4">8.1. Standaard annuleringskosten</h3>
              <p className="text-foreground mb-2">Indien de opdrachtgever de opdracht annuleert dient hij Bureau Vlieland alle tot het tijdstip van annulering door haar gemaakte of verschuldigd kosten vergoeden.</p>
              <p className="text-foreground mb-4">Daarnaast is opdrachtgever bij annulering van de opdracht gehouden om een bedrag te voldoen gelijk aan 10% van de in het opdrachtbevestiging vermelde totaalprijs, afhankelijk van het tijdstip van annulering vermeerderd met de navolgende, eveneens in een percentage van de totaalprijs uitgedrukte opslag:</p>
              <ul className="list-disc pl-6 mb-4 text-foreground">
                <li>3 maanden of langer voor uitvoering van de opdracht: 2,5%;</li>
                <li>tussen 3 maanden en 1 maand voor uitvoering van de opdracht: 5%;</li>
                <li>korter dan 1 maand voor uitvoering van de opdracht: 7,5%.</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-foreground mb-3 mt-4">8.2. Afwijkende annuleringskosten</h3>
              <p className="text-foreground mb-4">Indien een arrangement is samengesteld uit verschillende onderdelen (bv. accommodatie, hotel, excursie, cruise, vervoer per bus, boot, vluchten, e.d.), waarop verschillende annuleringsbepalingen van toepassing zijn, gelden per onderdeel de specifiek hierop van toepassing zijnde bepalingen. Deze afwijkende bepalingen worden vooraf aan de opdrachtgever kenbaar gemaakt.</p>
              
              <h3 className="text-xl font-semibold text-foreground mb-3 mt-4">8.3. Deelannulering</h3>
              <p className="text-foreground mb-2">8.3.a. Indien een deelnemer uit een gezelschap zijn overeenkomst voor een gezamenlijk arrangement annuleert, is hij annuleringskosten verschuldigd.</p>
              <p className="text-foreground mb-4">8.3.b. Voor de resterende deelnemer(s) wordt indien nodig een passend wijzigingsvoorstel gedaan. Voor een eventueel hieruit voorvloeiende gewijzigde arrangementsprijs gelden de normale betalingsvoorwaarden zoals genoemd in artikel 6.</p>
              
              <h3 className="text-xl font-semibold text-foreground mb-3 mt-4">8.4. Vervangend persoon</h3>
              <p className="text-foreground mb-2">8.4.a. Tijdig voor de aanvang van het arrangement kan een deelnemer zich laten vervangen door een ander. Daarvoor gelden de volgende voorwaarden:</p>
              <ul className="list-disc pl-6 mb-4 text-foreground">
                <li>de ander voldoet aan alle aan de overeenkomst verbonden voorwaarden; en</li>
                <li>het verzoek wordt uiterlijk 10 dagen vóór vertrek ingediend, dan wel zo tijdig dat de benodigde handelingen en formaliteiten nog kunnen worden verricht; en</li>
                <li>de voorwaarden van de bij de uitvoering betrokken dienstverleners verzetten zich niet tegen deze in-de-plaatsstelling.</li>
              </ul>
              <p className="text-foreground">8.4.b. De opdrachtgever is hoofdelijk aansprakelijk tegenover Bureau Vlieland voor de betaling van het nog verschuldigde gedeelte van de reissom. Eventuele wijzigings- en communicatiekosten en de eventuele extra kosten als gevolg van de in-de-plaatsstelling, zoals bijvoorbeeld de kosten voor de naamswijziging van het ticket worden in rekening gebracht bij opdrachtgever.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 9. Wijziging door Bureau Vlieland</h2>
              <p className="text-foreground">Bureau Vlieland is gerechtigd om in onderdelen van de overeenkomst wijzigingen aan te brengen (met inbegrip van de uit een dergelijke wijziging voortvloeiende prijsaanpassing) wegens gewichtige, door haar aan de opdrachtgever meegedeelde, omstandigheden welke ten tijde van het maken van het programmavoorstel/offerte niet voorzienbaar waren.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 10. Opzegging door Bureau Vlieland</h2>
              <p className="text-foreground mb-2">10.1. Bureau Vlieland heeft het recht de overeenkomst op te zeggen wegens gewichtige omstandigheden.</p>
              <p className="text-foreground mb-2">10.2. Onder gewichtige omstandigheden worden verstaan omstandigheden die van zodanige aard zijn dat verdere gebondenheid van Bureau Vlieland aan de overeenkomst in redelijkheid niet kan worden gevergd.</p>
              <p className="text-foreground mb-2">10.3. Indien de oorzaak van de opzegging aan de opdrachtgever kan worden toegerekend, komt de hieruit voortvloeiende schade voor rekening van de opdrachtgever.</p>
              <p className="text-foreground mb-2">10.4. Indien de oorzaak van de opzegging aan Bureau Vlieland kan worden toegerekend, komt de hieruit voortvloeiende schade voor rekening van Bureau Vlieland. Of zulks het geval is, wordt bepaald aan de hand van artikel 15 (Aansprakelijkheid en beperking van aansprakelijkheid) en artikel 16 (Overmacht).</p>
              <p className="text-foreground">10.5. Indien de oorzaak van de opzegging noch aan de reiziger noch aan Bureau Vlieland kan worden toegekend, dragen beide partijen hun eigen schade zoals nader uitgewerkt in artikel 19 (Hulp en bijstand).</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 11: Verzekeringen</h2>
              <p className="text-foreground">Bureau Vlieland biedt de opdrachtgever en daarmee alle deelnemers geen mogelijkheid aan tot het afsluiten van een reis- en/of een annuleringsverzekering. De opdrachtgever dient zelf zorg te dragen voor een reis- en/of annuleringsverzekering. Bureau Vlieland kan verzoeken om inzage in deze verzekering.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 12: Informatieplicht opdrachtgever</h2>
              <p className="text-foreground mb-2">12.1. Opdrachtgever verstrekt Bureau Vlieland alle gegevens omtrent hemzelf en de door hem aangemelde deelnemers die van belang kunnen zijn voor het correct kunnen uitvoeren van het arrangement. Tevens vermeldt de opdrachtgever bijzonderheden omtrent de hoedanigheid of de samenstelling van de door hem aangemelde deelnemer(s) of groep deelnemers die van belang kunnen zijn voor de goede uitvoering van het arrangement door Bureau Vlieland.</p>
              <p className="text-foreground mb-2">12.2. De opdrachtgever is verplicht informatie te verstrekken met betrekking tot de lichamelijke en geestelijke toestand van de deelnemer(s) (waaronder het gebruik van alcohol, drugs of medicijnen) als die lichamelijke en/of geestelijke toestand kan leiden tot ongemak, gevaar of risico's voor hemzelf of de overige deelnemers dan wel andere reizigers (begeleiding Bureau Vlieland, passagiers en/of bemanning) of bezittingen van derden. De opdrachtgever is zich ervan bewust dat de vervoerder (bijvoorbeeld de schipper van een boot) hem of een van de deelnemers het recht op verder vervoer kan ontzeggen als de informatie niet correct blijkt of niet wordt verstrekt. Informatie moet ook worden verstrekt met betrekking tot een beperkte mobiliteit, alsmede bij de noodzaak tot het begeleiden van minderjarige en mindervalide reizigers, zwangere vrouwen, zieken en andere deelnemers. Het is de opdrachtgever bekend dat de vervoerder zich het recht voorbehoudt om ten aanzien van bepaalde medische condities een medische verklaring te verlangen en bij ontbreken van die verklaring de opdrachtgever het recht op (verder) vervoer te ontzeggen.</p>
              <p className="text-foreground">12.3. Indien de opdrachtgever in deze informatieplicht tekortschiet en dit tot gevolg heeft dat deze deelnemer(s) door Bureau Vlieland van (verdere) deelname aan het arrangement wordt (worden) uitgesloten, worden de in dat artikel bedoelde kosten aan de opdrachtgever in rekening gebracht.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 13: Informatieplicht vooraf en verantwoordelijkheid Bureau Vlieland</h2>
              <p className="text-foreground mb-2">13.1. Bureau Vlieland zorgt voor de nodige informatie en voorlichting over het arrangement aan de opdrachtgever. Dit omvat zaken als programma, reisschema, belangrijke contactgegevens en informatie over reisdocumenten en visa.</p>
              <p className="text-foreground mb-2">13.2. De opdrachtgever verzorgt de voorlichting over het arrangement aan de deelnemers, na voorafgaand overleg met Bureau Vlieland, tenzij anders overeengekomen. De opdrachtgever zal zaken als het reisschema, belangrijke contactgegevens en informatie over reisdocumenten en visa aan de deelnemers distribueren na hierover informatie te hebben ontvangen van de Bureau Vlieland.</p>
              <p className="text-foreground">13.3. De vertegenwoordiging van Bureau Vlieland is als enige partij berust met de leiding gedurende de uitvoering van het arrangement. Onder de vertegenwoordiging van Bureau Vlieland valt personeel van Bureau Vlieland en ingehuurde derden, zoals gidsen, reisleiding, etc.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 14: Wijzigingen en Niet doorgaan wegens gewichtige omstandigheden</h2>
              <p className="text-foreground">Indien wegens gewichtige omstandigheden het arrangement of een deel van het arrangement gewijzigd dient te worden of geen doorgang kan vinden, waaromtrent Bureau Vlieland geen verwijt te maken valt, is Bureau Vlieland verplicht de opdrachtgever hiervan onverwijld in kennis te stellen. Bureau Vlieland doet in dit geval de opdrachtgever een passend alternatief.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 15. Aansprakelijkheid en beperking aansprakelijkheid Bureau Vlieland</h2>
              <p className="text-foreground mb-2">15.1. Bureau Vlieland zal bij haar werkzaamheden de zorg van een goede opdrachtnemer in acht nemen.</p>
              <p className="text-foreground mb-2">15.2. Recht op de aansprakelijkheidssom heeft de opdrachtgever alleen indien het arrangement niet in overeenstemming met het aangeleverde programma en overige gemaakte afspraken wordt uitgevoerd, tenzij de tekortkoming niet is toe te rekenen aan Bureau Vlieland noch aan de persoon van wiens hulp bij de uitvoering van de overeenkomst gebruik gemaakt is, omdat:</p>
              <p className="text-foreground mb-2">15.2.a. De tekortkoming in de uitvoering van het arrangement is toe te rekenen aan de opdrachtgever of de deelnemer; of</p>
              <p className="text-foreground mb-2">15.2.b. De tekortkoming in de uitvoering van het arrangement niet kon worden voorzien of niet kon worden opgeheven en toe te rekenen is aan een derde die niet bij de levering van de in het arrangement begrepen diensten is betrokken; of</p>
              <p className="text-foreground mb-2">15.2.c. De tekortkoming in de uitvoering van het arrangement te wijten is aan een gebeurtenis die Bureau Vlieland of degene van wiens hulp hij bij de uitvoering van de overeenkomst gebruikmaakt, met in achtneming van alle mogelijke zorgvuldigheid niet kon voorzien of verholpen; of</p>
              <p className="text-foreground mb-2">15.2.d. De tekortkoming in de uitvoering van het arrangement te wijten is aan onvoorziene omstandigheden en Bureau Vlieland hierdoor verhinderd is haar verplichtingen na te komen. Als onvoorziene omstandigheden kunnen onder meer gelden: stakingen, werkonderbreking, verlies van voorraad bij leveranciers, import- en exportverboden en brand; of</p>
              <p className="text-foreground mb-2">15.2.e. De tekortkoming in de uitvoering van het arrangement hem niet kan worden toegerekend ten gevolge van overmacht als bedoeld in artikel 16.</p>
              <p className="text-foreground mb-2">15.3. Indien bv. een boottocht of ander programma-onderdeel (voorstelling, bijeenkomst, excursie) onderdeel is van de overeenkomst en de opdrachtgever niet of niet tijdig de vertrekhaven of het betreffende programma-onderdeel kan bereiken doordat het vervoer auto, bus, trein, e.d. naar de vertrekhaven geen doorgang kan vinden ten gevolge van extreme weersomstandigheden en/of overheidsmaatregelen die het vervoer onmogelijk maken, komt dit in afwijking van lid 2 voor risico van de opdrachtgever. De opdrachtgever blijft in dat geval de volledige reissom verschuldigd.</p>
              <p className="text-foreground mb-2">15.4. Indien Bureau Vlieland zelf toerekenbaar tekortschiet en daarmee aansprakelijk is voor derving van (reis)genot van één of meer deelnemers, bedraagt de vergoeding per deelnemer ten hoogste maximaal éénmaal de gefactureerde arrangementsprijs per persoon. Deze maximale aansprakelijkheidssom geldt voor het desbetreffende arrangement.</p>
              <p className="text-foreground mb-2">15.5. Bureau Vlieland aanvaardt geen aansprakelijkheid voor handelingen en/of nalatigheden van door haar ingeschakelde derden, noch voor de juistheid van de door deze dienstverlener(s) verstrekte informatie. Bureau Vlieland draagt geen verantwoordelijkheid voor foto's, folders, advertenties, websites en andere informatiedragers voor zover onder verantwoordelijkheid van derden opgesteld of uitgegeven.</p>
              <p className="text-foreground mb-2">15.6. Bureau Vlieland is niet verantwoordelijk voor eventuele toezeggingen van door haar ingeschakelde derden, waarbij op kenbare wijze wordt afgeweken van de in deze voorwaarden of in de voorwaarden van de verantwoordelijke dienstverlener vermelde condities, tenzij zulke toezeggingen nadien schriftelijk worden bevestigd door Bureau Vlieland.</p>
              <p className="text-foreground mb-2">15.7. Door Bureau Vlieland ingeschakelde derden hebben niet de functie van vertegenwoordiger van Bureau Vlieland. Derden hebben niet de bevoegdheid om claims aan te nemen en rechtsbindende verklaringen af te geven en/of te ontvangen.</p>
              <p className="text-foreground mb-2">15.8. Bureau Vlieland aanvaardt geen aansprakelijkheid voor schade waartegen de opdrachtgever en deelnemer(s) is/zijn verzekerd (bijvoorbeeld door middel van het sluiten van een reis- en/of annuleringskostenverzekering dan wel ziektekostenverzekering), alsmede aansprakelijkheid voor schade die de opdrachtgever lijdt in het kader van de uitoefening van een beroep of bedrijf (daaronder begrepen schade door het missen van aansluitingen c.q. het niet tijdig op de plaats van bestemming aankomen), worden uitgesloten.</p>
              <p className="text-foreground mb-2">15.9. Bureau Vlieland kan niet aansprakelijk worden gesteld voor lichamelijk letsel of schade, delicten of diefstal en verlies van eigendommen van de opdrachtgever en deelnemer(s).</p>
              <p className="text-foreground mb-2">15.10. Bureau Vlieland is niet aansprakelijk voor handelingen en/of gedragingen van de opdrachtgever en deelnemer(s).</p>
              <p className="text-foreground mb-2">15.11. De in dit artikel opgenomen uitsluitingen en/of beperkingen van de aansprakelijkheid van Bureau Vlieland gelden ook ten behoeve van werknemers van Bureau Vlieland en betrokken dienstverleners, evenals hun personeel, tenzij verdrag of wet dit uitsluit.</p>
              <p className="text-foreground mb-2">15.12. Elke aansprakelijkheid van Bureau Vlieland vervalt door het verloop van één maand, te rekenen vanaf het moment van het ontstaan van de schade.</p>
              <p className="text-foreground">15.13. Ingeval op een in de reis begrepen dienst een Verdrag van toepassing is dat een uitsluiting of beperking van aansprakelijkheid aan de dienstverlener toekent of toestaat, is de aansprakelijkheid van Bureau Vlieland dienovereenkomstig uitgesloten of beperkt.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 16: Overmacht</h2>
              <p className="text-foreground mb-2">16.1. Onder overmacht wordt verstaan abnormale en onvoorzienbare omstandigheden die onafhankelijk zijn van de wil van degene die zich er op beroept en waarvan de gevolgen ondanks alle voorzorgsmaatregelen niet konden worden vermeden.</p>
              <p className="text-foreground">16.2. Bureau Vlieland heeft het recht om de uitvoering van de opdracht op te schorten of de overeenkomst door middel van een schriftelijke mededeling te ontbinden zonder tot enige schadevergoeding jegens opdrachtgever gehouden te zijn, ingeval Bureau Vlieland door overmacht wordt verhinderd de opdracht geheel of gedeeltelijk uit te voeren.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 17: Vrijwaring door de opdrachtgever</h2>
              <p className="text-foreground">Bureau Vlieland is gevrijwaard door de opdrachtgever tegen vorderingen van deelnemers of andere derden die door of namens de opdrachtgever bij het arrangement betrokken zijn.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 18: Verplichtingen van de deelnemer</h2>
              <p className="text-foreground mb-2">18.1. Alle deelnemers zijn verplicht de aanwijzingen van de opdrachtgever ter bevordering van de goede uitvoering van het arrangement op te volgen. De deelnemers zijn aansprakelijk voor de schade die wordt veroorzaakt bij ongeoorloofde gedragingen, te beoordelen naar de maatstaf van het gedrag van een correcte deelnemer. Hierbij geldt dat de opdrachtgever mede hoofdelijk aansprakelijk is voor het bovenstaande.</p>
              <p className="text-foreground mb-2">18.2. Alle individuele deelnemers die hinder of schade veroorzaken door bovengenoemde ongeoorloofde gedragingen, kunnen worden uitgesloten van verdere deelname aan het arrangement, indien door bovengenoemd gedrag de uitvoering in sterke mate wordt beïnvloed of bemoeilijkt. De daaruit voortvloeiende kosten komen voor rekening van de opdrachtgever.</p>
              <p className="text-foreground mb-2">18.3. Indien een deelnemer het arrangement niet (geheel) kan maken wegens het ontbreken van enig (geldig) document, komt zulks met alle daaraan verbonden gevolgen voor zijn rekening.</p>
              <p className="text-foreground">18.4. Alle deelnemers zijn zelf verantwoordelijk voor het bij zich hebben van de benodigde documenten, zoals een aan alle geldigheidsvereisten voldoend paspoort, de eventueel vereiste visa, bewijzen van inentingen en vaccinaties, (internationaal) rijbewijs en groene kaart.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 19. Hulp en bijstand</h2>
              <p className="text-foreground mb-2">19.1.a. Bureau Vlieland of de dienstverlener ter plaatse is naar gelang de omstandigheden verplicht de opdrachtgever en deelnemers hulp en bijstand te verlenen, indien de reis niet verloopt overeenkomstig de verwachtingen die deze op grond van de overeenkomst redelijkerwijs mocht hebben. De daaruit voortvloeiende kosten zijn voor rekening van Bureau Vlieland, indien de tekortkoming in de uitvoering van de overeenkomst hem overeenkomstig artikel 15 lid 2 is toe te rekenen.</p>
              <p className="text-foreground mb-2">19.1.b. Indien de oorzaak aan de opdrachtgever en deelnemers is toe te rekenen, is Bureau Vlieland tot verlening van hulp en bijstand slechts verplicht voor zover dat redelijkerwijs van hem kan worden gevergd. De kosten zijn in dat geval voor rekening van de opdrachtgever.</p>
              <p className="text-foreground">19.2. Indien de reis niet verloopt overeenkomstig de verwachtingen die de opdrachtgever op grond van de overeenkomst redelijkerwijs mocht hebben wegens omstandigheden die noch aan de opdrachtgever en deelnemers noch aan Bureau Vlieland zijn toe te rekenen, draagt ieder zijn eigen schade. Voor Bureau Vlieland bestaat deze o.a. uit de extra inzet van menskracht; voor de opdrachtgever bestaat deze o.a. uit extra verblijf- en repatriëringskosten.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 20: Klachten en evaluatie</h2>
              <p className="text-foreground mb-2">20.1. Alle geconstateerde tekortkomingen in de uitvoering van het arrangement dienen direct te worden gemeld bij (in deze volgorde) 1. de begeleiding van Bureau Vlieland 2. de betrokken dienstverlener, zodat deze ter plaatse een passende oplossing kan treffen. Indien de tekortkomingen niet binnen redelijke termijn kunnen worden opgelost en afbreuk doen aan de kwaliteit van het arrangement, de begeleiding van Bureau Vlieland of de betrokken dienstverlener niet aanwezig of bereikbaar, dan dient de opdrachtgever onverwijld contact op te nemen met het kantoor van Bureau Vlieland.</p>
              <p className="text-foreground mb-2">20.2. Opdrachtgever maakt uiterlijk 24 uur na terugkeer van het arrangement melding van een klacht die niet bevredigend is opgelost gedurende de uitvoering van het arrangement. Deze melding geschiedt bij het kantoor van Bureau Vlieland.</p>
              <p className="text-foreground mb-2">20.3. Indien opdrachtgever de klacht niet tijdig indient, wordt deze door Bureau Vlieland niet in behandeling genomen, tenzij de opdrachtgever hiervoor redelijkerwijs geen verwijt treft.</p>
              <p className="text-foreground">20.4. Bij het niet tijdig indienen van de klacht vervallen alle vorderingsrechten van de opdrachtgever op grond van deze overeenkomst.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 21: Rente en incassokosten</h2>
              <p className="text-foreground">Bij overschrijding van de overeengekomen betalingstermijn is de opdrachtgever over het factuurbedrag de wettelijke rente verschuldigd voor iedere maand of gedeelte daarvan waarmee de betalingstermijn is overschreden. Voorts is opdrachtgever gehouden tot vergoeding van de door Bureau Vlieland eventuele gemaakte incassokosten.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 22: Ontbinding bij insolventie</h2>
              <p className="text-foreground">De overeenkomst wordt met onmiddellijke ingang ontbonden, indien en zodra de opdrachtgever surséance van betaling aanvraagt, failliet wordt verklaard, na deugdelijk in gebreke te zijn gesteld nalatig blijft om vervallen termijnen te voldoen of nalatig blijft bij de totstandkoming van de overeenkomst door Bureau Vlieland verlangde zekerheid voor de nakoming tijdig of in voldoende mate te stellen. Indien de overeenkomst wordt ontbonden als gevolg van het bovenstaande gelden de annuleringsvoorwaarden zoals genoemd in artikel 8 (Annulering door opdrachtgever).</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Artikel 23: Geschillen</h2>
              <p className="text-foreground mb-2">23.1. Op alle verbintenissen en overeenkomsten welke daarvan een uitvloeisel zijn is uitsluitend het Nederlands recht van toepassing.</p>
              <p className="text-foreground mb-2">23.2. De beslissing van alle geschillen die voortvloeien uit de onder deze voorwaarden genoemde verbintenissen zijn met uitsluiting van iedere andere rechter opgedragen aan de bevoegde rechter in Leeuwarden.</p>
              <p className="text-foreground">23.3. Alle vorderingsrechten vervallen één jaar na afloop van de reis (of, indien de reis geen doorgang heeft gevonden, één jaar na de oorspronkelijke vertrekdatum).</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};
