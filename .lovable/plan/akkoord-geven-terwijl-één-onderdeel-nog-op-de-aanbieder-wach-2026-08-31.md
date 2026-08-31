# Akkoord geven terwijl één onderdeel nog op de aanbieder wacht

Mevrouw Swagerman (BV-2606-0013) kan niet ondertekenen omdat de Zeehondentocht nog niet door de aanbieder is bevestigd. De pagina zegt alleen "Zodra alle activiteiten in uw programma bevestigd zijn, verschijnen hier de voorwaarden ter ondertekening" — zonder te benoemen welk onderdeel het is, wat wij doen, en zonder alternatief. Resultaat: klant denkt dat er iets stuk is en mailt/chat.

## Wat er verandert

### 1. Duidelijke uitleg op de Akkoord-tab

In plaats van de vage grijze kaart komt er een blok dat exact vertelt:

- Welke onderdelen nog op bevestiging wachten (naam, dag, tijd, aanbieder waar bekend).
- Dat de rest van het programma al bevestigd is (bijv. "5 van 6 onderdelen bevestigd").
- Wat Bureau Vlieland doet: wij zitten er bovenop en u hoeft niets te doen; u krijgt automatisch bericht zodra het rond is.
- Dat er verder niets van de klant nodig is behalve eventueel de facturatiegegevens.
- Contactregel (mail/chat) voor vragen.

Dezelfde uitleg komt in de mobiele weergave en in de voortgangsbalk-tekst, zodat de boodschap overal gelijk is.

### 2. Ondertekenen onder voorbehoud

Onder die uitleg komt een knop **"Toch nu ondertekenen (onder voorbehoud)"**. Klikken opent de normale voorwaardenkaart met een extra, duidelijk gemarkeerd blok:

- "Onder voorbehoud: [onderdeel] is nog niet bevestigd door de aanbieder."
- Uitleg: als de aanbieder onverhoopt niet kan, vervalt dit onderdeel of stellen wij een gelijkwaardig alternatief voor; het bedrag wordt dan aangepast. De rest van de boeking is definitief.
- De klant vinkt dit expliciet aan (los van het bestaande voorwaarden-vinkje) en ondertekent met naam.

Na ondertekenen:
- De Akkoord-tab toont het ondertekende akkoord mét de vermelding "1 onderdeel onder voorbehoud", tot de aanbieder bevestigt.
- Het voorbehoud verdwijnt automatisch zodra het onderdeel op bevestigd staat.
- In de admin (projectdetail) is zichtbaar dat er onder voorbehoud is ondertekend, met welke onderdelen open stonden.

Blijft ongewijzigd: is álles bevestigd, dan is het gewoon de bestaande, ongewijzigde ondertekenflow. Facturatiegegevens blijven verplicht vóór ondertekenen.

### Buiten scope

De onbeantwoorde chatvraag pakken we hier niet op; alleen de pagina.

## Technisch

- `src/lib/customerPortalStatus.ts`: naast `allConfirmed` een lijst `unconfirmedItems` (niet-cancelled items zonder confirmed/accepted/executed/invoiced/`item_quote_status = bevestigd`) en `canAcceptUnderReservation = !allConfirmed && unconfirmedItems.length > 0` exporteren.
- Nieuw `src/components/customer-portal/PendingConfirmationExplainer.tsx`: uitlegblok met de openstaande onderdelen + knop om onder voorbehoud te ondertekenen (state in `AcceptView`).
- `src/components/customer-portal/AcceptView.tsx`: vage kaart vervangen door de explainer; bij `underReservation` alsnog `AcceptTermsCard` renderen met nieuwe props `reservationItems` en `underReservation`.
- `src/components/customer-portal/AcceptTermsCard.tsx`: extra voorbehoud-blok + verplicht tweede checkbox; `onAccept` doorgeven met de lijst van voorbehoud-item-ids.
- `src/pages/CustomerProgram.tsx` + accepteer-hook/edge function (`accept-terms`-pad): item-ids meesturen en vastleggen in `accepted_terms_log` (metadata) plus een regel in `program_request_history` ("Ondertekend onder voorbehoud van: …"); bevestigingsmail krijgt dezelfde voorbehoudsregel.
- `src/components/customer-portal/AcceptedTermsCard.tsx` en `ProgramStepper.tsx`: voorbehoud-badge/tekst tonen zolang de betreffende items niet bevestigd zijn.
- `src/components/admin/RequestCompletionStatus.tsx`: regel "Ondertekend onder voorbehoud (n onderdelen)".
- Tests: statuslogica (`unconfirmedItems`, `canAcceptUnderReservation`) en een render-test dat de explainer de openstaande onderdelen benoemt.
