# Plan: Berichtencentrum als werkvoorraad

Status: onderzoek en plan 26 oktober 2026. Erwin heeft op 26 oktober ja
gezegd op alle vier de beslissingen onderaan. Fase 0 is op 26 oktober gebouwd,
fase 1 en 2 op 27 oktober (zie "Gebouwd" onderaan); fase 3 volgt.

Vraag van Erwin: "Dit overzicht is ook niet erg intuïtief. Dat moet beter
kunnen." Dit document legt eerst vast wat het scherm nu doet en wat de
database laat zien, zet daar de gangbare inbox-patronen naast (Gmail, Front,
Help Scout, Intercom) en komt dan tot een voorstel in vier fases.

## Deel 1 — wat er nu staat

### De code

`src/pages/admin/AdminMessages.tsx` (609 regels) toont vier tabbladen:

| Tab | Component | Wat het laat zien |
|---|---|---|
| E-mail | `EmailPanel.tsx` (1016 regels) | Gesprekken per dossier uit twee bronnen: `project_communications` (inkomend en handmatig verzonden, 90 dagen, max 800) en `email_log` (automatisch verzonden, 90 dagen, max 800) |
| Chat & live-chat | `ChatPanel.tsx` | Klantportaal, partnerportaal en WhatsApp, gegroepeerd per dossier |
| Pre-sales | `ChatPanel.tsx` met `mode="presales"` | Dezelfde chat, maar alleen gesprekken zonder dossier |
| Verzonden e-mails | tabel in `AdminMessages.tsx` zelf | De laatste 500 rijen van `email_log` met vijf teltegels en een zoekveld |

Daarnaast staat `InboxToAnswer.tsx` (452 regels) nog in de import van
`AdminMessages.tsx`, maar wordt nergens meer gerenderd. Het is de vorige
versie van de E-mail-tab en kan weg.

### De cijfers (database, laatste 90 dagen)

| Wat | Aantal |
|---|---|
| Inkomende e-mails (`email_in`) | 30 |
| Handmatig verzonden e-mails (`email_out`) | 57 |
| Automatisch verzonden e-mails (`email_log`, 44 verschillende types) | 348 |
| Gesprekken in de E-mail-tab | 40 |
| Gesprekken zonder één inkomend bericht | 28 van 40 |
| Mediaan per gesprek | 0 inkomend, 4 automatisch |
| Grootste gesprek | 58 automatische mails |
| Inkomende e-mails met bijlage (alle tijd) | 24 van 74 |
| Admins | 1 |

Negen van de tien berichten in de E-mail-tab zijn dus systeemmail, en in
zeven van de tien gesprekken heeft nooit iemand iets teruggeschreven. Het
scherm heet Berichtencentrum maar is in de praktijk een verzendlogboek met
daartussen af en toe een mail die een antwoord nodig heeft.

De aantallen zijn klein en dalen: inkomende e-mails per maand gingen van 27
in juni naar 4 in oktober, inkomende chatberichten van 23 in juni naar 1 in
oktober. De mediane reactietijd op een inkomende e-mail was 31 uur in juni
en 80 tot 100 uur in juli, augustus en september. Dat is het getal dat dit
scherm omlaag moet brengen.

### Wat er misgaat, met de oorzaak in de code

1. **Het nieuwste bericht van de klant staat onderaan, onder de systeemmail.**
   `EmailPanel` sorteert een gesprek oplopend op datum en scrolt niet. In
   BV-2608-0002 staan de twee onbeantwoorde berichten (Watertaxi de Bazuin
   op 25 oktober, Richard Dijkstra op 26 oktober) onder elf automatische
   mails.
2. **Automatische mails zijn even grote kaarten als mensenmail, met drie
   keer dezelfde informatie.** De kaarttekst wordt in `fetchEmails()`
   letterlijk opgebouwd als `Automatisch verstuurd: <type>\nNaar: <naam>`,
   terwijl `email_log` voor 383 van de 457 mails de echte tekst heeft
   (`text_body`, `html_body`) en ook weet of de mail geopend of aangeklikt is
   (204 van 457 geopend). De interne sleutel (`quote_offer_customer`) staat
   zichtbaar in de chip.
