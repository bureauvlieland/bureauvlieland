

## Fix: quotes_requested_count vullen voor bestaande data

### Probleem
De kolom `quotes_requested_count` staat op `0` voor alle bestaande accommodation requests. De edge function zet dit alleen bij nieuwe aanvragen. Daarom toont de klantpagina geen "X partners benaderd" info.

### Oplossing

| Wat | Hoe |
|---|---|
| **DB migratie** | Eenmalige UPDATE die voor elke `accommodation_request` het werkelijke aantal quotes telt en `quotes_requested_count` vult: `UPDATE accommodation_requests SET quotes_requested_count = (SELECT count(*) FROM accommodation_quotes WHERE request_id = accommodation_requests.id)` |

Eén migratie, geen code-wijzigingen nodig. De UI werkt al correct met de waarde — het ontbrak alleen aan data.

