

# Usability Analyse & Herontwerp Partner Dashboard

## Geïdentificeerde Problemen

Na analyse van het huidige partner dashboard heb ik de volgende usability-problemen vastgesteld:

---

### 1. **Onduidelijke Visuele Hiërarchie**

De huidige pagina bevat te veel elementen met vergelijkbare visuele zwaarte:

| Element | Probleem |
|---------|----------|
| Partner header (naam + email) | Neemt ruimte in maar is niet actiegericht |
| PartnerStatsGrid (6 kaarten) | Te veel statistieken concurreren om aandacht |
| Segment toggle (Activiteiten/Logies) | Verstopt onder stats, niet prominent |
| Tabs (Nieuw/Voorstel verstuurd/etc.) | Horizontale scroll op mobile, onduidelijk |
| Tabellen met items | Prima, maar acties niet duidelijk |

**Kernprobleem:** Een partner opent het dashboard en weet niet direct wat de prioriteit is.

---

### 2. **Duplicatie van Informatie**

- **Partnernaam** staat in de sidebar EN in de header
- **"Nieuw" teller** staat in stats grid EN in tab-badge EN in header-badge
- **YTD Omzet** prominent maar niet actionable
- **Commissie info** verspreid over dashboard, finance pagina, en item sheets

---

### 3. **Verkeerde Focus**

Partners willen antwoord op:
1. **Wat moet ik NU doen?** (nieuwe aanvragen beantwoorden)
2. **Wat kan ik factureren?** (klaar voor invoice)
3. **Hoeveel verdien ik?** (YTD omzet)

De huidige opzet prioriteert "Voorstel verstuurd" en "Akkoord" die **geen actie vereisen**.

---

### 4. **Complexiteit voor "Both" Partners**

Partners met zowel activiteiten als logies moeten:
1. Eerst de segment toggle vinden (verstopt)
2. Apart switchen om beide stromen te zien
3. Geen unified overzicht van "wat vraagt om mijn actie"

---

### 5. **Mobile UX Problemen**

- Stats grid neemt te veel ruimte
- Tab-labels horizontaal scrollen
- Geen sticky actie-indicator
- Partner header dupliceert sidebar info

---

## Voorgesteld Herontwerp

### Nieuwe Structuur: Actie-Eerst Dashboard

```text
┌─────────────────────────────────────────────────────────────────┐
│  COMPACT HEADER                                                  │
│  "Welkom terug, [Partnernaam]"                                  │
│  [Vernieuwen] [Instellingen]                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ACTIE NODIG (prominent alert-banner indien van toepassing)     │
│  [!] 3 nieuwe aanvragen • 2 te factureren                       │
│  [Bekijk aanvragen →]                                            │
└─────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────┐  ┌───────────────────────────┐
│  SAMENVATTING (compact 2x2 grid)  │  │  YTD OMZET (sidebar)      │
│  ┌─────────┐  ┌─────────┐        │  │  €24.500                  │
│  │ 3 Nieuw │  │ 5 Wacht │        │  │  commissie: €3.675        │
│  └─────────┘  └─────────┘        │  │                           │
│  ┌─────────┐  ┌─────────┐        │  │  [Facturatie overzicht →] │
│  │ 8 Akkoord│ │ 2 Invoice│       │  │                           │
│  └─────────┘  └─────────┘        │  └───────────────────────────┘
└───────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  WORKFLOW TABS (vereenvoudigd)                                   │
│  [ Actie nodig (5) ] [ In behandeling ] [ Afgerond ]            │
└─────────────────────────────────────────────────────────────────┘

│ "Actie nodig" combineert: Nieuw + Tegenvoorstel + Te factureren │
│ Items met ALLE statussen die partner actie vereisen             │

┌─────────────────────────────────────────────────────────────────┐
│  ITEM LIST (mixed activities + accommodation)                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [Activiteit] Silent Disco • Testbedrijf • 15 mrt • NIEUW    ││
│  │ [Logies] Aanvraag Hotel • Klant BV • 12-14 jun • OFFERTE    ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Concrete Wijzigingen

### 1. **Partner Header Vereenvoudigen**

**Huidig:**
```
[Avatar] Brouwerij Fortuna
         info@fortuna.nl
