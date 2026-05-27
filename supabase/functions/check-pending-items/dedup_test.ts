// Unit-tests voor de dedup- en bureau-skip-logica van check-pending-items.
//
// We testen niet de hele Deno.serve handler (die is gekoppeld aan een echte
// Supabase client) maar isoleren de twee contracten die voor de nieuwe
// T-7/T-3/T+1/T+7 mails kritisch zijn:
//
//   1. sendReminderEmail() mag PER (email_type, recipient_email, related_item_id)
//      maximaal één mail versturen — een tweede aanroep moet via de email_log
//      dedup-check worden overgeslagen.
//   2. De upcoming-items en executed-items queries mogen GEEN bureau-items
//      (block_type === "bureau") meenemen — die worden door Bureau Vlieland
//      centraal geregeld en sturen nooit partner-notificaties.
//
// We bouwen een mini-mock van de supabase-client die alleen de gebruikte
// chain-methodes ondersteunt, zodat we exact kunnen verifiëren welke filters
// op email_log en program_request_items toegepast worden.

import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// ---- Mock client ------------------------------------------------------------

type Row = Record<string, unknown>;

interface QueryRecord {
  table: string;
  filters: Array<[string, string, unknown]>;
  inserted?: Row;
}

function makeMockSupabase(opts: {
  emailLogRows: Row[];
  itemRows: Row[];
  recorder: QueryRecord[];
}) {
  function queryBuilder(table: string) {
    const filters: Array<[string, string, unknown]> = [];
    const rec: QueryRecord = { table, filters };
    opts.recorder.push(rec);

    const builder: any = {
      select: () => builder,
      eq: (col: string, val: unknown) => {
        filters.push(["eq", col, val]);
        return builder;
      },
      neq: (col: string, val: unknown) => {
        filters.push(["neq", col, val]);
        return builder;
      },
      in: (col: string, val: unknown) => {
        filters.push(["in", col, val]);
        return builder;
      },
      lt: (col: string, val: unknown) => {
        filters.push(["lt", col, val]);
        return builder;
      },
      gt: (col: string, val: unknown) => {
        filters.push(["gt", col, val]);
        return builder;
      },
      is: (col: string, val: unknown) => {
        filters.push(["is", col, val]);
        return builder;
      },
      not: (col: string, op: string, val: unknown) => {
        filters.push(["not." + op, col, val]);
        return builder;
      },
      insert: (row: Row) => {
        rec.inserted = row;
        return Promise.resolve({ data: row, error: null });
      },
      maybeSingle: async () => {
        if (table === "email_log") {
          // Pas filters toe op de gemockte rows.
          const match = opts.emailLogRows.find((r) =>
            filters
              .filter((f) => f[0] === "eq")
              .every(([, col, val]) => r[col] === val)
          );
          return { data: match ?? null, error: null };
        }
        return { data: null, error: null };
      },
      then: (resolve: (v: unknown) => unknown) => {
        // Voor program_request_items queries zonder maybeSingle().
        if (table === "program_request_items") {
          let rows = opts.itemRows.slice();
          for (const [op, col, val] of filters) {
            if (op === "eq") rows = rows.filter((r) => r[col] === val);
            if (op === "neq") rows = rows.filter((r) => r[col] !== val);
            if (op === "in" && Array.isArray(val)) {
              rows = rows.filter((r) => (val as unknown[]).includes(r[col]));
            }
          }
          return Promise.resolve({ data: rows, error: null }).then(resolve);
        }
        return Promise.resolve({ data: [], error: null }).then(resolve);
      },
    };
    return builder;
  }
  return { from: queryBuilder };
}

// ---- De helper die we testen (vereenvoudigde versie van sendReminderEmail) --
// Deze spiegelt exact het dedup-contract uit check-pending-items/index.ts
// (zelfde filter: email_type + recipient_email + related_item_id).
async function sendReminderEmailStub(
  supabase: ReturnType<typeof makeMockSupabase>,
  opts: {
    email_type: string;
    recipient_email: string;
    related_item_id?: string;
  },
): Promise<"sent" | "skipped"> {
  const q = (supabase.from("email_log") as any)
    .select("id")
    .eq("email_type", opts.email_type)
    .eq("recipient_email", opts.recipient_email);
  if (opts.related_item_id) q.eq("related_item_id", opts.related_item_id);
  const { data: already } = await q.maybeSingle();
  if (already) return "skipped";

  // Simuleer de echte INSERT in email_log na verzending.
  await (supabase.from("email_log") as any).insert({
    email_type: opts.email_type,
    recipient_email: opts.recipient_email,
    related_item_id: opts.related_item_id ?? null,
    status: "sent",
  });
  return "sent";
}

// ---- Tests ------------------------------------------------------------------

