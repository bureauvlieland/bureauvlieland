## Doel
Alle klant-, partner- en admin-mails inhoudelijk consistent maken met het Bureau Vlieland-model: één partij, één factuur, partner ziet geen klant-PII, correcte aanspreektoon en juiste e-mailadressen.

## Gevonden directe fout
De screenshot komt uit de template `booking_confirmed_partner` / “Definitieve boeking - Partner”. Daar staat nu nog:

- facturatie naar `facturatie@bureauvlieland.nl`
- suggestie dat de partner direct na klantakkoord factureert
- potentieel klant-/facturatiegegevens richting partner

Dat is inhoudelijk niet meer passend bij het huidige model.

## Plan van aanpak

1. **Eén inhoudelijke bron van waarheid vastleggen**
   - Partner-facing facturen: upload via partnerportaal of mailroute `inkoop@reply.bureauvlieland.nl`.
   - Geen partnerfacturen rechtstreeks naar de klant.
   - Geen klantfactuurgegevens/PII naar partners.
   - Bureau Vlieland factureert centraal aan de klant.
   - Partnercommunicatie: informeel “je”. Klantcommunicatie: formeel “u”.
   - Positionering: “lokale specialist / reisagent / boekingskantoor + programma-ontwikkelaar”; niet “regie op het eiland”.

2. **Live e-mailtemplates in Lovable Cloud nalopen en corrigeren**
   - Alle rijen in `email_templates` scannen op:
     - `facturatie@bureauvlieland.nl`
     - `administratie@bureauvlieland.nl` waar dat eigenlijk geen partner-inbox hoort te zijn
     - klantgegevens in partnermails
     - “direct/rechtstreeks naar klant” formuleringen
     - oude commissie-/facturatiemodelteksten
     - verkeerde aanspreekvorm “u/je”
   - De foutieve `booking_confirmed_partner` template herschrijven naar:
     - bevestiging dat de klant definitief akkoord heeft gegeven
     - overzicht van alleen relevante boekings-/uitvoeringsdetails
     - duidelijke facturatie-instructie: factuur pas volgens proces aan Bureau Vlieland, via portaal of `inkoop@reply.bureauvlieland.nl`, met referentie
     - geen klantfactuurgegevens tonen

3. **Hardcoded mailteksten in backend functions nalopen**
   - Vooral fallbackteksten en directe Mailjet bodies in `supabase/functions/*` controleren.
   - De specifieke fallback in `update-customer-program` aanpassen zodat die niet alsnog klantfactuurgegevens naar partners mailt als de database-template ontbreekt.
   - Waar mogelijk dezelfde correcte tekstblokken gebruiken als de live template.

4. **Partnerportaal- en gids-teksten nalopen**
   - Frontendteksten in partnergidsen, facturatiedialogen en partnerkaarten controleren op dezelfde regels.
   - `facturatie@bureauvlieland.nl` vervangen waar partnerfacturen bedoeld zijn door `inkoop@reply.bureauvlieland.nl` of de bestaande portaal-uploadroute.
   - Oude formuleringen zoals “verrekent vervolgens commissie met u” corrigeren naar het actuele commissiemodel.

5. **E-mailadressen consistent maken**
   - Algemene afzender/reply: `hallo@bureauvlieland.nl` of project-reply-adres.
   - Administratie/footer: `administratie@bureauvlieland.nl` waar het om Bureau Vlieland bedrijfsgegevens gaat.
   - Partnerfacturen/inkoop: `inkoop@reply.bureauvlieland.nl`.
   - Oude of foutieve adressen (`facturatie@bureauvlieland.nl` in partnerinstructies) verwijderen uit actuele teksten.

6. **Auditrapport toevoegen**
   - Een korte `.lovable` auditnotitie toevoegen met:
     - welke templates/teksten zijn gecontroleerd
     - welke inhoudelijke regels zijn afgedwongen
     - resterende bewuste uitzonderingen, als die er zijn
   - Dit voorkomt dat we later opnieuw dezelfde discussie krijgen.

7. **Validatie**
   - Na wijzigingen opnieuw zoeken op alle risicofragmenten.
   - De gecorrigeerde live templates uitlezen om te bevestigen dat de oude passage verdwenen is.
   - Controleren dat de partnerbevestigingsmail geen klantfacturatiegegevens meer bevat.

## Technische uitvoering
- Databasewijzigingen via een nieuwe migratie die bestaande `email_templates` bijwerkt.
- Codewijzigingen in de relevante backend function(s) en partner-facing frontendteksten.
- Geen wijziging aan gegenereerde Cloud-client/types bestanden.
- Geen oude migratiegeschiedenis herschrijven; actuele correcties gaan via nieuwe migratie en actuele code.