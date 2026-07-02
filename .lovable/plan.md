## Geen code-wijziging nodig — alleen uitleg

**Wat "Verwacht" betekent in het commissie-overzicht**

Het tabblad *Verwacht* toont **niet** of de klant al gefactureerd is. Het toont of **de partner (Zuiver Traiteur) al een inkoopfactuur naar Bureau Vlieland heeft gestuurd** voor dat item.

De edge function `get-admin-commissions` haalt in de tak `statusFilter === "expected"` items op waarbij:

- **Activiteiten** (`program_request_items`): `status IN ('confirmed', 'accepted', 'executed')` **én** `invoiced_number IS NULL`
- **Logies** (`accommodation_quotes`): `status = 'selected'` **én** `invoiced_number IS NULL`

`invoiced_number` is het factuurnummer van de **inkoopfactuur van de partner**, niet de verkoopfactuur aan de klant.

**Concreet voor jouw screenshot (Zuiver Traiteur, 7 items, € 802,81)**

- 6 van de 7 projecten heb jij inderdaad al aan de klant gefactureerd. Dat verandert niks aan de commissie-status, want Bureau Vlieland moet nog **van Zuiver Traiteur** een inkoopfactuur ontvangen voordat de commissie omgezet wordt naar *Te factureren*.
- Voor 1 item heeft Zuiver Traiteur wél al zijn inkoopfactuur gestuurd (€ 30,96) → daarom staat die commissie klaar onder *Te factureren* (de gele banner).
- Zodra Zuiver Traiteur inkoopfacturen stuurt voor de andere 6 items — of de silence-agreement-termijn verstrijkt (7 dagen na uitvoering, zie mem: *Commission Tracking*) — schuiven ze automatisch mee naar *Te factureren* en kun jij daar één commissiefactuur van maken.

**Kort samengevat**

> "Verwacht" = commissie die Bureau Vlieland straks gaat innen zodra de partner zijn eigen inkoopfactuur indient. Volledig los van of de klantfactuur al de deur uit is.

Als je wilt dat dit ergens in de UI zichtbaar wordt (bijv. een tooltip of extra kolom), zeg het en dan maak ik daar een apart plan voor.