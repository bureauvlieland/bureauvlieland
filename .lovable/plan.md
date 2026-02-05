
# Plan: Admin Beheer voor Programma Templates

## Samenvatting
Een admin-pagina bouwen waarmee Bureau Vlieland programma templates kan aanmaken, bewerken en beheren. Templates tonen afbeeldingen van de gekoppelde building blocks voor een visueel aantrekkelijk overzicht.

---

## 1. Nieuwe Admin Pagina

### `src/pages/admin/AdminTemplates.tsx`

Overzichtspagina vergelijkbaar met AdminBuildingBlocks:

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  📋 Programma Templates                               [+ Nieuwe template] │
├──────────────────────────────────────────────────────────────────────────┤
│  [Zoeken...]          [Filter: Alle duurtes ▾]    [Status: Alle ▾]      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │ [afbeelding] │ Eilanddag Compleet          │ 1 dag │ ✓ │ [Edit]  │   │
│  │              │ Actief dagprogramma...      │ 5 items │            │   │
│  │              │ 🏖️ 🚴 🍽️ 🏐 🍺              │        │            │   │
│  ├───────────────────────────────────────────────────────────────────┤   │
│  │ [afbeelding] │ Avontuur & Ontspanning      │ 2 dagen │ ✓ │ [Edit] │   │
│  │              │ Twee dagen actie...         │ 10 items │            │   │
│  │              │ 🚤 🚴 🍽️ 🏎️ 🌅 🦭 🏄          │        │            │   │
│  ├───────────────────────────────────────────────────────────────────┤   │
│  │ [afbeelding] │ Complete Eilandervaring     │ 3 dagen │ ○ │ [Edit] │   │
│  │              │ Drie dagen vol avontuur...  │ 14 items │            │   │
│  │              │ 🚤 🚴 🍽️ 🚜 🌅 🏖️ 🦭 🏄        │        │            │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  3 templates • 2 gepubliceerd • 1 concept                                │
└──────────────────────────────────────────────────────────────────────────┘
```

**Kenmerken:**
- Tabel met template naam, beschrijving, duur, aantal items
- Miniatuur-afbeeldingen van de eerste 3-5 building blocks als preview
- Publicatie-toggle per template
- Filter op duur (1/2/3 dagen) en status (gepubliceerd/concept)

---

## 2. Template Bewerk Sheet

### `src/components/admin/AdminTemplateSheet.tsx`

Sheet om template details en items te beheren:

```text
┌──────────────────────────────────────────────────────────────────┐
│  Template bewerken                                        [✕]   │
├──────────────────────────────────────────────────────────────────┤
│  [Algemeen] [Programma]                                         │
│                                                                  │
│  === TAB: Algemeen ===                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ID: [eilanddag-compleet         ]                        │   │
│  │ Naam: [Eilanddag Compleet       ]                        │   │
│  │ Korte beschrijving: [Actief dagprogramma met lunch...]   │   │
│  │ Lange beschrijving: [Textarea...]                        │   │
│  │ Duur: [1 ▾] dagen                                        │   │
│  │ Doelgroep: [Bedrijf ▾]                                   │   │
│  │ Indicatieve prijs p.p.: [75    ]                         │   │
│  │ Afbeelding: [Kies uit media ▾] of [Upload]              │   │
│  │ Gepubliceerd: [○→●]                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  === TAB: Programma ===                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Dag 1                                                     │   │
│  │ ├─ [10:00] 🚢 Overtocht Doeksen         [⋮] [✕]          │   │
│  │ ├─ [10:30] 🚴 Fietshuur                 [⋮] [✕]          │   │
│  │ ├─ [12:30] 🍽️ Lunch in de natuur        [⋮] [✕]          │   │
│  │ ├─ [14:00] 🏐 Beach Games               [⋮] [✕]          │   │
│  │ └─ [16:30] 🍺 Borrel & Hapjes           [⋮] [✕]          │   │
│  │                                                           │   │
│  │ [+ Bouwsteen toevoegen]                                   │   │
│  │                                                           │   │
│  │ ─────────────────────────────────────────────────────     │   │
│  │ Dag 2 (indien 2+ dagen)                                   │   │
│  │ ├─ ...                                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [Verwijderen]                              [Annuleren] [Opslaan]│
└──────────────────────────────────────────────────────────────────┘
```

**Tab Algemeen:**
- Basis metadata (naam, beschrijving, duur)
- Indicatieve prijs per persoon
- Afbeelding via MediaPickerDialog
- Publicatiestatus

**Tab Programma:**
- Per dag de gekoppelde building blocks weergeven
- Elke item toont: tijd, afbeelding (thumbnail), naam
- Drag-and-drop voor volgorde (optioneel, later)
- Verwijder-knop per item
- "Bouwsteen toevoegen" opent selectie-dialoog

---

## 3. Bouwsteen Toevoegen Dialoog

### `src/components/admin/AddTemplateItemDialog.tsx`

Dialoog om een building block toe te voegen aan een template:

```text
┌─────────────────────────────────────────────────────────────┐
│  Bouwsteen toevoegen                                   [✕]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Zoeken...]                                                │
│                                                              │
│  ┌─ Outdoor & Sport ────────────────────────────────────┐   │
│  │ [img] Beach Games           ○                        │   │
│  │ [img] Blokarten             ○                        │   │
│  │ [img] SUP                   ●                        │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌─ Excursies ──────────────────────────────────────────┐   │
│  │ [img] Zeehondentocht        ○                        │   │
│  │ [img] Vliehors Expres       ○                        │   │
│  └──────────────────────────────────────────────────────┘   │
│  ...                                                         │
│                                                              │
│  Dag: [Dag 1 ▾]     Tijd: [14:00]                           │
│                                                              │
│                               [Annuleren] [Toevoegen]        │
└─────────────────────────────────────────────────────────────┘
```

**Kenmerken:**
- Zoeken in building blocks
- Gegroepeerd per categorie
- Afbeelding thumbnail per block
- Dag-selectie en tijd-invoer

---

## 4. Hooks Uitbreiden

### `src/hooks/useProgramTemplates.ts` (aanvullen)

Toevoegen:

```typescript
// Admin: Alle templates ophalen (inclusief unpublished)
export const useAdminTemplates = () => { ... };

