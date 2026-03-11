

# Email templates toevoegen aan instellingen + volledige e-mail review

## 1. Email Templates link toevoegen aan admin navigatie

De pagina `/admin/berichten/templates` bestaat nog, maar is niet meer bereikbaar via de sidebar. De "Berichten" sectie is vervangen door "Chat".

**Oplossing**: Email Templates toevoegen als item in de "Systeem" sectie van de sidebar, naast "Instellingen":

```
Systeem
├── Instellingen
└── Email Templates   ← nieuw
```

**Bestand**: `src/components/admin/AdminLayout.tsx` — `Mail` icon importeren, menu-item toevoegen aan Systeem sectie met URL `/admin/berichten/templates`.

---

## 2. Volledige e-mail review

Hieronder een inventarisatie van alle edge functions die e-mails versturen, met beoordeling van teksten en triggers.

### Programma-aanvragen

| Edge function | Trigger | Ontvangers | Gebruikt template? | Status |
|---|---|---|---|---|
| `send-program-request` | Klant dient programma in via website | Bureau + klant | Nee (hardcoded) | **⚠️ Geen test-mode redirect voor klant-email** — klant ontvangt altijd de echte mail, ook in preview. Bureau-mail gaat altijd naar erwin@. Teksten kloppen. |
| `approve-quote-item` | Admin stuurt item naar partner (of klant accepteert) | Partner | Nee (hardcoded in functie) | Teksten kloppen. |
| `update-partner-item-status` | Partner reageert op item (bevestigd/afgewezen/alternatief) | Klant (bij counter-proposal response) | Ja (`counter_proposal_response`) | Teksten kloppen. |

### Offerteaanvragen

| Edge function | Trigger | Ontvangers | Gebruikt template? | Status |
|---|---|---|---|---|
| `send-quote-request` | Klant dient offerte-aanvraag in | Bureau + klant | Ja (fallback aanwezig) | OK |
| `send-quote-offer` | Admin verstuurt offerte naar klant | Klant | Ja (`quote_offer_customer`) | OK |

### Annuleringen

| Edge function | Trigger | Ontvangers | Gebruikt template? | Status |
|---|---|---|---|---|
| `cancel-program-request` | Klant annuleert programma | Klant + partners + logiespartners | Deels (klant+partner templates, logiespartner hardcoded) | OK — teksten kloppen |

### Logies

| Edge function | Trigger | Ontvangers | Gebruikt template? | Status |
|---|---|---|---|---|
| `send-accommodation-request` | Klant dient logiesaanvraag in | Bureau + klant | Ja (met fallback) | OK |
| `send-accommodation-quote-request` | Admin stuurt offerteaanvraag naar logiespartners | Partners | Nee (admin schrijft body zelf) | OK — by design |
| `notify-accommodation-quote` | Partner dient offerte in / wijst af | Bureau (admin todo) | N.v.t. | OK |
| `select-accommodation-quote` | Klant/admin selecteert offerte | Partner (bevestiging) + overige partners (afwijzing) | Ja (`accommodation_selected_partner`, `accommodation_rejected_partner`) | OK |

### Herinneringen

| Edge function | Trigger | Ontvangers | Gebruikt template? | Status |
|---|---|---|---|---|
| `check-pending-items` | Dagelijkse cron | Partners (activiteit + logies herinneringen) | Ja (met fallback) | OK |

### Partner-beheer

| Edge function | Trigger | Ontvangers | Gebruikt template? | Status |
|---|---|---|---|---|
| `bulk-invite-partners` / `invite-partner` | Admin nodigt partner uit | Partner | Ja (`partner_invitation`) | OK |
| `send-partner-reset-email` | Partner vraagt wachtwoord-reset | Partner | Hardcoded | OK |
| `send-partner-intro-email` | Admin verstuurt intro-email | Partner | Hardcoded | OK |
| `resend-partner-invitation` | Admin verstuurt uitnodiging opnieuw | Partner | Ja | OK |

### Overig

| Edge function | Trigger | Ontvangers | Gebruikt template? | Status |
|---|---|---|---|---|
| `send-project-email` | Admin stuurt e-mail vanuit dossier | Variabel | Hardcoded wrapper | OK |
| `send-customer-accommodation-message` | Admin stuurt bericht naar klant over logies | Klant | Hardcoded | OK |
| `notify-new-chat-reply` | Nieuw chatbericht | Partner/bezoeker | Hardcoded | OK |
| `confirm-partner-commission` / `confirm-pending-commissions` | Proforma commissie bevestiging | Partner | Ja (`proforma_commission_notification`) | OK |

### Bevindingen

1. **`send-program-request`**: Klant-email wordt **niet** door test-mode gefilterd — in preview ontvangt de echte klant de bevestigingsmail. Dit is waarschijnlijk bewust (klant heeft zelf aangevraagd), maar verschilt van de andere flows.

2. **Alle teksten kloppen** — er zijn geen verkeerde of verouderde berichten gevonden na de wijzigingen van vandaag. De wijzigingen waren UI-only (status badges, klantportaal), geen edge functions zijn gewijzigd.

3. **Template coverage**: Enkele functies gebruiken nog hardcoded HTML in plaats van database-templates (send-program-request, approve-quote-item, chat notificaties, partner intro). Dit is niet fout maar maakt ze niet bewerkbaar via de admin UI.

## Implementatie

Alleen de sidebar-aanpassing is nodig — 3 regels wijzigen in `AdminLayout.tsx`. De e-mail review levert geen bugs op die gerepareerd moeten worden.

