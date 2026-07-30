## Doel
Het Berichtencentrum (tab E-mail) werkt sneller en veiliger, met Outlook-gemak: archiveren op gespreksniveau, zichtbare projectstatus en sneltoetsen.

## 1. Archiveren = alleen het gesprek
Nu archiveert "Archiveer" bij een programma- of logies-gesprek het hele dossier (`program_requests.archived_at` / `accommodation_requests.archived_at`). Dat wordt aangepast:

- "Archiveer" zet uitsluitend `archived_at` op alle bijbehorende `project_communications` van dat gesprek. Het project blijft actief in Projecten.
- Automatische mails uit `email_log` kunnen niet los gearchiveerd worden; die verdwijnen mee uit de lijst zodra alle gespreksberichten gearchiveerd zijn (gesprek wordt als gearchiveerd beschouwd wanneer er geen niet-gearchiveerde communicatie meer is).
- "Uit archief" draait dit terug.
- Losse extra knop in een klein menu (⋯): "Ook dossier archiveren" — de oude, zwaardere actie, expliciet gelabeld zodat dit nooit per ongeluk gebeurt.
- Het bestaande "Toon archief"-schakelaartje blijft werken en toont dan ook gearchiveerde gesprekken.

## 2. Projectstatus zichtbaar
Per gesprek wordt de status van het gekoppelde project meegeladen en getoond:

- **Fase-badge** met de bestaande afgeleide status (Concept, Offerte verstuurd, Akkoord ontvangen, AV getekend, Facturatie, Afgerond, Geannuleerd) via de al bestaande `getDerivedStatus`/`DERIVED_STATUS_LABEL`/`DERIVED_STATUS_TONE` uit `src/lib/projectStatus.ts` — dus exact dezelfde labels en kleuren als in het projectenoverzicht.
- **Aankomst-/programmadatum** met rode markering als de datum verstreken is (`isPastDate`).
- Bij logies-gesprekken de status van de logies-aanvraag op dezelfde manier.
- Weergave: compacte badge op de gespreksregel in de lijst; in de gespreksheader de volledige regel (fase + datum + reserveringsnummer) naast de bestaande "Project"/"Logies"-knop.

## 3. Sneltoetsen (Outlook-stijl)
Actief zolang het E-mailpaneel open is en de focus niet in een invoerveld/dialog staat:

| Toets | Actie |
| --- | --- |
| `j` / `k` of ↓ / ↑ | volgend / vorig gesprek |
| `Enter` | gesprek openen |
| `Esc` | terug naar de lijst |
| `r` | Beantwoorden |
| `e` | Archiveer gesprek |
| `u` | markeer als onbeantwoord (of `m` als beantwoord) |
| `a` | Toon archief aan/uit |
| `?` | overzicht sneltoetsen |

Een klein "?"-knopje in de paneelheader opent een dialog met dezelfde lijst, zodat de sneltoetsen vindbaar zijn.

## Technische details
- Bestanden: `src/components/admin/EmailPanel.tsx` (lijst, header, archiveerlogica, sneltoetsen), nieuw `src/components/admin/EmailShortcutsDialog.tsx`, nieuw `src/lib/emailThreadArchive.ts` (pure helpers: bepaal of een gesprek gearchiveerd is, welke communicatie-ids te updaten).
- `fetchEmails` haalt bij de programma-/logies-joins extra kolommen op die `getDerivedStatus` nodig heeft (`status`, `quote_status`, `completion_status`, `terms_accepted_at`, programmadatum) plus dezelfde velden voor logies; de bestaande query-structuur blijft gelijk.
- Geen databasewijzigingen nodig: `project_communications.archived_at` bestaat al.
- Unit-tests voor de nieuwe helpers in `src/lib/__tests__/emailThreadArchive.test.ts` (gesprek-archiefstatus, terughalen, dossier-actie los).
- Statusinfo is puur lees-/weergavelogica; er verandert niets aan workflow of e-mailverzending.

## Niet in scope
Bulk-selectie met checkboxes en snoozen van gesprekken (niet gekozen) — later toe te voegen.
