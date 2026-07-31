import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildReconciliationRows,
  summarizeReconciliation,
} from "../_shared/commissionReconciliation.ts";
import { loadReconciliationInputs } from "../_shared/commissionReconciliationData.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const partnerIdFilter = typeof body.partnerId === "string" && body.partnerId ? body.partnerId : null;

    // Eén gedeelde loader: werklijst, taakgenerator en opschoner rekenen met
    // exact dezelfde invoer (inclusief logies-offertes).
    const inputs = await loadReconciliationInputs(adminClient, { partnerId: partnerIdFilter });

    const rows = buildReconciliationRows({
      items: inputs.items,
      invoices: inputs.invoices,
      projects: inputs.projects,
      partners: inputs.partners,
      settings: inputs.settings,
    });

    const summary = summarizeReconciliation(rows);

    return new Response(JSON.stringify({ rows, summary, settings: inputs.settings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    console.error("get-commission-reconciliation error:", e);
    const message = e instanceof Error ? e.message : "Onbekende fout";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
