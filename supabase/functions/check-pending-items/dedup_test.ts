// Unit-tests voor de dedup- en bureau-skip-logica van check-pending-items.
//
// We testen niet de hele Deno.serve handler (die is gekoppeld aan een echte
// Supabase client) maar isoleren de twee contracten die voor de nieuwe
// T-7/T-3/T+1/T+7 mails kritisch zijn:
//
//   1. sendReminderEmail() mag PER (email_type, recipient_email, related_item_id)
//      standaard één mail versturen (vaste reeksen zoals T+3/T+7/T+14), en bij
//      een herhaalbeleid hooguit `maxSends` keer met `repeatDays` ertussen.
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
import { decideReminder, type ReminderPolicy } from "../_shared/reminderPolicy.ts";
import { isBureauItem } from "../_shared/bureau-item.ts";

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
      order: (col: string, o?: { ascending?: boolean }) => {
        filters.push(["order", col, o?.ascending ?? true]);
        return builder;
      },
      limit: (n: number) => {
        filters.push(["limit", "", n]);
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
        if (table === "email_log") {
          // Zelfde filters als de echte dedupe: eq's, nieuwste eerst, limit.
          let rows = opts.emailLogRows.filter((r) =>
            filters.filter((f) => f[0] === "eq").every(([, col, val]) => r[col] === val)
          );
          const order = filters.find((f) => f[0] === "order");
          if (order) {
            const [, col, asc] = order;
            rows = rows.slice().sort((a, b) =>
              (String(a[col] ?? "") < String(b[col] ?? "") ? -1 : 1) * (asc ? 1 : -1)
            );
          }
          const limit = filters.find((f) => f[0] === "limit");
          if (limit) rows = rows.slice(0, Number(limit[2]));
          return Promise.resolve({ data: rows, error: null }).then(resolve);
        }
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
// Spiegelt het dedup-contract uit check-pending-items/index.ts: zelfde filter
// (email_type + recipient_email + related_item_id), nieuwste `maxSends` rijen
// ophalen met .limit() (niet .maybeSingle(), die faalde bij twee rijen) en de
// beslissing aan _shared/reminderPolicy.ts laten.
async function sendReminderEmailStub(
  supabase: ReturnType<typeof makeMockSupabase>,
  opts: {
    email_type: string;
    recipient_email: string;
    related_item_id?: string;
    policy?: ReminderPolicy;
  },
  now: Date = new Date(),
): Promise<"sent" | "skipped"> {
  const maxSends = Math.max(1, opts.policy?.maxSends ?? 1);
  const q = (supabase.from("email_log") as any)
    .select("created_at")
    .eq("email_type", opts.email_type)
    .eq("recipient_email", opts.recipient_email)
    .order("created_at", { ascending: false })
    .limit(maxSends);
  if (opts.related_item_id) q.eq("related_item_id", opts.related_item_id);
  const { data: prior } = await q;
  const decision = decideReminder(
    ((prior ?? []) as Row[]).map((r) => String(r.created_at ?? "")),
    opts.policy,
    now,
  );
  if (!decision.send) return "skipped";

  // Simuleer de echte INSERT in email_log na verzending.
  await (supabase.from("email_log") as any).insert({
    email_type: opts.email_type,
    recipient_email: opts.recipient_email,
    related_item_id: opts.related_item_id ?? null,
    status: "sent",
    created_at: now.toISOString(),
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
      created_at: "2026-06-01T08:00:00Z",
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
      created_at: "2026-06-01T08:00:00Z",
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
      created_at: "2026-06-01T08:00:00Z",
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
      created_at: "2026-06-01T08:00:00Z",
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

Deno.test("bureau-skip: T+3/T+7/T+14 partner-invoice flow gebruikt isBureauItem()", () => {
  // Spiegelt het guard-pattern uit de executedItems-loop in index.ts. Een
  // bureau-onderdeel met block_type 'activity' (provider 'bureau') stuurde
  // voorheen factuurherinneringen aan hallo@ zelf.
  const items = [
    { id: "exec-1", block_type: "partner", provider_id: "p1" },
    { id: "exec-2", block_type: "bureau", block_category: "vervoer", provider_id: "rederij" },
    { id: "exec-3", block_type: "activity", provider_id: "bureau" },
  ];

  const eligibleForPartnerReminder = items.filter((i) => !isBureauItem(i));
  assertEquals(eligibleForPartnerReminder.map((i) => i.id), ["exec-1"]);
});

Deno.test("dedup: een vaste reeks herhaalt niet, ook niet na zeven dagen (geen lus meer)", async () => {
  const emailLogRows: Row[] = [
    { id: "log-1", email_type: "partner_invoice_reminder_t1", recipient_email: "partner@example.com", related_item_id: "item-A", created_at: "2026-09-08T08:00:00Z" },
  ];
  const recorder: QueryRecord[] = [];
  const supabase = makeMockSupabase({ emailLogRows, itemRows: [], recorder });
  const result = await sendReminderEmailStub(supabase, {
    email_type: "partner_invoice_reminder_t1",
    recipient_email: "partner@example.com",
    related_item_id: "item-A",
  }, new Date("2026-11-20T08:00:00Z"));
  assertEquals(result, "skipped", "T+3 mag na weken niet opnieuw");
});

Deno.test("dedup: meerdere bestaande rijen (oude lus) blokkeren, in plaats van door te sturen", async () => {
  const emailLogRows: Row[] = Array.from({ length: 12 }, (_, i) => ({
    id: `log-${i}`,
    email_type: "partner_invoice_reminder_t1",
    recipient_email: "hallo@bureauvlieland.nl",
    related_item_id: "item-T",
    created_at: `2026-11-${String(8 + i).padStart(2, "0")}T08:00:00Z`,
  }));
  const recorder: QueryRecord[] = [];
  const supabase = makeMockSupabase({ emailLogRows, itemRows: [], recorder });
  const result = await sendReminderEmailStub(supabase, {
    email_type: "partner_invoice_reminder_t1",
    recipient_email: "hallo@bureauvlieland.nl",
    related_item_id: "item-T",
  }, new Date("2026-11-21T08:00:00Z"));
  assertEquals(result, "skipped");
});

Deno.test("herhaalbeleid: activiteitsherinnering mag na 7 dagen opnieuw, tot drie keer", async () => {
  const policy: ReminderPolicy = { maxSends: 3, repeatDays: 7 };
  const base = {
    email_type: "reminder_activity_pending",
    recipient_email: "partner@example.com",
    related_item_id: "item-R",
  };
  const twoSends: Row[] = [
    { id: "a", ...base, created_at: "2026-11-01T08:00:00Z" },
    { id: "b", ...base, created_at: "2026-11-09T08:00:00Z" },
  ];
  const r1 = await sendReminderEmailStub(
    makeMockSupabase({ emailLogRows: twoSends, itemRows: [], recorder: [] }),
    { ...base, policy }, new Date("2026-11-12T08:00:00Z"));
  assertEquals(r1, "skipped", "drie dagen na de vorige: te recent");
  const r2 = await sendReminderEmailStub(
    makeMockSupabase({ emailLogRows: twoSends, itemRows: [], recorder: [] }),
    { ...base, policy }, new Date("2026-11-17T08:00:00Z"));
  assertEquals(r2, "sent", "acht dagen na de vorige: derde en laatste herinnering");
  const threeSends: Row[] = [...twoSends, { id: "c", ...base, created_at: "2026-11-17T08:00:00Z" }];
  const r3 = await sendReminderEmailStub(
    makeMockSupabase({ emailLogRows: threeSends, itemRows: [], recorder: [] }),
    { ...base, policy }, new Date("2026-12-01T08:00:00Z"));
  assertEquals(r3, "skipped", "plafond van drie bereikt");
});
