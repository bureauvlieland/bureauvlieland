// Claudia kennisbank-indexer.
// Embed één of meerdere bron-rijen (building_block / program_template / partner)
// en upsert in claudia_documents. Mode "all" doet een volledige backfill.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMBED_MODEL = "google/gemini-embedding-001";
const EMBED_DIMS = 1536;
const BATCH_SIZE = 16; // embeddings per request
const MAX_CONTENT = 6000;

type SourceType = "building_block" | "program_template" | "partner";

interface ReindexInput {
  mode?: "single" | "all";
  source_type?: SourceType;
  source_id?: string;
  source_types?: SourceType[]; // for "all" mode, optional restrict
}

function trim(s: string | null | undefined, max = MAX_CONTENT): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

async function embedBatch(texts: string[], apiKey: string): Promise<number[][]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: texts,
      dimensions: EMBED_DIMS,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Embedding API error ${res.status}: ${body.slice(0, 500)}`);
  }
  const json = await res.json();
  return (json.data as Array<{ embedding: number[] }>).map((d) => d.embedding);
}

function buildContent(
  type: SourceType,
  row: Record<string, unknown>,
): { content: string; metadata: Record<string, unknown> } {
  if (type === "building_block") {
    const parts = [
      `Bouwsteen: ${row.name}`,
      row.category && `Categorie: ${row.category}`,
      row.short_description && `Kort: ${row.short_description}`,
      row.description && `Omschrijving: ${row.description}`,
      row.duration && `Duur: ${row.duration}`,
      (row.min_people || row.max_people) &&
        `Groepsgrootte: ${row.min_people ?? "?"}-${row.max_people ?? "?"} pers.`,
      row.price_adult != null && `Prijs vanaf: € ${row.price_adult}`,
      row.tags && Array.isArray(row.tags) && (row.tags as unknown[]).length > 0 &&
        `Tags: ${(row.tags as string[]).join(", ")}`,
      row.seasonal_notes && `Seizoen: ${row.seasonal_notes}`,
      row.location_address && `Locatie: ${row.location_address}`,
    ].filter(Boolean);
    return {
      content: trim(parts.join("\n")),
      metadata: {
        name: row.name,
        category: row.category,
        block_type: row.block_type,
        provider_id: row.provider_id,
        status: row.status,
      },
    };
  }
  if (type === "program_template") {
    const parts = [
      `Programma-template: ${row.name}`,
      row.tagline && `Tagline: ${row.tagline}`,
      row.description && `Omschrijving: ${row.description}`,
      row.target_audience && `Doelgroep: ${row.target_audience}`,
      row.recommended_min_people &&
        `Aanbevolen groepsgrootte: ${row.recommended_min_people}-${row.recommended_max_people ?? "?"} pers.`,
      row.duration_days && `Duur: ${row.duration_days} dag(en)`,
      row.tags && Array.isArray(row.tags) && (row.tags as unknown[]).length > 0 &&
        `Tags: ${(row.tags as string[]).join(", ")}`,
    ].filter(Boolean);
    return {
      content: trim(parts.join("\n")),
      metadata: {
        name: row.name,
        slug: row.slug,
        is_published: row.is_published,
      },
    };
  }
  if (type === "partner") {
    // Strip PII: geen e-mail, telefoon, IBAN, adres-detail
    const parts = [
      `Partner: ${row.name}`,
      row.partner_type && `Type: ${row.partner_type}`,
      row.address_city && `Plaats: ${row.address_city}`,
      row.location_description && `Locatie: ${row.location_description}`,
      row.about_text && `Over: ${row.about_text}`,
      row.accommodation_description && `Accommodatie: ${row.accommodation_description}`,
      row.accommodation_types && Array.isArray(row.accommodation_types) &&
        (row.accommodation_types as unknown[]).length > 0 &&
        `Accommodatietypes: ${(row.accommodation_types as string[]).join(", ")}`,
      row.highlight_features && Array.isArray(row.highlight_features) &&
        (row.highlight_features as unknown[]).length > 0 &&
        `Kenmerken: ${(row.highlight_features as string[]).join(", ")}`,
      row.availability_notes && `Beschikbaarheid: ${row.availability_notes}`,
      row.commission_percentage != null && `Commissie: ${row.commission_percentage}%`,
    ].filter(Boolean);
    return {
      content: trim(parts.join("\n")),
      metadata: {
        name: row.name,
        partner_type: row.partner_type,
        is_active: row.is_active,
        reference_number: row.reference_number,
      },
    };
  }
  return { content: "", metadata: {} };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let runId: string | null = null;

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const input: ReindexInput = req.method === "POST"
      ? await req.json().catch(() => ({}))
      : {};
    const mode = input.mode ?? "single";

    const { data: runRow } = await supabase
      .from("claudia_run_log")
      .insert({
        run_type: "reindex",
        status: "running",
        model: EMBED_MODEL,
        input_summary: input,
      })
      .select("id")
      .single();
    runId = runRow?.id ?? null;

    type Item = { source_type: SourceType; source_id: string; row: Record<string, unknown> };
    const items: Item[] = [];

    if (mode === "single") {
      if (!input.source_type || !input.source_id) {
        throw new Error("source_type and source_id required for single mode");
      }
      const tableMap: Record<SourceType, string> = {
        building_block: "building_blocks",
        program_template: "program_templates",
        partner: "partners",
      };
      const table = tableMap[input.source_type];
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", input.source_id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        items.push({ source_type: input.source_type, source_id: String(data.id), row: data });
      }
    } else {
      const types = input.source_types ?? ["building_block", "program_template", "partner"];

      if (types.includes("building_block")) {
        const { data } = await supabase
          .from("building_blocks")
          .select("*")
          .eq("status", "published");
        (data ?? []).forEach((row) =>
          items.push({ source_type: "building_block", source_id: String(row.id), row })
        );
      }
      if (types.includes("program_template")) {
        // Tabel kan niet bestaan in alle envs — defensief
        const { data, error } = await supabase
          .from("program_templates")
          .select("*");
        if (!error) {
          (data ?? []).forEach((row) =>
            items.push({ source_type: "program_template", source_id: String(row.id), row })
          );
        }
      }
      if (types.includes("partner")) {
        const { data } = await supabase
          .from("partners")
          .select("*")
          .eq("is_active", true);
        (data ?? []).forEach((row) =>
          items.push({ source_type: "partner", source_id: String(row.id), row })
        );
      }
    }

    // Build content + metadata, skip empties
    const prepared = items
      .map((it) => ({
        ...it,
        ...buildContent(it.source_type, it.row),
      }))
      .filter((it) => it.content && it.content.trim().length > 20);

    let indexed = 0;

    for (let i = 0; i < prepared.length; i += BATCH_SIZE) {
      const batch = prepared.slice(i, i + BATCH_SIZE);
      const embeddings = await embedBatch(batch.map((b) => b.content), apiKey);

      const upserts = batch.map((b, idx) => ({
        source_type: b.source_type,
        source_id: b.source_id,
        content: b.content,
        embedding: embeddings[idx] as unknown as string,
        metadata: b.metadata,
        model_version: EMBED_MODEL,
        updated_at: new Date().toISOString(),
      }));

      const { error: upErr } = await supabase
        .from("claudia_documents")
        .upsert(upserts, { onConflict: "source_type,source_id" });
      if (upErr) throw upErr;

      indexed += batch.length;
    }

    if (runId) {
      await supabase
        .from("claudia_run_log")
        .update({
          status: "success",
          documents_indexed: indexed,
          duration_ms: Date.now() - startedAt,
          completed_at: new Date().toISOString(),
          output_summary: { indexed, mode },
        })
        .eq("id", runId);
    }

    return new Response(
      JSON.stringify({ success: true, indexed, mode }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("claudia-reindex error:", msg);
    if (runId) {
      await supabase
        .from("claudia_run_log")
        .update({
          status: "error",
          error_message: msg,
          duration_ms: Date.now() - startedAt,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
