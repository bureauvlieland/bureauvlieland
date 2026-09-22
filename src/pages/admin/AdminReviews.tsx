import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ExternalLink, Loader2, MessageSquareQuote, Star } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RatingStars } from "@/components/RatingStars";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";

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

const AdminReviews = () => {
  const [searchParams] = useSearchParams();
  const aanvraagFilter = searchParams.get("aanvraag");
  const [filter, setFilter] = useState<Filter>("alle");
  const [citaatVoor, setCitaatVoor] = useState<ReviewRow | null>(null);
  const [citaatTekst, setCitaatTekst] = useState("");
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
  };

  const bewaarCitaat = () => {
    if (!citaatVoor) return;
    const tekst = citaatTekst.trim();
    bijwerken.mutate(
      { id: citaatVoor.id, patch: { quote: tekst && tekst !== citaatVoor.text_positive ? tekst : null } },
      { onSuccess: () => setCitaatVoor(null) },
    );
  };

  const gemiddelde = rows.length ? rows.reduce((a, r) => a + r.rating, 0) / rows.length : null;

  return (
    <AdminLayout>
      <Helmet>
        <title>Beoordelingen – Admin</title>
      </Helmet>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Beoordelingen</h1>
            <p className="text-sm text-muted-foreground">
              Wat klanten na afloop invulden via de beoordelingspagina. Publiceren kan alleen met toestemming van de klant.
            </p>
          </div>
          {gemiddelde !== null && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RatingStars value={gemiddelde} small />
              <span>
                {gemiddelde.toFixed(1).replace(".", ",")} gemiddeld over {rows.length}
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

        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            {(["alle", "new", "published", "hidden"] as Filter[]).map((f) => (
              <TabsTrigger key={f} value={f}>
                {f === "alle" ? "Alle" : STATUS_LABEL[f]} ({tellingen[f] ?? 0})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingevulde beoordelingen</CardTitle>
            <CardDescription>
              "Wat kan beter?" is alleen voor ons en komt nooit op de website. Een eigen citaat vervangt de tekst op de site, niet in het
              archief.
            </CardDescription>
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
                    <TableHead>Datum</TableHead>
                    <TableHead>Klant</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="min-w-[280px]">Beoordeling</TableHead>
                    <TableHead>Toestemming</TableHead>
                    <TableHead>Google</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zichtbaar.map((r) => {
                    const project = r.program_requests;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {format(new Date(r.created_at), "d MMM yyyy", { locale: nl })}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{r.company || r.author_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.author_name}
                            {r.author_role ? `, ${r.author_role}` : ""}
                          </div>
                          {project && (
                            <Link
                              to={`/admin/projecten/${project.id}`}
                              className="mt-1 inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
                            >
                              {project.reference_number ?? "Project"}
                              <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </Link>
                          )}
                        </TableCell>
                        <TableCell>
                          <RatingStars value={r.rating} small />
                        </TableCell>
                        <TableCell className="text-sm">
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
                            {r.consent_publish && <Badge variant="secondary">Website</Badge>}
                            {r.consent_reference && <Badge variant="secondary">Referentiepagina</Badge>}
                            {!r.consent_publish && !r.consent_reference && <span className="text-xs text-muted-foreground">Geen</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.google_clicked_at ? (
                            <span className="inline-flex items-center gap-1">
                              <Star className="h-3 w-3" aria-hidden="true" />
                              {format(new Date(r.google_clicked_at), "d MMM", { locale: nl })}
                            </span>
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
                          <Button variant="outline" size="sm" onClick={() => openCitaat(r)}>
                            Citaat
                          </Button>
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