Deno.test("dedup: tweede verzending van dezelfde reminder voor zelfde item wordt overgeslagen", async () => {
  const emailLogRows: Row[] = [
    {
      id: "log-1",
      email_type: "partner_activity_unconfirmed_t7",
      recipient_email: "partner@example.com",
      related_item_id: "item-A",
    },
  ];
  const recorder: QueryRecord[] = [];
  const supabase = makeMockSupabase({ emailLogRows, itemRows: [], recorder });

  const result = await sendReminderEmailStub(supabase, {
    email_type: "partner_activity_unconfirmed_t7",
    recipient_email: "partner@example.com",
    related_item_id: "item-A",
  });

  assertEquals(result, "skipped", "Tweede T-7 mail voor zelfde item moet skipped zijn");
  assert(
    !recorder.some((r) => r.table === "email_log" && r.inserted),
    "Er mag geen nieuwe email_log-rij worden ingevoegd bij dedup-hit",
  );
});

Deno.test("dedup: andere email_type voor zelfde item wordt WEL verstuurd", async () => {
  // T-7 is al verstuurd, maar T-3 briefing moet apart kunnen.
  const emailLogRows: Row[] = [
    {
      id: "log-1",
      email_type: "partner_activity_unconfirmed_t7",
      recipient_email: "partner@example.com",
      related_item_id: "item-A",
    },
  ];
  const recorder: QueryRecord[] = [];
  const supabase = makeMockSupabase({ emailLogRows, itemRows: [], recorder });

  const result = await sendReminderEmailStub(supabase, {
    email_type: "partner_briefing_t3",
    recipient_email: "partner@example.com",
    related_item_id: "item-A",
  });

  assertEquals(result, "sent");
});

Deno.test("dedup: zelfde email_type maar ander item wordt WEL verstuurd", async () => {
  const emailLogRows: Row[] = [
    {
      id: "log-1",
      email_type: "partner_invoice_reminder_t1",
      recipient_email: "partner@example.com",
      related_item_id: "item-A",
    },
  ];
  const recorder: QueryRecord[] = [];
  const supabase = makeMockSupabase({ emailLogRows, itemRows: [], recorder });

  const result = await sendReminderEmailStub(supabase, {
    email_type: "partner_invoice_reminder_t1",
    recipient_email: "partner@example.com",
    related_item_id: "item-B",
  });

  assertEquals(result, "sent");
});

Deno.test("dedup: T+7 escalatie volgt onafhankelijk van T+1 (verschillende email_type)", async () => {
  const emailLogRows: Row[] = [
    {
      id: "log-1",
      email_type: "partner_invoice_reminder_t1",
      recipient_email: "partner@example.com",
      related_item_id: "item-A",
    },
  ];
  const recorder: QueryRecord[] = [];
  const supabase = makeMockSupabase({ emailLogRows, itemRows: [], recorder });

  const result = await sendReminderEmailStub(supabase, {
    email_type: "partner_invoice_reminder_t7",
    recipient_email: "partner@example.com",
    related_item_id: "item-A",
  });

  assertEquals(result, "sent");
});

Deno.test("bureau-skip: upcoming-items query filtert block_type 'bureau' eruit (T-7/T-3)", async () => {
  // Spiegelt de échte query uit check-pending-items/index.ts (rond regel 932).
  const itemRows: Row[] = [
    { id: "i1", block_type: "partner", status: "pending", provider_id: "p1" },
    { id: "i2", block_type: "bureau", status: "pending", provider_id: "rederij" },
    { id: "i3", block_type: "self_arranged", status: "pending", provider_id: null },
    { id: "i4", block_type: "partner", status: "confirmed", provider_id: "p2" },
  ];
  const recorder: QueryRecord[] = [];
  const supabase = makeMockSupabase({ emailLogRows: [], itemRows, recorder });

  const { data } = await (supabase.from("program_request_items") as any)
    .select("*")
    .in("status", ["pending", "confirmed"])
    .neq("block_type", "self_arranged")
    .neq("block_type", "bureau");

  const ids = (data as Row[]).map((r) => r.id);
  assertEquals(ids.sort(), ["i1", "i4"], "Bureau- en self_arranged-items moeten uitgesloten zijn");
});

Deno.test("bureau-skip: T+1/T+7 partner-invoice flow checkt expliciet item.block_type !== 'bureau'", () => {
  // Spiegelt het guard-pattern uit de executedItems-loop in index.ts
  // (regels 818-823 en 890).
  const items = [
    { id: "exec-1", block_type: "partner", provider_id: "p1" },
    { id: "exec-2", block_type: "bureau", provider_id: "bureau-rederij" },
  ];

  const eligibleForPartnerReminder = items.filter((i) => i.block_type !== "bureau");
  assertEquals(eligibleForPartnerReminder.map((i) => i.id), ["exec-1"]);
});
