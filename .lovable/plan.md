

## Plan: Bezette tijden chronologisch sorteren

### Probleem
De lijst "Bezette tijden op dag X" in het partnerportaal toont activiteiten in willekeurige volgorde in plaats van chronologisch gesorteerd op starttijd. In de screenshot is te zien: 15:45, 16:30, 14:00 -- terwijl 14:00 bovenaan hoort.

### Oplossing
Een eenregelige aanpassing in `src/lib/timeUtils.ts`: de functie `getBlockedTimeSlotsFromPartnerItems` sorteert de resultaten op `startMinutes` voordat ze worden teruggegeven.

### Technische details

| Bestand | Wijziging |
|---|---|
| `src/lib/timeUtils.ts` | `.sort((a, b) => a.startMinutes - b.startMinutes)` toevoegen aan het einde van de return-chain in `getBlockedTimeSlotsFromPartnerItems` |

Dit lost het probleem op voor zowel `PartnerItemSheet` als `StatusUpdateDialog`, aangezien beide dezelfde functie aanroepen.
