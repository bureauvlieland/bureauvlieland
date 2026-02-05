
# Plan: Extra's Menu Item voor Logiespartners

## Samenvatting
Een nieuw menu-item "Extra's" toevoegen aan de sidebar voor logiespartners, met een bijbehorende beheerpagina waar partners hun opgeslagen extra-sjablonen kunnen bekijken, bewerken en verwijderen.

---

## 1. Navigatie Uitbreiden

### Huidige situatie
De sidebar in `PartnerLayout.tsx` heeft de volgende items voor logiespartners:
- Overzicht
- Logies
- Facturatie
- Handleidingen
- Instellingen

### Wijziging
Voeg een nieuw menu-item **"Extra's"** toe, alleen zichtbaar voor logiespartners (`accommodation` of `both`):

```text
- Overzicht
- Logies
- Extra's  ← NIEUW (alleen voor logiespartners)
- Facturatie
- Handleidingen
- Instellingen
```

**Icon:** `UtensilsCrossed` of `ListPlus` (van lucide-react)

---

## 2. Nieuwe Pagina: PartnerExtras.tsx

Een beheerpagina waar partners hun opgeslagen extra-sjablonen kunnen beheren.

### Functionaliteit
- **Lijst van sjablonen** - Toon alle actieve `partner_extra_presets`
- **Toevoegen** - Button om nieuwe preset toe te voegen
- **Bewerken** - Klik om preset te wijzigen
- **Verwijderen** - Optie om preset te deactiveren/verwijderen
- **Categorie-filter** (optioneel) - Filter op F&B, Faciliteiten, Transport, Overig

### UI Design

```text
┌────────────────────────────────────────────────────────────────┐
│ Extra's                                   [+ Nieuwe Extra]    │
│ Beheer uw standaard extra diensten voor logiesoffertes        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ 🍽️ F&B (3)                                              │    │
│ ├─────────────────────────────────────────────────────────┤    │
│ │ Lunch (2-gangen)                                        │    │
│ │ €22,50 per persoon                      [Bewerken] [×]  │    │
│ │                                                          │    │
│ │ 3-gangendiner                                           │    │
│ │ €47,50 per persoon                      [Bewerken] [×]  │    │
│ │                                                          │    │
│ │ Ontbijtbuffet                                           │    │
│ │ €18,00 per persoon                      [Bewerken] [×]  │    │
│ └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ 🚗 Transport (1)                                        │    │
│ ├─────────────────────────────────────────────────────────┤    │
│ │ Parkeren Harlingen                                      │    │
│ │ €150,00 vast bedrag                     [Bewerken] [×]  │    │
│ └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Lege state
```text
┌────────────────────────────────────────────────────────────────┐
│                           📦                                    │
│                                                                 │
│              Nog geen extra's opgeslagen                        │
│                                                                 │
│  Maak sjablonen aan voor diensten die u vaak toevoegt          │
│  aan uw logiesoffertes, zoals lunch, diner of parkeren.        │
│                                                                 │
│                   [+ Eerste extra aanmaken]                     │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. Technische Implementatie

### Nieuwe Bestanden

| Bestand | Doel |
|---------|------|
| `src/pages/PartnerExtras.tsx` | Beheerpagina voor extra-presets |
| `src/components/partner-portal/PartnerExtraPresetSheet.tsx` | Sheet voor bewerken/aanmaken preset |

### Gewijzigde Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/components/partner-portal/PartnerLayout.tsx` | Menu-item toevoegen |
| `src/App.tsx` | Route toevoegen |
| `src/hooks/usePartnerExtraPresets.ts` | Filter op partner_id toevoegen, update functie |

### Route
```tsx
// In App.tsx
<Route path="/partner/extras" element={<PartnerExtras />} />
```

### Menu Item
```tsx
// In PartnerLayout.tsx menuItems array
...(isAccommodationPartner ? [
  { title: "Logies", url: `/partner/logies${urlSuffix}`, icon: BedDouble },
  { title: "Extra's", url: `/partner/extras${urlSuffix}`, icon: UtensilsCrossed },
] : []),
```

### Hook Update
De bestaande `usePartnerExtraPresets` hook moet uitgebreid worden met:
1. Filter op specifieke `partner_id`
2. Update mutation voor bewerken van presets

```tsx
export function usePartnerExtraPresets(partnerId?: string) {
  return useQuery({
    queryKey: ['partner-extra-presets', partnerId],
    queryFn: async () => {
      let query = supabase
        .from('partner_extra_presets')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true });

      if (partnerId) {
        query = query.eq('partner_id', partnerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PartnerExtraPreset[];
    },
    enabled: !!partnerId,
  });
}

export function useUpdatePartnerExtraPreset() {
  // ... update mutation
}
```

---

## 4. Sheet Component

De `PartnerExtraPresetSheet` is vergelijkbaar met `AddQuoteExtraDialog`, maar dan voor het beheren van presets:

```text
┌─────────────────────────────────────────────────────────────┐
│ Extra bewerken                                         [✕]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Naam: [Lunch                     ]                          │
│ Omschrijving: [2-gangenmenu met soep/brood        ]        │
│                                                              │
│ Categorie: [F&B ▾]                                          │
│                                                              │
│ Prijstype: ○ Per persoon  ● Vast bedrag                     │
│                                                              │
│ Prijs: [€ 22,50]                                            │
│                                                              │
│ BTW: [9 %]  ☑ Inclusief BTW                                 │
│                                                              │
│                              [Annuleren] [Opslaan]          │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Resultaat

Na implementatie:
- Logiespartners zien een "Extra's" menu-item in de sidebar
- Partners kunnen hun standaard extra-diensten beheren op een centrale plek
- Presets zijn beschikbaar bij het invullen van nieuwe logiesoffertes
- Consistente UI met de rest van de partner portal
