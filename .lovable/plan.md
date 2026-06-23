Ik zie dat de nieuwe mails goed in `sales_inbox` staan, maar op `scan_status = pending` blijven. Er zijn geen logs of HTTP-aanroepen voor `scan-sales-lead`, dus de AI-scan wordt momenteel niet effectief gestart vanuit `inbound-email`.

Plan:
1. Controleer of `scan-sales-lead` wel gedeployed is en deploy deze functie indien nodig.
2. Pas de trigger in `inbound-email` aan zodat de scan-aanroep wordt afgewacht en fouten zichtbaar worden gelogd, in plaats van volledig fire-and-forget te verdwijnen.
3. Voeg een veilige fallback toe: als de scan-trigger faalt, zet de inboxregel op `scan_status = failed` met een duidelijke foutmelding, zodat de inbox niet eindeloos “scannen” blijft tonen.
4. Deploy `inbound-email` en `scan-sales-lead` opnieuw.
5. Zet de twee bestaande pending sales-mails opnieuw in gang door `scan-sales-lead` handmatig voor die inboxregels aan te roepen of ze gecontroleerd op `failed` te zetten als de AI-configuratie ontbreekt.
6. Verifieer daarna in de database en logs dat nieuwe sales-mails eindigen op `scanned` of `failed`, maar niet meer op `pending`/blijvend scannen.