3. **Drie labelkaarten voor hetzelfde.** `emailTypeLabels` in
   `AdminMessages.tsx` kent 16 types, `EMAIL_TYPE_LABELS` in
   `src/types/projectCommunication.ts` kent 18 andere, en de 44 types die de
   afgelopen 90 dagen echt verstuurd zijn, staan grotendeels in geen van
   beide. `email_templates` heeft geen sleutelkolom, dus de namen uit die
   tabel zijn niet te koppelen.
4. **Twee boekhoudingen voor "te beantwoorden".** De functie `inbound-email`
   zet een nieuwe mail in `project_communications` (met `answered_at` leeg)
   én maakt een `admin_todos`-rij "Nieuw antwoord van …". De Werkbank telt
   de todo's, het Berichtencentrum telt `answered_at`. Ze lopen uit elkaar:
   de todo voor Ronald Oldenziel (4 september) staat op `done` terwijl de
   mail nooit als beantwoord is gemarkeerd, en de mail van Erwin Soolsma
   (15 oktober) is wel beantwoord terwijl de todo nog open staat.
5. **Drie tellers met drie definities.** De bel bovenin telt e-mails nieuwer
   dan een watermerk in `localStorage` plus ongelezen chats; de badge op de
   E-mail-tab telt onbeantwoorde inkomende mails; de lijst telt gesprekken;
   het lijstitem telt berichten ("2 nieuw"); de rij `↓2 ⚙11` telt richting.
   De getallen kloppen elk afzonderlijk, maar wie ze naast elkaar ziet kan
   dat niet weten.
6. **Beantwoorden sluit de cirkel niet.** `EmailPanel` opent
   `SendProjectEmailSheet` zonder `onEmailSent`, dus na versturen blijft het
   bericht onbeantwoord staan tot Erwin op `m` drukt. In het dode
   `InboxToAnswer` zat die koppeling wel. In de database staan nu nul mails
   die beantwoord zijn maar niet gemarkeerd, dus Erwin doet het met de hand.
7. **Bijlagen zijn onzichtbaar.** `inbound-email` slaat bijlagen op in
   storage en zet ze in `metadata.attachments`; `EmailPanel` leest dat veld
   niet. 24 inkomende mails hebben bijlagen.
8. **Tabs mengen drie dimensies.** E-mail en Chat zijn kanalen, Pre-sales is
   een fase, Verzonden e-mails is een richting. Verzonden e-mails is
   bovendien hetzelfde `email_log` dat ook al in de gesprekken zit, nu als
   tabel met teltegels: beheer, geen communicatie.
9. **De antwoordknop valt buiten beeld.** De gesprekskop heeft geen
   `min-w-0` op het linkerdeel, waardoor een lange titel de knoppen rechts
   uit de kaart duwt (zichtbaar op het screenshot).
10. **Design-systeem.** `EmailPanel` gebruikt losse paletkleuren
    (`bg-rose-50`, `text-emerald-700`, `bg-white`) en eigen chips waar
    `Pill`, `EmptyState` en de statustonen bestaan. Dit telt mee in de
    design-debt-teller.
11. **De live-abonnementen deden niets.** `useAdminInbox` en het oude
    `InboxToAnswer` abonneerden zich op wijzigingen in
    `project_communications`, maar die tabel zat niet in de
    realtime-publicatie van Supabase (alleen de drie chattabellen). Er kwam
    dus nooit een gebeurtenis, en daarom bestond de knop "Vernieuwen".

Eén vermoeden uit de eerste beoordeling klopt niet: de dubbele
"program_request_partner" naar Zuiver Traiteur is geen bug. Het zijn twee
onderdelen (verschillende `related_item_id`) van dezelfde partner. Het
scherm laat alleen niet zien welk onderdeel het betreft, dus het oogt als
een fout.

