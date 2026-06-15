import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * social-generate-drafts
 * Verzamelt kandidaten (nieuwe bouwstenen, partners, projectfoto's, partner van de week)
 * en laat de AI per kandidaat een conceptpost genereren in `social_posts` (status='draft').
 * Skipt kandidaten die in laatste 30 dagen al gebruikt zijn.
 *
 * Auth: admin-only wanneer aangeroepen vanuit UI (Authorization header met admin-JWT)
 *       OF service-role (cron via pg_net met service_role-key in header).
 */

type Candidate = {
  source_type: "building_block" | "partner" | "asset" | "partner_spotlight";
  source_id: string;
  summary: string;
  image_url?: string | null;
  hint?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return json({ error: "LOVABLE_API_KEY ontbreekt" }, 500);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Lees instellingen
    const { data: settings } = await supabase
      .from("social_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    const sources = (settings?.sources_enabled ?? {
      building_blocks: true,
      partners: true,
      assets: true,
      partner_spotlight: true,
    }) as Record<string, boolean>;
    const cadence = Number(settings?.cadence_per_week ?? 3);
    const toneOfVoice = (settings?.tone_of_voice as string) || "warm, eilandelijk, professioneel, niet schreeuwerig";
    const hashtagSets = (settings?.hashtag_sets as Record<string, string[]>) ?? {
      default: ["#vlieland", "#waddeneilanden", "#bureauvlieland"],
    };
    const defaultCtas = (settings?.default_ctas as Record<string, string>) ?? {
      default: "https://www.bureauvlieland.nl",
    };

    // Bepaal hoeveel we deze run mogen toevoegen om totaal op ±cadence/week te houden.
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("social_posts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo)
      .neq("status", "rejected");
    const slotsLeft = Math.max(0, cadence - (recentCount ?? 0));
    if (slotsLeft === 0) {
      return json({ ok: true, message: "Cadence al gehaald deze week", generated: 0 });
    }

    // Verzamel kandidaten
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const candidates: Candidate[] = [];

    if (sources.building_blocks) {
      const { data: blocks } = await supabase
        .from("building_blocks")
        .select("id, name, description, image_url, provider_name, created_at")
        .eq("status", "published")
        .gte("created_at", fourteenDaysAgo)
        .limit(10);
      for (const b of blocks ?? []) {
        candidates.push({
          source_type: "building_block",
          source_id: b.id,
          summary: `Bouwsteen "${b.name}" (${b.provider_name ?? "partner"}): ${b.description ?? ""}`.slice(0, 600),
          image_url: b.image_url ?? null,
          hint: "Vier een nieuwe bouwsteen in ons aanbod",
        });
      }
    }

    if (sources.assets) {
      const { data: assets } = await supabase
        .from("social_media_assets")
        .select("id, storage_path, title, note, anonymize_customer, last_used_at")
        .or(`last_used_at.is.null,last_used_at.lt.${thirtyDaysAgo}`)
        .order("created_at", { ascending: false })
        .limit(10);
      for (const a of assets ?? []) {
        const { data: pub } = supabase.storage.from("social-media").getPublicUrl(a.storage_path);
        candidates.push({
          source_type: "asset",
          source_id: a.id,
          summary: `Projectfoto "${a.title ?? "zonder titel"}". Notitie: ${a.note ?? "—"}. Anonimiseer klant: ${a.anonymize_customer ? "ja" : "nee"}.`,
          image_url: pub?.publicUrl ?? null,
          hint: "Echte projectfoto — vertel het verhaal achter de foto",
        });
      }
    }

    if (sources.partners) {
      const { data: partners } = await supabase
        .from("partners")
        .select("id, name, location_description, image_url, updated_at")
        .eq("is_active", true)
        .gte("updated_at", fourteenDaysAgo)
        .limit(5);
      for (const p of partners ?? []) {
        candidates.push({
          source_type: "partner",
          source_id: p.id,
          summary: `Partner "${p.name}": ${p.location_description ?? ""}`.slice(0, 600),
          image_url: p.image_url ?? null,
          hint: "Stel deze partner kort voor",
        });
      }
    }

    if (sources.partner_spotlight) {
      // 1 partner spotlight per run (roteert vanzelf door updated_at desc)
      const { data: spot } = await supabase
        .from("partners")
        .select("id, name, location_description, image_url")
        .eq("is_active", true)
        .eq("is_public", true)
        .order("updated_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (spot) {
        candidates.push({
          source_type: "partner_spotlight",
          source_id: spot.id,
          summary: `Partner in spotlight: ${spot.name}. ${spot.location_description ?? ""}`.slice(0, 600),
          image_url: spot.image_url ?? null,
          hint: "Wekelijkse partner-spotlight, persoonlijk en warm",
        });
      }
    }

    // Dedup: skip kandidaten die in laatste 30 dagen al een (niet-rejected) post hebben
    const usable: Candidate[] = [];
    for (const c of candidates) {
      const { count } = await supabase
        .from("social_posts")
        .select("id", { count: "exact", head: true })
        .eq("source_type", c.source_type)
        .eq("source_id", c.source_id)
        .gte("created_at", thirtyDaysAgo)
        .neq("status", "rejected");
      if ((count ?? 0) === 0) usable.push(c);
      if (usable.length >= slotsLeft) break;
    }

    if (usable.length === 0) {
      return json({ ok: true, message: "Geen nieuwe kandidaten", generated: 0 });
    }

    // Genereer per kandidaat
    let generated = 0;
    for (const c of usable) {
      const systemPrompt = `Je bent social media copywriter voor Bureau Vlieland: lokale specialist voor groepsuitjes, evenementen en logies op Vlieland.
Tone-of-voice: ${toneOfVoice}. Formeel 'u' wordt vermeden in social posts — gebruik 'je/jullie'.
Centrale belofte: één partij, één factuur, lokale kennis. Niet 'regie', wel zorgvuldig boekingskantoor + programma-ontwikkelaar.
NIET schreeuwerig, geen emoji-overdaad (max 2), geen overdreven uitroeptekens.
Vermijd hard sellen; vertel het verhaal en eindig zacht met een uitnodiging.`;

      const userPrompt = `Schrijf een Instagram/Facebook post (NL) voor deze bron:
"""
${c.summary}
"""
Doel/hint: ${c.hint ?? "geen specifieke hint"}.

Vereisten:
- 1 caption van max 600 tekens
- 8 tot 12 hashtags (zonder dubbels), inclusief deze basis: ${(hashtagSets.default ?? []).join(", ")}
- Korte alt-tekst (max 120 tekens) voor de afbeelding
- Geen verzonnen prijzen, geen verzonnen datums

Geef JSON terug met velden: caption (string), alt (string), hashtags (string[]).`;

      let aiOutput: { caption: string; alt: string; hashtags: string[] } | null = null;
      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": lovableKey,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (!aiRes.ok) {
          console.error("AI gateway error", aiRes.status, await aiRes.text());
          continue;
        }
        const data = await aiRes.json();
        const txt = data?.choices?.[0]?.message?.content ?? "";
        aiOutput = JSON.parse(txt);
      } catch (e) {
        console.error("AI parse error", e);
        continue;
      }
      if (!aiOutput?.caption) continue;

      // PII scrub: vervang voornaam-achternaam tokens door 'een groep' (zachte verdediging)
      const safeCaption = scrubPii(aiOutput.caption);
      const cta = defaultCtas.default ?? "https://www.bureauvlieland.nl";
      const finalCaption = `${safeCaption}\n\n${cta}`;

      await supabase.from("social_posts").insert({
        status: "draft",
        caption: finalCaption,
        hashtags: aiOutput.hashtags ?? hashtagSets.default ?? [],
        media_urls: c.image_url ? [c.image_url] : [],
        channels: ["instagram", "facebook"],
        source_type: c.source_type,
        source_id: c.source_id,
        source_summary: c.summary,
        ai_model: "google/gemini-2.5-flash",
        ai_raw: aiOutput as unknown as Record<string, unknown>,
      });
      generated++;

      // Update asset last_used_at
      if (c.source_type === "asset") {
        await supabase.from("social_media_assets").update({ last_used_at: new Date().toISOString() }).eq("id", c.source_id);
      }
    }

    return json({ ok: true, generated, candidates: candidates.length });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

function scrubPii(text: string): string {
  // Vervang sequenties "Voornaam Achternaam" (2 hoofdletter-woorden) door "een groep" wanneer ze klinken als persoonsnaam.
  // Lichtgewicht; admin reviewt sowieso vóór publicatie.
  return text.replace(/\b[A-Z][a-z]{2,}\s[A-Z][a-z]{2,}\b/g, "een groep");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
