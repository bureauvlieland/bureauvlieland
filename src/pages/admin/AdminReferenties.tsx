import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Helmet } from "react-helmet";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ArrowLeft, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Notice } from "@/components/system";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { buildReferenceSnapshot, caseMeta, normalizeFacts, normalizePhotos, normalizeProgram, slugify } from "@/lib/referenceCases";
import { loadReferenceSnapshotInput } from "@/lib/referenceCaseLoader";
import { transformImageUrl } from "@/lib/supabaseImage";

/**
 * Content → Referenties (docs/plan-reviews-oogsten.md, fase 3). Een
 * referentiepagina ontstaat uit een beoordeling waarbij de klant toestemming
 * gaf: de momentopname van het programma (dagen, onderdelen, foto's, feiten)
 * plus het citaat. Erwin redigeert de teksten (met een AI-voorzet), vraagt
 * de klant akkoord via de akkoordpagina en publiceert pas daarna.
 */
type CaseRow = Database["public"]["Tables"]["reference_cases"]["Row"] & {
  program_requests: {
    id: string;
    reference_number: string | null;
    customer_name: string;
    customer_email: string;
    customer_company: string | null;
  } | null;
};

type CaseStatus = "draft" | "sent" | "approved" | "published" | "hidden";

interface Candidate {
  id: string;
  request_id: string | null;
  author_name: string;
  company: string;
  created_at: string;
  program_requests: { reference_number: string | null; customer_name: string; customer_company: string | null } | null;
}

interface ProjectHit {
  id: string;
  reference_number: string | null;
  customer_name: string;
  customer_company: string | null;
  number_of_people: number;
  status: string;
  selected_dates: unknown;
}

interface FormState {
  title: string;
  slug: string;
  intro: string;
  body: string;
  quote: string;
  quote_author: string;
  quote_role: string;
  company: string;
}

const STATUS_LABEL: Record<CaseStatus, string> = {
  draft: "Concept",
  sent: "Akkoord gevraagd",
  approved: "Akkoord",
  published: "Gepubliceerd",
  hidden: "Verborgen",
};

const statusVariant = (status: string): "default" | "secondary" | "outline" =>
  status === "published" ? "default" : status === "hidden" ? "outline" : "secondary";

const formFrom = (row: CaseRow): FormState => ({
  title: row.title,
  slug: row.slug,
  intro: row.intro,
  body: row.body,
  quote: row.quote,
  quote_author: row.quote_author,
  quote_role: row.quote_role,
  company: row.company,
});

const datum = (iso: string | null | undefined, patroon = "d MMM yyyy HH:mm"): string => (iso ? format(new Date(iso), patroon, { locale: nl }) : "");
const toJson = (value: unknown): Json => value as Json;

/** Eén aanroep van een admin-edge-function, met de foutmelding uit het antwoord. */
async function roepFunctie<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (!error) return data as T;
  const context = (error as { context?: unknown }).context;
  if (context instanceof Response) {
    const payload = (await context.clone().json().catch(() => null)) as { error?: unknown } | null;
    const melding = typeof payload?.error === "string" ? payload.error : payload?.error ? JSON.stringify(payload.error) : `HTTP ${context.status}`;
    throw new Error(melding);
  }
  throw error instanceof Error ? error : new Error(String(error));
}

const snapshotInsert = (s: ReturnType<typeof buildReferenceSnapshot>) => ({
  slug: s.slug,
  title: s.title,
  intro: s.intro,
  body: s.body,
  quote: s.quote,
  quote_author: s.quote_author,
  quote_role: s.quote_role,
  company: s.company,
  group_size: s.group_size,
  program_date: s.program_date,
  days: s.days,
  facts: toJson(s.facts),
  program: toJson(s.program),
  photos: toJson(s.photos),
  block_ids: s.block_ids,
  landing_path: s.landing_path,
});

// ── Editor ──────────────────────────────────────────────────────────────────

interface CaseEditorProps {
  row: CaseRow;
  onChanged: () => void;
  onTerug: () => void;
}

