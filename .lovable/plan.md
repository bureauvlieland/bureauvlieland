

## Fix: Logiesoffertes alleen handmatig doorsturen + markering en logging

### Probleem

Wanneer een partner een logiesofferte indient, wordt automatisch `notify-accommodation-quote` aangeroepen vanuit `PartnerDashboard.tsx` (regel 324-327). Dit stuurt de offerte direct door naar de klant zonder tussenkomst van de admin.

### Oplossing

| Bestand | Wijziging |
|---|---|
| `src/pages/PartnerDashboard.tsx` | Verwijder de automatische aanroep van `notify-accommodation-quote` na het indienen van een offerte (regels 324-330). De partner krijgt nog steeds bevestiging dat de offerte is ingediend bij Bureau Vlieland, maar de klant ontvangt geen email meer. |
| `src/pages/admin/AdminAccommodationDetail.tsx` | De "Doorsturen" knop bestaat al en roept `notify-accommodation-quote` aan + zet `forwarded_at`. Dit is al correct. De knop logt al naar `project_communications`. Geen wijziging nodig — dit is al de handmatige flow. |

### Wat er al werkt

- De "Doorsturen" knop op quote-cards stuurt de offerte naar de klant via `notify-accommodation-quote`
- `forwarded_at` wordt gezet op de quote
- Er wordt een `project_communications` record aangemaakt met type `email`, direction `outbound`
- De email wordt gelogd in `email_log`
- Na doorsturen toont de card een "Doorgestuurd" badge

### Samenvatting wijziging

Eén kleine maar cruciale wijziging: verwijder 7 regels in `PartnerDashboard.tsx` die de automatische klantnotificatie triggeren. Daarna is de enige manier om een offerte naar de klant te sturen via de admin "Doorsturen" knop, die al correct markeert en logt.

