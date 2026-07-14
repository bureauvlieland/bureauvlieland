import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ACCOMMODATION_ATTACHMENT_BUCKET = "accommodation-quote-attachments";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1) Program request
    const { data: program, error: programError } = await supabase
      .from("program_requests")
      .select(`
        *,
        linked_accommodation_lite:accommodation_requests!program_requests_linked_accommodation_id_fkey(
          id,
          customer_token,
          reference_number,
          arrival_date,
          departure_date,
          number_of_guests,
          accommodation_type,
          status,
          created_at
        )
      `)
      .eq("customer_token", token)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (programError || !program) {
      return new Response(
        JSON.stringify({ error: "Program not found or expired" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fire-and-forget audit log entries
    supabase.from("program_request_history").insert({
      request_id: program.id,
      action: "customer_portal_viewed",
      actor: "customer",
      actor_name: program.customer_name,
      notes: "Klant heeft het portaal bezocht",
    }).then(() => {});
    if (program.quote_sent_at) {
      supabase.from("program_request_history").insert({
        request_id: program.id,
        action: "quote_opened",
        actor: "customer",
        actor_name: program.customer_name,
        notes: "Klant heeft de offerte bekeken",
      }).then(() => {});
    }

    // 2) Items
    const { data: items, error: itemsError } = await supabase
      .from("program_request_items")
      .select("*")
      .eq("request_id", program.id)
      .order("day_index", { ascending: true })
      .order("preferred_time", { ascending: true, nullsFirst: false });
    if (itemsError) throw itemsError;
    const itemList = items || [];
    const itemIds = itemList.map((i: any) => i.id);

    // 3) Enrich items with building_blocks data (image_url, image_asset, descriptions, external_url)
    const blockIds = Array.from(new Set(itemList.map((i: any) => i.block_id).filter(Boolean)));
    let blockMap: Record<string, any> = {};
    if (blockIds.length > 0) {
      const { data: blocks } = await supabase
        .from("building_blocks")
        .select("id, image_url, image_asset, short_description, description, external_url, vat_rate")
        .in("id", blockIds);
      blockMap = Object.fromEntries((blocks || []).map((b: any) => [b.id, b]));
    }
    const enrichedItems = itemList.map((item: any) => {
      const block = item.block_id ? blockMap[item.block_id] : null;
      return {
        ...item,
        image_url: block?.image_url || null,
        image_asset: block?.image_asset || null,
        block_short_description: block?.short_description || null,
        block_description: block?.description || null,
        external_url: block?.external_url || item.external_url || null,
      };
    });
    const blockVatRates: Record<string, number> = {};
    for (const [bid, b] of Object.entries(blockMap)) {
      blockVatRates[bid] = (b as any)?.vat_rate ?? 21;
    }

    // 4) Billing lines, grouped by item_id
    let billingLinesByItem: Record<string, any[]> = {};
    if (itemIds.length > 0) {
      const { data: linesData } = await supabase
        .from("program_item_billing_lines")
        .select("*")
        .in("item_id", itemIds)
        .order("sort_order", { ascending: true });
      for (const line of linesData || []) {
        const arr = billingLinesByItem[(line as any).item_id] || [];
        arr.push(line);
        billingLinesByItem[(line as any).item_id] = arr;
      }
    }

    // 4b) Maatwerk quote lines grouped by item_id
    let quoteLinesByItem: Record<string, any[]> = {};
    if (itemIds.length > 0) {
      const { data: qLines } = await supabase
        .from("program_request_item_quote_lines")
        .select("id, item_id, sort_order, description, quantity, unit, unit_price_incl_vat, vat_rate")
        .in("item_id", itemIds)
        .order("sort_order", { ascending: true });
      for (const line of qLines || []) {
        const arr = quoteLinesByItem[(line as any).item_id] || [];
        arr.push(line);
        quoteLinesByItem[(line as any).item_id] = arr;
      }
    }
    // Attach lines onto enriched items so the customer portal can render specificatie inline
    for (const it of enrichedItems as any[]) {
      it.quote_lines = quoteLinesByItem[it.id] || [];
    }

    // 5) History
    const { data: historyData } = await supabase
      .from("program_request_history")
      .select("*")
      .eq("request_id", program.id)
      .order("created_at", { ascending: false });

    // 6) Accepted terms log (if applicable)
    let acceptedTerms: any[] = [];
    if (program.terms_accepted_at) {
      const { data: termsData } = await supabase
        .from("accepted_terms_log")
        .select("*")
        .eq("request_id", program.id)
        .order("created_at", { ascending: true });
      acceptedTerms = termsData || [];
    }

    // 7) Quote PDF signed URL
    let quotePdfUrl: string | null = null;
    if (program.quote_pdf_path) {
      try {
        const { data: signedData } = await supabase.storage
          .from("quote-documents")
          .createSignedUrl(program.quote_pdf_path, SIGNED_URL_TTL_SECONDS);
        quotePdfUrl = signedData?.signedUrl ?? null;
      } catch (err) {
        console.error("Error generating signed URL for quote PDF:", err);
      }
    }

    // 8) Linked accommodation + quotes (with signed attachment URLs + extras + sanitized partner)
    let linkedAccommodation: any = null;
    let accommodationQuotes: any[] = [];
    let extrasByQuoteId: Record<string, any[]> = {};
    if (program.linked_accommodation_id) {
      const { data: accomData } = await supabase
        .from("accommodation_requests")
        .select("*")
        .eq("id", program.linked_accommodation_id)
        .maybeSingle();
      linkedAccommodation = accomData || null;

      if (accomData) {
        const { data: quotesData } = await supabase
          .from("accommodation_quotes")
          .select(`
            *,
            partner:partners(
              id, name, website_url,
              address_street, address_postal, address_city,
              location_lat, location_lng, location_description,
              gallery_images, about_text, highlight_features,
              terms_pdf_path, uses_default_terms
            )
          `)
          .eq("request_id", accomData.id)
          .in("status", ["submitted", "selected", "expired", "declined"])
          .order("price_per_person_per_night", { ascending: true });

        const quoteIds: string[] = (quotesData || []).map((q: any) => q.id);
        if (quoteIds.length > 0) {
          const { data: extrasData } = await supabase
            .from("accommodation_quote_extras")
            .select("*")
            .in("quote_id", quoteIds)
            .order("sort_order", { ascending: true });
          for (const ex of extrasData || []) {
            const arr = extrasByQuoteId[(ex as any).quote_id] || [];
            arr.push(ex);
            extrasByQuoteId[(ex as any).quote_id] = arr;
          }
        }

        accommodationQuotes = await Promise.all(
          (quotesData || []).map(async (q: any) => {
            let signedUrl: string | null = null;
            const path = q.quote_attachment_path;
            if (path) {
              if (/^https?:\/\//i.test(path)) {
                signedUrl = path;
              } else {
                const { data: signed, error: signErr } = await supabase
                  .storage
                  .from(ACCOMMODATION_ATTACHMENT_BUCKET)
                  .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
                if (signErr) {
                  console.error("sign url error", path, signErr);
                } else {
                  signedUrl = signed?.signedUrl ?? null;
                }
              }
            }
            return { ...q, quote_attachment_url: signedUrl };
          }),
        );
      }
    }

    return new Response(
      JSON.stringify({
        program: {
          ...program,
          items: enrichedItems,
          acceptedTerms,
          quote_pdf_url: quotePdfUrl,
        },
        rawItems: itemList,
        history: historyData || [],
        billingLinesByItem,
        quoteLinesByItem,
        blockVatRates,
        linkedAccommodation,
        accommodationQuotes,
        extrasByQuoteId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error fetching customer program:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
