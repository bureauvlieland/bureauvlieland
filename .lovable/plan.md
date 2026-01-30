
# Plan: Formele Aanspreking Doorvoeren ("je/jouw" → "u/uw")

## Samenvatting

Alle klantgerichte teksten in de applicatie moeten consistent de formele Nederlandse aanspreking gebruiken ("u/uw") in plaats van informeel ("je/jouw"). Dit betreft zowel de klantportalen als de publieke website.

---

## Geïdentificeerde Locaties

### Klantportalen & Formulieren (Prioriteit 1)

| Bestand | Huidige tekst | Nieuwe tekst |
|---------|--------------|--------------|
| `AccommodationSection.tsx` (r139) | "Jouw Logies" | "Uw Logies" |
| `AccommodationSection.tsx` (r186) | "contact met je op" | "contact met u op" |
| `AccommodationSection.tsx` (r210) | "bij je past" | "bij u past" |
| `AccommodationSection.tsx` (r310) | "Jouw Logiesaanvraag" | "Uw Logiesaanvraag" |
| `AccommodationSection.tsx` (r351) | "We verzamelen offertes voor je. Je ontvangt..." | "Wij verzamelen offertes voor u. U ontvangt..." |
| `ProgramOverviewCard.tsx` (r135) | "Jouw zakelijke programma" | "Uw zakelijke programma" |
| `CustomerProgram.tsx` (r301) | "Jouw Programma" | "Uw Programma" |
| `AccommodationQuotes.tsx` (r163) | "Jouw Logies Aanvraag" | "Uw Logies Aanvraag" |
| `CustomerProgramItem.tsx` (r270) | "Jouw tegenvoorstel" | "Uw tegenvoorstel" |
| `NextStepsCard.tsx` (r84) | "Vul je bedrijfsgegevens in" | "Vul uw bedrijfsgegevens in" |
| `NextStepsCard.tsx` (r115-116) | "Je programma is definitief...je boeking" | "Uw programma...uw boeking" |
| `PriceSummaryCard.tsx` (r384) | "afstemming van je programma" | "afstemming van uw programma" |
| `AddActivitySheet.tsx` (r139) | "aan je programma toe te voegen" | "aan uw programma toe te voegen" |
| `AddActivitySheet.tsx` (r265) | "zitten al in je programma" | "zitten al in uw programma" |
| `CounterProposalDialog.tsx` (r58) | "Kies een tijd voor je tegenvoorstel" | "Kies een tijd voor uw tegenvoorstel" |
| `AccommodationStatusBanner.tsx` (r32) | "contact met je op" | "contact met u op" |
| `AccommodationStatusBanner.tsx` (r54) | "bij je past" | "bij u past" |
| `AccommodationStatusBanner.tsx` (r73-75) | "offertes voor je" | "offertes voor u" |
| `SelectQuoteDialog.tsx` (r65-66) | "contact met je opnemen" | "contact met u opnemen" |
| `AccommodationQuotes.tsx` (r92) | "contact met je op" | "contact met u op" |

### Partnerportalen (Blijft "je/jouw")

De **partnerportalen** mogen informeler blijven omdat partners een andere relatie hebben met het platform. Echter, voor consistentie kunnen deze ook formeel worden:

| Bestand | Huidige tekst | Actie |
|---------|--------------|-------|
| `PartnerItemSheet.tsx` | "Jouw alternatief voorstel", "Jouw voorstel was", "Jouw reactie" | "Uw alternatief voorstel" etc. |
| `PartnerItemCard.tsx` | "Jouw voorstel:" | "Uw voorstel:" |
| `PartnerSettingsForm.tsx` (r520) | "voor je account" | "voor uw account" |
| `PartnerResetPassword.tsx` (r123) | "voor je partner account" | "voor uw partner account" |
| `PartnerBlockSheet.tsx` | "aan je activiteit" | "aan uw activiteit" |

### Publieke Website & Landing Pages (Prioriteit 2)

