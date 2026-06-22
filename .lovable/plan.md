## Doel

1. **Eén betekenis per woord.** Het woord *"akkoord"* wordt gereserveerd voor het **eindakkoord/ondertekenen** aan het einde van het traject. Per onderdeel spreken we van *"goedkeuren / goedgekeurd"*. Zo is er geen verwarring meer of de klant het programma al wel of niet definitief akkoord heeft gegeven.
2. **Eén statusboodschap.** Op het Programma-tabblad staan nu 3–4 zinnen door elkaar die hetzelfde of tegenstrijdige zeggen ("Wij wachten op de aanbieders" / "Bureau Vlieland stelt uw programma samen" / "Aanvragen verstuurd" / "Bureau Vlieland coördineert..."). We laten **één** duidelijke boodschap staan.

---

## Wijzigingen — Terminologie

### A. Per-onderdeel groene bevestiging
`src/components/customer-portal/CustomerProgramItem.tsx` (regel 380)

- "U hebt akkoord gegeven op dit voorstel" → **"U heeft dit programmaonderdeel goedgekeurd"**

### B. Per-onderdeel knoppen (zelfde bestand, knoplabels)

- "Ik ga akkoord met dit onderdeel" → **"Dit onderdeel goedkeuren"**
- "Ik ga akkoord met deze aanpassing" → **"Wijziging goedkeuren"**
- "Akkoord met nieuwe prijs" → **"Nieuwe prijs goedkeuren"**

### C. Tab-badges (`tabHeaderConfig.ts`)

- "N goed te keuren" blijft (al goed).
- "Akkoord gegeven" (badge wanneer alles is goedgekeurd) → **"Alles goedgekeurd"**
- "Klaar voor akkoord" → **"Klaar voor ondertekening"**

### D. Hero-strook bovenaan (`ProgramOverviewCard.tsx`)

De badge "Akkoord gegeven" rechtsboven het programma → **"Alles goedgekeurd"**. (Het echte akkoord = ondertekening, dat hoort op de Akkoord-tab.)

> De sidebar-stap *"Onderdelen goedkeuren"* en *"Voorwaarden ondertekenen"* blijven ongewijzigd — die maken het onderscheid al correct.

---

## Wijzigingen — Dubbele statusboodschappen

Volgorde van blokken op screenshot 2:

```
1. ProgramOverviewCard (hero, "Uw programma" + subtitel)
2. tabHeaderConfig subtitel (sticky tab-header)
3. ActionRequiredCard banner ("Aanvragen verstuurd naar aanbieders")
4. ProgramIntroCard (klein grijs blokje onderaan de programma-lijst)
```

We houden **ActionRequiredCard** (3) als enige drager van de status­boodschap en strippen de duplicaten:

### 1. `ProgramOverviewCard.tsx` — regel 182-187
Verwijder de subtitel-`<p>` die nu zegt *"Bureau Vlieland stelt uw programma samen. Wij nemen contact met u op."* / *"Dit voorstel is speciaal voor jullie samengesteld door Bureau Vlieland."* — dit dupliceert de ActionRequiredCard en is bij maatwerk-na-publicatie ook gewoon onjuist. De badge rechts ("Maatwerk", "Alles goedgekeurd") communiceert het programmatype al.

### 2. `tabHeaderConfig.ts` — Programma-case
De `subtitle` van de Programma-tab wordt **leeg** zodra de ActionRequiredCard de boodschap toont (statusSummary.total > 0). Bij `statusSummary.total === 0` (nog niets klaargezet) blijft "Bureau Vlieland stelt uw programma samen. Zodra het klaarstaat, vindt u het hier terug." staan, want dan is er nog geen ActionRequiredCard met items.

### 3. `ProgramIntroCard.tsx` — regel 218-226
Verwijder het grijze blok onderaan (*"Bureau Vlieland coördineert de aanvragen..."*). Wanneer er geen items zijn, blijft de "Hieronder vindt u uw programma..."-tekst staan; in de gepubliceerde situatie rendert de component niets meer (volledig overbodig).

### 4. `ActionRequiredCard.tsx`
Blijft de enige bron. Tekst blijft:
- Titel: **"Aanvragen verstuurd naar aanbieders"**
- Beschrijving: **"Uw aanvragen zijn verstuurd naar de aanbieders. Zodra zij reageren ontvangt u hiervan een e-mail."**

---

## Bestanden die wijzigen

- `src/components/customer-portal/CustomerProgramItem.tsx` (groene tekst + knoplabels)
- `src/components/customer-portal/tabHeaderConfig.ts` (badge-labels + subtitle leegmaken)
- `src/components/customer-portal/ProgramOverviewCard.tsx` (badge-label + subtitel verwijderen)
- `src/components/customer-portal/ProgramIntroCard.tsx` (grijs blok verwijderen)

Geen backend- of typewijzigingen nodig — alleen presentatie­tekst.