## Deel 2 — wat goed werkende inboxen anders doen

- **Werkvoorraad eerst.** De standaardweergave is "wacht op antwoord",
  gesorteerd op hoe lang iemand al wacht. Gelezen en beantwoord zijn twee
  verschillende dingen; een interne notitie telt niet als antwoord.
- **Berichten en gebeurtenissen zijn verschillende dingen.** Wat een mens
  schreef is een kaart. Wat het systeem deed is één regel in de tijdlijn,
  uitklapbaar, en een reeks wordt gebundeld ("8 aanvragen naar 6 partners").
- **Het nieuwste onbeantwoorde bericht is direct in beeld.** Oudere
  berichten ingeklapt, geciteerde tekst achter een knop, de thread opent op
  het eerste onbeantwoorde bericht.
- **Eén definitie van "open".** Elke teller in de interface telt hetzelfde
  ding, uit dezelfde bron.
- **Eén primaire actie.** Beantwoorden is dé knop; afhandelen en archiveren
  staan ernaast als lichte knoppen. Dat is ook regel 2 van het
  ontwerpsysteem.
- **Niet overdrijven.** Toewijzen, teamweergaven en SLA-timers horen bij
  een team. Hier is één admin en een handvol berichten per week.

## Deel 3 — het voorstel

### Het scherm

```
┌ Berichten ───────────────────────────────────────────────────────────────┐
│ [Te beantwoorden 2]  [Alle gesprekken]  [Archief]        kanaal ▾  zoek… │
├──────────────────────┬───────────────────────────────────────────────────┤
│ ● Richard Dijkstra   │ BV-2608-0002 · Richard Dijkstra     Akkoord · 5 nov│
│   BV-2608-0002 · klant│                                      [Project ↗] │
│   Re: Alternatief …  │  25 aug  Offerte verstuurd · geopend               │
│   wacht 1 dag        │  22 okt  Akkoord ontvangen                         │
│ ● Watertaxi de Bazuin│  22 okt  8 aanvragen naar 6 partners verstuurd  ▸  │
│   BV-2608-0002 · partner                                                  │
│   Re: Nieuwe aanvraag│ ┌ 25 okt · Watertaxi de Bazuin (partner) ─────────┐│
│   wacht 2 dagen      │ │ …tekst…                          📎 1 bijlage   ││
│                      │ └─────────────────────────────────────────────────┘│
│                      │ ┌ 26 okt · Richard Dijkstra (klant) ● onbeantwoord┐│
│                      │ │ …tekst…                                         ││
│                      │ └─────────────────────────────────────────────────┘│
│                      │ [Beantwoorden]   Afgehandeld   Archiveer   ···     │
└──────────────────────┴───────────────────────────────────────────────────┘
```

Drie weergaven in plaats van vier tabs. "Te beantwoorden" bevat e-mail én
chat, één rij per gesprek, gesorteerd op wachttijd. Kanaal (e-mail, chat
klant, chat partner, WhatsApp, website) is een filter, geen tab. Pre-sales
is het filter "zonder dossier"; zodra fase 5 van
`docs/plan-klantreis-en-ondertekening.md` de chat aan de aanvraag koppelt,
wordt die groep vanzelf klein.

In het gesprek: systeemmail als één regel met een Nederlands label en de
Mailjet-status, opeenvolgende mails van hetzelfde type gebundeld, mensenmail
als kaart met de rol van de afzender (klant of partner), bijlagen zichtbaar,
en de thread opent op het eerste onbeantwoorde bericht. Onderaan één
primaire knop.

### Fase 0 — opruimen en directe winst (1 bouwdag)

Alles hierin verandert de structuur niet en kan vandaag.

- `InboxToAnswer.tsx` en de import verwijderen.
- `onEmailSent` in `EmailPanel` koppelen aan "markeer gesprek als
  beantwoord", zoals het in `InboxToAnswer` al zat.