// Template aanmaken
export const useCreateTemplate = () => { ... };

// Template bijwerken
export const useUpdateTemplate = () => { ... };

// Template verwijderen
export const useDeleteTemplate = () => { ... };

// Template item toevoegen
export const useAddTemplateItem = () => { ... };

// Template item bijwerken
export const useUpdateTemplateItem = () => { ... };

// Template item verwijderen  
export const useDeleteTemplateItem = () => { ... };

// Publicatie toggle
export const useToggleTemplatePublish = () => { ... };
```

---

## 5. Navigatie Toevoegen

### `src/components/admin/AdminLayout.tsx`

Menu-item toevoegen:

```typescript
const menuItems = [
  // ... bestaande items
  { title: "Bouwstenen", url: "/admin/bouwstenen", icon: Blocks },
  { title: "Templates", url: "/admin/templates", icon: LayoutTemplate }, // NIEUW
  { title: "Media", url: "/admin/media", icon: ImageIcon },
  // ...
];
```

### `src/App.tsx`

Route toevoegen:

```typescript
import AdminTemplates from "./pages/admin/AdminTemplates";

// In Routes:
<Route path="/admin/templates" element={<AdminTemplates />} />
```

---

## 6. Afbeeldingen uit Building Blocks

De template preview sheet en admin overzicht tonen automatisch afbeeldingen van de gekoppelde building blocks:

**In TemplatePreviewSheet (public):**
- Al geïmplementeerd via `getBlockImage(block)`

**In AdminTemplates (admin overzicht):**
- Per template de eerste 3-4 block afbeeldingen als "collage"
- Gebruik `getBlockImage()` utility

**In AdminTemplateSheet (admin bewerken):**
- Elke template item toont thumbnail van de building block
- Thumbnail komt uit `block.image_url` of `getBlockImage(block)`

---

## 7. Bestanden Samenvatting

| Nieuw Bestand | Doel |
|---------------|------|
| `src/pages/admin/AdminTemplates.tsx` | Overzichtspagina templates |
| `src/components/admin/AdminTemplateSheet.tsx` | Template bewerk-sheet |
| `src/components/admin/AddTemplateItemDialog.tsx` | Bouwsteen toevoegen dialoog |

| Aangepast Bestand | Wijziging |
|-------------------|-----------|
| `src/hooks/useProgramTemplates.ts` | Admin CRUD hooks toevoegen |
| `src/components/admin/AdminLayout.tsx` | Menu-item toevoegen |
| `src/App.tsx` | Route toevoegen |

---

## 8. Resultaat

Na implementatie:
- Bureau Vlieland kan templates aanmaken en beheren via admin
- Templates tonen visueel de gekoppelde bouwstenen met afbeeldingen  
- Per dag kunnen bouwstenen worden toegevoegd met tijd
- Publicatie-toggle om templates zichtbaar te maken voor klanten
- Afbeeldingen worden automatisch getoond uit de building blocks
