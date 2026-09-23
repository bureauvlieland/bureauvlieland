import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ExternalLink, Loader2, MessageSquareQuote, Star } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AftersalesCatchUpCard } from "@/components/admin/AftersalesCatchUpCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RatingStars } from "@/components/RatingStars";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { useGoogleReviewsCache } from "@/hooks/useGoogleReviewsCache";
import { buildFunnel, googleReviewsPerMonth, responsePercentage } from "@/lib/reviewFunnel";

/**
 * Content → Beoordelingen (docs/plan-reviews-oogsten.md, fase 1): wat
 * klanten via /beoordeling/:token hebben ingevuld, met de toestemmingen,
 * de status voor de website en een eigen citaat. Publiceren kan alleen als
 * de klant daar toestemming voor gaf; wat hij "beter" vond blijft intern.
 */
type ReviewRow = Database["public"]["Tables"]["customer_reviews"]["Row"] & {
  program_requests: {
    id: string;
    reference_number: string | null;
    customer_name: string;
    customer_company: string | null;
  } | null;
};

type ReviewStatus = "new" | "published" | "hidden";
type Filter = "alle" | ReviewStatus;

const STATUS_LABEL: Record<ReviewStatus, string> = { new: "Nieuw", published: "Gepubliceerd", hidden: "Verborgen" };

const statusVariant = (status: string): "default" | "secondary" | "outline" =>
  status === "published" ? "default" : status === "hidden" ? "outline" : "secondary";

const kanPubliceren = (r: ReviewRow) => r.consent_publish || r.source !== "portal";
const pct = (v: number | null) => (v === null ? "–" : `${v}%`);
const kort = (iso: string) => format(new Date(iso), "d MMM", { locale: nl });