- Eén labelkaart `src/lib/emailTypeLabels.ts` met alle 44 types in gewoon
  Nederlands ("Offerte verstuurd", "Aanvraag naar partner", "Herinnering
  factuur, 7 dagen"), gebruikt door `EmailPanel`, `AdminMessages`,
  `EmailLogDetailDialog`, `ProjectCommunicationsCard` en `AdminTodos`. De
  twee bestaande kaarten verdwijnen.
- Automatische mails als één regel: label, ontvanger, onderdeel (via
  `related_item_id`), Mailjet-status. Klik opent het bestaande
  `EmailLogDetailDialog` met de echte inhoud.
- Reeksen bundelen: opeenvolgende automatische mails van hetzelfde type
  binnen tien minuten worden één regel "8 aanvragen naar 6 partners
  verstuurd", uitklapbaar. Als pure functie in `src/lib/emailThreadTimeline.ts`
  met een Vitest-test, zoals `emailThreadArchive.ts`.
- Thread opent gescrold naar het eerste onbeantwoorde bericht, anders naar
  het laatste bericht.
- Bijlagen uit `metadata.attachments` tonen met een downloadlink.
- `↓2 ✋ ⚙11` weg uit de lijst; de rij toont wachttijd en rol.
- `min-w-0` op de gesprekskop zodat de knoppen in beeld blijven.
- `Vernieuwen` weg: `EmailPanel` krijgt dezelfde `postgres_changes`-
  abonnementen als `useAdminInbox` (op `project_communications` en
  `email_log`).

### Fase 1 — één waarheid voor "te beantwoorden" (1 tot 2 bouwdagen)

- `answered_at` op `project_communications` wordt de enige bron.
  `inbound-email` maakt geen todo "Nieuw antwoord van …" meer aan; de
  Werkbank haalt onbeantwoorde e-mails en ongelezen chats rechtstreeks op
  (nieuwe bron in `inboxAssemble.ts`, met test). Bestaande open todo's van
  dit type worden eenmalig afgesloten.
- Eén hook `useOpenConversations` levert hetzelfde getal aan de bel, de
  sidebar-badge, de weergave "Te beantwoorden" en de Werkbank: onbeantwoorde
  inkomende e-mails plus gesprekken met ongelezen chatberichten, zonder
  archief, zonder gearchiveerde dossiers. Het watermerk in `localStorage`
  vervalt.
- De telling is overal per gesprek, nooit per bericht.

### Fase 2 — de nieuwe indeling (3 tot 4 bouwdagen)

- `AdminMessages.tsx` wordt een dunne pagina met de drie weergaven en het
  kanaalfilter; `EmailPanel` en `ChatPanel` leveren samen één lijst
  (`src/lib/conversationList.ts`, pure functie, getest) en elk hun eigen
  gespreksweergave.
- Lijstitem: naam, dossier en rol op de eerste regel, onderwerp of laatste
  bericht daaronder, wachttijd rechts, status als `Pill`. Ongelezen vet.
- Gesprekskop in de stijl van `PortalHead`: referentie, klant, statuspill,
  datum, knop naar het dossier. Templates verhuist uit de paginakop naar
  het `···`-menu; het staat al in de sidebar.
- Tijdlijn met gebeurtenissen (één regel) en berichten (kaart), met de
  bundeling uit fase 0. Datumscheidingen klein en zonder kapitalen.
- `SendProjectEmailSheet` blijft de composer (de AI-opsteller is waardevol),
  geopend vanuit één primaire knop onderaan de thread, op een telefoon via
  `ResponsiveSheetContent`.
- Verzonden e-mails wordt "Verzendlog" op `/admin/berichten/templates`,
  naast de templates. De teltegels gaan mee.
- Kleuren en chips op de tokens en `Pill`; de design-debt-teller gaat
  omlaag.

### Fase 3 — afronden (1 bouwdag)

- Sneltoetsen blijven; `m` heet "afgehandeld" en werkt op e-mail en chat.
- Een meetquery in `docs/` voor de mediane reactietijd en het aantal
  gesprekken dat langer dan drie dagen wacht, zodat we over een maand kunnen
  zien of het scherm zijn werk doet.
- Visuele test (`playwright.visual.config.ts`) van lijst en thread.

Totaal 6 tot 8 bouwdagen. Niet in dit plan: toewijzen aan collega's (één
admin), snoozen (de Werkbank heeft dat), een eigen mailclient naast het
dossier.

