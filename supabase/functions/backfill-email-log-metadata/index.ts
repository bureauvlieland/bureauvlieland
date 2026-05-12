import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function inferRecipientHint(emailType: string): string {
  const t = emailType.toLowerCase();
  if (t.includes("partner")) return "partner";
  if (t.includes("customer") || t.includes("klant") || t.includes("customer"))
    return "klant";
  if (t.includes("admin") || t.includes("bureau")) return "bureau";
  return "ontvanger";
}

function inferActor(sentBy: string | null, emailType: string): string {
  const hint = inferRecipientHint(emailType);
  const from = sentBy && sentBy.trim() !== "" ? sentBy.trim() : "system";
  return `${from} → ${hint} (auto-backfill)`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdminRes } = await admin.rpc("is_admin", {
      _user_id: user.id,
    });
    if (!isAdminRes) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids)
      ? body.ids
      : body?.id
        ? [body.id]
        : [];
    if (ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "Provide id or ids[]" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: rows, error: fetchErr } = await admin
      .from("email_log")
      .select("id, email_type, sent_by, metadata")
      .in("id", ids);
    if (fetchErr) throw fetchErr;

    const results: Array<{ id: string; updated: boolean; fields: string[] }> =
      [];

    for (const row of rows ?? []) {
      const meta = (row.metadata as Record<string, unknown>) ?? {};
      const fields: string[] = [];
      const next = { ...meta };

      const tmpl = meta.template_name;
      if (typeof tmpl !== "string" || tmpl.trim() === "") {
        next.template_name = row.email_type;
        fields.push("template_name");
      }
      const actor = meta.actor;
      if (typeof actor !== "string" || actor.trim() === "") {
        next.actor = inferActor(row.sent_by as string | null, row.email_type);
        fields.push("actor");
      }

      if (fields.length === 0) {
        results.push({ id: row.id, updated: false, fields: [] });
        continue;
      }

      next.backfilled_at = new Date().toISOString();
      next.backfilled_by = user.email ?? user.id;

      const { error: updErr } = await admin
        .from("email_log")
        .update({ metadata: next })
        .eq("id", row.id);
      if (updErr) {
        results.push({ id: row.id, updated: false, fields });
        continue;
      }
      results.push({ id: row.id, updated: true, fields });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
