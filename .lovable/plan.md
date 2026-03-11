

# Plan: Aanvraagflow herstructureren — Admin-first & Bureau Centraal als standaard

## Huidige situatie

De huidige flow werkt als volgt:

1. **Klant dient programma in** via configurator → `send-program-request` edge function stuurt **direct e-mails naar alle partners** met klantgegevens, plus een bevestiging naar de klant en een kopie naar Bureau Vlieland.

2. **Klant keurt offerte goed** → `accept-quote-proposal` stuurt **direct partner-notificaties** met reserveringsverzoeken.

3. **Facturatiemodel** staat standaard op `partner_direct` — partners factureren de eindklant rechtstreeks.

4. **Klant kan items individueel goedkeuren** via het portaal → `approve-quote-item` stuurt direct een partner-notificatie.

**Probleem**: Bureau Vlieland heeft geen controle over wat er naar partners gaat voordat het al verstuurd is. Het facturatiemodel laat klant-partner directe facturatie toe, terwijl Bureau Vlieland altijd tussenpersoon wil zijn.

---

## Gewenste situatie

1. **Klant dient aan** → Alleen Bureau Vlieland en klant krijgen e-mail. Partners worden **niet** automatisch benaderd.
2. **Admin beoordeelt** → Via admin-interface per item of bulk "Verstuur naar partner(s)" actie.
3. **Facturatie** → Altijd `bureau_central`: partners factureren Bureau Vlieland, Bureau Vlieland factureert de klant.

---

## Wijzigingen

### 1. `send-program-request` edge function — partner-mails verwijderen

De functie stuurt nu drie soorten e-mails: bureau, klant, partners. Wijziging:
- **Verwijder** het genereren en versturen van partner-e-mails (de hele `providerGroups` / `partnerEmails` logica).
- **Pas klant-e-mail aan**: verwijder tekst over "aanbieders zullen contact opnemen" → vervangen door "Bureau Vlieland beoordeelt uw aanvraag en neemt contact op".
- Bureau-e-mail: verwijder tekst "email wordt automatisch verstuurd" bij partner-items.

### 2. Database default wijzigen — `invoicing_mode` naar `bureau_central`

SQL-migratie: `ALTER TABLE program_requests ALTER COLUMN invoicing_mode SET DEFAULT 'bureau_central'`.

### 3. `InvoicingModeSelector` component en `partner_direct` optie verwijderen

- Verwijder de `InvoicingModeSelector` component uit `AdminRequestDetail.tsx`.
- Of: maak het read-only met alleen "Bureau Vlieland factureert klant" als informatief label.

### 4. Admin "Verstuur naar partners" actie toevoegen

In `AdminRequestDetail.tsx`, per item en als bulk-actie:
- **Per item**: knop "Verstuur naar partner" naast elk `pending` item. Roept de bestaande `approve-quote-item`-achtige logica aan (stuurt partner-notificatie).
- **Bulk**: "Verstuur alle onderdelen naar partners" knop die voor alle pending items tegelijk de partner-notificaties verstuurt.
- Items krijgen een visuele status: "Nog niet verstuurd" → "Verstuurd naar partner" (bestaande statussen `pending` → `in_afstemming`).

### 5. `accept-quote-proposal` edge function — review

Deze functie wordt aangeroepen wanneer admin een offerte goedkeurt. De partner-notificaties hierin blijven behouden (dit is een bewuste admin-actie). Geen wijziging nodig.

### 6. `approve-quote-item` edge function — blokkeren vanuit klantportaal

De klant kan nu individueel items goedkeuren die direct naar partners gaan. Dit moet geblokkeerd worden vanuit het klantportaal — alleen admins mogen items naar partners sturen. De edge function krijgt een check: als er geen `admin_override` flag is, weiger de actie.

### 7. Klantportaal en partner-portaal teksten bijwerken

- **Klantportaal**: verwijder alle verwijzingen naar `partner_direct` facturatie. Alle tekst wordt `bureau_central` (factuur van Bureau Vlieland).
- **Partner-portaal**: verwijder `partner_direct` logica — partners factureren altijd Bureau Vlieland. Klant-PII (e-mail, telefoon) wordt standaard verborgen.

### 8. Code cleanup

Verwijder `partner_direct` branches uit:
- `InvoiceProvidersCard.tsx`
- `CustomerPortalSplash.tsx`
- `PartnerAccommodationQuoteSheet.tsx`
- `PartnerAccommodationTable.tsx`
- `CustomerProgram.tsx`
- `src/types/purchaseInvoice.ts` (type kan vereenvoudigd)

---

## Bestanden

| Bestand | Actie |
|---------|-------|
| `supabase/functions/send-program-request/index.ts` | Partner-mails verwijderen, klant-tekst aanpassen |
| `supabase/functions/approve-quote-item/index.ts` | Admin-only check toevoegen |
| `src/pages/admin/AdminRequestDetail.tsx` | "Verstuur naar partners" knoppen, InvoicingModeSelector verwijderen |
| `src/components/admin/InvoicingModeSelector.tsx` | Verwijderen of read-only maken |
| DB migratie | `invoicing_mode` default → `bureau_central` |
| Klant/partner-portaal componenten | `partner_direct` branches verwijderen |

---

## Samenvatting

Drie kernwijzigingen: (1) Partners krijgen pas bericht wanneer de admin dit expliciet triggert, (2) facturatie loopt altijd via Bureau Vlieland, (3) alle `partner_direct` logica wordt verwijderd uit de codebase.

