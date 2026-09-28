import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Link2, Loader2, Mail, Search, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  asFeeSchedule,
  referralEmailFor,
  useDeleteWeddingReferral,
  useSaveWeddingReferral,
  useUpdateWeddingReferral,
  type FeeScheduleRow,
  type ReferralPartner,
  type WeddingReferralInsert,
  type WeddingReferralRow,
} from "@/hooks/useWeddingReferrals";
import {
  INVOICE_STATUSES,
  INVOICE_STATUS_LABEL,
  REFERRAL_STATUSES,
  REFERRAL_STATUS_LABEL,
  anonymizePatch,
  applyStatusChange,
  computeReferralFee,
  expiryDateFor,
  formatEuro,
  isClosed,
  isDueForAnonymization,
  toIsoDate,
  validateFeeOverride,
  type InvoiceStatus,
  type ReferralStatus,
} from "@/lib/weddingReferrals";
import { describeTier, normalizeTiers } from "@/lib/weddingReferralFee";
import { EmailLogDetailDialog } from "@/components/admin/EmailLogDetailDialog";
import type { ProjectCommunication } from "@/types/projectCommunication";

/**
 * Aanmaken en bewerken van een doorverwijzing
 * (docs/plan-bruiloftsdoorverwijzingen.md, fase 1). Bij "geboekt" verschijnt
 * direct de vergoeding uit de staffel die gold op de datum doorverwezen;
 * overschrijven kan met een opmerking. Alleen partners met de instelling
 * "ontvangt bruiloftsdoorverwijzingen" zijn te kiezen.
 */
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referral: WeddingReferralRow | null;
  partners: ReferralPartner[];
  schedules: FeeScheduleRow[];
}

interface FormState {
  couple_names: string;
  couple_email: string;
  couple_phone: string;
  partner_id: string;
  request_id: string | null;
  request_label: string;
  sales_inbox_id: string | null;
  sales_inbox_label: string;
  requested_at: string;
  referred_at: string;
  expected_precision: "day" | "month";
  expected_day: string;
  expected_month: string;
  estimated_guests: string;
  notes: string;
  status: ReferralStatus;
  final_wedding_date: string;
  final_day_guests: string;
  is_multi_day: boolean;
  fee_amount: string;
  fee_override_note: string;
  invoice_status: InvoiceStatus;
  invoice_number: string;
  invoice_date: string;
  invoice_paid_at: string;
}

type LinkResult =
  | { kind: "project"; id: string; label: string; name: string; email: string; phone: string; requestedAt: string; guests: number | null }
  | { kind: "inbox"; id: string; label: string; name: string; email: string; phone: string; requestedAt: string; guests: number | null };

const leeg = (today: string): FormState => ({
  couple_names: "",
  couple_email: "",
  couple_phone: "",
  partner_id: "",
  request_id: null,
  request_label: "",
  sales_inbox_id: null,
  sales_inbox_label: "",
  requested_at: today,
  referred_at: today,
  expected_precision: "day",
  expected_day: "",
  expected_month: "",
  estimated_guests: "",
  notes: "",
  status: "referred",
  final_wedding_date: "",
  final_day_guests: "",
  is_multi_day: false,
  fee_amount: "",
  fee_override_note: "",
  invoice_status: "not_applicable",
  invoice_number: "",
  invoice_date: "",
  invoice_paid_at: "",
});

