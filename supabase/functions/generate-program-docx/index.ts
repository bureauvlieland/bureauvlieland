// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
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
} from "npm:docx@8.5.0";

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

async function fetchImageBuffer(url: string): Promise<{ buffer: Uint8Array; type: "jpg" | "png" } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const ab = await res.arrayBuffer();
    let buffer = new Uint8Array(ab);
    let type: "jpg" | "png" = "jpg";
    if (ct.includes("png")) type = "png";
    else if (ct.includes("jpeg") || ct.includes("jpg")) type = "jpg";
    else if (ct.includes("webp") || ct.includes("gif") || ct.includes("svg")) {
      // not directly supported by docx ImageRun across all readers — skip
      return null;
    }
    return { buffer, type };
  } catch {
    return null;
  }
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

    // Filter items: skip cancelled, day_index < 0 (extra costs), and bureau-internal
    const visible = (items ?? [])
      .filter((i: any) => i.status !== "cancelled")
      .filter((i: any) => (i.day_index ?? 0) >= 0)
      .filter((i: any) => i.block_type !== "bureau")
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

    // Pre-fetch images
    const imageCache = new Map<string, { buffer: Uint8Array; type: "jpg" | "png" } | null>();
    await Promise.all(
      visible.map(async (it: any) => {
        const block = it.block_id ? blocksMap.get(it.block_id) : null;
        const url = block?.image_url;
        if (url && !imageCache.has(url)) {
          imageCache.set(url, await fetchImageBuffer(url));
        }
      }),
    );

    // Group items per day
    const dayGroups = new Map<number, any[]>();
    visible.forEach((it: any) => {
      const k = it.day_index ?? 0;
      if (!dayGroups.has(k)) dayGroups.set(k, []);
      dayGroups.get(k)!.push(it);
    });

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
          children: [new TextRun({ text: "" })],
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

        // Image cell
        const imgUrl = block?.image_url;
        const cached = imgUrl ? imageCache.get(imgUrl) : null;
        const leftChildren: Paragraph[] = [];
        if (cached) {
          try {
            leftChildren.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: cached.buffer,
                    transformation: { width: 200, height: 150 },
                  }),
                ],
              }),
            );
          } catch {
            leftChildren.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
          }
        } else {
          leftChildren.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
        }

        const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
        const cellBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

        const itemTable = new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2880, 6480],
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: cellBorders,
                  width: { size: 2880, type: WidthType.DXA },
                  margins: { top: 80, bottom: 80, left: 0, right: 160 },
                  verticalAlign: VerticalAlign.TOP,
                  children: leftChildren,
                }),
                new TableCell({
                  borders: cellBorders,
                  width: { size: 6480, type: WidthType.DXA },
                  margins: { top: 80, bottom: 80, left: 0, right: 0 },
                  verticalAlign: VerticalAlign.TOP,
                  children: rightChildren,
                }),
              ],
            }),
          ],
        });

        bodyChildren.push(itemTable);
        bodyChildren.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "" })] }));
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
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
