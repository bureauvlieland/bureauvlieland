
# Dashboard redesign: Activiteitenfeed als hoofdfocus + Realtime

## Doel

Het dashboard redesignen zodat de live activiteitenfeed de **primaire focus** is. Statistieken blijven beschikbaar maar worden compacter. De feed krijgt realtime updates via Supabase Realtime, meer details per actie, en een betere opmaak.

---

## Layoutwijziging dashboard

### Huidig layout (van boven naar beneden)
```text
[4 stat cards]
[3 logies stat cards]
[Todo widget]
[Partner beschikbaarheid | Commissies]
[Live activiteitenfeed]
[Recente aanvragen | Recente logies]
```

### Nieuw layout (2-koloms hoofdindeling)
```text
[Compacte stat bar - 1 rij met 7 stats]
──────────────────────────────────────────────
[Live activiteitenfeed (groot) | Zijpaneel    ]
[                               Todos         ]
[                               Beschikbaarh. ]
[                               Commissies    ]
──────────────────────────────────────────────
[Recente aanvragen | Recente logies] (behoud)
```

De feed neemt 2/3 van de breedte in beslag. Het zijpaneel 1/3.

---

## 1. LiveActivityFeed verbeteringen

### Realtime via Supabase Realtime

De component abonneert op **INSERT** events van `program_request_history`:

```ts
const channel = supabase
  .channel("live-activity-feed")
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "program_request_history",
  }, async (payload) => {
    // Fetch gekoppelde klantnaam + referentienummer
    // Prepend nieuw item bovenaan de lijst
  })
  .subscribe();
```

Bij een nieuw item:
- Een groene pulserende "Live" indicator verschijnt naast de titel
- Het nieuwe item "flasht" kort in groen (CSS animatie, 2 sec)
- De teller toont hoeveel nieuwe items er zijn als je gefilterd hebt

### Grotere feed, meer zichtbare items

- `max-h` verhogen van `400px` naar `calc(100vh - 320px)` — de feed vult de beschikbare hoogte
- Minimaal 15-20 items zichtbaar (was ~8-10)
- Items worden geladen: `limit(60)` in plaats van `40`

### Meer detail per feed-item

Elk item toont:
1. **Icoon + kleurcode** (behoud)
2. **Actielabel** (behoud, uitgebreid)
3. **Klantnaam + bedrijf** (behoud)
4. **Referentienummer** als badge (bijv. `BV-2601-0042`)
5. **Activiteitnaam** — bij partner `status_changed`: de bloknaam uit `notes` of `new_value`
6. **Extra context** — bij `counter_proposed`: klantnoot; bij `billing_updated`: bedrijfsnaam
7. **Exacte tijdstip** als tooltip bij hover (naast relatieve tijd)

### Meer actietypes met labels

Uitbreiden met actietypes die nu als `action` worden getoond:

| action | Actor | Label |
|--------|-------|-------|
| `item_cancelled` | customer | "Klant verwijdert activiteit" |
| `add_activity` | customer | "Klant voegt activiteit toe" |
| `program_request_submitted` | customer | "Nieuwe programmaanvraag ingediend" |
| `admin_sent_to_partners` | admin | "Admin stuurt naar partners" |
| `quote_sent` | admin | "Offerte verzonden naar klant" |
| `invoice_registered` | partner | "Partner registreert factuur" |

### Nieuwe indicator: "Nieuw" badge

Items die korter dan 5 minuten geleden zijn binnengekomen krijgen een kleine `NIEUW` badge in groen.

---

## 2. Compacte stat bar

De 7 statistieken (4 programma + 3 logies) worden samengevoegd in **één compacte horizontale rij** bovenaan:

```text
[Actieve aanvragen: 12]  [Te bevestigen: 5]  [Bevestigd: 28]  [Partners: 8]  |  [Logies totaal: 6]  [Te verwerken: 2]  [Offertes: 1]
```

Elke stat is een klikbare chip die linkt naar de relevante beheerpagina. Minder ruimte = meer ruimte voor de feed.

---

## Bestanden die worden aangepast

| Bestand | Wijziging |
|---------|-----------|
| `src/components/admin/LiveActivityFeed.tsx` | Realtime subscription, grotere feed, meer detail, "Nieuw" badge, Live indicator |
| `src/pages/admin/AdminDashboard.tsx` | 2-koloms layout, compacte stat bar, feed prominenter |

### Geen database-wijzigingen nodig

`program_request_history` staat al in Supabase Realtime (public schema). De RLS policies staan al admin SELECT toe. Geen migraties nodig.

---

## Technische details realtime

De subscription wordt opgezet in een `useEffect` die bij unmount wordt opgeruimd:

```ts
useEffect(() => {
  fetchFeed(); // initiële load

  const channel = supabase
    .channel("activity-feed-realtime")
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "program_request_history",
    }, async (payload) => {
      const newItem = payload.new as any;
      // Skip customer_portal_viewed om spam te voorkomen
      if (newItem.action === "customer_portal_viewed") return;

      // Haal klantnaam + referentie op
      const { data: req } = await supabase
        .from("program_requests")
        .select("customer_name, customer_company, reference_number")
        .eq("id", newItem.request_id)
        .single();

      const feedItem: FeedItem = {
        id: `h-${newItem.id}`,
        actor: newItem.actor,
        action: newItem.action,
        actor_name: newItem.actor_name,
        notes: newItem.notes,
        new_value: newItem.new_value,
        created_at: newItem.created_at,
        request_id: newItem.request_id,
        customer_name: req?.customer_name,
        customer_company: req?.customer_company,
        reference_number: req?.reference_number,
        isNew: true, // voor flash animatie
      };

      setItems(prev => [feedItem, ...prev].slice(0, 60));
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, []);
```

**Opmerking over `customer_portal_viewed`**: Deze actie wordt bewust **gefilterd uit de realtime feed** (maar blijft in de initiële laadquery) om te voorkomen dat de feed volloopt bij actief klantportaalgebruik. In de initiële load worden ze wel getoond, maar gedimmed weergegeven (lichtere kleur).

### Flash animatie voor nieuwe items

```css
@keyframes flash-new {
  0%, 100% { background-color: transparent; }
  30% { background-color: rgb(220 252 231); } /* green-100 */
}
```

Toegepast via een `isNew` flag die na 3 seconden wordt verwijderd.
