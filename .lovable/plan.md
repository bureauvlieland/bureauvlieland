
# Plan: Verwijder Link Geldigheid & Voeg Opnieuw Uitnodigen Toe

## Samenvatting

Dit plan lost twee gerelateerde problemen op:
1. De "24 uur geldig" tekst wordt verwijderd uit partner uitnodigingsemails
2. Admin kan een nieuwe uitnodigingslink versturen naar partners met een verlopen link

## Achtergrond

Uit de email van Island Events (Amber de Jongh) blijkt dat partners soms de uitnodigingslink laten verlopen. Momenteel is er geen manier om een nieuwe link te versturen als een partner al een auth_user_id heeft.

---

## Wijzigingen

### 1. Verwijder "24 uur geldig" tekst

**Bestand:** `supabase/functions/invite-partner/index.ts`

**HTML template (regel 119-122)** - Van:
```html
<p style="...">
  Deze link is 24 uur geldig. Na activatie vindt u het portaal op:...
</p>
```

Naar:
```html
<p style="...">
  Na activatie vindt u het portaal op:...
</p>
```

**Plain text versie (regel 342)** - Verwijder:
```
Deze link is 24 uur geldig.
```

---

### 2. Nieuwe Edge Function: resend-partner-invitation

Maakt het mogelijk om een nieuwe wachtwoord-reset link te genereren voor partners die al een auth account hebben.

**Nieuw bestand:** `supabase/functions/resend-partner-invitation/index.ts`

Functionaliteit:
- Ontvangt `partnerId` als parameter
- Controleert of partner een auth_user_id heeft
- Genereert een nieuwe recovery link via Supabase Auth Admin API
- Stuurt dezelfde uitnodigingsemail opnieuw (met nieuwe link)
- Update `invited_at` timestamp

---

### 3. Update AdminPartnerDetail.tsx

De "Partner uitnodigen" knop wordt aangepast zodat deze ook werkt voor partners met een verlopen link:

```text
Situatie                               | Knop tekst              | Actie
---------------------------------------|-------------------------|---------------------------
Geen auth_user_id                      | "Partner uitnodigen"    | invite-partner (nieuw account)
auth_user_id + geen password_set_at    | "Opnieuw uitnodigen"    | resend-partner-invitation
auth_user_id + password_set_at         | (geen knop)             | Partner is actief
```

UI wijziging:
- Knop wordt getoond als `!partner.password_set_at` (in plaats van `!partner.auth_user_id`)
- Knoplicoon: `UserPlus` voor nieuwe uitnodiging, `RefreshCw` voor opnieuw uitnodigen
- Tekst dynamisch: "Partner uitnodigen" of "Opnieuw uitnodigen"

---

## Technische Details

### Database Query voor Partner Status

Partner interface moet uitgebreid worden met `password_set_at`:

```typescript
interface Partner {
  // ... existing fields
  password_set_at: string | null;
}
```

### resend-partner-invitation Edge Function

```typescript
// Pseudo-code
1. Verify admin auth
2. Get partner by ID
3. Verify partner.auth_user_id exists
4. Generate new recovery link via adminClient.auth.admin.generateLink()
5. Send invitation email with new link
6. Update partners.invited_at = now()
7. Log email to email_log table
```

---

## Bestanden

### Nieuwe bestanden
| Bestand | Functie |
|---------|---------|
| `supabase/functions/resend-partner-invitation/index.ts` | Nieuwe link versturen |

### Te wijzigen bestanden
| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/invite-partner/index.ts` | Verwijder "24 uur geldig" tekst |
| `src/pages/admin/AdminPartnerDetail.tsx` | Toon "Opnieuw uitnodigen" knop + fetch password_set_at |

---

## Email Template Update

Als er een database template bestaat voor `partner_invitation`, zal de admin deze handmatig moeten aanpassen via /admin/berichten om de "24 uur geldig" tekst te verwijderen. De code fallback wordt automatisch bijgewerkt.
