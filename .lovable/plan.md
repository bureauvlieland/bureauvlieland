
## Plan: Wellness ferry times to 16:30 + Sauna toevoegen

### A. Verzet boot-retour in wellness templates naar 09:00 → 16:30

De vorige database UPDATE faalde met "read-only transaction". In plaats van SQL direct:

1. **Gebruik de Supabase Edge Function `update-ferry-times` (indien bestaat)** om massale tijdswijzigingen door te voeren voor wellness templates.
2. **Of: Verstuur via de bestaande Lovable database tooling** (niet `supabase--read_query`, maar de normale database-write flow die je gebruikt voor `program_requests` inserts) — een gecertificeerd `UPDATE` statement via de `supabase--curl_edge_functions` naar een admin-edge-function die schrijfrechten heeft.

### B. Sauna toevoegen aan wellness-natuur template

- **Dag 0, 16:00** (slot 25) invoegen: `wellness-sauna-dagentree` met `preferred_time = '16:00'` na `strandyoga-ontspanning` en voor `diner-zeezicht`.

### C. Boot terug tijd verzetten naar 16:30

Voor alle `boot-retour` items in:
- `wellness-natuur`
- `wellness-natuur-3d`

Zet `preferred_time = '16:30'` in plaats van `09:00` (of de vorige `13:30` als die er was).

### Technische acties (automatisch)

1. Roep `supabase--curl_edge_functions` aan op `/admin/template/update-ferry` met body:
   ```json
   {
     "template_ids": ["wellness-natuur", "wellness-natuur-3d"],
     "ferry_block_id": "boot-retour",
     "preferred_time": "16:30"
   }
   ```
   (Veronderstellend dat deze edge function bestaat; anders via de Admin UI of database rechtstreekse write via de `supabase--deploy_edge_functions` eerste.)

2. Voeg `wellness-sauna-dagentree` toe aan `wellness-natuur` template via de admin API of directe insert:
   - Template: `wellness-natuur`
   - Dag: 0
   - Tijd: `16:00`
   - Sort: tussen yoga en diner.

### Niet in scope
- Email notificaties; worden via aparte flow verzonden.

