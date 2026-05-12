## Doel

1. Eén centrale admin-pagina **Locaties** waar je in een lijst snel adres + kaartpin beheert voor álle entiteiten met een locatieveld (bouwstenen, partners, en losse programma-onderdelen).
2. Het kaartje in het Word-document toont een **duidelijke marker** op de juiste locatie.

---

## 1. Nieuwe admin-pagina `/admin/locaties`

**Plek in menu:** nieuw item **"Locaties"** in de admin-sidebar (icoon `MapPin`), tussen *Bouwstenen* en *Partners*.

**Pagina-layout:**

```
┌─ Locaties ─────────────────────────────────────────────┐
│ [Tabs] Bouwstenen (101) · Partners (47) · Overig (n)   │
│ [Filter] Alleen zonder coördinaten ☑   [Zoek …]        │
├────────────────────────────────────────────────────────┤
│ Naam            Categorie  Adres            Status     │
│ ────────────────────────────────────────────────────── │
│ Strandtent X    Catering   Postweg 12      ● Pin OK    │
│ Bunkermuseum    Excursies  —               ⚠ Geen pin  │
│ …                                                      │
└────────────────────────────────────────────────────────┘
```

Status-badges: groen "Pin OK" (lat+lng), amber "Alleen adres", rood "Geen locatie".

Default-filter "Alleen zonder coördinaten" aan, zodat je direct het werklijstje ziet (huidige stand: 86 bouwstenen + 47 partners zonder coördinaten).

---

## 2. Bewerk-popup (groot)

Klik op rij → opent een **grote dialog/modal** in het midden van het scherm (geen smal sheet rechts):

- Breedte ~`max-w-5xl`, hoogte tot ~85vh.
- Kaart neemt de hoofdruimte in, ongeveer **600–700px hoog**, full-width binnen de modal — comfortabel om pinnen te zetten.
- Boven de kaart: naam + categorie + zoekveld (Nominatim) + "Pin op adres"-knop.
- Onder de kaart: adresveld + lat/lng readout + knoppen *Wissen / Annuleer / Opslaan*.
- Hergebruikt de bestaande `LocationPicker`-logica (klik = pin, reverse-geocode, search, marker-sync) maar met flexibele hoogte zodat de kaart in de modal kan groeien — bestaande hardcoded `h-[250px]` wordt configurable via prop (`mapHeight`).
- Sluiten met Esc of klik buiten = annuleren (met confirm bij ongesaved wijzigingen).
- Volgende/Vorige-knoppen onderin om snel door de lijst van "geen pin"-items te lopen zonder de modal te sluiten — versnelt de inhaalslag aanzienlijk.

---

## 3. Data

Geen schemawijziging nodig — alle kolommen bestaan al:
- `building_blocks`: `location_lat`, `location_lng`, `location_address`
- `partners`: `address_street/postal/city`, `location_lat`, `location_lng`
- `program_request_items`: `location_address`, `location_lat`, `location_lng` — tab "Overig" toont alleen items zonder `provider_id` waar minimaal adres of coördinaten zijn ingevuld

Toegang: alleen admins (bestaande RLS dekt dit al).

---

## 4. Marker in Word-document

In `supabase/functions/generate-program-docx/index.ts` halen we nu een **kale OSM-tegel** op (geen pin). Aanpassing:

- Eerst opnieuw `staticmap.openstreetmap.de` proberen vanuit edge runtime (ondersteunt `markers=lat,lng,red-pushpin` natively).
- Als die nog steeds onbereikbaar is: vragen om een gratis **Geoapify static-map** API key (3000/dag gratis) en die endpoint gebruiken — ondersteunt markers en is stabiel.
- Robuust foutpad behouden: als de fetch faalt → kaartje overslaan, document blijft genereren.

---

## Validatie

1. `/admin/locaties` opent → Bouwstenen-tab toont 101 rijen, 86 met "Geen pin"-badge.
2. Klik een rij → grote popup → kaart vult de modal → klik op kaart zet pin → opslaan → badge wordt groen → "Volgende" springt naar volgend item zonder pin.
3. Word-document genereren voor een test-programma → elk kaartje heeft een zichtbare marker op de juiste plek.

---

## Bestanden

- **Nieuw**: `src/pages/admin/AdminLocations.tsx`
- **Nieuw**: `src/components/admin/LocationEditDialog.tsx` (grote popup, hergebruikt LocationPicker)
- **Edit**: `src/components/admin/LocationPicker.tsx` (kaarthoogte als prop)
- **Edit**: `src/App.tsx` (route `/admin/locaties`)
- **Edit**: admin-sidebar (menu-item "Locaties")
- **Edit**: `supabase/functions/generate-program-docx/index.ts` (markered static map met fallback)
- Eventueel: secret `GEOAPIFY_API_KEY`

## Open vraag

Wil je naast de tabel ook een **overzichtskaart** met alle pinnen tegelijk (handig om in één oogopslag te zien wat er ontbreekt)? Of houden we het puur op de lijst + bewerk-popup?
