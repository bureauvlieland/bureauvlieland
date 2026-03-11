

# Fix: klant kan nog steeds wijzigingen doorvoeren

## Probleem

De `readOnly` prop wordt correct doorgegeven aan `CustomerProgramItem` en verbergt de actieknoppen (Akkoord, Verwijderen, etc.), maar er zijn drie plekken waar bewerkingen nog steeds mogelijk zijn:

1. **Expanded content** in `CustomerProgramItem` — de tijd-bewerken knop (Edit2 icoon), dag-selector (Select) en opmerkingen-textarea zijn niet gated door `readOnly`
2. **Floating "Doorvoeren" bar** in `DesktopProgramView` en `MobileProgramView` — wordt getoond op basis van `hasChanges`, niet gefilterd door `isPublished`

## Wijzigingen

### 1. `CustomerProgramItem.tsx` — expanded content read-only maken

In de `CollapsibleContent` sectie (regels 397-516):
- **Tijd**: Als `readOnly`, verberg de Edit2 knop en toon alleen de tijdtekst (geen edit-mogelijkheid)
- **Dag selector**: Als `readOnly`, toon alleen tekst i.p.v. een Select dropdown
- **Opmerkingen**: Als `readOnly`, toon de tekst als plain text i.p.v. een bewerkbaar Textarea (of verberg helemaal als leeg)

### 2. `DesktopProgramView.tsx` — floating bar verbergen

Regel 442: wijzig `{hasChanges && (` naar `{hasChanges && isPublished && (`

### 3. `MobileProgramView.tsx` — floating bar verbergen

Regel 537: voeg `isPublished` toe aan de conditie: `{initialSection === "program" && hasChanges && isPublished && (`

