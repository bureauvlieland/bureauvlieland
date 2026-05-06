## Lazy loading op /activiteiten-boeken

Vervang het vaste 30-dagen venster door een incrementeel venster met "load more" via infinite scroll.

### Gedrag
- Start: 14 dagen vooruit
- Per scroll naar bodem: +14 dagen
- Maximum: 90 dagen
- Bij datum-selectie in kalender: alleen die dag (venster niet relevant)
- Bij wissen datum: venster reset naar 14 dagen

### Wijzigingen in `src/pages/ActiviteitenBoeken.tsx`
1. Nieuwe state `daysWindow` (default 14), reset naar 14 wanneer `selectedDate` verandert.
2. `dateEnd` baseren op `addDays(today, daysWindow)` wanneer geen datum is gekozen.
3. Sentinel `<div ref={sentinelRef} />` onderaan de resultatenlijst.
4. `IntersectionObserver` in `useEffect`: bij zichtbaar worden → `setDaysWindow(w => Math.min(w + 14, 90))`, alleen actief als `!selectedDate && daysWindow < 90 && !isFetching`.
5. Skeleton/spinner-rij tonen onder de lijst zolang `isFetching` (vervolgladingen) en label "Alles geladen" wanneer max bereikt.

### Caching
React-Query key blijft `["map-activities-all", dateStart, dateEnd]`. Elke window-uitbreiding is een nieuwe key; vorige resultaten blijven zichtbaar dankzij `placeholderData: keepPreviousData` (toevoegen in `useAllMapActivities`).

### Geen wijzigingen aan
- Filter/zoek-logica, bundeling per dag, MapActivityCard, edge function.
