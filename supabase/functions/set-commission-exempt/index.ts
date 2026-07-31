import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RowType = "activity" | "accommodation" | "purchase_invoice";

const TABLE_BY_TYPE: Record<RowType, string> = {
  activity: "program_request_items",
  accommodation: "accommodation_quotes",
  purchase_invoice: "partner_purchase_invoices",
};

const TODO_TYPE_BY_TYPE: Record<RowType, string> = {
  activity: "commission_missing_invoice",
  accommodation: "commission_missing_invoice",
  purchase_invoice: "commission_unlinked_invoice",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Invalid token" }, 401);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) return json({ error: "Admin access required" }, 403);

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const exempt = body.exempt !== false;
    const reasonRaw = typeof body.reason === "string" ? body.reason.trim() : "";
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (rows.length === 0) return json({ error: "Geen regels meegegeven" }, 400);
    if (rows.length > 200) return json({ error: "Maximaal 200 regels per keer" }, 400);
    if (exempt && reasonRaw.length < 3) {
      return json({ error: "Geef een reden op (minimaal 3 tekens)" }, 400);
    }

    const parsed: { type: RowType; id: string }[] = [];
    for (const r of rows) {
      const type = (r as Record<string, unknown>)?.type;
      const id = (r as Record<string, unknown>)?.id;
      if (typeof type !== "string" || !(type in TABLE_BY_TYPE)) {
        return json({ error: `Onbekend regeltype: ${String(type)}` }, 400);
      }
      if (typeof id !== "string" || id.length < 10) {
        return json({ error: "Ongeldig id" }, 400);
      }
      parsed.push({ type: type as RowType, id });
    }

    const now = new Date().toISOString();
    const payload = exempt
      ? {
        commission_exempt: true,
        commission_exempt_reason: reasonRaw,
        commission_exempt_at: now,
        commission_exempt_by: user.id,
      }
      : {
        commission_exempt: false,
        commission_exempt_reason: null,
        commission_exempt_at: null,
        commission_exempt_by: null,
      };

    let updated = 0;
    let todosClosed = 0;

    // Per tabel bundelen zodat we één update per soort doen.
    for (const type of Object.keys(TABLE_BY_TYPE) as RowType[]) {
      const ids = parsed.filter((p) => p.type === type).map((p) => p.id);
      if (ids.length === 0) continue;

      const { data, error } = await admin
        .from(TABLE_BY_TYPE[type])
        .update(payload)
        .in("id", ids)
        .select("id");
      if (error) throw error;
      updated += data?.length ?? 0;

      if (exempt) {
        // Bijbehorende automatische taken sluiten: commissievrij = geen actie meer.
        const { data: closed, error: todoError } = await admin
          .from("admin_todos")
          .update({
            status: "dismissed",
            completed_at: now,
            completion_reason: `Commissievrij gemarkeerd: ${reasonRaw}`,
          })
          .eq("auto_type", TODO_TYPE_BY_TYPE[type])
          .in("auto_entity_id", ids)
          .in("status", ["todo", "in_progress"])
          .select("id");
        if (todoError) throw todoError;
        todosClosed += closed?.length ?? 0;
      }
    }

    console.log("set-commission-exempt:", JSON.stringify({ exempt, updated, todosClosed }));
    return json({ updated, todosClosed, exempt });
  } catch (e: unknown) {
    console.error("set-commission-exempt error:", e);
    const message = e instanceof Error ? e.message : "Onbekende fout";
    return json({ error: message }, 500);
  }
});