const AdminReviews = () => {
  const [searchParams] = useSearchParams();
  const aanvraagFilter = searchParams.get("aanvraag");
  const [filter, setFilter] = useState<Filter>("alle");
  const [citaatVoor, setCitaatVoor] = useState<ReviewRow | null>(null);
  const [citaatTekst, setCitaatTekst] = useState("");
  const [tagsTekst, setTagsTekst] = useState("");
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-customer-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_reviews")
        .select("*, program_requests(id, reference_number, customer_name, customer_company)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReviewRow[];
    },
  });

  // Trechter (fase 4): nazorgmails uit het maillog, referentiepagina's uit de tabel, Google uit de cache.
  const { data: nazorgVerstuurd = [] } = useQuery({
    queryKey: ["admin-aftersales-sent"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_log").select("created_at").eq("email_type", "customer_aftersales_review").eq("status", "sent");
      if (error) throw error;
      return (data ?? []).map((r) => r.created_at);
    },
  });
  const { data: referentiesOnline = [] } = useQuery({
    queryKey: ["admin-reference-cases-published"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reference_cases").select("published_at").eq("status", "published");
      if (error) throw error;
      return (data ?? []).map((r) => r.published_at).filter((v): v is string => Boolean(v));
    },
  });
  const { data: google } = useGoogleReviewsCache();
  const trechter = useMemo(
    () => buildFunnel({ reviews: rows, aftersalesSentAt: nazorgVerstuurd, referencesPublishedAt: referentiesOnline, now: new Date() }),
    [rows, nazorgVerstuurd, referentiesOnline],
  );
  const perMaand = useMemo(() => googleReviewsPerMonth(google?.reviews ?? [], new Date()), [google]);

  const zichtbaar = useMemo(
    () =>
      rows.filter((r) => (filter === "alle" || r.status === filter) && (!aanvraagFilter || r.request_id === aanvraagFilter)),
    [rows, filter, aanvraagFilter],
  );

  const tellingen = useMemo(() => {
    const t: Record<Filter, number> = { alle: rows.length, new: 0, published: 0, hidden: 0 };
    for (const r of rows) t[r.status as ReviewStatus] = (t[r.status as ReviewStatus] ?? 0) + 1;
    return t;
  }, [rows]);

  const bijwerken = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Database["public"]["Tables"]["customer_reviews"]["Update"] }) => {
      const { error } = await supabase.from("customer_reviews").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-customer-reviews"] });
    },
    onError: (e: Error) => toast({ title: "Opslaan mislukt", description: e.message, variant: "destructive" }),
  });

  const herinner = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke<{ sent: number; skipped: number; failed: number; error?: string }>("send-review-reminder", {
        body: { review_id: id, origin: window.location.origin, sent_by: "admin" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.sent) throw new Error("Niet verstuurd: geen e-mailadres, geannuleerd programma of een fout bij Mailjet.");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-customer-reviews"] });
      toast({ title: "Herinnering verstuurd" });
    },
    onError: (e: Error) => toast({ title: "Herinnering niet verstuurd", description: e.message, variant: "destructive" }),
  });

  const zetStatus = (r: ReviewRow, status: ReviewStatus) => {
    if (status === "published" && !kanPubliceren(r)) {
      toast({ title: "Geen toestemming", description: "De klant gaf geen toestemming om deze beoordeling op de website te tonen." });
      return;
    }
    bijwerken.mutate({ id: r.id, patch: { status } });
  };

  const openCitaat = (r: ReviewRow) => {
    setCitaatVoor(r);
    setCitaatTekst(r.quote ?? r.text_positive);
    setTagsTekst(r.tags.join(", "));
  };

  const bewaarCitaat = () => {
    if (!citaatVoor) return;
    const tekst = citaatTekst.trim();
    const tags = tagsTekst
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    bijwerken.mutate(
      { id: citaatVoor.id, patch: { quote: tekst && tekst !== citaatVoor.text_positive ? tekst : null, tags } },
      { onSuccess: () => setCitaatVoor(null) },
    );
  };

  const metScore = rows.filter((r) => r.rating !== null);
  const gemiddelde = metScore.length ? metScore.reduce((a, r) => a + (r.rating ?? 0), 0) / metScore.length : null;

  return (
    <AdminLayout>
      <Helmet>
        <title>Beoordelingen – Admin</title>
      </Helmet>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Beoordelingen</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Wat klanten na afloop invulden via de beoordelingspagina. Publiceren kan alleen met toestemming van de klant.
            </p>
          </div>
          {gemiddelde !== null && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RatingStars value={gemiddelde} small />
              <span>
                {gemiddelde.toFixed(1).replace(".", ",")} gemiddeld over {metScore.length}
              </span>
            </div>
          )}
        </div>

        {aanvraagFilter && (
          <p className="text-sm text-muted-foreground">
            Alleen de beoordeling van één programma.{" "}
            <Link to="/admin/beoordelingen" className="underline underline-offset-2">
              Alle beoordelingen
            </Link>
          </p>
        )}

        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Trechter</CardTitle>
              <CardDescription>Van nazorgmail tot referentiepagina. Doel: minstens 40 procent van de verstuurde mails ingevuld.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stap</TableHead>
                    <TableHead className="text-right">Laatste 90 dagen</TableHead>
                    <TableHead className="text-right">Totaal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trechter.map((r) => (
                    <TableRow key={r.key}>
                      <TableCell>{r.label}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.recent}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.total}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-medium">Ingevuld na een nazorgmail</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{pct(responsePercentage(trechter, "recent"))}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{pct(responsePercentage(trechter, "total"))}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Google-reviews per maand</CardTitle>
              <CardDescription>
                {google?.review_count
                  ? `${google.review_count} reviews op Google, gemiddeld ${google.rating ? google.rating.toFixed(1).replace(".", ",") : "–"}.`
                  : "Uit de Google-cache."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  {perMaand.map((m) => (
                    <TableRow key={m.month}>
                      <TableCell>{m.label}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-2 text-xs text-muted-foreground">Telt alleen de recente reviews die Google in de cache meegeeft; het totaal hierboven is wel volledig.</p>
            </CardContent>
          </Card>
        </div>

        {!aanvraagFilter && <AftersalesCatchUpCard />}

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
            <div className="min-w-0 flex-1 space-y-1.5">
              <CardTitle className="text-base">Ingevulde beoordelingen</CardTitle>
              <CardDescription>
                "Wat kan beter?" is alleen voor ons en komt nooit op de website. Een eigen citaat vervangt de tekst op de site, niet in het
                archief.
              </CardDescription>
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="shrink-0">
              <TabsList>
                {(["alle", "new", "published", "hidden"] as Filter[]).map((f) => (
                  <TabsTrigger key={f} value={f}>
                    {f === "alle" ? "Alle" : STATUS_LABEL[f]} ({tellingen[f] ?? 0})
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Laden…
              </div>
            ) : zichtbaar.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nog geen beoordelingen{filter !== "alle" ? " in deze groep" : ""}. Ze verschijnen hier zodra een klant de
                beoordelingspagina uit de nazorgmail invult.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Klant</TableHead>
                    <TableHead className="min-w-[280px]">Beoordeling</TableHead>
                    <TableHead>Toestemming</TableHead>
                    <TableHead>Google / herinnering</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zichtbaar.map((r) => {
                    const project = r.program_requests;
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="whitespace-nowrap text-xs text-muted-foreground">
                            {format(new Date(r.created_at), "d MMM yyyy", { locale: nl })}
                          </div>
                          <div className="font-medium">{r.company || r.author_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.author_name}
                            {r.author_role ? `, ${r.author_role}` : ""}
                          </div>
                          {project && (
                            <Link
                              to={`/admin/projecten/${project.id}`}
                              className="mt-1 inline-flex items-center gap-1 whitespace-nowrap text-xs text-primary underline-offset-2 hover:underline"
                            >
                              {project.reference_number ?? "Project"}
                              <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </Link>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.rating !== null && (
                            <div className="mb-1">
                              <RatingStars value={r.rating} small />
                            </div>
                          )}
                          {r.quote && (
                            <p className="mb-1 flex items-start gap-1 font-medium">
                              <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                              {r.quote}
                            </p>
                          )}
                          <p className={r.quote ? "text-muted-foreground" : ""}>{r.text_positive || <em>Geen tekst</em>}</p>
                          {r.text_improve && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              <span className="font-medium">Kan beter:</span> {r.text_improve}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {r.source !== "portal" && <Badge variant="outline" className="whitespace-nowrap">Bestaand citaat</Badge>}
                            {r.consent_publish && <Badge variant="secondary" className="whitespace-nowrap">Website</Badge>}
                            {r.consent_reference && <Badge variant="secondary" className="whitespace-nowrap">Referentiepagina</Badge>}
                            {!r.consent_publish && !r.consent_reference && <span className="text-xs text-muted-foreground">Geen</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.google_clicked_at ? (
                            <span className="inline-flex items-center gap-1">
                              <Star className="h-3 w-3" aria-hidden="true" />
                              Geklikt {kort(r.google_clicked_at)}
                            </span>
                          ) : r.reminder_sent_at ? (
                            <span>Herinnerd {kort(r.reminder_sent_at)}</span>
                          ) : r.reminder_skipped_at ? (
                            <span>Geen herinnering</span>
                          ) : r.source === "portal" ? (
                            <div className="flex flex-col items-start gap-1">
                              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => herinner.mutate(r.id)} disabled={herinner.isPending}>
                                Herinner nu
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => bijwerken.mutate({ id: r.id, patch: { reminder_skipped_at: new Date().toISOString() } })}
                                disabled={bijwerken.isPending}
                              >
                                Overslaan
                              </Button>
                            </div>
                          ) : (
                            "–"
                          )}
                        </TableCell>
                        <TableCell>
                          <Select value={r.status} onValueChange={(v) => zetStatus(r, v as ReviewStatus)}>
                            <SelectTrigger className="h-8 w-[150px]">
                              <SelectValue>
                                <Badge variant={statusVariant(r.status)}>{STATUS_LABEL[r.status as ReviewStatus] ?? r.status}</Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">Nieuw</SelectItem>
                              <SelectItem value="published" disabled={!kanPubliceren(r)}>
                                Gepubliceerd
                              </SelectItem>
                              <SelectItem value="hidden">Verborgen</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-2">
                            {r.consent_reference && r.request_id && (
                              <Button asChild variant="secondary" size="sm">
                                <Link to={`/admin/referenties?beoordeling=${r.id}`}>Referentie</Link>
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => openCitaat(r)}>
                              Citaat
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={citaatVoor !== null} onOpenChange={(open) => !open && setCitaatVoor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Citaat voor de website</DialogTitle>
            <DialogDescription>
              Kort de tekst hooguit in; herschrijf hem niet. Leeg laten of gelijk aan de originele tekst = de volledige tekst tonen.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={citaatTekst} onChange={(e) => setCitaatTekst(e.target.value)} rows={6} maxLength={2000} />
          <div className="space-y-1.5">
            <Label htmlFor="citaat-tags">Tags</Label>
            <Input id="citaat-tags" value={tagsTekst} onChange={(e) => setTagsTekst(e.target.value)} placeholder="bedrijfsuitje-vlieland, zeehondentocht" />
            <p className="text-xs text-muted-foreground">
              Kommagescheiden. De slug van een landingspagina of het id van een bouwsteen zet deze beoordeling vooraan op die pagina; via de
              instappagina van de aanvraag gebeurt dat al vanzelf.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCitaatVoor(null)}>
              Annuleren
            </Button>
            <Button onClick={bewaarCitaat} disabled={bijwerken.isPending}>
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminReviews;
