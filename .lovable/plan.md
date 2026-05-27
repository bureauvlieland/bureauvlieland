# Fix verzamelfactuurdialoog partner

## Probleem

In `RegisterCollectivePartnerInvoiceDialog.tsx`:

1. **"Factureer aan" toont `administratie@bureauvlieland.nl**` (uit `bureauDetails.email`) i.p.v. de inkoop-inbox waar de partner de PDF naartoe kan mailen. Inconsistent met de banner op `/partner/facturatie` die wél `inkoop@reply.bureauvlieland.nl` toont.
2. **Bedragen worden als "excl. BTW" gelabeld**, maar businessregel is: alle prijzen die partner en klant zien zijn **incl. BTW**. Alleen de **commissie (10–15%)** wordt over het **ex-BTW**-bedrag berekend.

## Oplossing

### 1. Inkoopinbox tonen, niet `administratie@`

In het amber "Factureer aan Bureau Vlieland"-blok:

- Verwijder `bureauInfo.email` (administratie-adres) of vervang door `**inkoop@reply.bureauvlieland.nl**` met label "PDF mailen kan ook naar:".
- Voorkeur: behoud KvK/BTW/adres voor formele factuuradressering, en zet een aparte regel "PDF mag ook gemaild worden naar [inkoop@reply.bureauvlieland.nl](mailto:inkoop@reply.bureauvlieland.nl)" → maakt dubbele upload-route expliciet.

### 2. Prijzen als incl. BTW behandelen

- Inputvelden per item blijven het bedrag **incl. BTW** (geen extra rekenstap voor de partner; dat matcht hoe `quoted_price` is opgeslagen).
- Label `Totaal excl. BTW` → `**Totaal incl. BTW**`.
- Commissieberekening aanpassen: per item BTW-tarief ophalen (via `useItemVatRates` zoals admin doet), ex-BTW per regel afleiden met `calculateFromInclVat`, optellen → `commissionAmount = totalExcl × commissionPercentage / 100`.
- Toon zowel **Totaal incl. BTW** als (kleinere regel) "Totaal excl. BTW (basis commissie): €X,XX" zodat het transparant is.

### 3. Edge function `register-partner-invoice`

- Geeft `amount` mee per item als **incl. BTW** (huidige opslag in `program_request_items.invoiced_amount`). Controleren of de allocation-tabel ook incl. BTW verwacht; zo niet, ex-BTW erbij berekenen en opslaan. (Pas alleen aan als nodig — eerst tabelvelden checken.)

## Memory toevoegen

`mem://style/partner-invoice-dialog-rules` — type: preference

> Partner-facing factuurdialogen tonen prijzen **incl. BTW** (label nooit "excl"). Commissie wordt berekend over ex-BTW (afgeleid via VAT rate). "Factureer aan"-blokken tonen het **inkoop-inboxadres** (`inkoop@reply.bureauvlieland.nl`), niet `administratie@`.

## Bestanden

- `src/components/partner-portal/RegisterCollectivePartnerInvoiceDialog.tsx`
- (mogelijk) `supabase/functions/register-partner-invoice/index.ts` — alleen als allocations ex-BTW vereisen
- `mem://style/partner-invoice-dialog-rules` (nieuw)
- `mem://index.md` (Memories-lijst uitbreiden)

## Vraag voor jou

Wil je in het amber blok **alleen** het inkoopadres tonen (clean), of **én** de formele bedrijfsgegevens (KvK/BTW/adres) **én** een aparte regel "PDF kan ook gemaild worden naar inkoop@…"? Mijn voorkeur: het tweede, want de partner heeft beide nodig (bedrijfsgegevens om de factuur op te stellen + mailroute als alternatief voor upload).

Het tweede