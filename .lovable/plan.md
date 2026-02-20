
## Persoonlijke ondertekening toevoegen aan welkomsttekst

### Wat er aangepast wordt

In `CustomerPortalSplash.tsx` staat de welkomsttekst momenteel als één alinea. We voegen direct daarna een tweede, iets kleinere alinea toe met de persoonlijke afsluiting:

```
Met vriendelijke eilandgroet,
Erwin
```

"Erwin" krijgt een iets prominentere stijl (`font-medium text-foreground`) zodat de naam er subtiel uitspringt ten opzichte van de muted tekstkleur van de afsluiting.

### Technische wijziging

**`src/components/customer-portal/CustomerPortalSplash.tsx`** — regel ~233–236:

```tsx
<p className="text-muted-foreground">
  Fijn dat u er bent! Via dit portaal vindt u alles ...
</p>
<p className="text-muted-foreground text-sm">
  Met vriendelijke eilandgroet,<br />
  <span className="font-medium text-foreground">Erwin</span>
</p>
```

Één bestand, minimale wijziging.
