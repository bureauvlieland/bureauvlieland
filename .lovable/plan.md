

## Plan: Admin toont verkeerde tijd + partner kan voorkeurstijd niet selecteren

### Twee problemen

**1. Admin toont alleen `preferred_time`, niet het partnervoorstel**
In `AdminRequestDetail.tsx` regel 1272 staat:
```typescript
{item.preferred_time || "-"}
```
Dit negeert `proposed_time` en `confirmed_time` volledig. De admin ziet dus altijd de originele klantwens (18:00), niet het partnervoorstel (19:30).

**2. Partner kon 18:00 niet kiezen in de tijdpicker**
De partner wilde 18:00 bevestigen maar de tijdpicker blokkeerde die slot. Dit komt waarschijnlijk doordat een ander item op dezelfde dag (bijv. een activiteit van 15:00-18:30 inclusief marge) die slot als "bezet" markeert. De partner moest noodgedwongen 19:30 kiezen en schreef in de opmerking dat 18:00 eigenlijk goed is.

### Aanpassingen

**1. Admin tijdkolom: toon actieve tijd met prioriteit**
`src/pages/admin/AdminRequestDetail.tsx` — de "Tijd" cel (rond regel 1272):

- Toon: `confirmed_time` > `proposed_time` > `preferred_time`
- Kleur/label: groen voor bevestigd, oranje voor partnervoorstel "(voorstel)", grijs voor voorkeur
- Als `proposed_time` verschilt van `preferred_time`, toon de originele voorkeur als doorgestreepte subtekst

**2. Partner tijdpicker: voorkeurstijd altijd beschikbaar houden**
`src/components/partner-portal/PartnerItemSheet.tsx` — de `availableTimeSlots` berekening (regel 118-122):

- Voeg de `preferred_time` van het huidige item altijd toe aan de beschikbare slots, ook als deze geblokkeerd is door een ander item
- Dit geeft de partner de mogelijkheid om de oorspronkelijke klantwens te bevestigen

### Technische details

**AdminRequestDetail.tsx** (regel ~1271-1273):
```typescript
// Van:
{item.preferred_time || "-"}

// Naar:
const activeTime = item.confirmed_time || item.proposed_time || item.preferred_time;
// + kleurindicatie en label
```

**PartnerItemSheet.tsx** (regel ~118-122):
```typescript
// Na het filteren, voeg preferred_time toe als die er niet in zit:
const slots = allSlots.filter(...);
if (item.preferred_time && !slots.includes(item.preferred_time)) {
  slots.push(item.preferred_time);
  slots.sort();
}
```

**Geen database-migratie nodig.**

