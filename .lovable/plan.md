# Plan: Naam corrigeren + "stuur naar partners" als todo borgen

## Probleem
1. In een aantal transactionele e-mails staat **"Erwin van der Most"** als afzender/ontvanger. Dat moet **"Erwin Soolsma"** zijn.
2. De actie uit de "Volgende stap"-banner (*"Concept – 6 onderdelen zijn klaar om naar partners te sturen"*) verschijnt **niet** in de admin todo-lijst. Op dit moment wordt de auto-todo `send_items_to_partners` alleen aangemaakt op het moment dat de klant zijn akkoord op de offerte geeft (in `accept-quote-proposal`). Voor projecten in concept- of voorwaarden-fase, of projecten waar items na publicatie zijn toegevoegd, ontstaat dus nooit een todo, terwijl er wel werk klaar staat.

## Aanpak

### 1. Naam fixen — "Erwin van der Most" → "Erwin Soolsma"
Vervang in deze edge functions de hardcoded naam:
- `supabase/functions/send-accommodation-request/index.ts` (2 plekken: `To`-veld en `recipient_name` in log)
- `supabase/functions/send-program-request/index.ts` (1 plek)
- `supabase/functions/send-quote-request/index.ts` (1 plek)

Geen schema-/UI-wijziging.

### 2. "Stuur onderdelen naar partners" altijd als todo
We voeren de bestaande auto-todo `send_items_to_partners` ook op alle andere triggermomenten uit, zodat hij altijd verschijnt zodra er onderdelen klaarstaan om verzonden te worden.

**Centrale helper** in `src/lib/autoTodoCreator.ts` (of nieuwe `ensureSendItemsTodo`-helper) die:
- de huidige `readyForPartner`-telling bepaalt via `getItemSendCounts` (`src/lib/projectWorkflow.ts`)
- bij telling > 0: maakt of werkt de bestaande `send_items_to_partners`-todo bij (titel + beschrijving met aantal en klantnaam)
- bij telling = 0: markeert een eventuele openstaande todo als `done` (zelfde patroon als `cleanup-stale-todos`)

**Aanroeppunten** (zowel client- als edge-side, zodat geen pad gemist wordt):
1. **Na publiceren naar klant** — `send-program-quote` / `publish-program` edge function: na succesvol versturen.
2. **Na klant-akkoord** — `accept-quote-proposal` (huidige plek behouden, maar via dezelfde helper).
3. **Na item toevoegen / status wijzigen** in admin: in `AdminRequestDetail.tsx` na `addItem` / `updateItem` / na bulk wijzigingen. Eén nette `ensureSendItemsTodo(requestId)`-call bij elke mutatie.
4. **Na partner-acceptatie van een ander item** — in `partner-respond`/equivalent: zodra een item naar `confirmed` gaat, hertellen.
5. **Periodiek** — in `cleanup-stale-todos` edge function een extra pass: voor alle actieve projecten met `readyForPartner > 0` zonder open todo, alsnog aanmaken (vangnet voor legacy projecten).

**Todo-inhoud**:
- Titel: `Stuur onderdelen naar partners — {customer_company || customer_name}`
- Beschrijving: `{N} onderde(e)l(en) klaar om naar de betrokken partners te sturen.`
- Prioriteit: `high` als project al klant-akkoord heeft, anders `normal`.
- `related_request_id` + `auto_entity_id = request.id` (zodat dedupe blijft werken).

**Resolve-pad** blijft zoals nu in `send-items-to-partners/index.ts`: na verzenden todo op `done` zetten — aangevuld met de nieuwe "0 ready → close"-regel uit de helper.

## Technische details

```text
ensureSendItemsTodo(requestId)
  ├─ fetch project + items
  ├─ count = getItemSendCounts(items, project).readyForPartner
  ├─ existing = admin_todos where auto_type='send_items_to_partners'
  │              and auto_entity_id=requestId and status!='done'
  ├─ count > 0 && !existing  → INSERT
  ├─ count > 0 &&  existing  → UPDATE title/description/priority
  └─ count == 0 && existing  → UPDATE status='done', completed_at=now()
```

Helper bestaat in twee varianten met identieke logica:
- `src/lib/sendItemsTodo.ts` (browser, Supabase JS client) — gebruikt door admin UI mutaties.
- `supabase/functions/_shared/send-items-todo.ts` (Deno, service role) — gebruikt door edge functions.

## Buiten scope
- Geen wijziging aan `lifecycle.ts` of de "Volgende stap"-banner zelf.
- Geen wijziging aan e-mail templates of partner-portaal.
- Geen historische backfill via migratie; de `cleanup-stale-todos`-pass vult bestaande projecten bij de eerstvolgende run vanzelf aan.
