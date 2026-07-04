// Unified endpoint for project_documents CRUD:
// - list         : list documents for a program_request or accommodation_request
// - sign-upload  : return a signed PUT URL + create pending row
// - confirm      : mark row as uploaded (no-op placeholder; row is already created)
// - sign-download: return a signed GET URL for a specific document
// - delete       : delete document (row + storage object)
//
// Auth resolution (in priority order):
// 1) customer_token (validated against program_requests / accommodation_requests)
// 2) supabase auth JWT (admin → is_admin; partner → is_partner)

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Action = "list" | "sign-upload" | "confirm" | "sign-download" | "delete";

interface Body {
  action?: Action;
  program_request_id?: string | null;
  accommodation_request_id?: string | null;
  customer_token?: string | null;
  document_id?: string | null;
  // upload
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  label?: string | null;
  description?: string | null;
}

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const MAX_SIZE = 20 * 1024 * 1024;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function resolveActor(req: Request, body: Body) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const token = body.customer_token?.trim();

  if (token) {
    // Validate token against target
    if (body.program_request_id) {
      const { data } = await admin
        .from("program_requests")
        .select("id, customer_token, expires_at")
        .eq("id", body.program_request_id)
        .eq("customer_token", token)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (data) {
        return { role: "customer" as const, name: "Klant", userId: null as string | null, partnerId: null as string | null };
      }
    }
    if (body.accommodation_request_id) {
      const { data } = await admin
        .from("accommodation_requests")
        .select("id, customer_token, expires_at")
        .eq("id", body.accommodation_request_id)
        .eq("customer_token", token)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (data) {
        return { role: "customer" as const, name: "Klant", userId: null as string | null, partnerId: null as string | null };
      }
    }
    return null;
  }

  // JWT auth
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return null;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;
  if (!user) return null;

  const { data: isAdminRow } = await admin.rpc("is_admin", { _user_id: user.id });
  if (isAdminRow) {
    return {
      role: "admin" as const,
      name: (user.user_metadata?.full_name as string) ?? user.email ?? "Admin",
      userId: user.id,
      partnerId: null as string | null,
    };
  }

  const { data: partnerId } = await admin.rpc("get_partner_id", { _user_id: user.id });
  if (partnerId) {
    const { data: partner } = await admin
      .from("partners")
      .select("name")
      .eq("id", partnerId as string)
      .maybeSingle();
    return {
      role: "partner" as const,
      name: partner?.name ?? "Partner",
      userId: user.id,
      partnerId: partnerId as string,
    };
  }

  return null;
}

