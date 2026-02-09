
# Partner overzicht verbeteren

## Huidige problemen
- 10 kolommen veroorzaken horizontale scroll
- Logies commissie ontbreekt in het overzicht
- Adres-kolom neemt ruimte in maar voegt weinig toe
- Acties zitten verstopt in een dropdown-menu

## Wijzigingen

### 1. Kolommen optimaliseren
- **Adres-kolom verwijderen** -- deze informatie is beschikbaar op de detailpagina
- **Commissie-kolom splitsen** in twee compacte waarden: "Activiteiten / Logies" (bijv. "10% / 10%") in een enkele kolom met label
- **Voorwaarden-kolom verwijderen** als losse kolom en verplaatsen als icoon naast de partnernaam (net als de beschikbaarheid-badge)

### 2. Acties zichtbaar maken
De dropdown met `MoreVertical` vervangen door inline icon-buttons met tooltips:
- **Bewerken** (Edit-icoon) -- navigeert naar detailpagina
- **Uitnodigen** (UserPlus-icoon) -- alleen zichtbaar als partner nog niet uitgenodigd
- **Verwijderen** (Trash2-icoon) -- rode kleur, opent bevestigingsdialog

"Bekijk als partner" verplaatsen naar de detailpagina aangezien het minder vaak wordt gebruikt.

### 3. Nieuwe kolomstructuur
Na optimalisatie worden de kolommen:

| Checkbox | Partner (naam + KvK + badges) | Type | Contact | Commissie (act/logies) | Status | Actief | Acties |

Dit zijn 8 kolommen i.p.v. 10, met meer informatiedichtheid en geen horizontale scroll.

### 4. Commissie weergave
De commissie-kolom toont beide percentages compact:
```
10% / 10%
```
Met een subtekst "act. / logies" in klein grijs lettertype.

## Technisch

### Bestand dat wordt aangepast
- `src/pages/admin/AdminPartners.tsx`

### Wijzigingen
- Partner interface uitbreiden met `accommodation_commission_percentage`
- Supabase query aanpassen om `accommodation_commission_percentage` op te halen
- Adres-kolom (`TableHead` + `TableCell`) verwijderen
- Voorwaarden-kolom verwijderen en icoon toevoegen naast partnernaam
- Commissie-cel aanpassen voor dubbele weergave
- Dropdown vervangen door inline buttons met tooltips
- "Bekijk als partner" link verwijderen uit de tabelrij
