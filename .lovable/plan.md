

## Plan: Mollie betaalflow met MAP "op rekening" boekingen

### Concept

Bureau Vlieland handelt de online betaling zelf af via een eigen Mollie-account. Na succesvolle betaling wordt de boeking bij MAP aangemaakt "op rekening" (met Bureau Vlieland als verkooppunt/referral). De partner stuurt vanuit MAP de bevestiging naar de klant. De partner factureert Bureau Vlieland achteraf.

```text
Klant ──▶ Boekingsformulier ──▶ map-create-payment (edge fn)
                                   │
                                   ├─ Slaat pending record op in map_bookings
                                   └─ Maakt Mollie payment aan
                                       │
                                       ▼
                                   Mollie checkout (klant betaalt)
                                       │
                                       ├─ redirectUrl → /boeking-status?id=...
                                       └─ webhookUrl → map-payment-webhook
                                                         │
                                                         ▼
                                                     Status "paid"?
                                                         │
                                                    POST /bookings naar MAP
                                                    (op rekening, Bureau Vlieland als referral)
                                                         │
                                                    MAP stuurt bevestiging
                                                    vanuit aanbieder
```

### 1. Secret toevoegen

- `MOLLIE_API_KEY` — Bureau Vlieland's Mollie API key (test of live)

### 2. Database: kolommen toevoegen aan `map_bookings`

- `mollie_payment_id` (text, nullable) — Mollie payment ID (tr_xxx)
- `payment_status` (text, default `'pending'`) — pending / paid / booked / failed / expired

### 3. Edge function: `map-create-payment`

- Ontvangt boekingsgegevens van frontend
- Slaat `map_bookings` record op met `booking_status = 'awaiting_payment'`, `payment_status = 'pending'`
- Maakt Mollie payment via `POST https://api.mollie.com/v2/payments`:
  - `amount.value` en `amount.currency` (EUR)
  - `description`: activiteitnaam + datum
  - `redirectUrl`: `https://bureauvlieland.lovable.app/boeking-status?id={bookingId}`
  - `webhookUrl`: `https://{SUPABASE_URL}/functions/v1/map-payment-webhook`
  - `metadata.bookingId`: interne booking ID
- Retourneert Mollie `_links.checkout.href` naar frontend

### 4. Edge function: `map-payment-webhook`

- Ontvangt `POST` van Mollie met `id` in body
- Haalt betaalstatus op via `GET https://api.mollie.com/v2/payments/{id}`
- Bij `status === 'paid'`:
  - Update `payment_status → 'paid'`
  - Haal partner MAP API key op
  - `POST /api/v1/bookings` naar MAP (boeking op rekening via verkooppunt Bureau Vlieland)
  - Sla `map_booking_id` op, zet `booking_status → 'confirmed'`, `payment_status → 'booked'`
- Bij `failed` / `expired` / `canceled`:
  - Update `payment_status` naar corresponderende status

### 5. Frontend aanpassingen

**MapBookingDialog.tsx**:
- Na formulier-submit: roep `map-create-payment` aan (i.p.v. `map-create-booking`)
- Redirect gebruiker naar Mollie checkout URL via `window.location.href`

**Nieuwe pagina: `/boeking-status`** (`src/pages/BookingStatus.tsx`):
- Ontvangt redirect van Mollie met `?id={bookingId}`
- Pollt `map_bookings` tabel op `payment_status`
- Toont: "Betaling verwerken..." → "Betaald & geboekt!" of "Betaling mislukt"
- Geen authenticatie nodig (publieke pagina, lookup op booking ID)

**Route toevoegen** in `App.tsx`

### 6. Config

- `supabase/config.toml`: toevoegen `[functions.map-create-payment]` en `[functions.map-payment-webhook]` met `verify_jwt = false`

### 7. Bestaande `map-create-booking` edge function

- Blijft intact als fallback voor admin/directe boekingen zonder betaling

### Technische details

- Mollie API auth: `Authorization: Bearer {MOLLIE_API_KEY}`
- MAP booking velden: `ActivityId`, `Name`, `EmailAddress`, `PhoneNumber`, `NumberOfAdults`, `NumberOfChildren`
- MAP response bevat `Id` (booking ID), `IsPaid` (false bij op rekening), `OnAccount` (true)
- RLS: `map_bookings` heeft al anon SELECT nodig voor de statuspagina — toevoegen als policy op basis van booking `id`

