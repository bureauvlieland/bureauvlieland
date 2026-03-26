

## Plan: Werklijst-widget verwijderen van Dashboard

### Probleem
De `DashboardTodoWidget` op het dashboard is een duplicaat van de aparte Taken-pagina (`/admin/todos`). Less is more.

### Wijzigingen

**`src/pages/admin/AdminDashboard.tsx`**:
1. Verwijder import van `DashboardTodoWidget` (regel 7)
2. Verwijder `<DashboardTodoWidget />` uit de layout (regel 124)
3. `LiveActivityFeed` schuift omhoog als primaire content in de linkerkolom

Optioneel: `src/components/admin/DashboardTodoWidget.tsx` kan verwijderd worden, maar het wordt ook gebruikt in de `DashboardTodoWidget` export — even checken of het nergens anders geïmporteerd wordt. Als alleen hier → verwijderen.

### Resultaat
Dashboard wordt schoner: statistiekchips bovenaan + activiteitenfeed + zijbalk-widgets. Taken worden uitsluitend via de Taken-pagina beheerd.

