

## Verbeteringen: volledige email in log + inklapbaar menu

### 1. Volledige email terugbekijken in communicatielog

`ProjectCommunicationsCard.tsx` toont berichten met `line-clamp-3` (max 3 regels). Voor emails wil je het volledige bericht kunnen lezen.

**Wijziging:** Per communicatie-item een expand/collapse toggle toevoegen. Standaard ingeklapt (3 regels), klik om de volledige tekst te tonen.

| Bestand | Wijziging |
|---|---|
| `src/components/admin/ProjectCommunicationsCard.tsx` | Voeg per item een `expandedIds` state toe. Bij klik toggle `line-clamp-3` weg. Toon "Meer lezen" / "Minder" link onder afgekapte berichten. |

### 2. Inklapbaar linkermenu (admin sidebar)

De `AdminLayout` heeft al een `Sidebar` met `collapsible="icon"`, maar de `SidebarTrigger` is alleen zichtbaar op mobiel (`lg:hidden`). Op desktop is er geen manier om het menu in te klappen.

**Wijziging:** Toon de `SidebarTrigger` ook op desktop.

| Bestand | Wijziging |
|---|---|
| `src/components/admin/AdminLayout.tsx` | Verwijder `lg:hidden` van de header zodat de trigger altijd zichtbaar is, of voeg een aparte trigger toe in de sidebar footer/header voor desktop. |

