

## Statusoverzicht offertes op klantpagina

### Huidige situatie
- Klant kan al offertes selecteren — dit blijft behouden.
- De klantpagina toont geen info over hoeveel partners benaderd zijn of hoeveel er nog moeten reageren. De "wacht" status zegt alleen "Wij verzamelen offertes voor u" zonder aantallen.
- RLS-beleid verbergt `pending` en `declined` quotes voor klanten, dus de klant ziet alleen `submitted`/`selected`/`expired` quotes.

### Oplossing: teller op `accommodation_requests`

Voeg een `quotes_requested_count` kolom toe aan `accommodation_requests` zodat de klant kan zien hoeveel partners er benaderd zijn, zonder dat de details van pending/declined quotes zichtbaar worden.

### Wijzigingen

| Bestand | Wat |
|---|---|
| **DB migratie** | `ALTER TABLE accommodation_requests ADD COLUMN quotes_requested_count integer NOT NULL DEFAULT 0;` |
| **`send-accommodation-quote-request/index.ts`** | Na het verwerken van partners: tel totaal aantal quotes voor deze request en update `quotes_requested_count` op de accommodation_request. |
| **`src/types/accommodation.ts`** | Voeg `quotes_requested_count` toe aan `AccommodationRequest` interface. |
| **`src/hooks/useCustomerProgram.ts`** | Map het nieuwe veld bij het transformeren van accommodation data. |
| **`src/hooks/useAccommodationQuotes.ts`** | Idem. |
| **`src/components/customer-portal/AccommodationSection.tsx`** | **"Wacht" state (state 4)**: Toon "Bureau Vlieland heeft X logiespartners benaderd" i.p.v. generieke tekst. **"Quotes beschikbaar" state (state 3)**: Toon boven de offertes een samenvatting: "X partners benaderd · Y offertes ontvangen · Z wachtend". |
| **`src/components/accommodation-portal/AccommodationStatusBanner.tsx`** | Voeg `quotesRequested` prop toe. Toon in de "wacht" en "ontvangen" states hoeveel partners benaderd vs. ontvangen. |

### Voorbeeld klantweergave

**Wachtend (0 offertes):**
> Bureau Vlieland heeft 4 logiespartners benaderd. U ontvangt een email zodra er offertes binnenkomen.

**Offertes beschikbaar:**  
> 4 partners benaderd · 2 offertes ontvangen · 2 wachtend op reactie  
> Bekijk en vergelijk de offertes. Kies de optie die het beste bij u past.

Selectie-functionaliteit blijft volledig intact.

