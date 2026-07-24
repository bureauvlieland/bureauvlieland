import { supabase } from "@/integrations/supabase/client";
import { getDerivedStatus, type DerivedStatus } from "@/lib/projectStatus";

export type RowKind = "programma" | "logies" | "combi" | "catering";

export interface OverviewRow {
  id: string;                      // navigation id (program_id when present, else accommodation_id)
  reference: string | null;
  kind: RowKind;
  origin: string | null;
  customerName: string;
  customerCompany: string | null;
  numberOfPeople: number;
  earliestDate: Date | null;       // arrival or first selected date
  endDate: Date | null;            // departure or last selected date
  durationDays: number;            // number of days incl
  derivedStatus: DerivedStatus;
  accommodationStatus: string | null;
  readinessDone: number;
  readinessTotal: number;
  programId: string | null;
  accommodationId: string | null;
  isNew?: boolean;
  /** Waar zodra minstens één item van dit programma auto_closed_reason='auto_past_execution' heeft. */
  autoClosed?: boolean;
  /** Waar zodra het project actief gesnoozed is (snoozed_until > now). */
  snoozed?: boolean;
  /** Ruwe snoozed_until (kan in het verleden liggen → verlopen). */
  snoozedUntil?: Date | null;
}

interface FetchOptions {
  /** when true, returns logies-rows (one per accommodation_request) instead of project-rows */
  logiesView?: boolean;
}

function toDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function isFresh(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  if (isNaN(t)) return false;
  return Date.now() - t < 24 * 60 * 60 * 1000;
}

function isSnoozed(snoozedUntil: string | null | undefined): boolean {
  if (!snoozedUntil) return false;
  const t = new Date(snoozedUntil).getTime();
  if (isNaN(t)) return false;
  return t > Date.now();
}


