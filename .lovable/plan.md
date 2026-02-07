

# Laatste getClaims-fixes in één keer

Twee resterende edge functions gebruiken nog de niet-bestaande `getClaims()` methode en zullen daarom falen:

1. **`supabase/functions/invite-partner/index.ts`** -- individuele partner uitnodigen
2. **`supabase/functions/get-admin-commissions/index.ts`** -- commissie-overzicht ophalen

## Aanpassing (identiek aan vorige fix)

In beide bestanden wordt dit patroon:

```typescript
const token = authHeader.replace("Bearer ", "");
const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
if (claimsError || !claims?.claims?.sub) { ... }
const userId = claims.claims.sub;
```

Vervangen door:

```typescript
const { data: { user }, error: userError } = await userClient.auth.getUser();
if (userError || !user) { ... }
const userId = user.id;
```

Beide functies worden daarna direct gedeployed. Geen andere bestanden hoeven te worden aangepast.
