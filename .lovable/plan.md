

## Probleem

Het formulier verstuurt niet omdat er een validatiefout optreedt die niet zichtbaar is. De oorzaak:

1. De `Select` voor ontvanger heeft `defaultValue={recipients[0].email}` — dus de dropdown **toont** de klant
2. Maar `handleRecipientSelect` wordt alleen aangeroepen bij `onValueChange` — **niet** bij mount
3. Daardoor blijft `recipientEmail` in het formulier leeg (`""`)
4. Zod-validatie faalt op `z.string().email()` voor een lege string → submit wordt geblokkeerd, maar de foutmelding is niet zichtbaar omdat het veld verborgen is (alleen zichtbaar bij `recipientType === "custom"`)

## Oplossing

In `SendProjectEmailSheet.tsx`:

1. **`defaultValues` vullen met eerste recipient** — als er recipients zijn, direct `recipientEmail`, `recipientName` en `recipientType` invullen op basis van `recipients[0]`
2. **`useEffect` toevoegen** — wanneer de sheet opent en recipients veranderen, het formulier resetten met de juiste waarden (zodat het ook werkt bij heropenen)

Dit is een eenvoudige fix in één bestand.