| Bestand | Huidige tekst | Nieuwe tekst |
|---------|--------------|--------------|
| `Contact.tsx` (r14) | "voor jouw bedrijfsevenement" | "voor uw bedrijfsevenement" |
| `Contact.tsx` (r92) | "Je hebt te maken met Erwin" | "U hebt te maken met Erwin" |
| `Contact.tsx` (r119-120) | "denk graag met je mee...voor jouw groep" | "denk graag met u mee...voor uw groep" |
| `Offerte.tsx` | "contact met je op" | "contact met u op" |
| Alle landingpagina's | "Stel je programma samen" | "Stel uw programma samen" |
| `BedrijfsuitjeVlieland.tsx` | "Stel in 5 minuten je eigen programma samen. Kies je bouwstenen..." | "Stel in 5 minuten uw eigen programma samen. Kies uw onderdelen..." |
| `Voorbeeldprogrammas.tsx` | "Bouwstenen voor jouw programma" + meta tags | "Bouwstenen voor uw programma" |
| `ForWho.tsx` (r387-388) | "jouw klanten...je betrouwbare lokale partner" | "uw klanten...uw betrouwbare lokale partner" |
| `VoorWie.tsx` (r85) | "voor jouw groep" | "voor uw groep" |
| `OverOns.tsx` (r74) | "over jouw evenement" | "over uw evenement" |
| `Programmas.tsx` (r307) | "jouw lokale partner" | "uw lokale partner" |

### Configurator & Gedeeld Programma

| Bestand | Huidige tekst | Nieuwe tekst |
|---------|--------------|--------------|
| `SharedProgram.tsx` | "Stel je eigen programma samen", "aan je programma", "in je eigen programma" | Formele variant |
| `GlobalCartDrawer.tsx` (r56) | "aan je programma" | "aan uw programma" |

### Extra Services & Banners

| Bestand | Huidige tekst | Nieuwe tekst |
|---------|--------------|--------------|
| `ExtraServices.tsx` | "voor je evenement", "voor je groep" | "voor uw evenement/groep" |
| `FietsverhuurBanner.tsx` (r53) | "voor je hele groep" | "voor uw hele groep" |

---

## Technische Aanpak

De wijzigingen zijn puur tekstueel en betreffen:
1. **Vervangen van "je" → "u"** in lopende tekst
2. **Vervangen van "jouw" → "uw"** voor bezittelijke voornaamwoorden
3. **Vervangen van "Je" → "U"** aan begin van zinnen
4. **Vervangen van "Jouw" → "Uw"** in titels en kopjes

---

## Bestanden te wijzigen (26 bestanden)

### Klantportaal (10 bestanden)
1. `src/components/customer-portal/AccommodationSection.tsx`
2. `src/components/customer-portal/ProgramOverviewCard.tsx`
3. `src/components/customer-portal/CustomerProgramItem.tsx`
4. `src/components/customer-portal/NextStepsCard.tsx`
5. `src/components/customer-portal/PriceSummaryCard.tsx`
6. `src/components/customer-portal/AddActivitySheet.tsx`
7. `src/components/customer-portal/CounterProposalDialog.tsx`
8. `src/pages/CustomerProgram.tsx`
9. `src/components/accommodation-portal/AccommodationStatusBanner.tsx`
10. `src/components/accommodation-portal/SelectQuoteDialog.tsx`

### Partnerportaal (5 bestanden)
11. `src/components/partner-portal/PartnerItemSheet.tsx`
12. `src/components/partner-portal/PartnerItemCard.tsx`
13. `src/components/partner-portal/PartnerSettingsForm.tsx`
14. `src/components/partner-portal/PartnerBlockSheet.tsx`
15. `src/pages/PartnerResetPassword.tsx`

### Publieke pagina's (11 bestanden)
16. `src/pages/Contact.tsx`
17. `src/pages/Offerte.tsx`
18. `src/pages/AccommodationQuotes.tsx`
19. `src/pages/Voorbeeldprogrammas.tsx`
20. `src/pages/SharedProgram.tsx`
21. `src/pages/BedrijfsuitjeVlieland.tsx` (+ andere landingpages met dezelfde CTA's)
22. `src/components/ForWho.tsx`
23. `src/pages/VoorWie.tsx`
24. `src/pages/OverOns.tsx`
25. `src/pages/Programmas.tsx`
26. `src/components/configurator/GlobalCartDrawer.tsx`
27. `src/components/ExtraServices.tsx`
28. `src/components/FietsverhuurBanner.tsx`

---

## Resultaat

Na de wijzigingen:
- ✅ Alle klantgerichte communicatie gebruikt formeel "u/uw"
- ✅ Consistent met e-mailtemplates en andere transactionele communicatie
- ✅ Professionele B2B-uitstraling gewaarborgd