## Beslissingen voor Erwin

1. **`answered_at` als enige bron en de todo "Nieuw antwoord van …"
   afschaffen?** Advies: ja. De todo kan niet per bericht en de twee lopen
   aantoonbaar uit elkaar.
2. **E-mail en chat samen in "Te beantwoorden"?** Advies: ja. Het gaat om
   een handvol berichten per week; één lijst op wachttijd is dan het
   duidelijkst.
3. **Verzonden e-mails naar de templatespagina als verzendlog?** Advies:
   ja. Het is beheer, geen gesprek.
4. **Fase 0 nu bouwen, de rest na akkoord?** Fase 0 verandert geen
   structuur en is in een dag te zien op een preview.

## Gebouwd

### Fase 0 (26 oktober 2026)

- `InboxToAnswer.tsx` verwijderd, samen met de import in `AdminMessages`.
- Beantwoorden markeert het gesprek als beantwoord (`onEmailSent` in
  `EmailPanel` roept `setThreadAnswered` aan).
- Eén labelkaart `src/lib/emailTypeLabels.ts` met alle 63 types die ooit
  verstuurd zijn plus de oude sleutels, met categorie en Mailjet-statuslabels.
  Gebruikt door `EmailPanel`, `AdminMessages`, `EmailLogDetailDialog`,
  `ProjectCommunicationsCard`, `PartnerNotificationsCard` en `AdminTodos`;
  de vier losse kaarten zijn weg.
- Automatische mails zijn één regel: tijd, label, ontvanger, onderdeel (via
  `related_item_id`) en status (afgeleverd, geopend, geklikt, gebounced).
  Klik opent `EmailLogDetailDialog` met de echte inhoud uit `email_log`.
- Bundeling in `src/lib/emailThreadTimeline.ts` (pure functies, 19 tests):
  opeenvolgende automatische mails van hetzelfde type binnen tien minuten
  worden één uitklapbare regel, bijvoorbeeld "Aanvraag naar partner · 8
  mails naar Zuiver Traiteur, Brouwerij Fortuna, De Bazuin Watertaxi en 3
  anderen".
- Een gesprek opent op het eerste onbeantwoorde bericht, anders op het
  laatste bericht van een mens, anders onderaan.
- Bijlagen van inkomende mails worden getoond; `EmailAttachments` is uit
  het projectdossier gehaald naar een gedeeld component.
- De lijst toont per gesprek wie het laatst schreef met de rol (klant of
  partner, afgeleid van het klantadres van het dossier en eerdere
  partnermails) en "wacht 2 dagen" bij een open bericht. De iconen
  `↓ ✋ ⚙` zijn weg, "2 nieuw" heet "2 onbeantwoord".
- Gesprekskop: `min-w-0 flex-1` zodat de knoppen in beeld blijven.
- Migratie `20261026130000_berichtencentrum-realtime.sql` zet
  `project_communications` en `email_log` in de realtime-publicatie;
  `EmailPanel` abonneert zich erop (gedempt op 800 ms). De knop
  "Vernieuwen" is weg; de tab Verzonden e-mails ververst elke minuut.
- Kaarten en chips in `EmailPanel` op `Pill` en de statustokens in plaats
  van losse paletkleuren.

### Fase 1 (27 oktober 2026)

- Eén bron: `src/lib/openConversations.ts` haalt op wat open staat, per
  gesprek geteld: e-mailgesprekken met een inkomend bericht zonder
  `answered_at` (niet gearchiveerd, dossier niet gearchiveerd, 90 dagen) en
  chatgesprekken met een ongelezen bericht van een ander dan de admin (niet
  gesloten of gearchiveerd, dossier niet gearchiveerd). De groepering is
  zuiver en getest (11 tests); de query-invarianten uit de oude badge-test
  bewaken nu dit bestand (`openConversationsQuery.test.ts`).
