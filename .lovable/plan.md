


## Plan: Alternatieve datum voorstellen bij afwijzing logiesaanvraag

### Status: ✅ Geïmplementeerd

### Wat is gebouwd

1. **Database**: `proposed_arrival_date` en `proposed_departure_date` kolommen toegevoegd aan `accommodation_quotes`
2. **Partner portal**: Derde optie "Niet beschikbaar, maar wel op andere datum" met datumvelden in `PartnerAccommodationQuoteSheet`
3. **Decline handler**: `handleQuoteDecline` in `PartnerAccommodation.tsx` slaat voorgestelde datums op, maakt auto-todo aan voor admin
4. **Admin zichtbaarheid**: Alternatieve datums getoond in de offerte-tabel op `AdminAccommodationDetail.tsx`
