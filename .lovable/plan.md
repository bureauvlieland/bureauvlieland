
# Fix: Afwijzen knop werkt niet

## Probleem geïdentificeerd

Bij analyse van de code zie ik dat de "Afwijzen" knop correct is gekoppeld aan de `handleDecline` functie en dat de `onDecline` prop wordt doorgegeven vanuit `PartnerAccommodation.tsx`. 

Het probleem is waarschijnlijk dat de `Button` componenten binnen de Sheet geen expliciete `type="button"` hebben. In HTML formulieren (en sheets/dialogen) worden buttons standaard behandeld als `type="submit"`, wat kan leiden tot onverwacht gedrag zoals het herladen van de pagina.

## Oplossing

Voeg `type="button"` toe aan alle action buttons in de `PartnerAccommodationQuoteSheet`:

### Wijzigingen in `src/components/partner-portal/PartnerAccommodationQuoteSheet.tsx`

**Regel 699-719 - De "Afwijzen" knop sectie:**
```typescript
{canSubmit && responseType === "decline" && (
  <div className="flex gap-2 pt-4">
    <Button type="button" variant="outline" onClick={onClose} className="flex-1">
      Annuleren
    </Button>
    <Button 
      type="button"   // <-- TOEVOEGEN
      onClick={handleDecline} 
      variant="destructive"
      className="flex-1"
      disabled={isSubmitting}
    >
      {isSubmitting ? (
        "Bezig..."
      ) : (
        <>
          <Ban className="h-4 w-4 mr-2" />
          Afwijzen
        </>
      )}
    </Button>
  </div>
)}
```

**Regel 675-696 - De "Offerte indienen" knop sectie:**
```typescript
<Button type="button" variant="outline" onClick={onClose} className="flex-1">
  Annuleren
</Button>
<Button 
  type="button"   // <-- TOEVOEGEN
  onClick={handleSubmit} 
  className="flex-1"
  disabled={isSubmitting || !accommodationName.trim() || !priceTotal}
>
  ...
</Button>
```

## Verificatie

Na deze wijziging:
1. Log in als logiespartner
2. Ga naar Logies Aanvragen
3. Open een aanvraag met status "pending"
4. Selecteer "Niet beschikbaar"
5. Klik op de rode "Afwijzen" knop
6. De aanvraag zou nu naar de "Afgerond" tab moeten verplaatsen met status "Afgewezen"

## Debugging console logs

De eerder toegevoegde console logs blijven behouden zodat bij eventuele verdere problemen de uitvoer zichtbaar is:
- `"handleDecline called, onDecline: function, declineReason: ..."`
- `"onDecline result: true/false"`
