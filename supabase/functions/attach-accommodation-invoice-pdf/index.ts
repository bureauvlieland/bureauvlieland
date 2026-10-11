import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * De partner koppelt een pdf aan een al geregistreerde logiesfactuur
 * (partnerportaal fase 0). De pdf staat al in de bucket partner-invoices
 * (de partner mag alleen in zijn eigen map uploaden); deze functie zet
 * alleen het pad op accommodation_quotes.invoiced_file_path. Dat kan de
 * partner niet zelf: de trigger protect_partner_accommodation_quote_fields
 * zet dat veld bij een partner-update terug, dus het gaat met de service
 * role, na controle dat de offerte van de partner is, dat er een factuur
 * geregistreerd is, dat het pad in zijn map ligt en dat het bestand bestaat.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface AttachRequest {
  quoteId?: string;
  partnerToken?: string;
  filePath?: string;
}

/** Het pad moet in de map van de partner liggen en op .pdf eindigen, zonder uitstapjes. */
export function isPathInPartnerFolder(filePath: string, partnerId: string): boolean {
  if (!filePath.startsWith(`${partnerId}/`)) return false;
  if (filePath.includes("..") || filePath.includes("//")) return false;
  return /\.pdf$/i.test(filePath);
}

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { quoteId, partnerToken, filePath }: AttachRequest = await req.json().catch(() => ({}));
    if (!quoteId || !partnerToken || !filePath) return json({ error: "quoteId, partnerToken en filePath zijn verplicht" }, 400);

    const { data: partner, error: partnerError } = await supabase
      .from("partners")
      .select("id, name")
      .eq("partner_token", partnerToken)
      .eq("is_active", true)
      .maybeSingle();
    if (partnerError || !partner) return json({ error: "Partner niet gevonden" }, 404);

    if (!isPathInPartnerFolder(filePath, partner.id)) return json({ error: "Het bestand staat niet in uw eigen map" }, 400);

    const { data: quote, error: quoteError } = await supabase
      .from("accommodation_quotes")
      .select("id, invoiced_number, invoiced_file_path")
      .eq("id", quoteId)
      .eq("partner_id", partner.id)
      .maybeSingle();
    if (quoteError || !quote) return json({ error: "Offerte niet gevonden of geen toegang" }, 404);
    if (!quote.invoiced_number) return json({ error: "Registreer eerst de factuur, voeg daarna de pdf toe" }, 400);

    // Bestaat het bestand? De partner uploadt zelf naar de bucket; wij koppelen alleen.
    const slash = filePath.lastIndexOf("/");
    const folder = filePath.slice(0, slash);
    const fileName = filePath.slice(slash + 1);
    const { data: files, error: listError } = await supabase.storage.from("partner-invoices").list(folder, { search: fileName });
    if (listError || !files?.some((f: { name: string }) => f.name === fileName)) {
      return json({ error: "De pdf is niet gevonden in de opslag" }, 404);
    }

    const { error: updateError } = await supabase
      .from("accommodation_quotes")
      .update({ invoiced_file_path: filePath, updated_at: new Date().toISOString() })
      .eq("id", quoteId);
    if (updateError) {
      console.error("attach-accommodation-invoice-pdf: update", updateError);
      return json({ error: "Kon de pdf niet koppelen" }, 500);
    }

    console.log(`Pdf gekoppeld aan logiesfactuur ${quote.invoiced_number} (offerte ${quoteId}) door ${partner.name}`);
    return json({ success: true, filePath });
  } catch (error) {
    console.error("attach-accommodation-invoice-pdf:", error);
    return json({ error: "Er ging iets mis bij het koppelen van de pdf" }, 500);
  }
};

if (import.meta.main) Deno.serve(handler);
