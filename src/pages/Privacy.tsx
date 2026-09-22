import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Container, FunnelHead, Section } from "@/components/system";
import { GENERAL_CONTACT_EMAIL } from "@/lib/bureauContact";

/**
 * Privacyverklaring (fase 2 van docs/plan-reviews-oogsten.md): nodig zodra
 * wij beoordelingen en referenties met naam en organisatie publiceren.
 * Beschrijft wat de site en de programma-aanvraag werkelijk verwerken.
 */
const BIJGEWERKT = "22 september 2026";

const Privacy = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>Privacyverklaring – Bureau Vlieland</title>
      <meta name="description" content="Welke gegevens Bureau Vlieland verwerkt bij een aanvraag, een programma en een beoordeling, waarom, hoe lang en wat uw rechten zijn." />
      <link rel="canonical" href="https://bureauvlieland.nl/privacy" />
    </Helmet>
    <Navigation />

    <main id="main-content">
      <FunnelHead
        eyebrow="Privacy"
        title="Privacyverklaring"
        intro={`Wat wij met uw gegevens doen, in gewone taal. Bijgewerkt op ${BIJGEWERKT}.`}
      />

      <Section>
        <Container size="content">
          <div className="prose prose-lg max-w-none">
            <h2>Wie wij zijn</h2>
            <p>
              Bureau Vlieland organiseert programma's voor groepen op Vlieland. Wij zijn verantwoordelijk voor de verwerking van uw gegevens
              zoals hier beschreven. Sikkelduin 11, 8899 CG Vlieland, {GENERAL_CONTACT_EMAIL}, 0562 700 208.
            </p>

            <h2>Welke gegevens wij verwerken</h2>
            <ul>
              <li>
                <strong>Aanvraag en programma:</strong> uw naam, e-mailadres, telefoonnummer, organisatie, groepsgrootte, data, wensen en
                bijzonderheden (zoals dieetwensen), de gegevens van deelnemers die u zelf aanlevert, en de factuurgegevens van uw
                organisatie.
              </li>
              <li>
                <strong>Communicatie:</strong> de e-mails die wij u sturen en uw antwoorden daarop, berichten via het klantportaal en
                vragen via de chat op de website.
              </li>
              <li>
                <strong>Beoordelingen en referenties:</strong> de score en tekst die u na afloop invult, uw naam, functie en organisatie,
                en de toestemmingen die u daarbij geeft (met tijdstip en IP-adres als bewijs).
              </li>
              <li>
                <strong>Websitegebruik:</strong> noodzakelijke cookies voor het werken van de site; analytische en marketingcookies alleen
                als u die in de cookiebanner toestaat. Bij een technische fout ontvangen wij een foutrapport met technische gegevens
                van uw browser, zonder persoonsgegevens die u niet zelf invoerde.
              </li>
            </ul>

            <h2>Waarvoor en op welke grond</h2>
            <ul>
              <li>
                <strong>Uitvoering van de overeenkomst:</strong> uw aanvraag beantwoorden, een voorstel maken, het programma boeken bij
                de eilandpartners, u en uw deelnemers informeren, en factureren.
              </li>
              <li>
                <strong>Toestemming:</strong> cookies voor analyse en marketing, en het tonen van uw beoordeling of een referentiepagina
                op de website. Toestemming kunt u altijd intrekken.
              </li>
              <li>
                <strong>Gerechtvaardigd belang:</strong> de website beveiligen, fouten opsporen, onze dienstverlening verbeteren en u na
                afloop één keer vragen naar uw ervaring.
              </li>
              <li>
                <strong>Wettelijke plicht:</strong> factuurgegevens bewaren zolang de belastingdienst dat voorschrijft.
              </li>
            </ul>

            <h2>Met wie wij gegevens delen</h2>
            <p>
              Met de eilandpartners die uw programma uitvoeren (accommodaties, activiteitenaanbieders, horeca, vervoer) delen wij alleen
              wat zij voor de uitvoering nodig hebben: de naam van de contactpersoon, aantallen, tijden en bijzonderheden. Daarnaast
              gebruiken wij dienstverleners die voor ons gegevens opslaan of versturen, zoals onze database- en websitehosting,
              e-mailverzending, foutrapportage en (na toestemming) statistieken. Met hen hebben wij afspraken over de bescherming van
              uw gegevens. Wij verkopen geen gegevens.
            </p>

            <h2>Beoordelingen en referentiepagina's</h2>
            <p>
              Na afloop van een programma vragen wij één keer om een beoordeling. Wat u schrijft over wat beter kan, blijft intern. Uw
              naam, functie, organisatie en uw tekst komen alleen op bureauvlieland.nl als u daarvoor het vinkje heeft gezet. Een
              referentiepagina over uw programma maken wij alleen met uw toestemming; u ziet de pagina vooraf en keurt hem goed voordat
              hij online gaat. Een review op Google plaatst u zelf; daar hebben wij geen toegang toe. Wilt u een beoordeling of
              referentiepagina laten weghalen, mail dan naar {GENERAL_CONTACT_EMAIL}; wij halen hem dan van de website.
            </p>

            <h2>Hoe lang wij gegevens bewaren</h2>
            <p>
              Niet langer dan nodig. Aanvraag- en programmagegevens bewaren wij zolang wij ze nodig hebben voor de uitvoering, de
              nazorg en eventuele vragen achteraf; factuurgegevens bewaren wij zeven jaar vanwege de wettelijke bewaarplicht.
              Beoordelingen bewaren wij zolang ze gepubliceerd zijn of totdat u uw toestemming intrekt.
            </p>

            <h2>Beveiliging</h2>
            <p>
              Verbindingen met de website en het klantportaal zijn versleuteld. Het klantportaal en de beoordelingspagina zijn alleen
              bereikbaar via een persoonlijke link uit onze e-mails; deel die niet met anderen. Toegang tot gegevens is beperkt tot de
              mensen die ze voor hun werk nodig hebben.
            </p>

            <h2>Uw rechten</h2>
            <p>
              U kunt uw gegevens inzien, laten corrigeren of laten verwijderen, de verwerking laten beperken, bezwaar maken, uw
              gegevens laten overdragen en een gegeven toestemming intrekken. Mail daarvoor naar {GENERAL_CONTACT_EMAIL}; wij
              reageren binnen een maand. Bent u niet tevreden over hoe wij met uw gegevens omgaan, dan kunt u een klacht indienen bij
              de Autoriteit Persoonsgegevens.
            </p>

            <h2>Wijzigingen</h2>
            <p>
              Verandert er iets in wat wij verwerken, dan passen wij deze verklaring aan en zetten wij de datum bovenaan bij. Vragen?
              Neem <Link to="/contact">contact</Link> met ons op.
            </p>
          </div>
        </Container>
      </Section>
    </main>

    <Footer />
  </div>
);

export default Privacy;
