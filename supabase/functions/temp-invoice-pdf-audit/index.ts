// Tijdelijke auditfunctie: maakt signed URLs voor inkoopfactuur-PDF's zodat
// betaalbatches tegen de originele PDF's gecontroleerd kunnen worden.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: invoices } = await supabase
    .from("partner_purchase_invoices")
    .select("id, invoice_number, partner_id, amount_incl_vat, file_path")
    .not("payment_batch_id", "is", null)
    .not("file_path", "is", null);

  const out: any[] = [];
  for (const inv of invoices ?? []) {
    const { data: signed } = await supabase.storage
      .from("partner-invoices")
      .createSignedUrl(inv.file_path as string, 900);
    out.push({ ...inv, url: signed?.signedUrl ?? null });
  }

  return new Response(JSON.stringify({ invoices: out }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
