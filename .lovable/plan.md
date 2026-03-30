

## Plan: "Niet gekozen" badge andere kleur geven

### Probleem
"Niet gekozen" (rejected) gebruikt dezelfde rode `destructive` kleur als "Afgewezen" en "Verlopen", terwijl het een ander soort status is — de klant heeft simpelweg een andere partner gekozen. Dit verdient een neutrale/zachtere kleur.

### Aanpak
Kleur wijzigen naar **muted/grijs** (vergelijkbaar met "Verlopen") of **amber/oranje** om het te onderscheiden van echte afwijzingen. Grijs past het best: het is een afgeronde, neutrale status.

### Bestanden die aangepast worden

| Bestand | Huidige waarde | Nieuwe waarde |
|---|---|---|
| `src/pages/admin/AdminPartnerDetail.tsx` | `variant: "destructive"` | `variant: "secondary"` |
| `src/components/partner-portal/PartnerAccommodationTable.tsx` | `variant: "destructive"` | `variant: "secondary"` |
| `src/components/partner-portal/PartnerAccommodationRequestCard.tsx` | `variant: "destructive"` | `variant: "secondary"` |
| `src/components/partner-portal/PartnerUnifiedList.tsx` | `color: "text-destructive"`, `bgColor: "bg-destructive/10"` | `color: "text-muted-foreground"`, `bgColor: "bg-muted"` |

Vier kleine regelwijzigingen, geen nieuwe bestanden.