const CaseEditor = ({ row, onChanged, onTerug }: CaseEditorProps) => {
  const [form, setForm] = useState<FormState>(() => formFrom(row));
  const [bevestigMail, setBevestigMail] = useState(false);
  const [bevestigVerwijderen, setBevestigVerwijderen] = useState(false);
  const project = row.program_requests;
  const status = row.status as CaseStatus;
  const dirty = JSON.stringify(form) !== JSON.stringify(formFrom(row));
  const facts = normalizeFacts(row.facts);
  const program = normalizeProgram(row.program);
  const photos = normalizePhotos(row.photos);

  const veld = (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const patch = async (p: Database["public"]["Tables"]["reference_cases"]["Update"]) => {
    const { error } = await supabase.from("reference_cases").update(p).eq("id", row.id);
    if (error) throw error;
  };

  const opslaan = useMutation({
    mutationFn: async () => {
      const next: FormState = {
        title: form.title.trim(),
        slug: slugify(form.slug) || slugify(form.title) || row.slug,
        intro: form.intro.trim(),
        body: form.body.trim(),
        quote: form.quote.trim(),
        quote_author: form.quote_author.trim(),
        quote_role: form.quote_role.trim(),
        company: form.company.trim(),
      };
      if (!next.title) throw new Error("Een titel is verplicht.");
      await patch(next);
      setForm(next);
    },
    onSuccess: () => {
      onChanged();
      toast({ title: "Opgeslagen" });
    },
    onError: (e: Error) =>
      toast({
        title: "Opslaan mislukt",
        description: /duplicate|unique/i.test(e.message) ? "Deze slug bestaat al; kies een andere." : e.message,
        variant: "destructive",
      }),
  });

  const aiVoorzet = useMutation({
    mutationFn: async () => {
      if (dirty) await opslaan.mutateAsync();
      return roepFunctie<{ draft: { title: string; intro: string; body: string } }>("draft-reference-case", { case_id: row.id });
    },
    onSuccess: ({ draft }) => {
      setForm((f) => ({ ...f, title: draft.title || f.title, intro: draft.intro || f.intro, body: draft.body || f.body }));
      toast({ title: "AI-voorzet klaar", description: "Lees de tekst na en sla op; de voorzet is nog niet opgeslagen." });
    },
    onError: (e: Error) => toast({ title: "AI-voorzet mislukt", description: e.message, variant: "destructive" }),
  });

  const akkoordVragen = useMutation({
    mutationFn: () => roepFunctie<{ success: boolean; sent_to: string }>("send-reference-approval", { case_id: row.id, origin: window.location.origin }),
    onSuccess: (r) => {
      setBevestigMail(false);
      onChanged();
      toast({ title: "Akkoordmail verstuurd", description: `Naar ${r.sent_to}.` });
    },
    onError: (e: Error) => toast({ title: "Versturen mislukt", description: e.message, variant: "destructive" }),
  });

  const zetStatus = useMutation({
    mutationFn: (nieuw: CaseStatus) =>
      patch(nieuw === "published" ? { status: nieuw, published_at: row.published_at ?? new Date().toISOString() } : { status: nieuw }),
    onSuccess: (_, nieuw) => {
      onChanged();
      toast({ title: nieuw === "published" ? "Gepubliceerd" : nieuw === "hidden" ? "Verborgen" : "Status aangepast" });
    },
    onError: (e: Error) => toast({ title: "Niet gelukt", description: e.message, variant: "destructive" }),
  });

  const vernieuwen = useMutation({
    mutationFn: async () => {
      if (!row.request_id) throw new Error("Deze pagina hangt niet meer aan een programma.");
      const input = await loadReferenceSnapshotInput(row.request_id, row.review_id, []);
      const s = buildReferenceSnapshot(input);
      await patch({
        group_size: s.group_size,
        program_date: s.program_date,
        days: s.days,
        facts: toJson(s.facts),
        program: toJson(s.program),
        photos: toJson(s.photos),
        block_ids: s.block_ids,
        landing_path: s.landing_path,
      });
    },
    onSuccess: () => {
      onChanged();
      toast({ title: "Momentopname vernieuwd", description: "Programma, feiten en foto's komen opnieuw uit het project; de teksten zijn niet aangeraakt." });
    },
    onError: (e: Error) => toast({ title: "Vernieuwen mislukt", description: e.message, variant: "destructive" }),
  });

  const verwijderen = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reference_cases").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onChanged();
      onTerug();
      toast({ title: "Referentiepagina verwijderd" });
    },
    onError: (e: Error) => toast({ title: "Verwijderen mislukt", description: e.message, variant: "destructive" }),
  });

  const bezig = opslaan.isPending || aiVoorzet.isPending || akkoordVragen.isPending || zetStatus.isPending || vernieuwen.isPending || verwijderen.isPending;
  const kanMailen = Boolean(project?.customer_email) && !dirty;
  const volgendeStap: Record<CaseStatus, string> = {
    draft: "Lees de teksten na (of vraag een AI-voorzet), sla op, bekijk de voorvertoning en vraag de klant akkoord.",
    sent: `Akkoord gevraagd op ${datum(row.approval_sent_at)}. Wacht op de klant; opnieuw sturen kan.`,
    approved: "De klant gaf akkoord. Publiceer de pagina; hij komt dan op /referenties.",
    published: "De pagina staat online. Aanpassingen zijn na opslaan meteen zichtbaar.",
    hidden: row.approved_at ? "Niet online. Opnieuw publiceren kan, het akkoord blijft geldig." : "Niet online. Vraag eerst akkoord voordat u publiceert.",
  };

  return (
    <div className="p-6 space-y-6">
      <button type="button" onClick={onTerug} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Alle referentiepagina's
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{row.title || "Referentiepagina"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project ? (
              <>
                <Link to={`/admin/projecten/${project.id}`} className="underline underline-offset-2">
                  {project.reference_number ?? "Project"}
                </Link>
                {" · "}
                {project.customer_name}
                {project.customer_email ? ` · ${project.customer_email}` : ""}
              </>
            ) : (
              "Zonder gekoppeld programma"
            )}
          </p>
        </div>
        <Badge variant={statusVariant(status)}>{STATUS_LABEL[status] ?? status}</Badge>
      </div>

      <Notice tone={status === "approved" ? "success" : "info"} title="Volgende stap">
        <p>{volgendeStap[status]}</p>
      </Notice>

      {row.feedback && (
        <Notice tone="warning" title={`De klant wil iets anders (${datum(row.feedback_at)})`}>
          <p className="whitespace-pre-line">{row.feedback}</p>
        </Notice>
      )}

      {row.approved_at && (
        <Notice tone="success" title={`Akkoord van ${row.approved_name ?? "de klant"} op ${datum(row.approved_at)}`}>
          <p>Vastgelegd met tijdstip en IP-adres. Verwijderen of aanpassen kan altijd op verzoek van de klant.</p>
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Teksten</CardTitle>
            <CardDescription>Feitelijk en in de u-vorm, zonder superlatieven. De klant ziet precies deze tekst op de akkoordpagina.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ref-titel">Titel</Label>
                <Input id="ref-titel" value={form.title} onChange={veld("title")} maxLength={120} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ref-slug">Webadres</Label>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-sm text-muted-foreground">/referenties/</span>
                  <Input id="ref-slug" value={form.slug} onChange={veld("slug")} maxLength={120} />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-intro">Intro</Label>
              <Textarea id="ref-intro" value={form.intro} onChange={veld("intro")} rows={2} maxLength={400} />
              <p className="text-xs text-muted-foreground">Eén of twee zinnen onder de titel in de hero.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-tekst">Tekst</Label>
              <Textarea id="ref-tekst" value={form.body} onChange={veld("body")} rows={12} maxLength={6000} />
              <p className="text-xs text-muted-foreground">Alinea's scheiden met een lege regel. Links als [tekst](/pad).</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-citaat">Citaat</Label>
              <Textarea id="ref-citaat" value={form.quote} onChange={veld("quote")} rows={3} maxLength={1000} />
              <p className="text-xs text-muted-foreground">Uit de beoordeling; hooguit inkorten, niet herschrijven.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="ref-naam">Naam</Label>
                <Input id="ref-naam" value={form.quote_author} onChange={veld("quote_author")} maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ref-functie">Functie</Label>
                <Input id="ref-functie" value={form.quote_role} onChange={veld("quote_role")} maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ref-organisatie">Organisatie</Label>
                <Input id="ref-organisatie" value={form.company} onChange={veld("company")} maxLength={160} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button onClick={() => opslaan.mutate()} disabled={bezig || !dirty}>
                {opslaan.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                Opslaan
              </Button>
              <Button variant="outline" onClick={() => aiVoorzet.mutate()} disabled={bezig}>
                {aiVoorzet.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                AI-voorzet
              </Button>
              {dirty && <span className="text-xs text-muted-foreground">Niet-opgeslagen wijzigingen.</span>}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Akkoord en publicatie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dirty ? (
                <Button variant="outline" className="w-full" disabled>
                  Voorvertoning (sla eerst op)
                </Button>
              ) : (
                <Button asChild variant="outline" className="w-full">
                  <a href={`/referentie-akkoord/${row.approval_token}`} target="_blank" rel="noopener noreferrer">
                    Voorvertoning
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </Button>
              )}

              {bevestigMail ? (
                <div className="space-y-2 rounded-md border border-border p-3 text-sm">
                  <p>
                    Mail "Mag deze referentiepagina online?" versturen naar <span className="font-medium">{project?.customer_email}</span>?
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => akkoordVragen.mutate()} disabled={bezig}>
                      {akkoordVragen.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                      Verstuur
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setBevestigMail(false)} disabled={bezig}>
                      Annuleren
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="secondary" className="w-full" onClick={() => setBevestigMail(true)} disabled={bezig || !kanMailen}>
                  {row.approval_sent_at ? "Akkoord opnieuw vragen" : "Akkoord vragen"}
                </Button>
              )}
              {!project?.customer_email && <p className="text-xs text-muted-foreground">Geen e-mailadres bij het programma; akkoord vragen kan niet.</p>}
              {dirty && <p className="text-xs text-muted-foreground">Sla eerst op voordat u de voorvertoning of de akkoordmail gebruikt.</p>}

              {status === "published" ? (
                <>
                  <Button asChild variant="outline" className="w-full">
                    <a href={`/referenties/${row.slug}`} target="_blank" rel="noopener noreferrer">
                      Bekijk op de site
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => zetStatus.mutate("hidden")} disabled={bezig}>
                    Verbergen
                  </Button>
                </>
              ) : (
                <Button className="w-full" onClick={() => zetStatus.mutate("published")} disabled={bezig || !row.approved_at || dirty}>
                  {status === "hidden" ? "Opnieuw publiceren" : "Publiceren"}
                </Button>
              )}
              {!row.approved_at && <p className="text-xs text-muted-foreground">Publiceren kan pas na het akkoord van de klant.</p>}
              {row.published_at && status === "published" && <p className="text-xs text-muted-foreground">Online sinds {datum(row.published_at)}.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Momentopname van het programma</CardTitle>
              <CardDescription>Dagen, onderdelen, foto's en feiten zoals ze op de pagina komen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {facts.length > 0 && (
                <dl className="space-y-1">
                  {facts.map((f) => (
                    <div key={f.label} className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{f.label}</dt>
                      <dd className="text-right font-medium">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {program.length > 0 ? (
                <ul className="space-y-1">
                  {program.map((d) => (
                    <li key={d.day_index}>
                      <span className="font-medium">{d.label}</span>
                      {d.date ? ` (${datum(d.date, "d MMM")})` : ""}: {d.items.map((i) => i.name).join(", ") || "geen onderdelen"}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Geen onderdelen gevonden bij dit programma.</p>
              )}
              {photos.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {photos.map((p) => (
                    <img key={p.url} src={transformImageUrl(p.url, { width: 160, quality: 60 })} alt={p.alt} className="h-14 w-20 rounded object-cover" loading="lazy" />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Geen foto's: de bouwstenen van dit programma hebben geen foto in de storage.</p>
              )}
              <Button variant="outline" size="sm" onClick={() => vernieuwen.mutate()} disabled={bezig || !row.request_id}>
                {vernieuwen.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                Momentopname vernieuwen
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              {bevestigVerwijderen ? (
                <div className="space-y-2 text-sm">
                  <p>Deze referentiepagina definitief verwijderen? De akkoordlink van de klant werkt daarna niet meer.</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" onClick={() => verwijderen.mutate()} disabled={bezig}>
                      Verwijder
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setBevestigVerwijderen(false)} disabled={bezig}>
                      Annuleren
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setBevestigVerwijderen(true)} disabled={bezig || status === "published"}>
                  Verwijderen
                </Button>
              )}
              {status === "published" && <p className="mt-2 text-xs text-muted-foreground">Verberg de pagina eerst; daarna kan verwijderen.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ── Overzicht ───────────────────────────────────────────────────────────────

const AdminReferenties = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const bewerkId = searchParams.get("id");
  const aanvraagFilter = searchParams.get("aanvraag");
  const beoordelingId = searchParams.get("beoordeling");
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-reference-cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reference_cases")
        .select("*, program_requests(id, reference_number, customer_name, customer_email, customer_company)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CaseRow[];
    },
  });

  const { data: kandidaten = [], isLoading: kandidatenLaden } = useQuery({
    queryKey: ["admin-reference-candidates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_reviews")
        .select("id, request_id, author_name, company, created_at, program_requests(reference_number, customer_name, customer_company)")
        .eq("consent_reference", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Candidate[];
    },
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-reference-cases"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-reference-candidates"] });
  };

  const openen = useMemo(
    () => kandidaten.filter((k) => !rows.some((r) => r.review_id === k.id || (k.request_id !== null && r.request_id === k.request_id))),
    [kandidaten, rows],
  );
  const zichtbaar = useMemo(() => (aanvraagFilter ? rows.filter((r) => r.request_id === aanvraagFilter) : rows), [rows, aanvraagFilter]);
  const row = bewerkId ? (rows.find((r) => r.id === bewerkId) ?? null) : null;

  const maakConcept = useMutation({
    mutationFn: async (bron: { request_id: string | null; review_id: string | null }) => {
      if (!bron.request_id) throw new Error("Deze beoordeling hangt niet aan een programma.");
      const input = await loadReferenceSnapshotInput(bron.request_id, bron.review_id, rows.map((r) => r.slug));
      const snapshot = buildReferenceSnapshot(input);
      const { data, error } = await supabase
        .from("reference_cases")
        .insert({ ...snapshotInsert(snapshot), request_id: bron.request_id, review_id: bron.review_id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      invalidate();
      setSearchParams({ id }, { replace: true });
      toast({ title: "Concept gemaakt", description: "Lees de teksten na, vraag eventueel een AI-voorzet en sla op." });
    },
    onError: (e: Error) => toast({ title: "Concept maken mislukt", description: e.message, variant: "destructive" }),
  });
  const { mutate: startConcept } = maakConcept;

  // Vanuit Beoordelingen ("Referentie"): bestaand concept openen of een nieuw maken.
  const gestartVoor = useRef<string | null>(null);
  useEffect(() => {
    if (!beoordelingId || isLoading || kandidatenLaden) return;
    const bestaand = rows.find((r) => r.review_id === beoordelingId);
    if (bestaand) {
      setSearchParams({ id: bestaand.id }, { replace: true });
      return;
    }
    const kandidaat = kandidaten.find((k) => k.id === beoordelingId);
    if (!kandidaat || gestartVoor.current === beoordelingId) return;
    gestartVoor.current = beoordelingId;
    startConcept({ request_id: kandidaat.request_id, review_id: kandidaat.id });
  }, [beoordelingId, isLoading, kandidatenLaden, rows, kandidaten, setSearchParams, startConcept]);

  // Referentie uit een project zonder beoordeling (de cases van vóór de
  // beoordelingspagina): zoeken op referentienummer of organisatie.
  const [projectZoek, setProjectZoek] = useState("");
  const zoekterm = projectZoek.trim();
  const { data: projectHits = [], isFetching: projectenZoeken } = useQuery({
    queryKey: ["admin-reference-project-search", zoekterm],
    enabled: zoekterm.length >= 2,
    queryFn: async () => {
      const patroon = `%${zoekterm.replace(/[%_]/g, "")}%`;
      const { data, error } = await supabase
        .from("program_requests")
        .select("id, reference_number, customer_name, customer_company, number_of_people, status, selected_dates")
        .neq("status", "deleted")
        .or(`reference_number.ilike.${patroon},customer_company.ilike.${patroon},customer_name.ilike.${patroon}`)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as ProjectHit[];
    },
  });

  const terug = () => setSearchParams(aanvraagFilter ? { aanvraag: aanvraagFilter } : {}, { replace: true });

  return (
    <AdminLayout>
      <Helmet>
        <title>Referenties – Admin</title>
      </Helmet>

      {row ? (
        <CaseEditor key={row.id} row={row} onChanged={invalidate} onTerug={terug} />
      ) : (
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Referentiepagina's</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Programma's van eerdere groepen als pagina op de site, na akkoord van de klant. Een concept ontstaat uit een beoordeling waarbij de klant
              toestemming gaf.
            </p>
          </div>

          {bewerkId && !isLoading && (
            <Notice tone="warning">
              <p>Deze referentiepagina bestaat niet (meer).</p>
            </Notice>
          )}

          {beoordelingId && (maakConcept.isPending || isLoading || kandidatenLaden) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Concept maken uit het programma…
            </div>
          )}

          {aanvraagFilter && (
            <p className="text-sm text-muted-foreground">
              Alleen de referentiepagina van één programma.{" "}
              <Link to="/admin/referenties" className="underline underline-offset-2">
                Alle referentiepagina's
              </Link>
            </p>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Referentie uit een project</CardTitle>
              <CardDescription>
                Voor programma's zonder beoordeling, zoals de cases van vóór de beoordelingspagina. Het concept krijgt de momentopname van het
                programma; het citaat vult u zelf in, en de klant keurt de pagina goed via de akkoordmail.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={projectZoek}
                onChange={(e) => setProjectZoek(e.target.value)}
                placeholder="Zoek op referentienummer of organisatie, bijvoorbeeld BV-2602 of Kreeft"
                className="max-w-xl"
              />
              {zoekterm.length >= 2 && (
                projectenZoeken && projectHits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Zoeken…</p>
                ) : projectHits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Geen projecten gevonden.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead>Klant</TableHead>
                        <TableHead>Programma</TableHead>
                        <TableHead className="text-right">Actie</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectHits.map((p) => {
                        const bestaand = rows.find((r) => r.request_id === p.id);
                        const dates = Array.isArray(p.selected_dates) ? (p.selected_dates as string[]) : [];
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="text-sm">
                              {p.reference_number ?? "Project"}
                              <div className="text-xs text-muted-foreground">{p.status}</div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{p.customer_company || p.customer_name}</div>
                              <div className="text-xs text-muted-foreground">{p.customer_name}</div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {p.number_of_people} personen{dates.length > 0 ? ` · ${dates.length} ${dates.length === 1 ? "dag" : "dagen"} · ${datum(dates[0], "MMM yyyy")}` : ""}
                            </TableCell>
                            <TableCell className="text-right">
                              {bestaand ? (
                                <Button variant="outline" size="sm" onClick={() => setSearchParams({ id: bestaand.id }, { replace: true })}>
                                  Open concept
                                </Button>
                              ) : (
                                <Button size="sm" onClick={() => startConcept({ request_id: p.id, review_id: null })} disabled={maakConcept.isPending}>
                                  Concept maken
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )
              )}
            </CardContent>
          </Card>

          {openen.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Toestemming gekregen, nog geen pagina</CardTitle>
                <CardDescription>Klanten die bij hun beoordeling aangaven dat wij een referentiepagina mogen maken.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Klant</TableHead>
                      <TableHead>Programma</TableHead>
                      <TableHead className="text-right">Actie</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openen.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{datum(k.created_at, "d MMM yyyy")}</TableCell>
                        <TableCell>
                          <div className="font-medium">{k.company || k.program_requests?.customer_company || k.author_name}</div>
                          <div className="text-xs text-muted-foreground">{k.author_name}</div>
                        </TableCell>
                        <TableCell className="text-sm">{k.program_requests?.reference_number ?? (k.request_id ? "Project" : "Geen programma")}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => startConcept({ request_id: k.request_id, review_id: k.id })} disabled={maakConcept.isPending || !k.request_id}>
                            Concept maken
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Referentiepagina's</CardTitle>
              <CardDescription>Concept → akkoord gevraagd → akkoord → gepubliceerd. Publiceren kan alleen na akkoord van de klant.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Laden…
                </div>
              ) : zichtbaar.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nog geen referentiepagina's. Ze ontstaan uit beoordelingen waarbij de klant toestemming gaf (hierboven, of via Content → Beoordelingen).
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead className="min-w-[240px]">Titel</TableHead>
                      <TableHead>Klant</TableHead>
                      <TableHead>Programma</TableHead>
                      <TableHead>Bijgewerkt</TableHead>
                      <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zichtbaar.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Badge variant={statusVariant(r.status)} className="whitespace-nowrap">{STATUS_LABEL[r.status as CaseStatus] ?? r.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => setSearchParams({ id: r.id }, { replace: true })}
                            className="text-left font-medium underline-offset-2 hover:underline"
                          >
                            {r.title || "Zonder titel"}
                          </button>
                          <div className="text-xs text-muted-foreground">/referenties/{r.slug}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{r.company || r.program_requests?.customer_company || "–"}</div>
                          {r.program_requests && (
                            <Link to={`/admin/projecten/${r.program_requests.id}`} className="whitespace-nowrap text-xs text-primary underline-offset-2 hover:underline">
                              {r.program_requests.reference_number ?? "Project"}
                            </Link>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{caseMeta(r)}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{datum(r.updated_at, "d MMM yyyy")}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {r.status === "published" && (
                              <Button asChild variant="ghost" size="sm">
                                <a href={`/referenties/${r.slug}`} target="_blank" rel="noopener noreferrer" aria-label="Bekijk op de site">
                                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                </a>
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => setSearchParams({ id: r.id }, { replace: true })}>
                              Bewerken
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminReferenties;