const vanRij = (r: WeddingReferralRow): FormState => ({
  couple_names: r.couple_names,
  couple_email: r.couple_email ?? "",
  couple_phone: r.couple_phone ?? "",
  partner_id: r.partner_id,
  request_id: r.request_id,
  request_label: r.request_id ? "Gekoppeld project" : "",
  sales_inbox_id: r.sales_inbox_id,
  sales_inbox_label: r.sales_inbox_id ? "Gekoppelde sales-inboxmail" : "",
  requested_at: r.requested_at,
  referred_at: r.referred_at,
  expected_precision: r.expected_wedding_precision === "month" ? "month" : "day",
  expected_day: r.expected_wedding_precision === "day" ? (r.expected_wedding_date ?? "") : "",
  expected_month: r.expected_wedding_precision === "month" && r.expected_wedding_date ? r.expected_wedding_date.slice(0, 7) : "",
  estimated_guests: r.estimated_guests === null ? "" : String(r.estimated_guests),
  notes: r.notes,
  status: r.status as ReferralStatus,
  final_wedding_date: r.final_wedding_date ?? "",
  final_day_guests: r.final_day_guests === null ? "" : String(r.final_day_guests),
  is_multi_day: r.is_multi_day,
  fee_amount: r.fee_amount === null ? "" : String(r.fee_amount),
  fee_override_note: r.fee_override_note,
  invoice_status: r.invoice_status as InvoiceStatus,
  invoice_number: r.invoice_number ?? "",
  invoice_date: r.invoice_date ?? "",
  invoice_paid_at: r.invoice_paid_at ?? "",
});

