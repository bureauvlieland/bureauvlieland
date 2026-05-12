// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
  VerticalAlign,
  PageBreak,
  ExternalHyperlink,
  ImageRun,
} from "npm:docx@9.5.1";

/**
 * Fetch a single OpenStreetMap raster tile centred on the given coordinates.
 * Returns a PNG as Uint8Array, or null on failure.
 *
 * We use the standard OSM tile server (tile.openstreetmap.org) which is
 * reachable from Supabase Edge runtime, unlike staticmap.openstreetmap.de
 * which is blocked at DNS level.
 *
 * A User-Agent identifying the application is required by OSM tile policy.
 */
async function fetchStaticMapPng(lat: number, lng: number): Promise<Uint8Array | null> {
  const zoom = 14;
  const n = 2 ** zoom;
  const xtile = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const ytile = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  const url = `https://tile.openstreetmap.org/${zoom}/${xtile}/${ytile}.png`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const resp = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "BureauVlieland-Programma/1.0 (hallo@bureauvlieland.nl)" },
    });
    clearTimeout(timer);
    if (!resp.ok) {
      console.warn(`[docx] tile fetch ${resp.status} for ${lat},${lng}`);
      return null;
    }
    return new Uint8Array(await resp.arrayBuffer());
  } catch (e) {
    console.warn(`[docx] tile fetch failed for ${lat},${lng}:`, (e as any)?.message ?? e);
    return null;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NAVY = "1F2D4D";
const TERRACOTTA = "C9602B";
const MUTED = "6B7280";
const LIGHT = "F3EFE9";

const monthNames = [
  "januari","februari","maart","april","mei","juni",
  "juli","augustus","september","oktober","november","december",
];
const dayNames = ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];

