

# Plan: Partner Bulk Uitnodiging & Activatie Tracking

## Samenvatting

Dit plan implementeert drie functionaliteiten:
1. **Reset bestaande koppelingen** - Ontkoppel de huidige auth_user_id's zodat partners opnieuw kunnen worden uitgenodigd
2. **Bulk uitnodiging** - Selecteer meerdere partners en nodig ze met één klik uit
3. **Activatie tracking** - Toon of een partner zijn wachtwoord heeft ingesteld en ingelogd is

---

## Stap 1: Database Aanpassingen

Nieuwe kolommen toevoegen aan de `partners` tabel:
- `invited_at` (timestamp) - Wanneer de uitnodiging is verstuurd
- `password_set_at` (timestamp) - Wanneer de partner zijn wachtwoord heeft ingesteld
- `last_login_at` (timestamp) - Laatst ingelogd (wordt bijgewerkt bij elke login)

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Partner Onboarding Status                   │
├─────────────────────────────────────────────────────────────────┤
│  Status        │ auth_user_id │ invited_at │ password_set_at    │
├─────────────────────────────────────────────────────────────────┤
│  Niet uitgen.  │     NULL     │    NULL    │       NULL         │
│  Uitgenodigd   │     UUID     │  timestamp │       NULL         │
│  Actief        │     UUID     │  timestamp │     timestamp      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stap 2: Admin Tool - Partners Resetten

Nieuwe "Reset alle partner koppelingen" actie in het admin panel:
- Knop in de header van `/admin/partners`
- Bevestigingsdialog met waarschuwing
- Zet `auth_user_id`, `invited_at`, `password_set_at`, `last_login_at` terug naar NULL
- Verwijdert de bijbehorende auth users en user_roles

---

## Stap 3: Bulk Uitnodiging Functionaliteit

### 3.1 UI Updates (`AdminPartners.tsx`)
- Checkbox kolom toevoegen aan de partners tabel
- "Selecteer alle (niet-uitgenodigde)" checkbox in header
- "X partners uitnodigen" knop die verschijnt bij selectie
- Voortgangsindicator tijdens bulk operatie

### 3.2 Nieuwe Edge Function (`bulk-invite-partners`)
- Accepteert array van partner IDs
- Verwerkt partners sequentieel met rate limiting (voorkom Mailjet throttling)
- Retourneert resultaat per partner (succes/fout)
- Vult `invited_at` timestamp in

---

## Stap 4: Wachtwoord-Activatie Tracking

### 4.1 Update Partner Reset Password Flow
De bestaande `/partner/reset-password` pagina aanpassen:
- Na succesvol wachtwoord instellen: update `password_set_at` in partners tabel
- Dit geeft aan dat de partner actief zijn account heeft geactiveerd

### 4.2 Login Tracking
Bij elke partner login: update `last_login_at` timestamp
- Implementeren in de partner auth flow

---

## Stap 5: Verbeterde Admin Partners Overzicht

### 5.1 Nieuwe Status Badge Logica
```text
┌────────────────────────────────────────────────────────────┐
│  Badge             │ Conditie                             │
├────────────────────────────────────────────────────────────┤
│  🔴 Niet uitgen.   │ auth_user_id = NULL                  │
│  🟡 Wacht op actie │ auth_user_id SET, password_set = NULL│
│  🟢 Actief         │ password_set_at IS NOT NULL          │
└────────────────────────────────────────────────────────────┘
```

### 5.2 Filter Opties
- "Alle partners"
- "Niet uitgenodigd" (voor bulk selectie)
- "Wacht op activatie" (uitgenodigd maar nog niet ingelogd)
- "Actief" (wachtwoord ingesteld)

### 5.3 Statistieken Header
```text
┌─────────────────────────────────────────────────────────────┐
│  📊 Onboarding Voortgang                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  38 totaal  │  4 uitgenodigd  │  2 actief  │  34 wachtend   │
└─────────────────────────────────────────────────────────────┘
```

---

## Technische Details

### Database Migratie
```sql
-- Nieuwe tracking kolommen
ALTER TABLE partners 
ADD COLUMN invited_at timestamptz,
ADD COLUMN password_set_at timestamptz,
ADD COLUMN last_login_at timestamptz;
```

### Edge Functions
1. **`reset-partner-connections`** - Admin-only functie om alle partner auth te resetten
2. **`bulk-invite-partners`** - Uitbreiden van huidige invite-partner logica voor bulk operaties

### Frontend Componenten
- `BulkInviteConfirmDialog` - Bevestigingsdialog met partner lijst
- `PartnerOnboardingStats` - Stats widget voor dashboard
- Uitbreiding van `AdminPartners.tsx` met checkbox selectie en filters

---

## Veiligheidsoverwegingen

- Reset functie vereist admin rol verificatie
- Bulk invite heeft rate limiting (max 5 emails per seconde)
- Alle acties worden gelogd in `admin_activity_log`
- Preview omgevingen sturen emails naar test adres (bestaande safety)

---

## Verwachte Resultaat

Na implementatie kun je:
1. ✅ Alle bestaande partner koppelingen resetten met één klik
2. ✅ Meerdere partners tegelijk selecteren en uitnodigen
3. ✅ Zien welke partners hun wachtwoord hebben ingesteld
4. ✅ Filteren op onboarding status voor opvolging

