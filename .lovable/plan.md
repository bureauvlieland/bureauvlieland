
# Fix: Partner verwijderen werkt niet door accommodation_quotes

## Probleem

Partner "Strandhotel Vlieland" (hotel-vlieland) kan niet worden verwijderd omdat:

1. De partner heeft 2 gekoppelde `accommodation_quotes` records
2. De huidige `handleDeletePartner` functie controleert alleen op:
   - `building_blocks` (0 gevonden)
   - `program_request_items` (0 gevonden)
3. **Ontbrekend**: controle op `accommodation_quotes` (2 gevonden)

De database delete faalt waarschijnlijk door een constraint, maar de gebruiker krijgt alleen een generieke "Kon partner niet verwijderen" melding.

## Oplossing

Voeg een extra controle toe voor `accommodation_quotes` voordat de partner wordt verwijderd.

### Wijzigingen in `src/pages/admin/AdminPartners.tsx`

**Regel 197-232 - handleDeletePartner functie:**

```typescript
const handleDeletePartner = async () => {
  if (!partnerToDelete) return;
  
  setIsDeleting(true);
  try {
    // Check if partner has linked building blocks
    const { data: blocks } = await supabase
      .from("building_blocks")
      .select("id")
      .eq("provider_id", partnerToDelete.id)
      .limit(1);
    
    if (blocks && blocks.length > 0) {
      toast({
        title: "Kan partner niet verwijderen",
        description: "Deze partner heeft nog gekoppelde bouwstenen.",
        variant: "destructive",
      });
      return;
    }

    // Check if partner has program request items
    const { data: items } = await supabase
      .from("program_request_items")
      .select("id")
      .eq("provider_id", partnerToDelete.id)
      .limit(1);
    
    if (items && items.length > 0) {
      toast({
        title: "Kan partner niet verwijderen",
        description: "Deze partner heeft nog gekoppelde aanvraag-items.",
        variant: "destructive",
      });
      return;
    }

    // NIEUW: Check if partner has accommodation quotes
    const { data: quotes } = await supabase
      .from("accommodation_quotes")
      .select("id")
      .eq("partner_id", partnerToDelete.id)
      .limit(1);
    
    if (quotes && quotes.length > 0) {
      toast({
        title: "Kan partner niet verwijderen",
        description: "Deze partner heeft nog gekoppelde logies offertes. Verwijder eerst de offertes.",
        variant: "destructive",
      });
      return;
    }

    // Delete the partner
    const { error } = await supabase
      .from("partners")
      .delete()
      .eq("id", partnerToDelete.id);

    if (error) throw error;
    // ... rest of function
  }
}
```

### Wijzigingen in `src/pages/admin/AdminCRM.tsx`

Dezelfde controle toevoegen aan de `handleDeletePartner` functie daar (regels 198+).

## Resultaat

Na deze wijziging krijg je een duidelijke melding:
> "Kan partner niet verwijderen: Deze partner heeft nog gekoppelde logies offertes."

## Alternatief (optioneel)

Als je wilt dat partners met afgewezen/verlopen quotes WEL verwijderd kunnen worden, kunnen we de controle aanpassen om alleen "actieve" quotes te checken:

```typescript
const { data: quotes } = await supabase
  .from("accommodation_quotes")
  .select("id")
  .eq("partner_id", partnerToDelete.id)
  .not("status", "in", '("declined","expired","rejected")')
  .limit(1);
```
