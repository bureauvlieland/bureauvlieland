

## Plan: Extra kosten uitsluiten van "verstuur naar partner" logica

### Probleem
Wanneer je losse kosten toevoegt (dag -1, provider "bureau"), worden deze meegeteld in de "klaar om naar partners te sturen" of "wacht op klantakkoord" banner. Die banner hoort niet te verschijnen voor interne kostenregels.

### Oorzaak
In `src/lib/projectWorkflow.ts` controleert `getItemSendPhase` op `skip_partner_notification`, maar bureau-kosten hebben dat op `true` staan. Daardoor vallen ze door naar de "klaar_voor_partner" of "wacht_op_klant" fase in plaats van "niet_van_toepassing".

### Oplossing

**`src/lib/projectWorkflow.ts`**
- `ItemForSendPhase` interface uitbreiden met optioneel `day_index` veld
- In `getItemSendPhase`: na de cancelled-check, bureau-kostitems (day_index === -1 en provider_id === "bureau") direct als `"niet_van_toepassing"` retourneren
- Hierdoor verdwijnen ze uit zowel de banners als de tellers

Eén bestand, kleine aanpassing.

