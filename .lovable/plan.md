## Doel

Pre-sales (websitevragen via de floating button + WhatsApp zonder project) wordt een eigen hoofdtab bovenin het Berichtencentrum, naast "E-mail", "Chat & live-chat" en "Verzonden e-mails", met een rood badge-getal voor nieuwe/ongelezen berichten. De sub-tab "Pre-sales" in de gesprekkenlijst verdwijnt.

## Wat verandert

1. **ChatPanel krijgt een modus**
   - Nieuwe prop `mode?: "projects" | "presales"` (default `projects`).
   - Definitie pre-sales blijft ongewijzigd: gesprek zonder gekoppeld programma of logies (dus ook WhatsApp- en widget-berichten zonder project).
   - `mode="presales"`: toont uitsluitend pre-sales gesprekken; kanaalfilters worden beperkt tot Alle / WhatsApp / Website-chat (geen Klant/Partner), geen groepering per projectnummer.
   - `mode="projects"`: gedraagt zich als nu, pre-sales blijft uitgesloten; de sub-tab "Pre-sales" wordt verwijderd.

2. **Nieuwe hoofdtab in AdminMessages**
   - Tab `presales` (icoon + label "Pre-sales") tussen "Chat & live-chat" en "Verzonden e-mails", met dezelfde rode badge-styling als de andere tabs.
   - Tabcontent rendert `<ChatPanel mode="presales" />`.
   - Deeplink `?tab=presales` werkt net als de bestaande tabs.

3. **Badge-telling**
   - Kleine query/hook die ongelezen berichten telt in niet-gearchiveerde gesprekken zonder `request_id`, `accommodation_request_id` en `accommodation_id` (zelfde ongelezen-definitie als de chatlijst gebruikt).
   - Deze pre-sales gesprekken worden afgetrokken van de badge op "Chat & live-chat", zodat er niet dubbel geteld wordt.

## Technisch

- `src/components/admin/ChatPanel.tsx`: prop `mode`, filterlogica splitsen, pre-sales sub-tab verwijderen.
- `src/pages/admin/AdminMessages.tsx`: extra `TabsTrigger`/`TabsContent`, tab-param uitbreiden, badge-tellingen.
- Telling van ongelezen pre-sales in een aparte hook (bijv. `usePresalesUnread`) zodat de badge ook klopt als de tab niet open staat.