```

**Nieuw:**
```
Welkom terug, Brouwerij Fortuna                    [Vernieuwen]
```

De partnernaam staat al in de sidebar; in de main content is een "Welkom"-regel voldoende.

---

### 2. **"Actie Nodig" Alert Banner**

Nieuw component dat alleen verschijnt als er daadwerkelijk actie nodig is:

| Conditie | Banner tekst |
|----------|--------------|
| Nieuwe aanvragen | "3 nieuwe aanvragen wachten op je reactie" |
| Tegenvoorstellen | "1 klant heeft een tegenvoorstel ingediend" |
| Te factureren | "2 activiteiten zijn gereed voor facturatie" |
| Geen actie | Banner verborgen, toont "Alles up-to-date" message |

**Component:** `PartnerActionBanner.tsx`

```tsx
interface PartnerActionBannerProps {
  pendingCount: number;
  counterProposedCount: number;
  toInvoiceCount: number;
  onNavigate: (target: "pending" | "invoice") => void;
}
```

---

### 3. **Stats Grid Compacter**

**Huidig:** 6 kaarten in een grid, te veel visuele ruis

**Nieuw:** 4 compacte stat-items met duidelijkere groupering:

| Stat | Icoon | Betekenis |
|------|-------|-----------|
| Nieuw | 🔔 Bell (amber) | Te beantwoorden (activiteiten + logies) |
| Wacht op klant | ⏳ Hourglass (blue) | Voorstel verstuurd, wacht op klant |
| Akkoord | ✓ CheckCircle (green) | Klant heeft geaccepteerd |
| Te factureren | 📋 Receipt (purple) | Klaar voor facturatie |

Verwijder "YTD Omzet" uit de grid (verplaats naar sidebar of aparte module).

---

### 4. **Unified "Actie Nodig" Tab**

**Huidig:** Aparte tabs voor "Nieuw" en "Voorstel verstuurd"

**Nieuw:** Drie workflow-gebaseerde tabs:

| Tab | Inhoud |
|-----|--------|
| **Actie nodig** | pending + counter_proposed + te factureren |
| **In behandeling** | confirmed + alternative + accepted + executed |
| **Afgerond** | invoiced + cancelled + unavailable |

Dit reduceert cognitieve load: partner ziet direct wat aandacht vraagt.

---

### 5. **Unified Item List (Mixed Types)**

Voor "both" partners: toon activiteiten EN logies in dezelfde lijst, gesorteerd op urgentie.

**Visuele onderscheiding:**
- Activiteiten: Primaire kleur, Activity icoon
- Logies: Amber kleur, Bed icoon

Elk item toont:
- Type badge (Activiteit/Logies)
- Naam/klant
- Datum
- Status badge
- Chevron

---

### 6. **Financiële Module (Sidebar of Collapsed)**

Verplaats YTD omzet naar een aparte module die:
- Compact is op het dashboard (€24.500 + link naar details)
- Uitklapt of linkt naar /partner/facturatie

---

### 7. **Mobile Optimalisatie**

- **Sticky action banner** bovenaan met aantal openstaande items
- **Compact stat row** (2x2 in plaats van grid)
- **Full-width tabs** zonder horizontale scroll
- **Card-based items** in plaats van tabel

---

## Technische Implementatie

### Nieuwe Bestanden

```
src/components/partner-portal/PartnerActionBanner.tsx        (nieuw)
src/components/partner-portal/PartnerCompactStats.tsx        (nieuw)
src/components/partner-portal/PartnerUnifiedList.tsx         (nieuw)
src/components/partner-portal/PartnerMobileHeader.tsx        (nieuw)
```

### Bestanden die worden aangepast

```
src/pages/PartnerDashboard.tsx                               (herstructureren)
src/components/partner-portal/PartnerStatsGrid.tsx           (vervangen door compact versie)
src/components/partner-portal/PartnerLayout.tsx              (header vereenvoudigen)
```

---

### PartnerActionBanner Component

```tsx
const PartnerActionBanner = ({ pendingCount, counterProposedCount, toInvoiceCount, onNavigate }) => {
  const hasActions = pendingCount > 0 || counterProposedCount > 0 || toInvoiceCount > 0;
  
  if (!hasActions) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <span className="text-green-800 font-medium">Alles up-to-date</span>
      </div>
    );
  }

  const messages = [];
  if (pendingCount > 0) messages.push(`${pendingCount} nieuwe aanvra${pendingCount === 1 ? 'ag' : 'gen'}`);
  if (counterProposedCount > 0) messages.push(`${counterProposedCount} tegenvoorstel${counterProposedCount === 1 ? '' : 'len'}`);
  if (toInvoiceCount > 0) messages.push(`${toInvoiceCount} te factureren`);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
            <Bell className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="font-medium text-amber-900">Actie nodig</p>
            <p className="text-sm text-amber-700">{messages.join(' • ')}</p>
          </div>
        </div>
        <Button size="sm" onClick={() => onNavigate("pending")}>
          Bekijken
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
```

---

### Vereenvoudigde Tab Structuur

```tsx
// Oude categorisatie
const pendingItems = items.filter(i => i.status === "pending" || i.status === "counter_proposed");
const proposalSentItems = items.filter(i => i.status === "confirmed" || i.status === "alternative");
const acceptedItems = items.filter(i => i.status === "accepted" || i.status === "executed");
const closedItems = items.filter(i => ["invoiced", "unavailable", "cancelled"].includes(i.status));

