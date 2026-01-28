

# Plan: Partner Type Selector in Admin

## Overzicht

Voeg een "Partner type" selectieveld toe aan het Admin Partner Detail formulier (`/admin/partners/:id`), zodat admins kunnen aangeven of een partner een activiteiten-partner, logies-partner, of beide is.

---

## Huidige Situatie

- De `partners` tabel heeft al een `partner_type` kolom met standaardwaarde `'activity_provider'`
- De Partner Layout checkt al op `partner_type === "accommodation" || partner_type === "both"` om de Logies tab te tonen
- Het Admin Partner Detail formulier toont dit veld nog NIET

---

## Technische Wijzigingen

### 1. AdminPartnerDetail.tsx

**Locatie:** `src/pages/admin/AdminPartnerDetail.tsx`

**Wijzigingen:**

1. **Partner interface uitbreiden:**
```typescript
interface Partner {
  // ... bestaande velden
  partner_type: string | null;
  accommodation_commission_percentage: number | null;
}
```

2. **FormData uitbreiden:**
```typescript
const [formData, setFormData] = useState({
  // ... bestaande velden
  partner_type: "activity_provider",
  accommodation_commission_percentage: 10,
});
```

3. **UI toevoegen in Instellingen Card:**
   - Select dropdown met opties:
     - `activity_provider` → "Activiteiten partner"
     - `accommodation` → "Logies partner"  
     - `both` → "Activiteiten én logies"
   - Conditioneel veld voor "Logies commissie %" (alleen tonen als type `accommodation` of `both`)

4. **Save functie updaten:**
   - `partner_type` en `accommodation_commission_percentage` meenemen in insert/update

---

## Voorgestelde UI

```text
┌─────────────────────────────────────────────┐
│  ⚙️ Instellingen                            │
├─────────────────────────────────────────────┤
│                                             │
│  Partner type                               │
│  ┌─────────────────────────────────────┐   │
│  │ Activiteiten én logies          ▼   │   │
│  └─────────────────────────────────────┘   │
│  Bepaalt welke portaalfuncties zichtbaar   │
│  zijn voor deze partner                     │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  Commissie activiteiten                     │
│  ┌────────┐                                │
│  │ 15     │ %                              │
│  └────────┘                                │
│  Dit percentage wordt in rekening gebracht  │
│  over gefactureerde activiteiten           │
│                                             │
│  Commissie logies                          │  ← Alleen zichtbaar
│  ┌────────┐                                │    als accommodation
│  │ 10     │ %                              │    of both
│  └────────┘                                │
│  Dit percentage over geaccepteerde logies  │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  Partner actief                [Toggle]     │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Bestandenlijst

| Bestand | Actie |
|---------|-------|
| `src/pages/admin/AdminPartnerDetail.tsx` | Bijwerken |

---

## Geen database wijzigingen nodig

De `partner_type` en `accommodation_commission_percentage` kolommen bestaan al in de `partners` tabel.

