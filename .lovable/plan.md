
# UX-optimalisaties admin omgeving

## 1. Sidebar: Financiele items groeperen

De sidebar heeft momenteel 14 losse menu-items, waarvan drie financiele items (Facturatie, Inkoopfacturen, Commissies) elk met hetzelfde Euro-icoon. Dit kan overzichtelijker.

**Voorstel:** Groepeer de sidebar in logische secties met subtitels en bundel de drie financiele pagina's onder een inklapbaar "Financien"-kopje.

Nieuwe sidebar-structuur:
- **Operationeel**: Dashboard, Projecten, CRM, Partners
- **Content**: Bouwstenen, Templates, Media
- **Financien** (inklapbaar): Facturatie, Inkoopfacturen, Commissies
- **Systeem**: Todo's, Berichten, Activiteitenlog, Instellingen

Elk icoon wordt uniek: Inkoopfacturen krijgt `Receipt` en Commissies krijgt `HandCoins` i.p.v. drie keer `Euro`.

---

## 2. Dashboard: Todo-widget toevoegen

Het dashboard toont statistieken en recente aanvragen, maar mist een directe link naar openstaande todo's -- juist het eerste wat je wilt zien als admin.

**Voorstel:** Voeg boven de "Recente aanvragen" een compacte todo-widget toe die de top-5 urgente/openstaande todo's toont met checkbox-functionaliteit. Hiermee kun je snel taken afvinken zonder naar de Todo-pagina te navigeren.

---

## 3. Projectdetailpagina: Tabs in plaats van lange scroll

`AdminRequestDetail.tsx` is 1171 regels lang en toont alles in een lange scrollpagina: klantinfo, eventdetails, activiteitenstatus, gekoppelde logies, conflict-banner, facturatiemodus, inkoopfacturen, completionstatus, financieel overzicht, activiteitentabel, communicatiekaart en geschiedenis.

**Voorstel:** Organiseer de content in tabs:
- **Overzicht** -- Klantinfo, eventdetails, statusoverzicht, gekoppelde logies (bovenzijde blijft altijd zichtbaar)
- **Activiteiten** -- De activiteitentabel met template- en toevoeg-knoppen
- **Financien** -- Facturatiemodus, inkoopfacturen, completionstatus, financieel overzicht
- **Communicatie** -- De communicatiekaart (e-mails, logs)
- **Geschiedenis** -- De tijdlijn

De bovenste sectie (header + klantinfo + conflictbanner) blijft altijd zichtbaar boven de tabs.

---

## 4. Klantinfo en eventdetails samenvoegen op detailpagina

Op zowel `AdminRequestDetail` als `AdminAccommodationDetail` worden klantgegevens en eventdetails in aparte cards getoond. Dit zijn gerelateerde gegevens die beter in een compactere layout passen.

**Voorstel:** Combineer klantinfo en eventdetails in een enkele card met een twee-koloms layout. Links de klantgegevens, rechts de event/programmadetails. Dit bespaart verticale ruimte en maakt de pagina meteen overzichtelijker.

---

## 5. Berichten en Communicatie: naamgeving verduidelijken

De sidebar heeft "Berichten" (e-mail log van alle systeem-emails) en projecten hebben een "Communicatie" card. De naam "Berichten" suggereert een inbox, maar het is eigenlijk een e-maillog.

**Voorstel:** Hernoem "Berichten" naar "E-maillog" in de sidebar en gebruik het `MailCheck`-icoon i.p.v. `Mail`. Dit maakt het onderscheid duidelijker.

---

## 6. Settings-pagina: herinnering-instellingen zichtbaar maken

De nieuwe herinnering-instellingen (reminder_days_partner_quote, etc.) worden weergegeven via de generieke `app_settings` renderer. Deze hebben nog geen eigen categorie-label of -icoon.

**Voorstel:** Voeg een nieuwe categorie "Herinneringen" toe aan `SETTING_CATEGORIES` met een `Bell`-icoon, zodat de herinnering-instellingen gegroepeerd en herkenbaar zijn op de instellingenpagina.

---

## Technische samenvatting

### Bestanden die worden aangepast

| Bestand | Wijziging |
|---------|-----------|
| `src/components/admin/AdminLayout.tsx` | Sidebar herstructureren met groepen, inklapbaar financien-blok, unieke iconen |
| `src/pages/admin/AdminDashboard.tsx` | Todo-widget toevoegen met top-5 openstaande taken |
| `src/pages/admin/AdminRequestDetail.tsx` | Tabs-structuur implementeren (Overzicht / Activiteiten / Financien / Communicatie / Geschiedenis) |
| `src/pages/admin/AdminRequestDetail.tsx` | Klant- en eventcards samenvoegen in compacte 2-koloms layout |
| `src/types/appSettings.ts` | Nieuwe categorie "reminders" toevoegen aan `SETTING_CATEGORIES` |
| `src/pages/admin/AdminSettings.tsx` | Icoon en beschrijving voor reminders-categorie |

### Geen database-wijzigingen nodig

Alle optimalisaties zijn puur frontend/UI en vereisen geen migraties of edge function wijzigingen.
