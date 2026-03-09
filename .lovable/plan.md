

## Bug Fix: Wijzigingen in klantportaal worden niet opgeslagen (Desktop)

### Oorzaak gevonden

De **DesktopProgramView** mist de "floating changes bar" die de **MobileProgramView** wél heeft (regel 529-546). Wanneer een klant op desktop een activiteit verwijdert:

1. Het item wordt lokaal als `cancelled` gemarkeerd (state) — visueel verdwijnt het
2. Er is geen "Doorvoeren" knop zichtbaar om de wijzigingen te submiten
3. Bij pagina-refresh wordt de originele state opnieuw geladen → item is terug

De edge function `update-customer-program` handelt "removed" changes correct af (regels 1252-1260), maar wordt simpelweg nooit aangeroepen op desktop.

### Fix

Dezelfde floating changes bar uit MobileProgramView toevoegen aan DesktopProgramView, direct na de `</Card>` van het programma-blok (rond regel 431). Deze bar verschijnt alleen wanneer `hasChanges` true is en toont:
- Aantal wijzigingen
- "Doorvoeren" knop die `onSubmitChanges` aanroept → opent het bestaande `ChangeConfirmationDialog` met samenvatting

De bestaande flow daarna werkt al correct:
- `ChangeConfirmationDialog` toont een samenvatting van alle wijzigingen
- Bij bevestiging: edge function wordt aangeroepen
- Edge function: update database + stuur notificatie-emails naar partners + log in history

### Wijzigingen

| Bestand | Wijziging |
|---|---|
| `src/components/customer-portal/DesktopProgramView.tsx` | Floating changes bar toevoegen (copy van MobileProgramView, regels 529-546) na het programma-card |

Geen database- of edge function-wijzigingen nodig — alles werkt al, alleen de UI-trigger op desktop ontbreekt.