// Nieuwe workflow-gebaseerde categorisatie
const actionNeededItems = items.filter(i => 
  i.status === "pending" || 
  i.status === "counter_proposed" ||
  ((i.status === "accepted" || i.status === "executed") && !i.invoiced_number && i.program_requests.terms_accepted_at)
);

const inProgressItems = items.filter(i => 
  i.status === "confirmed" || 
  i.status === "alternative" || 
  i.status === "accepted" || 
  (i.status === "executed" && (i.invoiced_number || !i.program_requests.terms_accepted_at))
);

const completedItems = items.filter(i => 
  i.status === "invoiced" || 
  i.status === "unavailable" || 
  i.status === "cancelled"
);
```

---

### PartnerUnifiedList (Mixed Activities + Accommodation)

```tsx
interface UnifiedListItem {
  id: string;
  type: "activity" | "accommodation";
  name: string;
  customer: string;
  date: string;
  status: string;
  urgencyScore: number; // Voor sortering
  originalItem: PartnerItem | PartnerAccommodationQuote;
}

const PartnerUnifiedList = ({ items, accommodationQuotes, onSelectItem, onSelectQuote }) => {
  // Merge en sorteer op urgentie
  const unified: UnifiedListItem[] = [
    ...items.map(i => ({
      id: i.id,
      type: "activity" as const,
      name: i.block_name,
      customer: i.program_requests.customer_company || i.program_requests.customer_name,
      date: i.program_requests.selected_dates[i.day_index],
      status: i.status,
      urgencyScore: getUrgencyScore(i.status),
      originalItem: i,
    })),
    ...accommodationQuotes.map(q => ({
      id: q.id,
      type: "accommodation" as const,
      name: q.accommodation_name || "Logies aanvraag",
      customer: q.accommodation_requests.customer_company || q.accommodation_requests.customer_name,
      date: q.accommodation_requests.arrival_date,
      status: q.status,
      urgencyScore: getUrgencyScore(q.status),
      originalItem: q,
    })),
  ].sort((a, b) => b.urgencyScore - a.urgencyScore);

  return (
    <div className="space-y-2">
      {unified.map(item => (
        <UnifiedListItemCard key={item.id} item={item} onClick={() => ...} />
      ))}
    </div>
  );
};

const getUrgencyScore = (status: string): number => {
  const scores: Record<string, number> = {
    pending: 100,
    counter_proposed: 95,
    // te factureren items krijgen ook hoge score
    alternative: 50,
    confirmed: 40,
    accepted: 30,
    executed: 20,
    invoiced: 10,
    cancelled: 0,
    unavailable: 0,
  };
  return scores[status] ?? 0;
};
```

---

## Visuele Hiërarchie (Na Herontwerp)

| Element | Zwaarte | Doel |
|---------|---------|------|
| Action Banner | **Hoog** | Directe aandacht naar wat actie vraagt |
| Compact Stats | Medium | Overzicht status (zonder afleiding) |
| Workflow Tabs | Medium | Navigatie naar specifieke workflows |
| Item List | Medium | Concrete items om aan te werken |
| YTD Module | Laag | Financieel inzicht (niet primair) |

---

## Tone of Voice Aanpassingen

| Huidig | Voorstel |
|--------|----------|
| "Nieuw" (vaag) | "Actie nodig" (duidelijk) |
| "Voorstel verstuurd" (status) | "Wacht op klant" (actiegericht) |
| "Akkoord" (kort) | "Klant akkoord" (completer) |
| Partner email in header (duplicatie) | "Welkom terug, [naam]" (persoonlijk) |

---

## Samenvatting Wijzigingen

1. **Action Banner** - Prominent overzicht van wat actie vraagt
2. **Compact Stats** - 4 items i.p.v. 6, focus op workflow
3. **Unified Tabs** - "Actie nodig" / "In behandeling" / "Afgerond"
4. **Mixed List** - Activiteiten + Logies in één overzicht
5. **Header vereenvoudigd** - Geen duplicatie met sidebar
6. **Mobile optimalisatie** - Sticky banner, compact grid
7. **YTD naar sidebar** - Financiën niet primair op dashboard

---

## Resultaat

Het herontworpen dashboard beantwoordt direct de drie vragen van elke partner:

| Vraag | Antwoord |
|-------|----------|
| Wat moet ik NU doen? | Action Banner + "Actie nodig" tab |
| Wat is de voortgang? | Compact stats + tabs |
| Hoeveel verdien ik? | YTD module (secundair) |

Een partner kan binnen 3 seconden zien of er werk is, en met 1 klik beginnen.