- Eén hook `useOpenConversations` voedt de bel, de badge in de zijbalk en
  de drie tabbladen van het Berichtencentrum (E-mail, Chat, Pre-sales).
  `useAdminInbox` en `usePresalesUnread` zijn weg, en daarmee het
  "gezien"-watermerk in `localStorage`: open is open tot er geantwoord of
  gelezen is. De bel heet "Te beantwoorden".
- De Werkbank leest dezelfde bron: een dossier met een wachtend gesprek
  krijgt de reden "Te beantwoorden", een regel per gesprek ("E-mail van
  Richard Dijkstra · wacht 2 dagen") met een link naar het gesprek in het
  Berichtencentrum, en een score tussen een hoge-prioriteittaak en stilte.
  De cooldown op recent contact geldt hier niet. Opbouw in
  `inboxAssemble.ts`, vijf tests erbij.
- `inbound-email` maakt de todo "Nieuw antwoord van …" niet meer aan;
  `reconcile-admin-todos` kent het type niet meer. Migratie
  `20261027120000_berichtencentrum-todo-afschaffen.sql` sluit de drie nog
  openstaande exemplaren.

### Fase 2 (27 oktober 2026)

- `AdminMessages.tsx` is een dunne pagina: kop, drie weergaven (Te
  beantwoorden, Alle gesprekken, Archief) als tabbladen met teller, het
  kanaal als filterchips (E-mail, Chat klant, Chat partner, WhatsApp,
  Website), links de lijst, rechts het gesprek. De URL draagt weergave,
  kanaal en gesprek (`?weergave=&kanaal=&gesprek=`); oude links met
  `inbox=` en `conversation=` en de oude route `/admin/chat` blijven werken.
- Eén lijst voor e-mail en chat: `src/lib/conversationList.ts` (zuiver, 15
  tests) maakt van e-mailgesprekken en chatgesprekken dezelfde rij: wie en
  met welke rol, dossier, onderwerp of adres, wachttijd rechts, status als
  `Pill`, ongelezen vet. "Te beantwoorden" sorteert op wachttijd, de andere
  weergaven op laatste activiteit. Pre-sales is geen tabblad meer: chats
  zonder dossier staan gewoon in de lijst onder hun kanaal.
- `EmailPanel.tsx` (1270 regels) en `ChatPanel.tsx` (607 regels) zijn
  gesplitst: data en acties in `useEmailThreads` en `useAdminChat`
  (met archiefvlag en wachttijd per gesprek), de weergaven in
  `EmailThreadView` en `ChatConversationView`, de lijst in
  `ConversationList`, de opbouw van e-mailgesprekken in
  `src/lib/emailThreads.ts`.
- Gesprekskop in de stijl van `PortalHead`: dossierreferentie als eyebrow,
  de naam als kop, statuspill, feiten (aantal berichten, datum) en de knop
  naar het dossier; de overige acties in één `···`-menu. Onderaan één
  primaire knop "Beantwoorden" met "Afgehandeld" en "Archiveer" ernaast.
  De composer komt op een telefoon van onderen (`ResponsiveSheetContent`,
  ook voor het projectdossier).
- Chatweergave op dezelfde leest, met de chat-aan/uit-schakelaar in de
  paginakop en "Aanvraag aanmaken" en "Opslaan bij project" in het menu.
- Verzonden e-mails is "Verzendlog" op `/admin/berichten/templates`
  (tabblad naast de templates, `SentEmailLog`); de oude URL
  `?tab=verzonden` stuurt door. Templates en verzendlog staan in het
  `···`-menu van het Berichtencentrum.
- Sneltoetsen: j/k, Enter, Esc, r, m, u, e, 1/2/3 voor de weergaven, a, ?.
- Kleuren en chips op de tokens en `Pill`; de losse paletkleuren uit
  `EmailPanel` en `ChatPanel` zijn weg.