const getal = (s: string): number | null => {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const datumLabel = (iso: string | null) => (iso ? format(parseISO(iso), "d MMM yyyy", { locale: nl }) : "–");

export function WeddingReferralSheet({ open, onOpenChange, referral, partners, schedules }: Props) {
  const today = toIsoDate(new Date());
  const [form, setForm] = useState<FormState>(() => leeg(today));
  const [feeTouched, setFeeTouched] = useState(false);
  const [zoekterm, setZoekterm] = useState("");
  const [zoekActief, setZoekActief] = useState("");
  const [bevestigVerwijderen, setBevestigVerwijderen] = useState(false);
  const [bevestigAnonimiseren, setBevestigAnonimiseren] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);

  // Fase 2: de verzonden doorverwijsmail, terug te lezen in het maildialoog.
  const { data: verzondenMail = null } = useQuery({
    queryKey: ["wedding-referral-email", referral?.referral_email_log_id ?? null],
    enabled: open && Boolean(referral?.referral_email_log_id),
    queryFn: async (): Promise<ProjectCommunication | null> => {
      const { data: log, error } = await supabase.from("email_log").select("*").eq("id", referral!.referral_email_log_id!).maybeSingle();
      if (error) throw error;
      if (!log) return null;
      return {
        id: `email_log_${log.id}`,
        email_log_id: log.id,
        request_id: log.related_request_id,
        accommodation_id: log.related_accommodation_id,
        communication_type: "email_out",
        direction: "outbound",
        subject: log.subject,
        content: log.text_body || "",
        html_body: log.html_body || null,
        text_body: log.text_body || null,
        from_email: log.from_email || null,
        reply_to: log.reply_to || null,
        contact_name: log.recipient_name,
        contact_email: log.recipient_email,
        logged_by: null,
        logged_at: log.created_at,
        communication_date: log.sent_at || log.created_at,
        metadata: { email_type: log.email_type, status: log.status, mailjet_message_id: log.mailjet_message_id, ...((log.metadata as Record<string, unknown>) || {}) },
        created_at: log.created_at,
        updated_at: log.created_at,
        source: "email_log",
        email_type: log.email_type,
      };
    },
  });

  const save = useSaveWeddingReferral();
  const update = useUpdateWeddingReferral();
  const verwijder = useDeleteWeddingReferral();

  useEffect(() => {
    if (!open) return;
    setForm(referral ? vanRij(referral) : leeg(today));
    setFeeTouched(Boolean(referral?.fee_override_note));
    setZoekterm("");
    setZoekActief("");
  }, [open, referral, today]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const feeSchedules = useMemo(() => schedules.map(asFeeSchedule), [schedules]);
  const kiesbarePartners = useMemo(
    () => partners.filter((p) => p.receives_wedding_referrals || p.id === form.partner_id),
    [partners, form.partner_id],
  );
  const gekozenPartner = partners.find((p) => p.id === form.partner_id) ?? null;

  const feeResult = useMemo(
    () =>
      form.status === "booked"
        ? computeReferralFee(
            { referred_at: form.referred_at, final_day_guests: getal(form.final_day_guests), is_multi_day: form.is_multi_day },
            feeSchedules,
            referral?.status === "booked" ? referral.fee_schedule_id : null,
          )
        : null,
    [form.status, form.referred_at, form.final_day_guests, form.is_multi_day, feeSchedules, referral],
  );
  const berekend = feeResult?.ok ? feeResult.calculation.total : null;

  // Zolang de vergoeding niet handmatig is aangeraakt, volgt hij de berekening.
  useEffect(() => {
    if (form.status !== "booked" || feeTouched) return;
    setForm((f) => ({ ...f, fee_amount: berekend === null ? "" : String(berekend) }));
  }, [berekend, form.status, feeTouched]);

  const vervaldatum = form.referred_at ? expiryDateFor(form.referred_at) : null;

  const wisselStatus = (next: ReferralStatus) => {
    const huidig = {
      status: referral?.status ?? "referred",
      invoice_status: referral?.invoice_status ?? "not_applicable",
      referred_at: form.referred_at,
      final_day_guests: getal(form.final_day_guests),
      is_multi_day: form.is_multi_day,
      fee_amount: getal(form.fee_amount),
      fee_calculated_amount: berekend,
      fee_override_note: form.fee_override_note,
    };
    // Weg van een gefactureerde boeking kan niet; de vergoeding zelf wordt bij opslaan berekend.
    if (huidig.status === "booked" && next !== "booked") {
      const uitkomst = applyStatusChange(huidig, next, feeSchedules);
      if (uitkomst.ok === false) {
        toast.error(uitkomst.error);
        return;
      }
    }
    setForm((f) => ({
      ...f,
      status: next,
      invoice_status: next === "booked" ? (f.invoice_status === "not_applicable" ? "to_invoice" : f.invoice_status) : "not_applicable",
      fee_amount: next === "booked" ? f.fee_amount : "",
      fee_override_note: next === "booked" ? f.fee_override_note : "",
    }));
    if (next !== "booked") setFeeTouched(false);
  };

  const { data: zoekresultaten = [], isFetching: zoekt } = useQuery({
    queryKey: ["wedding-referral-link-search", zoekActief],
    enabled: zoekActief.length >= 2,
    queryFn: async (): Promise<LinkResult[]> => {
      const q = `%${zoekActief.replace(/[%,]/g, " ")}%`;
      const [projecten, inbox] = await Promise.all([
        supabase
          .from("program_requests")
          .select("id, reference_number, customer_name, customer_email, customer_phone, number_of_people, created_at")
          .or(`customer_name.ilike.${q},customer_email.ilike.${q}`)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("sales_inbox")
          .select("id, from_name, from_email, subject, received_at, scan_result")
          .or(`from_name.ilike.${q},from_email.ilike.${q},subject.ilike.${q}`)
          .order("received_at", { ascending: false })
          .limit(6),
      ]);
      if (projecten.error) throw projecten.error;
      if (inbox.error) throw inbox.error;
      const uitProjecten: LinkResult[] = (projecten.data ?? []).map((p) => ({
        kind: "project",
        id: p.id,
        label: `${p.reference_number ?? "Project"} · ${p.customer_name} · ${datumLabel(p.created_at.slice(0, 10))}`,
        name: p.customer_name,
        email: p.customer_email,
        phone: p.customer_phone,
        requestedAt: p.created_at.slice(0, 10),
        guests: p.number_of_people,
      }));
      const uitInbox: LinkResult[] = (inbox.data ?? []).map((m) => {
        const scan = (m.scan_result ?? {}) as Record<string, unknown>;
        const scanGetal = typeof scan.number_of_people === "number" ? scan.number_of_people : null;
        return {
          kind: "inbox",
          id: m.id,
          label: `Sales-inbox · ${m.from_name || m.from_email} · ${m.subject ?? "zonder onderwerp"} · ${datumLabel(m.received_at.slice(0, 10))}`,
          name: (typeof scan.customer_name === "string" && scan.customer_name) || m.from_name || "",
          email: (typeof scan.customer_email === "string" && scan.customer_email) || m.from_email,
          phone: typeof scan.customer_phone === "string" ? scan.customer_phone : "",
          requestedAt: m.received_at.slice(0, 10),
          guests: scanGetal,
        };
      });
      return [...uitProjecten, ...uitInbox];
    },
  });

  const koppel = (r: LinkResult) => {
    setForm((f) => ({
      ...f,
      request_id: r.kind === "project" ? r.id : f.request_id,
      request_label: r.kind === "project" ? r.label : f.request_label,
      sales_inbox_id: r.kind === "inbox" ? r.id : f.sales_inbox_id,
      sales_inbox_label: r.kind === "inbox" ? r.label : f.sales_inbox_label,
      couple_names: f.couple_names || r.name,
      couple_email: f.couple_email || r.email,
      couple_phone: f.couple_phone || r.phone,
      requested_at: referral ? f.requested_at : r.requestedAt || f.requested_at,
      estimated_guests: f.estimated_guests || (r.guests === null ? "" : String(r.guests)),
    }));
    setZoekActief("");
    setZoekterm("");
  };

  const opslaan = async () => {
    if (!form.couple_names.trim()) return toast.error("Vul de namen van het bruidspaar in.");
    if (!form.partner_id) return toast.error("Kies een partner.");
    if (!form.requested_at || !form.referred_at) return toast.error("Datum aanvraag en datum doorverwezen zijn verplicht.");
    if (form.referred_at < form.requested_at) return toast.error("De datum doorverwezen ligt vóór de datum van de aanvraag.");

    const expectedDate =
      form.expected_precision === "month" ? (form.expected_month ? `${form.expected_month}-01` : null) : form.expected_day || null;

    const values: WeddingReferralInsert = {
      couple_names: form.couple_names.trim(),
      couple_email: form.couple_email.trim() || null,
      couple_phone: form.couple_phone.trim() || null,
      partner_id: form.partner_id,
      request_id: form.request_id,
      sales_inbox_id: form.sales_inbox_id,
      requested_at: form.requested_at,
      referred_at: form.referred_at,
      expires_at: expiryDateFor(form.referred_at),
      expected_wedding_date: expectedDate,
      expected_wedding_precision: form.expected_precision,
      estimated_guests: getal(form.estimated_guests),
      notes: form.notes.trim(),
      status: form.status,
      final_wedding_date: form.final_wedding_date || null,
      final_day_guests: getal(form.final_day_guests),
      is_multi_day: form.is_multi_day,
      fee_schedule_id: null,
      fee_calculated_amount: null,
      fee_amount: null,
      fee_override_note: "",
      invoice_status: "not_applicable",
      invoice_number: form.invoice_number.trim() || null,
      invoice_date: form.invoice_date || null,
      invoice_paid_at: form.invoice_paid_at || null,
    };

    if (form.status === "booked") {
      if (!feeResult) return toast.error("De vergoeding kan niet worden berekend.");
      if (feeResult.ok === false) return toast.error(feeResult.error);
      const bedrag = getal(form.fee_amount);
      if (bedrag === null || bedrag < 0) return toast.error("Vul een geldige vergoeding in.");
      const fout = validateFeeOverride(bedrag, feeResult.calculation.total, form.fee_override_note);
      if (fout) return toast.error(fout);
      values.fee_schedule_id = feeResult.schedule.id;
      values.fee_calculated_amount = feeResult.calculation.total;
      values.fee_amount = bedrag;
      values.fee_override_note = Math.abs(bedrag - feeResult.calculation.total) < 0.005 ? "" : form.fee_override_note.trim();
      values.invoice_status = form.invoice_status === "not_applicable" ? "to_invoice" : form.invoice_status;
      if (values.invoice_status === "paid" && !values.invoice_paid_at) values.invoice_paid_at = today;
      if (values.invoice_status !== "not_applicable" && values.invoice_status !== "to_invoice" && !values.invoice_date) values.invoice_date = today;
    }

    if (!referral) {
      const { data: sessie } = await supabase.auth.getSession();
      values.created_by = sessie.session?.user.id ?? null;
    }

    save.mutate(
      { id: referral?.id ?? null, values },
      {
        onSuccess: () => {
          toast.success(referral ? "Doorverwijzing opgeslagen" : "Doorverwijzing aangemaakt");
          onOpenChange(false);
        },
      },
    );
  };

  const anonimiseer = () => {
    if (!referral) return;
    update.mutate(
      { id: referral.id, patch: anonymizePatch(new Date()) },
      {
        onSuccess: () => {
          toast.success("Persoonsgegevens geanonimiseerd");
          setBevestigAnonimiseren(false);
          onOpenChange(false);
        },
      },
    );
  };

  const bezig = save.isPending || update.isPending || verwijder.isPending;
  const tiers = feeResult?.ok ? normalizeTiers(feeResult.schedule.tiers) : [];
  const tierIndex = feeResult?.ok ? tiers.findIndex((t) => t.max_guests === feeResult.calculation.tier.max_guests) : -1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{referral ? "Doorverwijzing bewerken" : "Nieuwe doorverwijzing"}</SheetTitle>
          <SheetDescription>
            {referral
              ? "Werk de status, de uitkomst en de facturatie bij. De vergoeding volgt de staffel die gold op de datum doorverwezen."
              : "Leg vast welke bruiloftsaanvraag naar welke partner is gegaan. De vervaldatum ligt 18 maanden na de datum doorverwezen."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {referral?.anonymized_at && (
            <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
              Persoonsgegevens geanonimiseerd op {datumLabel(referral.anonymized_at.slice(0, 10))}.
            </p>
          )}

          {referral?.referral_email_log_id && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                Doorverwezen per mail{verzondenMail?.communication_date ? ` op ${datumLabel(verzondenMail.communication_date.slice(0, 10))}` : ""}
                {typeof verzondenMail?.metadata.cc === "string" ? `, cc ${verzondenMail.metadata.cc}` : ""}
              </span>
              <Button type="button" variant="outline" size="sm" onClick={() => setMailOpen(true)} disabled={!verzondenMail}>
                Mail bekijken
              </Button>
            </div>
          )}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Bruidspaar</h3>
            <div className="space-y-2">
              <Label htmlFor="wr-namen">Namen *</Label>
              <Input id="wr-namen" value={form.couple_names} onChange={(e) => set("couple_names", e.target.value)} placeholder="Anna & Bram" disabled={Boolean(referral?.anonymized_at)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="wr-email">E-mail</Label>
                <Input id="wr-email" type="email" value={form.couple_email} onChange={(e) => set("couple_email", e.target.value)} disabled={Boolean(referral?.anonymized_at)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wr-tel">Telefoon</Label>
                <Input id="wr-tel" value={form.couple_phone} onChange={(e) => set("couple_phone", e.target.value)} disabled={Boolean(referral?.anonymized_at)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wr-zoek">Oorspronkelijke aanvraag (optioneel)</Label>
              {form.request_id && (
                <p className="flex items-center gap-2 text-sm">
                  <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <Link2Label label={form.request_label} />
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setForm((f) => ({ ...f, request_id: null, request_label: "" }))}>
                    Ontkoppel
                  </Button>
                </p>
              )}
              {form.sales_inbox_id && (
                <p className="flex items-center gap-2 text-sm">
                  <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <Link2Label label={form.sales_inbox_label} />
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setForm((f) => ({ ...f, sales_inbox_id: null, sales_inbox_label: "" }))}>
                    Ontkoppel
                  </Button>
                </p>
              )}
              <div className="flex gap-2">
                <Input
                  id="wr-zoek"
                  value={zoekterm}
                  onChange={(e) => setZoekterm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setZoekActief(zoekterm.trim());
                    }
                  }}
                  placeholder="Zoek op naam of e-mail in projecten en sales-inbox"
                />
                <Button type="button" variant="outline" onClick={() => setZoekActief(zoekterm.trim())} disabled={zoekterm.trim().length < 2}>
                  {zoekt ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
                  <span className="sr-only">Zoeken</span>
                </Button>
              </div>
              {zoekActief.length >= 2 && !zoekt && (
                <ul className="divide-y rounded-md border text-sm">
                  {zoekresultaten.length === 0 && <li className="px-3 py-2 text-muted-foreground">Niets gevonden.</li>}
                  {zoekresultaten.map((r) => (
                    <li key={`${r.kind}-${r.id}`}>
                      <button type="button" className="w-full px-3 py-2 text-left hover:bg-muted" onClick={() => koppel(r)}>
                        {r.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Doorverwijzing</h3>
            <div className="space-y-2">
              <Label>Partner *</Label>
              <Select value={form.partner_id} onValueChange={(v) => set("partner_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Kies een partner" />
                </SelectTrigger>
                <SelectContent>
                  {kiesbarePartners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {!p.receives_wedding_referrals ? " (ontvangt geen doorverwijzingen meer)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {kiesbarePartners.length === 0 && (
                <p className="text-xs text-muted-foreground">Geen enkele partner heeft "Ontvangt bruiloftsdoorverwijzingen" aan. Zet dat aan op de partnerpagina.</p>
              )}
              {gekozenPartner && <p className="text-xs text-muted-foreground">Doorverwijsadres: {referralEmailFor(gekozenPartner)}</p>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="wr-aanvraag">Datum aanvraag *</Label>
                <Input id="wr-aanvraag" type="date" value={form.requested_at} onChange={(e) => set("requested_at", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wr-doorverwezen">Datum doorverwezen *</Label>
                <Input id="wr-doorverwezen" type="date" value={form.referred_at} onChange={(e) => set("referred_at", e.target.value)} />
                <p className="text-xs text-muted-foreground">Vervalt op {datumLabel(vervaldatum)}.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
              <div className="space-y-2">
                <Label>Verwachte trouwdatum</Label>
                <Select value={form.expected_precision} onValueChange={(v) => set("expected_precision", v as "day" | "month")}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Precieze dag</SelectItem>
                    <SelectItem value="month">Alleen maand</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wr-verwacht">{form.expected_precision === "month" ? "Maand en jaar" : "Datum"}</Label>
                {form.expected_precision === "month" ? (
                  <Input id="wr-verwacht" type="month" value={form.expected_month} onChange={(e) => set("expected_month", e.target.value)} />
                ) : (
                  <Input id="wr-verwacht" type="date" value={form.expected_day} onChange={(e) => set("expected_day", e.target.value)} />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wr-gasten">Geschat aantal gasten</Label>
              <Input id="wr-gasten" type="number" min={0} className="sm:w-40" value={form.estimated_guests} onChange={(e) => set("estimated_guests", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wr-notities">Notities</Label>
              <Textarea id="wr-notities" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} disabled={Boolean(referral?.anonymized_at)} />
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Uitkomst</h3>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => wisselStatus(v as ReferralStatus)}>
                <SelectTrigger className="sm:w-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REFERRAL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {REFERRAL_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.status === "referred" && vervaldatum && vervaldatum < today && (
                <p className="text-xs text-muted-foreground">De vervaldatum is verstreken; bij opslaan blijft de status zoals gekozen, de nachtelijke controle zet hem op vervallen.</p>
              )}
            </div>

            {form.status === "booked" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="wr-trouwdatum">Definitieve trouwdatum</Label>
                    <Input id="wr-trouwdatum" type="date" value={form.final_wedding_date} onChange={(e) => set("final_wedding_date", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wr-daggasten">Definitief aantal daggasten *</Label>
                    <Input id="wr-daggasten" type="number" min={0} value={form.final_day_guests} onChange={(e) => set("final_day_guests", e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="wr-meerdaags">Meerdaagse bruiloft</Label>
                    <p className="text-xs text-muted-foreground">Toeslag volgens de staffel.</p>
                  </div>
                  <Switch id="wr-meerdaags" checked={form.is_multi_day} onCheckedChange={(v) => set("is_multi_day", v)} />
                </div>

                <div className="space-y-2 rounded-md bg-muted/40 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">Vergoeding volgens staffel</span>
                    <span className="text-lg font-semibold tabular-nums">{formatEuro(berekend)}</span>
                  </div>
                  {feeResult?.ok ? (
                    <p className="text-xs text-muted-foreground">
                      Staffel van {datumLabel(feeResult.schedule.effective_from)}: trede {describeTier(tiers, tierIndex)} gasten {formatEuro(feeResult.calculation.base)}
                      {feeResult.calculation.surcharge > 0 ? ` + meerdaags ${formatEuro(feeResult.calculation.surcharge)}` : ""}. Excl. btw.
                    </p>
                  ) : (
                    <p className="text-xs text-destructive">{feeResult && feeResult.ok === false ? feeResult.error : ""}</p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="wr-vergoeding">Vastgelegde vergoeding (excl. btw)</Label>
                      <Input
                        id="wr-vergoeding"
                        type="number"
                        step="0.01"
                        min={0}
                        value={form.fee_amount}
                        onChange={(e) => {
                          setFeeTouched(true);
                          set("fee_amount", e.target.value);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wr-opmerking">Opmerking bij afwijking</Label>
                      <Input id="wr-opmerking" value={form.fee_override_note} onChange={(e) => set("fee_override_note", e.target.value)} placeholder="Verplicht als het bedrag afwijkt" />
                    </div>
                  </div>
                  {berekend !== null && getal(form.fee_amount) !== null && Math.abs((getal(form.fee_amount) ?? 0) - berekend) >= 0.005 && (
                    <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => { setFeeTouched(false); set("fee_override_note", ""); }}>
                      Terug naar het staffelbedrag
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Factuurstatus</Label>
                    <Select value={form.invoice_status} onValueChange={(v) => set("invoice_status", v as InvoiceStatus)}>
                      <SelectTrigger className="sm:w-60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INVOICE_STATUSES.filter((s) => s !== "not_applicable").map((s) => (
                          <SelectItem key={s} value={s}>
                            {INVOICE_STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {form.invoice_status !== "to_invoice" && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="wr-factuurnr">Factuurnummer</Label>
                        <Input id="wr-factuurnr" value={form.invoice_number} onChange={(e) => set("invoice_number", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="wr-factuurdatum">Factuurdatum</Label>
                        <Input id="wr-factuurdatum" type="date" value={form.invoice_date} onChange={(e) => set("invoice_date", e.target.value)} />
                      </div>
                      {form.invoice_status === "paid" && (
                        <div className="space-y-2">
                          <Label htmlFor="wr-betaald">Betaald op</Label>
                          <Input id="wr-betaald" type="date" value={form.invoice_paid_at} onChange={(e) => set("invoice_paid_at", e.target.value)} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              {referral && !referral.anonymized_at && isClosed(referral) && (
                <Button type="button" variant="outline" size="sm" onClick={() => setBevestigAnonimiseren(true)} disabled={bezig}>
                  <ShieldOff className="mr-1 h-4 w-4" aria-hidden="true" />
                  Anonimiseren
                  {isDueForAnonymization(referral, today) ? " (kan nu)" : ""}
                </Button>
              )}
              {referral && (
                <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setBevestigVerwijderen(true)} disabled={bezig}>
                  <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
                  Verwijderen
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={bezig}>
                Annuleren
              </Button>
              <Button type="button" onClick={opslaan} disabled={bezig}>
                {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {referral ? "Opslaan" : "Aanmaken"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>

      <EmailLogDetailDialog open={mailOpen} onOpenChange={setMailOpen} communication={verzondenMail} />

      <AlertDialog open={bevestigAnonimiseren} onOpenChange={setBevestigAnonimiseren}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Persoonsgegevens anonimiseren?</AlertDialogTitle>
            <AlertDialogDescription>
              Namen, e-mail, telefoon en notities van het bruidspaar worden gewist. Partner, data, aantallen, vergoeding en factuurgegevens blijven staan. Dit is niet terug te draaien.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={anonimiseer}>Anonimiseren</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bevestigVerwijderen} onOpenChange={setBevestigVerwijderen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Doorverwijzing verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Alleen voor een foutieve invoer. Een doorverwijzing die niet doorging, zet je op "Niet doorgegaan", zodat de aantallen per seizoen kloppen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!referral) return;
                verwijder.mutate(referral.id, {
                  onSuccess: () => {
                    setBevestigVerwijderen(false);
                    onOpenChange(false);
                  },
                });
              }}
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}

const Link2Label = ({ label }: { label: string }) => <span className="min-w-0 flex-1 truncate">{label}</span>;