export async function fetchProjectsOverview({ logiesView = false }: FetchOptions = {}): Promise<OverviewRow[]> {
  const [
    { data: programs, error: progError },
    { data: accommodations, error: accError },
    { data: items },
    { data: accQuotes },
  ] = await Promise.all([
    supabase
      .from("program_requests")
      .select(`
        id, reference_number, customer_name, customer_company, number_of_people,
        selected_dates, status, terms_accepted_at, linked_accommodation_id,
        quote_status, completion_status, created_at, origin, snoozed_until
      `)
      .neq("status", "deleted"),
    supabase
      .from("accommodation_requests")
      .select(`
        id, reference_number, customer_name, customer_company, number_of_guests,
        arrival_date, departure_date, status, linked_program_id, created_at
      `),

    supabase
      .from("program_request_items")
      .select("request_id, status, skip_partner_notification, customer_approved_at, auto_closed_reason"),
    supabase
      .from("accommodation_quotes")
      .select("request_id, status"),
  ]);

  if (progError) throw progError;
  if (accError) throw accError;

  const accById = new Map<string, NonNullable<typeof accommodations>[number]>();
  accommodations?.forEach(a => accById.set(a.id, a));

  // item stats per program_request
  const stats = new Map<string, { total: number; confirmed: number; notSent: number; autoClosed: number }>();
  items?.forEach(it => {
    const s = stats.get(it.request_id) ?? { total: 0, confirmed: 0, notSent: 0, autoClosed: 0 };
    s.total++;
    if (it.status === "confirmed") s.confirmed++;
    if (it.skip_partner_notification && it.customer_approved_at) s.notSent++;
    if ((it as any).auto_closed_reason === "auto_past_execution") s.autoClosed++;
    stats.set(it.request_id, s);
  });

  // accommodation quotes per accommodation_request
  const quotesByAcc = new Map<string, { status: string }[]>();
  accQuotes?.forEach(q => {
    const arr = quotesByAcc.get(q.request_id) ?? [];
    arr.push({ status: q.status });
    quotesByAcc.set(q.request_id, arr);
  });

  const rows: OverviewRow[] = [];

  if (logiesView) {
    // one row per accommodation request
    accommodations?.forEach(acc => {
      const arrival = toDate(acc.arrival_date);
      const departure = toDate(acc.departure_date);
      const program = acc.linked_program_id
        ? programs?.find(p => p.id === acc.linked_program_id) ?? null
        : null;

      const derived = getDerivedStatus({
        program_status: program?.status ?? null,
        accommodation_status: acc.status,
        completion_status: program?.completion_status ?? null,
        terms_accepted_at: program?.terms_accepted_at ?? null,
        quote_status: program?.quote_status ?? null,
      });

      rows.push({
        id: program?.id ?? acc.id,
        reference: acc.reference_number,
        kind: program ? "combi" : "logies",
        origin: (program as any)?.origin ?? null,
        customerName: acc.customer_name,
        customerCompany: acc.customer_company,
        numberOfPeople: acc.number_of_guests,
        earliestDate: arrival,
        endDate: departure,
        durationDays: arrival && departure
          ? Math.max(1, Math.round((departure.getTime() - arrival.getTime()) / 86400000))
          : 1,
        derivedStatus: derived,
        accommodationStatus: acc.status,
        readinessDone: 0,
        readinessTotal: 0,
        programId: program?.id ?? null,
        accommodationId: acc.id,
        isNew: isFresh(acc.created_at) && !program,
        autoClosed: program ? ((stats.get(program.id)?.autoClosed ?? 0) > 0) : false,
        snoozed: isSnoozed((program as any)?.snoozed_until),
        snoozedUntil: toDate((program as any)?.snoozed_until ?? null),
      });

    });
    return rows.sort(sortByEarliest);
  }

  // project view: one row per program (with linked acc), plus logies-only
  const linkedAccIds = new Set(programs?.filter(p => p.linked_accommodation_id).map(p => p.linked_accommodation_id!));

  programs?.forEach(prog => {
    const linkedAcc = prog.linked_accommodation_id ? accById.get(prog.linked_accommodation_id) : null;
    const dates = Array.isArray(prog.selected_dates) ? (prog.selected_dates as unknown[]).map(String) : [];
    const firstSel = dates[0] ? toDate(dates[0]) : null;
    const lastSel = dates.length ? toDate(dates[dates.length - 1]) : null;
    const arrival = linkedAcc ? toDate(linkedAcc.arrival_date) : null;
    const departure = linkedAcc ? toDate(linkedAcc.departure_date) : null;

    const earliest = arrival && firstSel
      ? (arrival < firstSel ? arrival : firstSel)
      : (arrival ?? firstSel);
    const end = departure && lastSel
      ? (departure > lastSel ? departure : lastSel)
      : (departure ?? lastSel ?? earliest);

    const s = stats.get(prog.id);
    const accQuoteList = linkedAcc ? quotesByAcc.get(linkedAcc.id) ?? [] : [];

    const derived = getDerivedStatus({
      program_status: prog.status,
      accommodation_status: linkedAcc?.status ?? null,
      completion_status: prog.completion_status,
      terms_accepted_at: prog.terms_accepted_at,
      quote_status: prog.quote_status,
    });

    // readiness checks
    const checks: boolean[] = [];
    if (s && s.total > 0) {
      checks.push(s.notSent === 0);
      checks.push(s.confirmed === s.total);
    }
    if (linkedAcc) checks.push(accQuoteList.some(q => q.status === "selected"));
    checks.push(!!prog.terms_accepted_at);

    rows.push({
      id: prog.id,
      reference: prog.reference_number,
      kind: (prog as any).origin === "catering_only" ? "catering" : (linkedAcc ? "combi" : "programma"),
      origin: (prog as any).origin ?? null,
      customerName: prog.customer_name,
      customerCompany: prog.customer_company,
      numberOfPeople: prog.number_of_people,
      earliestDate: earliest,
      endDate: end,
      durationDays: earliest && end
        ? Math.max(1, Math.round((end.getTime() - earliest.getTime()) / 86400000) + 1)
        : Math.max(1, dates.length || 1),
      derivedStatus: derived,
      accommodationStatus: linkedAcc?.status ?? null,
      readinessDone: checks.filter(Boolean).length,
      readinessTotal: checks.length,
      programId: prog.id,
      accommodationId: linkedAcc?.id ?? null,
      isNew: isFresh(prog.created_at) && (!s || s.confirmed === 0) && !prog.terms_accepted_at,
      autoClosed: !!s && s.autoClosed > 0,
      snoozed: isSnoozed((prog as any).snoozed_until),
    });

  });

  // logies-only (without linked program)
  accommodations?.forEach(acc => {
    if (linkedAccIds.has(acc.id)) return;
    if (acc.linked_program_id) return;
    const arrival = toDate(acc.arrival_date);
    const departure = toDate(acc.departure_date);
    const derived = getDerivedStatus({
      program_status: null,
      accommodation_status: acc.status,
      completion_status: null,
      terms_accepted_at: null,
      quote_status: null,
    });
    const accQuoteList = quotesByAcc.get(acc.id) ?? [];
    const checks: boolean[] = [accQuoteList.some(q => q.status === "selected")];

    rows.push({
      id: acc.id,
      reference: acc.reference_number,
      kind: "logies",
      origin: null,
      customerName: acc.customer_name,
      customerCompany: acc.customer_company,
      numberOfPeople: acc.number_of_guests,
      earliestDate: arrival,
      endDate: departure,
      durationDays: arrival && departure
        ? Math.max(1, Math.round((departure.getTime() - arrival.getTime()) / 86400000))
        : 1,
      derivedStatus: derived,
      accommodationStatus: acc.status,
      readinessDone: checks.filter(Boolean).length,
      readinessTotal: checks.length,
      programId: null,
      accommodationId: acc.id,
      isNew: isFresh(acc.created_at),
    });

  });

  return rows.sort(sortByEarliest);
}

function sortByEarliest(a: OverviewRow, b: OverviewRow): number {
  // overdue (past) sorted ascending; future ascending; no_date last
  if (!a.earliestDate && !b.earliestDate) return 0;
  if (!a.earliestDate) return 1;
  if (!b.earliestDate) return -1;
  return a.earliestDate.getTime() - b.earliestDate.getTime();
}
