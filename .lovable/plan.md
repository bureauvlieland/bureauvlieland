

## Plan: Mailjet API keys bijwerken

### Stappen
1. **MAILJET_API_KEY** bijwerken via de secrets tool
2. **MAILJET_SECRET_KEY** bijwerken via de secrets tool
3. Alle e-mail edge functions redeployen om de nieuwe keys op te pikken

### Geen codewijzigingen nodig
De secrets worden al correct gebruikt in alle edge functions via `Deno.env.get()`.