async function canReadTarget(
  admin: ReturnType<typeof createClient>,
  actor: NonNullable<Awaited<ReturnType<typeof resolveActor>>>,
  programRequestId: string | null,
  accommodationRequestId: string | null,
) {
  if (actor.role === "admin" || actor.role === "customer") return true;
  if (actor.role === "partner" && actor.partnerId) {
    if (programRequestId) {
      const { data } = await admin.rpc("partner_can_view_program_request", {
        _user_id: actor.userId,
        _request_id: programRequestId,
      });
      if (data) return true;
    }
    if (accommodationRequestId) {
      const { data } = await admin.rpc("partner_can_view_accommodation_request", {
        _user_id: actor.userId,
        _request_id: accommodationRequestId,
      });
      if (data) return true;
    }
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const action = body.action;
    if (!action) return json(400, { error: "missing_action" });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const actor = await resolveActor(req, body);
    if (!actor) return json(401, { error: "unauthorized" });

    // -------- LIST --------
    if (action === "list") {
      const canRead = await canReadTarget(admin, actor, body.program_request_id ?? null, body.accommodation_request_id ?? null);
      if (!canRead) return json(403, { error: "forbidden" });

      let q = admin
        .from("project_documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (body.program_request_id) q = q.eq("program_request_id", body.program_request_id);
      else if (body.accommodation_request_id) q = q.eq("accommodation_request_id", body.accommodation_request_id);
      else return json(400, { error: "missing_target" });

      const { data, error } = await q;
      if (error) return json(500, { error: error.message });

      // Filter by visibility for non-admin
      const filtered = (data ?? []).filter((d: any) => {
        if (actor.role === "admin") return true;
        if (actor.role === "customer") return d.is_visible_to_customer !== false;
        if (actor.role === "partner") return d.is_visible_to_partners !== false;
        return false;
      });
      return json(200, { documents: filtered });
    }

    // -------- SIGN UPLOAD --------
    if (action === "sign-upload") {
      const canRead = await canReadTarget(admin, actor, body.program_request_id ?? null, body.accommodation_request_id ?? null);
      if (!canRead) return json(403, { error: "forbidden" });

      const fileName = (body.file_name ?? "").trim();
      const mime = (body.mime_type ?? "").trim();
      const size = Number(body.file_size ?? 0);
      if (!fileName) return json(400, { error: "missing_file_name" });
      if (!mime || !ALLOWED_MIME.has(mime)) return json(400, { error: "unsupported_mime" });
      if (!size || size <= 0 || size > MAX_SIZE) return json(400, { error: "invalid_size" });

      const scope: "project" | "accommodation" = body.program_request_id ? "project" : "accommodation";
      const parentId = body.program_request_id ?? body.accommodation_request_id!;
      const rowId = crypto.randomUUID();
      const safeName = fileName.replace(/[^\w.\-]+/g, "_").slice(0, 120);
      const path = `${scope === "project" ? "program" : "accommodation"}/${parentId}/${rowId}-${safeName}`;

      const { data: signed, error: signErr } = await admin.storage
        .from("project-documents")
        .createSignedUploadUrl(path);
      if (signErr || !signed) return json(500, { error: signErr?.message ?? "sign_failed" });

      const isVisibleToPartners = actor.role === "admin" || actor.role === "customer"
        ? true
        : true; // partner-uploads default visible; admin can toggle later
      const isVisibleToCustomer = actor.role !== "partner"; // partner uploads private to customer by default

      const { error: insErr } = await admin.from("project_documents").insert({
        id: rowId,
        program_request_id: body.program_request_id ?? null,
        accommodation_request_id: body.accommodation_request_id ?? null,
        scope,
        file_path: path,
        file_name: fileName,
        file_size: size,
        mime_type: mime,
        label: body.label ?? null,
        description: body.description ?? null,
        uploaded_by: actor.role,
        uploaded_by_user_id: actor.userId,
        uploaded_by_partner_id: actor.partnerId,
        uploaded_by_name: actor.name,
        is_visible_to_partners: isVisibleToPartners,
        is_visible_to_customer: isVisibleToCustomer,
      });
      if (insErr) {
        return json(500, { error: insErr.message });
      }

      return json(200, {
        document_id: rowId,
        upload_url: signed.signedUrl,
        token: signed.token,
        path,
      });
    }

    // -------- SIGN DOWNLOAD --------
    if (action === "sign-download") {
      if (!body.document_id) return json(400, { error: "missing_document_id" });
      const { data: doc, error: docErr } = await admin
        .from("project_documents")
        .select("*")
        .eq("id", body.document_id)
        .maybeSingle();
      if (docErr) return json(500, { error: docErr.message });
      if (!doc) return json(404, { error: "not_found" });

      const canRead = await canReadTarget(admin, actor, doc.program_request_id, doc.accommodation_request_id);
      if (!canRead) return json(403, { error: "forbidden" });
      if (actor.role === "partner" && !doc.is_visible_to_partners) return json(403, { error: "forbidden" });
      if (actor.role === "customer" && !doc.is_visible_to_customer) return json(403, { error: "forbidden" });

      const { data: signed, error: signErr } = await admin.storage
        .from("project-documents")
        .createSignedUrl(doc.file_path, 900);
      if (signErr || !signed) return json(500, { error: signErr?.message ?? "sign_failed" });

      return json(200, { url: signed.signedUrl, file_name: doc.file_name });
    }

    // -------- DELETE --------
    if (action === "delete") {
      if (!body.document_id) return json(400, { error: "missing_document_id" });
      const { data: doc } = await admin
        .from("project_documents")
        .select("*")
        .eq("id", body.document_id)
        .maybeSingle();
      if (!doc) return json(404, { error: "not_found" });

      const isOwner =
        (actor.role === "admin") ||
        (actor.role === "customer" && doc.uploaded_by === "customer") ||
        (actor.role === "partner" && doc.uploaded_by === "partner" && doc.uploaded_by_partner_id === actor.partnerId);
      if (!isOwner) return json(403, { error: "forbidden" });

      await admin.storage.from("project-documents").remove([doc.file_path]);
      const { error: delErr } = await admin.from("project_documents").delete().eq("id", doc.id);
      if (delErr) return json(500, { error: delErr.message });
      return json(200, { ok: true });
    }

    if (action === "confirm") {
      // No-op: rows are created at sign-upload time.
      return json(200, { ok: true });
    }

    return json(400, { error: "unknown_action" });
  } catch (err) {
    console.error("project-documents error:", err);
    return json(500, { error: (err as Error).message ?? "internal_error" });
  }
});
