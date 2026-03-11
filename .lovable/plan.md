

# Klantenportaal-link toevoegen aan logies status-email

## Wat
De gegenereerde tekst voor de logies status-update mail wordt uitgebreid met een regel die een link bevat naar het klantenportaal, zodat de klant zelf de details kan teruglezen.

## Aanpak

### 1. Request query uitbreiden — join met linked program
De query op regel 179-183 wordt uitgebreid met een join op `program_requests` via `linked_program_id`, zodat de `customer_token` van het programma beschikbaar is:
```
.select("*, linked_program:program_requests!accommodation_requests_linked_program_id_fkey(customer_token)")
```

### 2. `generateStatusEmailBody` uitbreiden met portal URL
- Functie krijgt een extra parameter `portalUrl`
- Na de bulletpoints en voor de afsluitende tekst komt een nieuwe regel:
  ```
  U kunt de details teruglezen op uw eigen pagina: {url}
  ```
- De URL wordt opgebouwd als:
  - Met linked program: `https://bureauvlieland.nl/mijn-programma/{program_token}`
  - Zonder: `https://bureauvlieland.nl/mijn-logies/{accommodation_token}`

### 3. `handleOpenStatusEmail` aanpassen
- Portal URL samenstellen uit `request.linked_program?.customer_token` of `request.customer_token`
- Doorgeven aan `generateStatusEmailBody`

### Bestand
- `src/pages/admin/AdminAccommodationDetail.tsx`

