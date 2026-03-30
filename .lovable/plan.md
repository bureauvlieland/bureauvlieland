

## Plan: Logiesofferte-herziening workflow verbeteren

### Huidige problemen

1. **Prijs niet afgerond**: `price_per_person_per_night` toont `€97.66666666666667` — geen afrondingsformattering
2. **"Doorsturen" knop verdwijnt na resubmit**: De admin kan een herziene offerte niet opnieuw doorsturen naar de klant. De knop verschijnt alleen als `forwarded_at === null` én `status === "submitted"`. Na een reset wordt `forwarded_at` gewist, maar als de partner herindient wordt `forwarded_at` niet opnieuw gewist in `handleQuoteSubmit`.
3. **Partner ziet niet wat er gewijzigd is**: Na een gastenwijziging krijgt de partner een e-mail, maar in het portaal is niet duidelijk wat er veranderd is t.o.v. de vorige versie.
4. **Communicatielog mist automatische mails**: E-mails verstuurd door `send-accommodation-quote-request` (bij reset) worden niet gelogd in `project_communications`, waardoor het communicatielog incompleet is.
5. **Versiehistorie niet zichtbaar op de kaart**: De admin ziet op de quote-card niet dat er een eerdere versie bestaat; dat is alleen in het detail-sheet.

### Aanpak

**1. Prijsformattering fixen**
In `AdminAccommodationDetail.tsx`, de p.p.p.n. prijs afronden met `toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })`.

**2. "Doorsturen" knop altijd tonen na herziening**
In `handleQuoteSubmit` (PartnerAccommodation.tsx): bij de update ook `forwarded_at: null` meezetten. Zo wordt na elke herindienst de "Doorsturen" knop weer zichtbaar voor de admin.

**3. Wijzigingsindicator voor partner**
In `PartnerAccommodationRequestCard.tsx`: wanneer de quote status "pending" is en er eerder al een offerte was ingediend (d.w.z. er is versiehistorie of de quote eerder `submitted_at` had), een amberkleurig blok tonen:
- "Wijziging ontvangen — het aantal gasten is gewijzigd naar X. Pas uw offerte aan."
- Dit halen we uit het feit dat de status "pending" is terwijl er al history records bestaan (of uit een nieuw veld `reset_reason` op de quote).

Concreet: een `reset_reason` veld toevoegen aan `accommodation_quotes` (nullable text). Bij het resetten in `updateGuestsMutation` vullen we dit met bijv. `"Aantal gasten gewijzigd: 25 → 33"`. De partner ziet dit als banner. Na herindienst wordt het weer gewist.

**4. Communicatielog aanvullen**
In `updateGuestsMutation` (AdminAccommodationDetail.tsx): na het versturen van de reset-mail, een `project_communications` entry aanmaken met type "email" en direction "outbound" zodat het in het communicatielog verschijnt.

**5. Versie-indicator op quote-card**
Op de quote-card in de admin een subtiel "v2" / "v3" label tonen als er versiehistorie bestaat. Hiervoor de quote-history count meefetchen in de quotes query, of een aparte lichte query.

### Migratie (database)

Nieuw veld: `ALTER TABLE accommodation_quotes ADD COLUMN reset_reason text;`

### Wijzigingen

| Bestand | Actie |
|---|---|
| `src/pages/admin/AdminAccommodationDetail.tsx` | Prijsformattering; communicatielog-entry bij reset; `reset_reason` meegeven; versie-indicator op card |
| `src/pages/PartnerAccommodation.tsx` | `forwarded_at: null` en `reset_reason: null` bij herindienst |
| `src/components/partner-portal/PartnerAccommodationRequestCard.tsx` | Banner met `reset_reason` tonen als status "pending" en reason aanwezig |
| Migratie | `reset_reason` kolom toevoegen |

Vier bestanden + 1 migratie.

