// Contracttest (notificaties fase 1): de heads-up T-3 gebruikt de standaard
// facturatiezin (inboxroute invoices@ met referentie), geen "Factuur registreren"
// of uploadknop meer.
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));

Deno.test("send-partner-headsup-t3: geen upload-/registreerknop of inkoop@ meer", () => {
  assert(!/upload/i.test(src), "index.ts noemt nog 'upload'");
  assert(!src.includes("Factuur registreren"), "index.ts verwijst nog naar de knop 'Factuur registreren'");
  assert(!src.includes("inkoop@reply"), "index.ts noemt nog inkoop@reply");
});

Deno.test("send-partner-headsup-t3: standaard facturatiezin met referentie", () => {
  assert(src.includes('Mail na uitvoering de pdf van je factuur naar <a href="mailto:invoices@reply.bureauvlieland.nl">invoices@reply.bureauvlieland.nl</a>, met onze referentie ${escapeHtml(request.reference_number || "")} erop. Wij factureren centraal aan de klant.'));
});
