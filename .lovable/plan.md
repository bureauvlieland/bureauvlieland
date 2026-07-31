## Doel

Gesprekken zonder gekoppeld project (website-widget/WhatsApp-vragen) krijgen een eigen tab **Pre-sales** in het Berichtencentrum, in plaats van onderaan te verschijnen als groepskop "Zonder project".

## Wat er verandert (`src/components/admin/ChatPanel.tsx`)

1. **Nieuwe filter-tab**: het kanaalrijtje (Alle / Klant / Partner / WhatsApp) krijgt een vijfde tab **Pre-sales** met een eigen icoon en een badge met het aantal ongelezen pre-sales gesprekken.
2. **Definitie pre-sales**: een gesprek zonder `program` én zonder `accommodation` in `useConversationProjects` — precies de gesprekken die nu onder "Zonder project" vallen (ongeacht kanaal, dus zowel website-chat als WhatsApp).
3. **Filterlogica**:
   - Tab "Pre-sales" toont uitsluitend die gesprekken, zonder groepskop (platte lijst, gesorteerd op laatste bericht).
   - De tabs Alle / Klant / Partner / WhatsApp tonen alleen gesprekken mét project, zodat de kop "Zonder project" verdwijnt en er geen dubbele weergave ontstaat.
4. **Groepering opschonen**: de `key: "none"`-tak en de bijbehorende sorteer-uitzonderingen vervallen; alle overgebleven groepen zijn project- of logies-groepen.
5. **Lege staat**: in de pre-sales tab een passende melding ("Geen pre-sales vragen") in plaats van de generieke tekst.

## Technische notities

- `ChannelFilter` breidt uit met `"presales"`; de kanaalfilter blijft op `conversation.source` werken, de pre-sales-check gaat via `projectRefs`.
- Ongelezen-telling per tab hergebruikt de bestaande `unreadByConversation`-map.
- Puur front-end; geen database- of edge-functionwijzigingen.