function fmtDate(d: Date) {
  return `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtDateShort(d: Date) {
  return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

function p(text: string, opts: any = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 60 },
    alignment: opts.alignment,
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        italics: opts.italics,
        color: opts.color,
        size: opts.size, // half-points
        font: opts.font || "Calibri",
      }),
    ],
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { request_id, customer_token } = await req.json();
    if (!request_id) {
      return new Response(JSON.stringify({ error: "request_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Authorize
    let authorized = false;
    if (customer_token) {
      const { data: pr } = await supabase
        .from("program_requests")
        .select("id, customer_token, expires_at")
        .eq("id", request_id)
        .maybeSingle();
      if (pr && pr.customer_token === customer_token && (!pr.expires_at || new Date(pr.expires_at) > new Date())) {
        authorized = true;
      }
    } else {
      const auth = req.headers.get("Authorization");
      if (auth) {
        const token = auth.replace("Bearer ", "");
        const userClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: `Bearer ${token}` } } },
        );
        const { data: u } = await userClient.auth.getUser();
        if (u?.user) {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", u.user.id);
          if (roles?.some((r: any) => r.role === "admin")) authorized = true;
        }
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch program + items
    const { data: program, error: pErr } = await supabase
      .from("program_requests")
      .select("*")
      .eq("id", request_id)
      .single();
    if (pErr || !program) throw new Error(pErr?.message || "Program not found");

    const { data: items } = await supabase
      .from("program_request_items")
      .select("*")
      .eq("request_id", request_id);

    // Fetch building blocks for descriptions/images
    const blockIds = Array.from(new Set((items ?? []).map((i: any) => i.block_id).filter(Boolean)));
    const blocksMap = new Map<string, any>();
    if (blockIds.length) {
      const { data: blocks } = await supabase
        .from("building_blocks")
        .select("id, description, short_description, image_url")
        .in("id", blockIds);
      (blocks ?? []).forEach((b: any) => blocksMap.set(b.id, b));
    }

    // Filter items: skip cancelled and extra-cost rows (day_index < 0).
    // NB: block_type "bureau" enkel uitsluiten als het ook day_index < 0 heeft
    // (centraal gefactureerde extra's). Reguliere bureau-items horen wél in het programma.
    const visible = (items ?? [])
      .filter((i: any) => i.status !== "cancelled")
      .filter((i: any) => (i.day_index ?? 0) >= 0)
      .sort((a: any, b: any) => {
        if (a.day_index !== b.day_index) return a.day_index - b.day_index;
        const at = a.confirmed_time || a.proposed_time || a.preferred_time || "zz";
        const bt = b.confirmed_time || b.proposed_time || b.preferred_time || "zz";
        return String(at).localeCompare(String(bt));
      });

    // Selected dates
    const selectedDates: Date[] = Array.isArray(program.selected_dates)
      ? program.selected_dates.map((d: string) => new Date(d))
      : [];

    // Group items per day
    const dayGroups = new Map<number, any[]>();
    visible.forEach((it: any) => {
      const k = it.day_index ?? 0;
      if (!dayGroups.has(k)) dayGroups.set(k, []);
      dayGroups.get(k)!.push(it);
    });

    // Prefetch static map images for all visible items with coordinates.
    // NB: numeric columns from Supabase can arrive as strings — coerce safely.
    const mapImages = new Map<string, Uint8Array>();
    const mapTargets = visible
      .map((it: any) => {
        const lat = it.location_lat == null ? NaN : Number(it.location_lat);
        const lng = it.location_lng == null ? NaN : Number(it.location_lng);
        return Number.isFinite(lat) && Number.isFinite(lng) ? { it, lat, lng } : null;
      })
      .filter(Boolean) as Array<{ it: any; lat: number; lng: number }>;
    console.log(`[docx] prefetching ${mapTargets.length} static maps`);
    const mapResults = await Promise.allSettled(
      mapTargets.map(({ lat, lng }) => fetchStaticMapPng(lat, lng)),
    );
    mapTargets.forEach(({ it }, i) => {
      const r = mapResults[i];
      if (r.status === "fulfilled" && r.value) mapImages.set(it.id, r.value);
    });
    console.log(`[docx] embedded ${mapImages.size} maps`);

    // Build cover page
    const customerLabel = program.customer_company || program.customer_name || "";
    const dateRange =
      selectedDates.length === 0
        ? "Datum nader te bepalen"
        : selectedDates.length === 1
          ? fmtDateShort(selectedDates[0])
          : `${fmtDateShort(selectedDates[0])} – ${fmtDateShort(selectedDates[selectedDates.length - 1])}`;

    const coverChildren: Paragraph[] = [
      new Paragraph({
        spacing: { before: 2400, after: 240 },
        children: [new TextRun({ text: "PROGRAMMA", color: TERRACOTTA, bold: true, size: 28, font: "Calibri" })],
      }),
      new Paragraph({
        spacing: { after: 240 },
        children: [new TextRun({ text: customerLabel, color: NAVY, bold: true, size: 56, font: "Georgia" })],
      }),
      p(dateRange, { color: NAVY, size: 28, font: "Georgia", after: 120 }),
      p(`${program.number_of_people ?? 0} personen`, { color: MUTED, size: 22, after: 240 }),
      ...(program.reference_number
        ? [p(`Referentie: ${program.reference_number}`, { color: MUTED, size: 18 })]
        : []),
      new Paragraph({
        spacing: { before: 4800 },
        children: [
          new TextRun({ text: "Samengesteld door Bureau Vlieland", color: NAVY, size: 20, font: "Calibri" }),
        ],
      }),
      new Paragraph({ children: [new PageBreak()] }),
    ];

    // Build day sections
    const bodyChildren: any[] = [];
    const sortedDayKeys = Array.from(dayGroups.keys()).sort((a, b) => a - b);
    for (let idx = 0; idx < sortedDayKeys.length; idx++) {
      const dayIndex = sortedDayKeys[idx];
      const dayItems = dayGroups.get(dayIndex)!;
      const dayDate = selectedDates[dayIndex];

      bodyChildren.push(
        new Paragraph({
          spacing: { before: idx === 0 ? 0 : 360, after: 80 },
          children: [
            new TextRun({
              text: dayDate ? `Dag ${dayIndex + 1} — ${fmtDate(dayDate)}` : `Dag ${dayIndex + 1}`,
              bold: true,
              size: 32,
              color: NAVY,
              font: "Georgia",
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 200 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: TERRACOTTA, space: 1 } },
        }),
      );

      for (const it of dayItems) {
        const block = it.block_id ? blocksMap.get(it.block_id) : null;
        const description: string =
          block?.description || block?.short_description || "";

        const time = it.confirmed_time || it.proposed_time || it.preferred_time;
        const timeStr = time && time !== "flexibel" ? time : "Flexibel";
        const metaBits: string[] = [`Tijd: ${timeStr}`];
        if (it.duration) metaBits.push(`Duur: ${it.duration}`);
        if (it.provider_name) metaBits.push(`Aanbieder: ${it.provider_name}`);

        // Right column children
        const rightChildren: Paragraph[] = [
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: it.block_name || "", bold: true, size: 26, color: NAVY, font: "Georgia" }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: metaBits.join("  •  "), color: MUTED, size: 18, font: "Calibri" }),
            ],
          }),
        ];

        if (it.location_address) {
          const url =
            it.location_lat && it.location_lng
              ? `https://www.google.com/maps/dir/?api=1&destination=${it.location_lat},${it.location_lng}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(it.location_address)}`;
          rightChildren.push(
            new Paragraph({
              spacing: { after: 100 },
              children: [
                new ExternalHyperlink({
                  link: url,
                  children: [
                    new TextRun({
                      text: `📍 ${it.location_address}`,
                      color: TERRACOTTA,
                      size: 18,
                      font: "Calibri",
                    }),
                  ],
                }),
              ],
            }),
          );

          // Static map image (if successfully prefetched)
          const mapPng = mapImages.get(it.id);
          if (mapPng) {
            rightChildren.push(
              new Paragraph({
                spacing: { after: 120 },
                children: [
                  new ImageRun({
                    type: "png",
                    data: mapPng,
                    transformation: { width: 280, height: 280 },
                    altText: {
                      title: "Locatie op de kaart",
                      description: it.location_address,
                      name: "map",
                    },
                  }),
                ],
              }),
            );
          }
        }

        if (description) {
          // Split description into paragraphs
          const paras = description.split(/\n\s*\n|\n/).filter(Boolean);
          paras.forEach((para) =>
            rightChildren.push(
              new Paragraph({
                spacing: { after: 80 },
                children: [new TextRun({ text: para, size: 20, color: "333333", font: "Calibri" })],
              }),
            ),
          );
        }

        if (it.customer_notes) {
          rightChildren.push(
            new Paragraph({
              spacing: { before: 80, after: 80 },
              children: [
                new TextRun({
                  text: `Opmerking: ${it.customer_notes}`,
                  italics: true,
                  size: 18,
                  color: MUTED,
                  font: "Calibri",
                }),
              ],
            }),
          );
        }

        // Single-column layout: skip the table wrapper entirely.
        // Push item paragraphs directly into the body for maximum Word compatibility.
        for (const childPara of rightChildren) {
          bodyChildren.push(childPara);
        }
        bodyChildren.push(new Paragraph({ spacing: { after: 200 } }));
      }
    }

    // Footer paragraph at the very end
    bodyChildren.push(
      new Paragraph({
        spacing: { before: 400 },
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 4 } },
        children: [
          new TextRun({
            text: `Samengesteld door Bureau Vlieland — ${fmtDateShort(new Date())}`,
            color: MUTED,
            size: 16,
            font: "Calibri",
          }),
        ],
      }),
    );

    const doc = new Document({
      styles: {
        default: { document: { run: { font: "Calibri", size: 22 } } },
      },
      sections: [
        {
          properties: {
            page: {
              size: { width: 11906, height: 16838 }, // A4
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          children: [...coverChildren, ...bodyChildren],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    return new Response(buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        // The Supabase functions client only returns Blob data for octet-stream/pdf.
        // The DOCX MIME type is otherwise parsed as text in the browser, corrupting the file.
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="programma-${program.reference_number || request_id}.docx"`,
      },
    });
  } catch (e) {
    console.error("generate-program-docx error", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
