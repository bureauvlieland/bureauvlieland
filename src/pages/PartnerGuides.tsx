import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
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
  BarChart3,
  FileText,
  CreditCard,
  Package,
} from "lucide-react";

interface PartnerCommissionData {
  commission_percentage: number;
  accommodation_commission_percentage?: number;
  partner_type?: string;
}

const PartnerGuides = () => {
  const [searchParams] = useSearchParams();
  const [partnerData, setPartnerData] = useState<PartnerCommissionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPartnerData = async () => {
      try {
        const token = searchParams.get("token") || localStorage.getItem("partner_token");
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-partner-dashboard?token=${token}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setPartnerData({
            commission_percentage: data.partner?.commission_percentage ?? 15,
            accommodation_commission_percentage: data.partner?.accommodation_commission_percentage,
            partner_type: data.partner?.partner_type,
          });
        }
      } catch (error) {
        console.error("Error fetching partner data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPartnerData();
  }, [searchParams]);

  const isActivityPartner = !partnerData?.partner_type || partnerData.partner_type === 'activity_provider' || partnerData.partner_type === 'both';
  const isAccommodationPartner = partnerData?.partner_type === 'accommodation' || partnerData?.partner_type === 'both';

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
                    U kunt op twee manieren inloggen op het Partner Portaal:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>
                      <strong>Direct inloggen</strong> — Gebruik het e-mailadres en wachtwoord dat u van Bureau Vlieland heeft ontvangen (formaat: <code className="bg-muted px-1 rounded">Vlieland-XXXX</code>). Uw account wordt automatisch geactiveerd bij de eerste login.
                    </li>
                    <li>
                      <strong>Via activatielink</strong> — Klik op "Account Activeren" in de uitnodigingsmail om een eigen wachtwoord in te stellen.
                    </li>
                  </ol>
                  <p className="text-sm bg-muted p-3 rounded-lg">
                    <strong>Let op:</strong> De activatielink in de e-mail is 24 uur geldig. U kunt altijd direct inloggen met de verstrekte inloggegevens.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="voorwaarden-instellen">
                <AccordionTrigger className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Algemene voorwaarden instellen
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Voordat klanten uw diensten kunnen boeken, dient u uw algemene voorwaarden in te stellen. Ga naar <strong>Instellingen</strong> en kies uit twee opties:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>
                      <strong>Eigen voorwaarden uploaden</strong> — Upload een PDF met uw eigen algemene voorwaarden.
                    </li>
                    <li>
                      <strong>Standaardvoorwaarden accepteren</strong> — Gebruik de <em>Standaardvoorwaarden Partneraanbod Bureau Vlieland</em>.
                    </li>
                  </ul>
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-blue-800 text-sm">
                    <strong>Waarom is dit belangrijk?</strong> Bij elke boeking worden uw voorwaarden aan de klant getoond ter acceptatie. Dit vormt een juridisch bindende overeenkomst en is essentieel voor de audit-trail.
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="wachtwoord-wijzigen">
                <AccordionTrigger>Wachtwoord vergeten of wijzigen</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Wilt u uw wachtwoord wijzigen? Dit kunt u doen via de wachtwoord reset functie:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>Ga naar de <strong>Partner Login</strong> pagina</li>
                    <li>Vul uw emailadres in</li>
                    <li>Klik op "Wachtwoord vergeten?"</li>
                    <li>U ontvangt een email met een link om een nieuw wachtwoord in te stellen</li>
                  </ol>
                  <p className="text-sm bg-muted p-3 rounded-lg">
                    <strong>Let op:</strong> De reset link in de email is 1 uur geldig.
                  </p>
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

        {/* Dashboard */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Dashboard
            </CardTitle>
            <CardDescription>
              Uw overzichtspagina met alle belangrijke informatie op één plek
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="actiebanner">
                <AccordionTrigger>Actiebanner</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Bovenaan uw dashboard ziet u een actiebanner die aangeeft of er openstaande taken zijn:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li><strong>Nieuwe aanvragen</strong> — Aanvragen die wachten op uw reactie</li>
                    <li><strong>Tegenvoorstellen</strong> — Klanten die een tegenvoorstel hebben gedaan op uw alternatief</li>
                    <li><strong>Te factureren</strong> — Afgeronde activiteiten waarvoor nog geen factuur is geregistreerd</li>
                  </ul>
                  <p>
                    Als er geen acties nodig zijn, toont de banner een groene melding "Alles up-to-date".
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="statistiekknoppen">
                <AccordionTrigger>Statistiekknoppen</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Onder de actiebanner vindt u klikbare statistiekknoppen die het aantal items per status tonen. Klik op een knop om direct naar het betreffende overzicht of de bijbehorende pagina te navigeren.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="gecombineerd-overzicht">
                <AccordionTrigger>Gecombineerd overzicht</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Alle activiteiten en logiesaanvragen worden gecombineerd in één lijst, automatisch gesorteerd op urgentie. Items die uw aandacht vereisen staan bovenaan.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="agenda">
                <AccordionTrigger>Agenda</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    De agendawidget toont de komende 14 dagen met bevestigde en geaccepteerde items in chronologische volgorde. Zo heeft u altijd zicht op wat er binnenkort gepland staat.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ytd-module">
                <AccordionTrigger>YTD-module (Jaar-tot-datum)</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Onderaan het dashboard vindt u de YTD-module met:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li><strong>Totale omzet</strong> — Uw cumulatieve omzet van het lopende jaar</li>
                    <li><strong>Openstaande commissie</strong> — Commissie die nog door Bureau Vlieland gefactureerd wordt</li>
                  </ul>
                  <p>
                    Klik op "Facturatie" om naar het volledige financiële overzicht te gaan.
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

              <AccordionItem value="referentienummer">
                <AccordionTrigger>Referentienummer en versie</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Elke aanvraag heeft een uniek referentienummer in het formaat <code className="bg-muted px-1 rounded">#BV-JJMM-NNNN</code> (bijv. #BV-2601-0001).
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>Het referentienummer is zichtbaar in de aanvraagdetails en kan met de <strong>kopieerknop</strong> worden gekopieerd</li>
                    <li>Vermeld dit nummer altijd op uw factuur voor eenvoudige verwerking</li>
                    <li>Bij wijzigingen door de klant verschijnt een <strong>versie-indicator</strong>, zodat u kunt zien dat er iets is gewijzigd</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="bevestigen">
                <AccordionTrigger className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Aanvraag bevestigen
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Bij het bevestigen van een aanvraag geeft u de volgende informatie op:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li><strong>Prijs (excl. BTW)</strong> — Het bedrag dat u aan de klant factureert, exclusief BTW</li>
                    <li><strong>Voorkeurstijd/datum</strong> — Optioneel, als u een specifiek tijdstip wilt voorstellen</li>
                    <li><strong>Toelichting</strong> — Eventuele opmerkingen bij uw bevestiging</li>
                  </ul>
                  <p>
                    Na bevestiging ontvangt de klant direct een bevestigingsmail en wordt de activiteit in hun programma gemarkeerd als "Bevestigd".
                  </p>
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    <strong>Verwachte commissie:</strong> Bij de bevestiging wordt een voorberekening van de commissie getoond op basis van uw opgegeven prijs en uw commissiepercentage ({isLoading ? '...' : `${partnerData?.commission_percentage ?? 10}%`}).
                  </div>
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

        {/* Mijn Aanbod (voor activiteitenpartners) */}
        {isActivityPartner && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Mijn Aanbod
              </CardTitle>
              <CardDescription>
                Beheer uw activiteiten en bouwblokken
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="aanbod-overzicht">
                  <AccordionTrigger>Overzicht van uw aanbod</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      Via <strong>Mijn Blokken</strong> in het menu vindt u een overzicht van al uw activiteiten en bouwblokken. Elk blok toont de status, prijs en eventuele seizoensnotities.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="aanbod-toevoegen">
                  <AccordionTrigger>Nieuw blok toevoegen</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      U kunt zelf nieuwe activiteiten voorstellen:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                      <li>Klik op "Blok toevoegen"</li>
                      <li>Vul de details in:
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                          <li><strong>Naam en omschrijving</strong></li>
                          <li><strong>Duur</strong> (bijv. 1,5 uur)</li>
                          <li><strong>Prijs</strong> — per persoon of vast bedrag, exclusief BTW</li>
                          <li><strong>Min/max personen</strong></li>
                          <li><strong>Seizoensnotities</strong> (optioneel)</li>
                        </ul>
                      </li>
                    </ol>
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800 text-sm">
                      <strong>Let op:</strong> Nieuwe blokken krijgen de status "Concept" en worden pas zichtbaar voor klanten nadat Bureau Vlieland ze heeft beoordeeld en goedgekeurd.
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="aanbod-status">
                  <AccordionTrigger>Status van uw blokken</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      Elk blok doorloopt drie statussen:
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                      <li><strong>Concept</strong> — Uw voorstel wordt beoordeeld door Bureau Vlieland</li>
                      <li><strong>Actief</strong> — Goedgekeurd, beschikbaar voor maatwerk en offertes</li>
                      <li><strong>Gepubliceerd</strong> — Zichtbaar voor klanten in de configurator</li>
                    </ul>
                    <p className="text-sm">
                      Publicatie is een bevoegdheid van Bureau Vlieland. U kunt uw blokken inhoudelijk bijwerken zolang ze actief zijn.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Facturatie */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Facturatie
            </CardTitle>
            <CardDescription>
              Het commissiemodel, facturatiemodellen en hoe u facturen registreert
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="facturatiemodel">
                <AccordionTrigger className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Facturatiemodel
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Per project wordt een facturatiemodel bepaald. Er zijn twee modellen:
                  </p>
                  <div className="space-y-3">
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="font-medium">Partner Direct</p>
                      <p className="text-sm mt-1">U factureert rechtstreeks aan de eindklant. Bureau Vlieland stuurt u een commissiefactuur.</p>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="font-medium">Bureau Centraal</p>
                      <p className="text-sm mt-1">Bureau Vlieland factureert de eindklant. U stuurt uw factuur naar Bureau Vlieland.</p>
                    </div>
                  </div>
                  <p className="text-sm">
                    Het facturatiemodel is zichtbaar in de aanvraagdetails, zodat u altijd weet aan wie u dient te factureren.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="commissiemodel">
                <AccordionTrigger>Commissiepercentages</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Bureau Vlieland rekent commissie over het door u gefactureerde bedrag <strong>exclusief BTW</strong>:
                  </p>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    {isLoading ? (
                      <>
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </>
                    ) : (
                      <>
                        {(!partnerData?.partner_type || partnerData.partner_type !== 'accommodation') && (
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Activiteiten</span>
                            <span className="text-lg font-bold text-primary">
                              {partnerData?.commission_percentage ?? 15}%
                            </span>
                          </div>
                        )}
                        {(partnerData?.partner_type === 'accommodation' || partnerData?.partner_type === 'both') && (
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Logies</span>
                            <span className="text-lg font-bold text-primary">
                              {partnerData?.accommodation_commission_percentage ?? 10}%
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-sm">
                    De <strong>verwachte commissie</strong> is alvast zichtbaar bij elke aanvraag zodra u een prijs heeft opgegeven, zodat u vooraf inzicht heeft in de kosten.
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
                  <div className="bg-muted p-3 rounded-lg text-sm space-y-2">
                    <p>
                      <strong>Bij Bureau Centraal:</strong> Stuur uw factuur naar Bureau Vlieland in plaats van naar de eindklant. U kunt een factuurkopie uploaden bij het registreren.
                    </p>
                  </div>
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
        {isAccommodationPartner && (
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

                <AccordionItem value="kamersoorten">
                  <AccordionTrigger>Kamersoorten configureren</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      Configureer uw standaard kamertypes eenmalig, zodat u deze snel kunt hergebruiken bij het opstellen van offertes:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                      <li>Ga naar <strong>Kamersoorten</strong> in het menu</li>
                      <li>Klik op "Kamersoort toevoegen"</li>
                      <li>Vul de details in:
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                          <li>Naam (bijv. "Tweepersoonskamer Superior")</li>
                          <li>Oppervlakte in m²</li>
                          <li>Bedconfiguratie</li>
                          <li>Maximale bezetting</li>
                          <li>Faciliteiten (WiFi, TV, balkon, etc.)</li>
                          <li>Richtprijs per nacht</li>
                        </ul>
                      </li>
                    </ol>
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-blue-800 text-sm">
                      <strong>Voordeel:</strong> Bij het indienen van een offerte kunt u met één klik een kamersoort toevoegen. 
                      Alle gegevens worden automatisch overgenomen.
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="extra-diensten">
                  <AccordionTrigger>Extra diensten beheren</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      Naast kamers kunt u extra diensten aanbieden zoals catering of parkeerplaatsen:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                      <li>Ga naar <strong>Extra's</strong> in het menu</li>
                      <li>Maak sjablonen aan voor veelgebruikte diensten:
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                          <li>Naam en omschrijving</li>
                          <li>Prijs per persoon of vast bedrag</li>
                          <li>BTW-tarief (9% of 21%)</li>
                          <li>Categorie (F&B, Faciliteiten, Transport, Overig)</li>
                        </ul>
                      </li>
                    </ol>
                    <p>
                      Bij het opstellen van een offerte kunt u deze sjablonen selecteren en direct toevoegen aan de offerte.
                    </p>
                    <div className="bg-muted p-3 rounded-lg text-sm">
                      <strong>Commissie:</strong> Over extra diensten geldt hetzelfde commissiepercentage als over logies 
                      ({isLoading ? '...' : `${partnerData?.accommodation_commission_percentage ?? 10}%`}).
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="kamerindeling">
                  <AccordionTrigger>Kamerindeling opgeven in offerte</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-3">
                    <p>
                      Bij uw offerte specificeert u de kamerindeling:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                      <li>Selecteer kamers uit uw vooraf ingestelde kamersoorten, óf</li>
                      <li>Voer handmatig een kamertype, aantal en prijs in</li>
                    </ol>
                    <p className="text-sm">
                      Dit helpt de klant een weloverwogen keuze te maken tussen verschillende offertes.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        )}

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
              <AccordionItem value="faq-facturatiemodel">
                <AccordionTrigger>Wat is het verschil tussen 'Partner Direct' en 'Bureau Centraal' facturatie?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Bij <strong>Partner Direct</strong> factureert u rechtstreeks aan de eindklant. Bureau Vlieland stuurt u vervolgens een commissiefactuur over het gefactureerde bedrag.
                  </p>
                  <p>
                    Bij <strong>Bureau Centraal</strong> factureert Bureau Vlieland de eindklant. U stuurt uw factuur naar Bureau Vlieland in plaats van naar de klant. Het facturatiemodel wordt per project bepaald en is zichtbaar in de aanvraagdetails.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-beschikbaarheid">
                <AccordionTrigger>Hoe kan ik mijn beschikbaarheid beheren?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p>
                    Via de beschikbaarheidsmanager op uw dashboard kunt u periodes blokkeren (bijv. vakantie, onderhoud). Ga naar <strong>Overzicht</strong> en scroll naar "Beschikbaarheid" om periodes toe te voegen of te verwijderen. Tijdens geblokkeerde periodes ontvangt u geen nieuwe aanvragen.
                  </p>
                </AccordionContent>
              </AccordionItem>

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
