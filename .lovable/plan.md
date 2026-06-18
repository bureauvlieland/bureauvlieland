## Meta-koppeling afmaken

De edge functions staan al: `social-generate-drafts`, `social-publish`, `social-refresh-token`, `social-meta-oauth-start/-callback`. Wat ontbreekt: secrets, cron, foutafhandeling, asset-validatie, go-live.

---

### Stap 1 — Secrets (jij)

Vóór ik kan bouwen heb ik nodig:
- `META_APP_ID`
- `META_APP_SECRET`

Te maken in [Meta for Developers](https://developers.facebook.com/apps/) → nieuwe **Business**-app → Facebook Login + Instagram Graph toevoegen. Permissions die nodig zijn: `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`. In de App-console moet de OAuth-callback URL van `social-meta-oauth-callback` whitelisted worden — die URL geef ik je zodra je begint.

Zodra je zegt "ik heb de Meta App aangemaakt" vraag ik beide secrets via `add_secret`.

---

### Stap 2 — OAuth-flow doortesten

Jij doorloopt `/admin/social-settings` → "Verbind Facebook" → kiest de FB-pagina + gekoppeld IG-business-account. Ik controleer of `meta_page_token` + `meta_ig_user_id` correct in `social_settings` landen.

Eventueel fix ik kleine bugs die boven komen.

---

### Stap 3 — Asset-validatie vóór scheduling

In `social-generate-drafts` (of bij het schedulen): check per asset
- Aspect ratio in {1:1, 4:5, 1.91:1} voor IG
- Min. 320px aan de korte zijde
- Bestandsgrootte binnen limiet

Als asset niet voldoet → draft krijgt `status='rejected'` + reden, géén schedule.

---

### Stap 4 — Foutafhandeling bij publish

In `social-publish`: bij `status='failed'`
- Schrijf `last_error` (bestaat al?) met provider-respons
- Maak admin-todo (`type: 'social_publish_failed'`)
- Stuur e-mail naar Erwin via bestaande Mailjet edge function

Per memory-rule: `metadata.template_name` + `metadata.actor` op de logEmail-aanroep.

---

### Stap 5 — Cron-jobs (via `supabase--insert`, niet via migratie — bevat anon key)

```
07:00 daily   → social-generate-drafts   (vult drafts voor komende week)
*/15 * * * *  → social-publish           (pakt scheduled posts op)
0 3 * * 0     → social-refresh-token     (Meta long-lived token vervalt na 60d)
```

`pg_cron` + `pg_net` zijn waarschijnlijk al aan (al gebruikt voor andere jobs); zo niet, eerst enabelen.

---

### Stap 6 — Dry-run + go-live

1. `publishing_enabled = false` laten staan.
2. Eén draft handmatig op `scheduled` zetten op een test-tijdstip.
3. `social-publish` triggert → controleer of FB+IG-call gemaakt wordt (dry-run mode: alleen loggen, niet posten) → fix wat stuk is.
4. Daarna `publishing_enabled = true` en eerste echte post live.

---

### Wat ik nu nodig heb

Bevestig dat je de Meta App gaat aanmaken — dan geef ik je de exacte callback-URL die je moet whitelisten, plus de lijst permissions om in de App Review op te geven. Zodra je dat hebt, vraag ik de twee secrets aan en bouw ik stap 3–6 in één batch.
