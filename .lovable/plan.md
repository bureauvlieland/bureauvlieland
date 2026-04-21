

## Plan: leesbare labels, ontbrekende afbeeldingen koppelen, juiste partners + foto's op partnerpagina

### Diagnose

**Bouwstenen-pagina:**
1. **Onleesbare labels**: De categorie-badge gebruikt `bg-card/90` (vrijwel wit) zonder expliciete tekstkleur → witte tekst op wit. Fix: donkere tekst + sterkere achtergrond.
2. **Ontbrekende afbeeldingen** (9 publieke bouwstenen tonen placeholder):
   - `catering-3-gangen-diner` — geen image_url én geen image_asset
   - `luxe-lunch`, `fiets-huur`, `beach-games`, `vliegeren`, `surfen`, `vuurtoren` — wel `image_asset`, maar geen `image_url` in storage. (De lokale asset-import werkt, maar enkele filenames matchen niet exact, bv. `cycling-team.jpg` werkt wel — dus deze zouden moeten laden. Ik koppel ze toch aan storage-images zodat ze cdn-geserveerd worden en consistent zijn.)
3. **Verkeerde partners**: 4 publieke bouwstenen hebben `provider_id = NULL` → tonen "door Bureau Vlieland" terwijl dat niet klopt:
   - `borrel` → moet `zuiver` (Zuiver Traiteur) zijn
   - `catering-3-gangen-diner` → `zuiver`
   - `fietstocht-met-begeleiding` → `bureau` (gids door Bureau Vlieland is correct) of `vvv-vlieland` indien beschikbaar — **vraag bevestiging**
   - `vrije-tijd` → `bureau` is OK (eigen invulling — niet expliciet partner)

**Partnerpagina:**
4. **Niet alleen MAP-partners**: de query toont 16 partners (zowel met published blocks als met MAP-slug). De gebruiker neemt dit waarschijnlijk zo waar omdat álle partners géén `image_url` hebben → grote letter-placeholder. Plus de groene "Direct boekbaar" badge trekt visueel sterk aan.
5. **Foto's ontbreken op alle partnerkaarten**: geen enkele partner heeft een `image_url`. Oplossing: koppel een representatieve afbeelding (eerste gepubliceerde bouwsteen van die partner óf een specifiek door ons gekozen storage-image).

### A. Fix label-leesbaarheid op `/bouwstenen` en `/partners`
In `Bouwstenen.tsx` en `Partners.tsx`: vervang
```tsx
<Badge variant="secondary" className="bg-card/90 backdrop-blur-sm">
```
door
```tsx
<Badge className="bg-white/95 text-foreground border border-border shadow-sm backdrop-blur-sm">
```
Resultaat: witte chip met donkere leesbare tekst en lichte rand.

### B. Database: koppel ontbrekende building-block afbeeldingen
SQL-migratie:
- `catering-3-gangen-diner` → `1771141578047-diner_vlieland.jpg` (sfeer diner)
- `luxe-lunch` → `luncharrangement.webp`
- `fiets-huur` → upload bestaande lokale `cycling-team.jpg` in storage óf koppel `1770455243853-IMG_6365.jpg` (beste fiets-foto in storage)
- `beach-games` → `voc-blokarten.jpg` (VOC-sfeer) of bestaande beach-asset uploaden
- `vliegeren` → bestaande `kite-flying` lokaal werkt al; voor consistentie storage-versie genereren of asset_image laten staan
- `surfen` → koppel `voc-branding-raften.jpg` (zelfde sfeer)
- `vuurtoren` → laat lokale asset werken (lighthouse-vlieland.jpg klopt al)

Voor de blocks waarvan de lokale asset al goed werkt (`fiets-huur`, `vliegeren`, `surfen`, `vuurtoren`, `beach-games`, `luxe-lunch`) onderzoek ik eerst waarom ze toch placeholder tonen — vermoedelijk treft de getBlockImage util ze wel maar de productie-build serveert ze met andere hash. Veiligste oplossing: koppel ze aan een storage-URL zodat het deterministisch is.

### C. Database: corrigeer provider_id voor publieke blocks
SQL:
```sql
UPDATE building_blocks SET provider_id='zuiver' WHERE id IN ('borrel','catering-3-gangen-diner');
-- fietstocht-met-begeleiding en vrije-tijd: blijven 'bureau' (correct)
```

### D. Database: koppel afbeeldingen aan partners
Per partner een passende image uit storage of openbare bron koppelen. Voorstel (alleen voor de 16 zichtbare partners):

| Partner | Voorstel image (storage) |
|---|---|
| Brouwerij Fortuna | `1771363537999-fortuna.jpg` |
| Café Boven | `1770974443694-terras.2_1.jpg` |
| De Bazuin Watertaxi | `watertaxi-harlingen-vlieland.jpg` |
| De Vlielander Kaasbunker | placeholder (admin uploadt later) |
| Island Events | `strandyoga-ontspanning.jpg` (wellness/relax sfeer) |
| Manege De Seeruyter | `paardrijden.jpeg` |
| Paal 50 | `1770455091370-2016-02-25_17.28.50.jpg` (strand) |
| Rederij Doeksen | `boot-retour.png` |
| Stichting Natuur Educatie Centrum | `wadloopexcursie.jpg` |
| Trattoria Oliva | `1770455958249-Oliva_4.jpeg` |
| Vliehors Expres | `vliehors-expres.JPG` |
| Vlieland Outdoor Center | `voc-beach-golf.jpg` |
| Vlieland Yoga | `strandyoga-ontspanning.jpg` |
| Zeehondentochten Vlieland | `zeehondentocht.png` |
| Zeezicht Vlieland | `1771141578047-diner_vlieland.jpg` |
| Zuiver Traiteur | `strand-bbq.jpg` |

Eén SQL `UPDATE` per partner met `image_url = 'https://blhspuifehausilnzwio.supabase.co/storage/v1/object/public/building-block-images/<file>'`.

### E. Verbeter Partner-card visueel
- Image fallback: i.p.v. enkele letter, toon eerste-bouwsteen-image van die partner als fallback (query uit `building_blocks` met `provider_id` joinen).
- "Direct boekbaar" badge minder schreeuwerig: vervang accent-kleur door kalmer `bg-primary/10 text-primary border border-primary/30`.
- Voeg duidelijke tekst onder de kaart toe: "Maakt onderdeel uit van X bouwstenen in onze offertes" — al aanwezig, prima zo.

### F. Niet in scope
- Nieuwe foto's uploaden van klant — gebruik wat in storage staat. Admin kan later in beheer eigen foto's uploaden.
- Detailpagina per partner (`/partners/:id`) — apart vervolg.
- Wijzigingen aan MAP-koppeling-logica.

### Vraag ter bevestiging
**`fietstocht-met-begeleiding`**: Bureau Vlieland houden, of bestaat er een specifieke fietsgids-partner die ik moet koppelen (bijv. VVV Vlieland, Eigen gids)?

