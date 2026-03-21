

## Plan: Klantomschrijving bewerkbaar maken in AI-dialoog

### Aanpassing

**`src/components/admin/AdminAiProgramDialog.tsx`**

- Nieuwe state `editableDescription` initialiseren met `customerDescription ?? ""`
- Het read-only `<div>` (regels 262-267) vervangen door een `<Textarea>` zodat de admin de tekst kan aanpassen/aanvullen voordat het naar de AI gaat
- In `handleGenerate`: `editableDescription` gebruiken i.p.v. `customerDescription` bij het samenstellen van de prompt
- Bij reset (dialog sluiten) de `editableDescription` terugzetten naar `customerDescription`
- Altijd tonen (niet alleen als `customerDescription` truthy is), zodat de admin ook tekst kan invoeren als er nog geen klantomschrijving is

