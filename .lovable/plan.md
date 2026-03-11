

# Cart-knop navigeert naar programma-pagina i.p.v. drawer openen

## Probleem
De floating cart-knop opent nu overal een drawer met het volledige programma-overzicht. Op pagina's zoals /contact ziet dit er rommelig uit en biedt het niet de volledige bewerkervaring.

## Oplossing
De floating cart-knop op niet-configurator pagina's navigeert direct naar `/programma-samenstellen` in plaats van een drawer te openen. De drawer en `RequestFormModal` worden verwijderd uit `GlobalCartDrawer.tsx` — het wordt simpelweg een navigatie-knop.

## Wijzigingen

**`src/components/configurator/GlobalCartDrawer.tsx`**
- Vervang de `Drawer`-wrapper door een simpele `Link`-knop naar `/programma-samenstellen`
- Behoud het floating button-uiterlijk met item-count badge en pulse-animatie
- Verwijder `Drawer`, `DrawerContent`, `ConfiguratorCart`, `RequestFormModal` imports en state
- Op de configurator-pagina zelf: knop verbergen op desktop (bestaand gedrag via `lg:hidden`)

