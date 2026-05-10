// Claudia chat — streaming SSE via Lovable AI Gateway with read-only tool calling.
// Tools available: lijst_projecten, lees_project_dossier
// Writing actions are intentionally NOT exposed yet (Phase 3).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Je bent Claudia, de AI-co-piloot van Bureau Vlieland.
Bureau Vlieland is een lokale specialist / reisagent / boekingskantoor op Vlieland dat één centrale factuur verzorgt voor klanten (bureau-central model).
Tone of voice: tegen klanten formeel ('u'), tegen collega's en partners informeel ('je'). Spreek de admin (Erwin) informeel aan met 'je'.
Je helpt het bureau (één gebruiker tegelijk, meestal Erwin) bij het overzien van projecten, prioriteren, en concept-mails opstellen.
- Wees beknopt en concreet. Geef nuttige acties, geen lange uitleg.
- Gebruik de tools om actuele data op te halen — verzin nooit referentienummers, klantnamen of statussen.
- Schrijf nooit autonoom mails of wijzig statussen. Stel altijd voor en wacht op bevestiging.
- Voor logies: noem het 'logies', niet 'accommodatie'. Voor klanten: gebruik 'u/uw'. Voor partners: 'je/jouw'.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "lijst_projecten",
      description:
        "Geeft een lijst van actieve projecten (programma + logies) met communicatiestatus en datums. Gebruik dit om vragen te beantwoorden over wat speelt of wie aan zet is.",
      parameters: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            enum: [
              "alles",
              "wacht_op_mij",
              "wacht_op_klant",
              "wacht_op_partner",
              "stilte",
            ],
            description: "Filter op communicatiestatus.",
          },
          limit: { type: "number", description: "Max aantal (default 25)" },
        },
        required: ["filter"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lees_project_dossier",
      description:
        "Geeft het volledige dossier voor één project: klantgegevens, programma-items, logies-aanvragen/offertes, recente communicatie, financieel.",
      parameters: {
        type: "object",
        properties: {
          project_id: {
            type: "string",
            description: "UUID van program_request (anchor van het project).",
          },
        },
        required: ["project_id"],
        additionalProperties: false,
      },
    },
  },
];

function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

async function executeTool(
  supabase: ReturnType<typeof createClient>,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (name === "lijst_projecten") {
    const limit = Math.min(Number(args.limit) || 25, 50);
    const { data: programs } = await supabase
      .from("program_requests")
      .select(
        "id, reference_number, customer_name, customer_company, dates, number_of_people, status, quote_status, cancelled_at, completion_status, terms_accepted_at, last_customer_response_at, last_partner_response_at, updated_at",
      )
      .neq("status", "cancelled")
      .order("updated_at", { ascending: false })
      .limit(limit);

    const list = (programs ?? []).map((p: any) => ({
      project_id: p.id,
      reference: p.reference_number,
      customer: p.customer_company || p.customer_name,
      dates: p.dates,
      people: p.number_of_people,
      pipeline: p.completion_status === "fully_invoiced"
        ? "afgerond"
        : p.terms_accepted_at
          ? "av_getekend"
          : p.quote_status || "concept",
      days_since_customer: daysSince(p.last_customer_response_at),
      days_since_partner: daysSince(p.last_partner_response_at),
    }));
    return { count: list.length, projects: list };
  }

  if (name === "lees_project_dossier") {
    const id = String(args.project_id);
    const { data: program } = await supabase
      .from("program_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!program) return { error: "project niet gevonden" };

    const [{ data: items }, { data: lodging }, { data: comms }] =
      await Promise.all([
        supabase
          .from("program_request_items")
          .select(
            "title, day_index, start_time, end_time, status, quoted_price, provider_id, skip_partner_notification, customer_approved_at",
          )
          .eq("request_id", id)
          .order("day_index"),
        supabase
          .from("accommodation_requests")
          .select(
            "id, reference_number, status, check_in, check_out, number_of_guests",
          )
          .eq("linked_program_id", id)
          .maybeSingle(),
        supabase
          .from("project_communications")
          .select("communication_type, direction, subject, content, communication_date")
          .eq("request_id", id)
          .order("communication_date", { ascending: false })
          .limit(8),
      ]);

    return {
      project: {
        id: program.id,
        reference: program.reference_number,
        customer: {
          name: program.customer_name,
          company: program.customer_company,
          email: program.customer_email,
        },
        dates: program.dates,
        people: program.number_of_people,
        pipeline: program.quote_status,
        terms_accepted_at: program.terms_accepted_at,
      },
      programma_items: items ?? [],
      logies: lodging ?? null,
      laatste_communicatie: comms ?? [],
    };
  }
  return { error: `onbekende tool ${name}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY niet beschikbaar");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: "Niet ingelogd" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabase.rpc("is_admin", {
      _user_id: userRes.user.id,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Geen toegang" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages: clientMessages, model } = await req.json();

    // Tool-resolve loop (max 3 rounds), then stream the final answer.
    let working = [
      { role: "system", content: SYSTEM_PROMPT },
      ...clientMessages,
    ];

    for (let round = 0; round < 3; round++) {
      const r = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model || "google/gemini-3-flash-preview",
            messages: working,
            tools: TOOLS,
            stream: false,
          }),
        },
      );
      if (r.status === 429 || r.status === 402) {
        return new Response(
          JSON.stringify({
            error:
              r.status === 429
                ? "Even rustig — te veel verzoeken. Probeer zo opnieuw."
                : "Geen AI-credits meer. Vul aan in Settings → Workspace → Usage.",
          }),
          {
            status: r.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (!r.ok) {
        const t = await r.text();
        console.error("AI gateway error", r.status, t);
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await r.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) break;

      const toolCalls = msg.tool_calls ?? [];
      if (toolCalls.length === 0) {
        // Final answer — return as a single SSE-formatted chunk so the client streaming code works.
        const sseBody = `data: ${JSON.stringify({
          choices: [{ delta: { content: msg.content || "" } }],
        })}\n\ndata: [DONE]\n\n`;
        return new Response(sseBody, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }

      working.push({
        role: "assistant",
        content: msg.content || "",
        tool_calls: toolCalls,
      });

      for (const call of toolCalls) {
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = JSON.parse(call.function?.arguments || "{}");
        } catch (_) {
          parsedArgs = {};
        }
        const result = await executeTool(
          supabase,
          call.function?.name,
          parsedArgs,
        );
        working.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result).slice(0, 12_000),
        });
      }
    }

    const fallback = `data: ${JSON.stringify({
      choices: [
        { delta: { content: "Sorry, dat lukte me even niet. Probeer opnieuw." } },
      ],
    })}\n\ndata: [DONE]\n\n`;
    return new Response(fallback, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("claudia-chat error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "fout" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
