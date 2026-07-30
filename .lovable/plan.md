## Wat ik heb vastgesteld (geverifieerd in code + database)

Commissie wordt pas factureerbaar zodra een inkoopfactuur aan een **programma-onderdeel** is gekoppeld. `get-admin-commissions` gebruikt daarvoor `program_request_items.invoiced_number`. Er zijn twee lekken:

**Lek 1 — verkocht, maar partner factureerde nooit** (13 items, € 6.083,50 verkoopwaarde incl. btw, oudste 9 april 2026):
Zuiver 6 items (€ 2.726), Trattoria Oliva (€ 1.335), De Bazuin Watertaxi (€ 960), Vlieland Outdoor Center (€ 560), Zeehondentochten (€ 425), Rederij (€ 77,50).

**Lek 2 — inkoopfactuur geregistreerd, maar nooit aan een item gekoppeld** (21 van 42 facturen):
Wel verwerkt in de inbox en doorgestuurd, maar zonder item-koppeling → geen commissie. O.a. Trattoria Oliva 3× (€ 3.789,62), Zuiver 3× (€ 3.533,49), Stortemelk 2× (€ 9.474,97), De Bazuin (€ 1.230), Vlielandhotel (€ 925,85), Seeruyter (€ 595,90), Bunkermuseum (€ 112). Een deel hiervan is terecht commissievrij (Rederij/veerboot, Poiesz, Taxi van Koot) — dat moet expliciet als zodanig te markeren zijn in plaats van stilzwijgend te verdwijnen.

Verder: er is geen enkel signaal als een inkoopfactuur uitblijft. De bestaande `notify-partners-missing-invoice-pdf` gaat alleen over ontbrekende **PDF's** bij reeds geregistreerde facturen. Er zijn 220 bankmutaties (jan–jul 2026) met tegenpartij en IBAN, bruikbaar als extra signaal.

## Wat ik ga bouwen

### 1. Reconciliatie-tab "Match" op de Commissie-pagina
Per partner + project naast elkaar: verkoopwaarde (quoted_price ex btw) ↔ geregistreerde inkoopfactuur ↔ verschil, met status:
- **Inkoopfactuur ontbreekt** — verkocht en uitgevoerd, geen factuur (lek 1)
- **Factuur niet gekoppeld** — inkoopfactuur bestaat, maar hangt niet aan een item (lek 2), met een koppel-actie direct vanuit de regel
- **Afwijking** — factuur wijkt meer dan de marge af (voorstel: € 5 of 2%)
- **Match** — binnen marge
- **Commissievrij** — expliciet gemarkeerd (veerboot, boodschappen, taxi), telt niet mee als gat

Filters op partner, periode en status; export naar CSV.

### 2. Vangnet: automatische signalering
- Dagelijkse job die na X dagen (voorstel: 14 dagen na uitvoering) een admin-todo aanmaakt per item zonder inkoopfactuur, én per inkoopfactuur die na 7 dagen nog niet aan een item is gekoppeld. Todo's sluiten automatisch zodra de koppeling er is.
- Herinneringsmail aan de partner bij een ontbrekende factuur, met dezelfde cooldown (5 dagen) als de bestaande PDF-herinnering; `pays_by_direct_debit`-partners en bureau-items uitgezonderd.
- Badge met het aantal open reconciliatie-regels op de Commissie-pagina en in de Facturatie-sidebar.

### 3. Handmatig factureren op verkoopwaarde
Per regel de actie **"Commissie factureren op verkoopwaarde"**: zet het item op `pending` met quoted_price ex btw als grondslag, gemarkeerd als `commission_basis = 'sales'` met reden. Alles met een inkoopfactuur blijft `commission_basis = 'purchase'`.

### 4. Bank-signaal (vangnet voor "buiten de app om")
Waarschuwing wanneer er een uitgaande bankmutatie naar een partner-IBAN staat zonder gekoppelde inkoopfactuur in dezelfde periode — precies het geval "partner factureerde buiten de app om en is al betaald".

### 5. Bestaande achterstand
Alle 13 ontbrekende items en 21 niet-gekoppelde facturen verschijnen automatisch in de Match-tab. Ik boek niets automatisch weg; je beoordeelt per regel (koppelen, alsnog opvragen, pro forma factureren, of markeren als commissievrij).

## Technische details

- **Database**: `program_request_items` krijgt `commission_basis` (`purchase` | `sales`, default `purchase`) en `commission_basis_reason`. `partner_purchase_invoices` krijgt `commission_exempt` (boolean) + `commission_exempt_reason`. Nieuwe `auto_type`-waarden voor de todo's (`partner_invoice_missing`, `purchase_invoice_unlinked`) — geen nieuwe tabel nodig.
- **Edge functions**: nieuw `get-commission-reconciliation` en `flag-missing-partner-invoices` (dagelijkse cron, idempotent); uitbreiden van `update-commission-status` (pro forma op verkoopwaarde) en `reconcile-admin-todos` (nette sluiting).
- **Frontend**: nieuwe tab + tabel in `src/pages/admin/AdminCommissions.tsx`, matchlogica als losse testbare module `src/lib/commissionReconciliation.ts`, koppel-dialog hergebruikt de bestaande allocatie-UI uit `AdminPurchaseInvoices.tsx`.
- **Tests**: Vitest op de matchlogica (marges, alle vier statussen, meerdere facturen op één item, credits, commissievrij) en idempotency-test op de signaleringsjob (dubbele run = geen dubbele todo of mail).
- Marge en dagen-drempels in `app_settings`, aanpasbaar zonder code-wijziging.
