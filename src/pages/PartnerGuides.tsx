import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  UserPlus, 
  MessageSquare, 
  Calendar, 
  Receipt, 
  HelpCircle,
  CheckCircle2,
  XCircle,
  Clock,
  BedDouble,
} from "lucide-react";

const PartnerGuides = () => {
  return (
    <PartnerLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Handleidingen</h1>
          <p className="text-muted-foreground mt-2">
            Alles wat u moet weten over het werken met het Bureau Vlieland Partner Portaal
          </p>
        </div>

        {/* Aan de slag */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Aan de slag
            </CardTitle>
            <CardDescription>
              De eerste stappen om uw account in te richten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="account-activeren">
                <AccordionTrigger>Account activeren</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    U heeft een uitnodigingsmail ontvangen van Bureau Vlieland met een link om uw account te activeren.
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>Klik op de knop "Account Activeren" in de e-mail</li>
                    <li>Stel een veilig wachtwoord in (minimaal 8 tekens)</li>
                    <li>U wordt automatisch doorgestuurd naar het Partner Portaal</li>
                  </ol>
                  <p className="text-sm bg-muted p-3 rounded-lg">
                    <strong>Let op:</strong> De activatielink is 24 uur geldig. Neem contact op als de link verlopen is.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="wachtwoord-wijzigen">
                <AccordionTrigger>Wachtwoord wijzigen</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    U kunt uw wachtwoord op elk moment wijzigen via de instellingen:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>Ga naar <strong>Instellingen</strong> in het menu</li>
                    <li>Klik op "Wachtwoord wijzigen"</li>
                    <li>Voer uw huidige wachtwoord in en kies een nieuw wachtwoord</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="bedrijfsgegevens">
                <AccordionTrigger>Bedrijfsgegevens bijwerken</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Houd uw gegevens up-to-date voor een correcte facturatie:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li><strong>Adresgegevens:</strong> Voor correspondentie en commissiefacturen</li>
                    <li><strong>KvK-nummer:</strong> Verplicht voor zakelijke transacties</li>
                    <li><strong>Bankgegevens:</strong> IBAN en tenaamstelling</li>
                    <li><strong>Contactpersoon boekingen:</strong> Naam en telefoonnummer voor directe communicatie</li>
                  </ul>
                  <p className="text-sm">
                    Deze gegevens kunt u aanpassen via <strong>Instellingen</strong>.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Aanvragen verwerken */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Aanvragen verwerken
            </CardTitle>
            <CardDescription>
              Hoe u reageert op binnenkomende aanvragen van klanten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="nieuwe-aanvraag">
                <AccordionTrigger>Nieuwe aanvraag ontvangen</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Wanneer een klant uw diensten selecteert, ontvangt u:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>Een e-mailnotificatie met een samenvatting</li>
                    <li>Een melding op uw dashboard met "Actie vereist"</li>
                  </ul>
                  <p>
                    De aanvraag bevat alle relevante details: datum, tijdstip, aantal personen en eventuele speciale wensen.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="bevestigen">
                <AccordionTrigger className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Aanvraag bevestigen
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Wanneer u een aanvraag bevestigt, ontvangt de klant direct een bevestigingsmail. 
                    De activiteit wordt in hun programma gemarkeerd als "Bevestigd".
                  </p>
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800 text-sm">
                    <strong>Let op:</strong> Na bevestiging kunt u de datum/tijd niet meer wijzigen. 
                    Neem bij wijzigingen contact op met Bureau Vlieland.
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="alternatief">
                <AccordionTrigger className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Alternatief voorstellen
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Als het gevraagde tijdstip niet mogelijk is, kunt u een alternatief voorstellen:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>Klik op "Alternatief voorstellen"</li>
                    <li>Kies een andere datum en/of tijdstip</li>
                    <li>Voeg eventueel een toelichting toe</li>
                    <li>De klant ontvangt een mail met uw voorstel</li>
                  </ol>
                  <p>
                    De klant kan uw voorstel accepteren of een tegenvoorstel doen. U ontvangt hiervan bericht.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="afwijzen">
                <AccordionTrigger className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  Niet beschikbaar melden
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Als u in de gevraagde periode niet beschikbaar bent, kunt u dit aangeven:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>Klik op "Niet beschikbaar"</li>
                    <li>Voeg een korte reden toe (optioneel)</li>
                    <li>De klant en Bureau Vlieland worden geïnformeerd</li>
                  </ol>
                  <p className="text-sm">
                    <strong>Tip:</strong> Voorkom onnodige afwijzingen door uw beschikbaarheid vooraf bij te werken.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tegenvoorstel">
                <AccordionTrigger>Reageren op tegenvoorstel</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Wanneer een klant uw alternatief niet accepteert, kunnen zij een tegenvoorstel doen. 
                    U ontvangt hiervan een melding en kunt op dezelfde manier reageren:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>Bevestigen (als het nieuwe voorstel past)</li>
                    <li>Nieuw alternatief voorstellen</li>
                    <li>Aangeven dat u niet beschikbaar bent</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Beschikbaarheid beheren */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Beschikbaarheid beheren
            </CardTitle>
            <CardDescription>
              Periodes blokkeren waarin u niet beschikbaar bent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="periodes-instellen">
                <AccordionTrigger>Niet-beschikbare periodes instellen</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    U kunt vooraf periodes blokkeren waarin u niet beschikbaar bent:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>Ga naar <strong>Overzicht</strong> op uw dashboard</li>
                    <li>Scroll naar "Beschikbaarheid"</li>
                    <li>Klik op "Periode toevoegen"</li>
                    <li>Selecteer de start- en einddatum</li>
                    <li>Voeg eventueel een reden toe (bijv. "Vakantie")</li>
                  </ol>
                  <p>
                    Tijdens geblokkeerde periodes worden er geen aanvragen naar u doorgestuurd.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="periodes-verwijderen">
                <AccordionTrigger>Geblokkeerde periode verwijderen</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Plannen gewijzigd? U kunt een geblokkeerde periode eenvoudig verwijderen:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>Ga naar uw beschikbaarheidsoverzicht</li>
                    <li>Zoek de periode die u wilt verwijderen</li>
                    <li>Klik op het prullenbak-icoon</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Facturatie */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Facturatie
            </CardTitle>
            <CardDescription>
              Het commissiemodel en hoe u facturen registreert
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="commissiemodel">
                <AccordionTrigger>Commissiepercentages</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Bureau Vlieland rekent commissie over de door u gefactureerde omzet (exclusief BTW):
                  </p>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Activiteiten</span>
                      <span className="text-lg font-bold text-primary">15%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Logies</span>
                      <span className="text-lg font-bold text-primary">10%</span>
                    </div>
                  </div>
                  <p className="text-sm">
                    U factureert rechtstreeks aan de eindklant. Bureau Vlieland stuurt u periodiek 
                    een commissiefactuur op basis van de geregistreerde facturen in het portaal.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="factuur-registreren">
                <AccordionTrigger>Factuur registreren</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Na afloop van een activiteit registreert u de factuur in het portaal:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>Open de betreffende aanvraag</li>
                    <li>Klik op "Factuur registreren"</li>
                    <li>Voer het factuurnummer en bedrag exclusief BTW in</li>
                    <li>Upload eventueel een kopie van de factuur</li>
                  </ol>
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-blue-800 text-sm">
                    <strong>Tip:</strong> Vermeld het referentienummer (bijv. #BV-2501-0001) op uw factuur 
                    voor eenvoudige verwerking.
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="commissie-overzicht">
                <AccordionTrigger>Overzicht commissies</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Via <strong>Facturatie</strong> in het menu heeft u inzicht in:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>Openstaande commissies (nog te factureren door Bureau Vlieland)</li>
                    <li>Gefactureerde commissies (reeds afgerekend)</li>
                    <li>Jaar-tot-datum (YTD) statistieken</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="uitbetaling">
                <AccordionTrigger>Uitbetaling door Bureau Vlieland</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Bureau Vlieland verstuurt periodiek commissiefacturen naar partners. 
                    Het betalingsproces verloopt als volgt:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>U ontvangt een commissiefactuur per e-mail</li>
                    <li>De factuur bevat een overzicht van alle afgeronde activiteiten</li>
                    <li>Betaaltermijn: 14 dagen</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Logies (voor logiespartners) */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-primary" />
              Logies
            </CardTitle>
            <CardDescription>
              Voor partners die accommodatie aanbieden
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="offerte-indienen">
                <AccordionTrigger>Offerte indienen</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Wanneer Bureau Vlieland een logiesaanvraag naar u doorstuurt:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>Bekijk de aanvraagdetails (aantal gasten, data, wensen)</li>
                    <li>Klik op "Offerte indienen"</li>
                    <li>Vul de totaalprijs en eventuele voorwaarden in</li>
                    <li>Voeg een omschrijving toe van wat inbegrepen is</li>
                    <li>De klant ontvangt uw offerte in het klantportaal</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="offerte-wijzigen">
                <AccordionTrigger>Offerte wijzigen</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Zolang de klant uw offerte nog niet heeft geaccepteerd, kunt u deze aanpassen:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>Open de aanvraag in het Logies-overzicht</li>
                    <li>Klik op "Offerte bewerken"</li>
                    <li>Pas de prijs of voorwaarden aan</li>
                    <li>De klant ziet automatisch de bijgewerkte offerte</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="kamerindeling">
                <AccordionTrigger>Kamerindeling opgeven</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Bij uw offerte kunt u een kamerindeling specificeren:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>Aantal kamers per type (1-persoons, 2-persoons, etc.)</li>
                    <li>Bedconfiguratie per kamer</li>
                    <li>Eventuele bijzonderheden</li>
                  </ul>
                  <p className="text-sm">
                    Dit helpt de klant een weloverwogen keuze te maken tussen verschillende offertes.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Veelgestelde vragen */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Veelgestelde vragen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="faq-afwijzing">
                <AccordionTrigger>Wat als ik per ongeluk een aanvraag afwijs?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p>
                    Neem direct contact op met Bureau Vlieland via{" "}
                    <a href="mailto:erwin@bureauvlieland.nl" className="text-primary underline">
                      erwin@bureauvlieland.nl
                    </a>
                    . In sommige gevallen kan de afwijzing ongedaan worden gemaakt, 
                    afhankelijk van of de klant al geïnformeerd is.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-commissie">
                <AccordionTrigger>Kan ik mijn commissiepercentage laten aanpassen?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p>
                    Commissiepercentages worden vastgesteld in overleg met Bureau Vlieland. 
                    Neem contact op als u hierover wilt spreken.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-annulering">
                <AccordionTrigger>Wat gebeurt er als de klant annuleert?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Bij annulering door de klant:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>U ontvangt direct een melding via e-mail</li>
                    <li>De aanvraag wordt gemarkeerd als "Geannuleerd"</li>
                    <li>Eventuele annuleringskosten handelt u rechtstreeks af met de klant</li>
                    <li>Over geannuleerde boekingen wordt geen commissie berekend</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-wijziging">
                <AccordionTrigger>Kan een bevestigde boeking nog gewijzigd worden?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p>
                    Wijzigingen na bevestiging verlopen via Bureau Vlieland. 
                    Neem contact op via{" "}
                    <a href="mailto:erwin@bureauvlieland.nl" className="text-primary underline">
                      erwin@bureauvlieland.nl
                    </a>{" "}
                    of bel 0562-452090.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-maatwerk">
                <AccordionTrigger>Wat zijn maatwerk programma's?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Naast programma's die klanten zelf samenstellen via de configurator, 
                    maakt Bureau Vlieland ook maatwerk programma's op verzoek van klanten.
                  </p>
                  <p>
                    De werkwijze voor u als partner blijft hetzelfde: u ontvangt een aanvraag 
                    via het portaal en reageert zoals gebruikelijk.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact footer */}
        <div className="mt-8 p-6 bg-muted rounded-lg text-center">
          <h3 className="font-semibold mb-2">Nog vragen?</h3>
          <p className="text-muted-foreground text-sm">
            Neem contact op via{" "}
            <a href="mailto:erwin@bureauvlieland.nl" className="text-primary underline">
              erwin@bureauvlieland.nl
            </a>{" "}
            of bel{" "}
            <a href="tel:0562452090" className="text-primary underline">
              0562-452090
            </a>
          </p>
        </div>
      </div>
    </PartnerLayout>
  );
};

export default PartnerGuides;
