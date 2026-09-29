import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Eye, Loader2, Plus } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PartnerAgreementSheet } from "@/components/admin/PartnerAgreementSheet";
import { MarkdownText } from "@/components/shared/MarkdownText";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useAgreementPartners,
  useDeletePartnerAgreement,
  usePartnerAgreementAcceptances,
  usePartnerAgreements,
  useSetPartnerAgreementStatus,
  type PartnerAgreementRow,
} from "@/hooks/usePartnerAgreements";
import {
  AGREEMENT_STATE_LABEL,
  AGREEMENT_STATUS_LABEL,
  APPLIES_TO_LABEL,
  acceptanceMatrix,
  daysOpen,
  type AgreementAppliesTo,
  type AgreementState,
  type AgreementStatus,
} from "@/lib/partnerAgreements";
import { toIsoDate } from "@/lib/weddingReferrals";

/**
 * Systeem → Partnerafspraken (docs/plan-bruiloftsdoorverwijzingen.md →
 * Partnerafspraken). Afspraken per versie, publiceren, en per afspraak wie
 * akkoord is en wie nog niet.
 */
const kort = (iso: string) => format(parseISO(iso), "d MMM yyyy", { locale: nl });

const statusVariant = (s: string): "default" | "secondary" | "outline" => (s === "published" ? "default" : s === "draft" ? "secondary" : "outline");
const stateVariant = (s: AgreementState): "default" | "secondary" | "destructive" => (s === "accepted" ? "default" : s === "outdated" ? "secondary" : "destructive");

const AdminPartnerAgreements = () => {
  const today = toIsoDate(new Date());
  const { data: agreements = [], isLoading } = usePartnerAgreements();
  const { data: acceptances = [] } = usePartnerAgreementAcceptances();
  const { data: partners = [] } = useAgreementPartners();
  const zetStatus = useSetPartnerAgreementStatus();
  const verwijder = useDeletePartnerAgreement();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetAgreement, setSheetAgreement] = useState<PartnerAgreementRow | null>(null);
  const [alsNieuweVersie, setAlsNieuweVersie] = useState(false);
  const [bekijk, setBekijk] = useState<PartnerAgreementRow | null>(null);
  const [publiceer, setPubliceer] = useState<PartnerAgreementRow | null>(null);

  const matrix = useMemo(() => acceptanceMatrix(agreements, acceptances, partners), [agreements, acceptances, partners]);
  const perSleutel = useMemo(() => {
    const map = new Map<string, PartnerAgreementRow[]>();
    for (const a of agreements) map.set(a.key, [...(map.get(a.key) ?? []), a]);
    return [...map.entries()].map(([key, versies]) => ({ key, versies: versies.sort((a, b) => b.version - a.version) }));
  }, [agreements]);

  const openSheet = (agreement: PartnerAgreementRow | null, nieuweVersie: boolean) => {
    setSheetAgreement(agreement);
    setAlsNieuweVersie(nieuweVersie);
    setSheetOpen(true);
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Partnerafspraken – Admin</title>
      </Helmet>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Partnerafspraken</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Afspraken die partners in hun portaal lezen en accepteren. Vastgelegd worden wie, wanneer, welke versie en de tekst op dat moment. Een wijziging
              is een nieuwe versie; eerdere akkoorden blijven staan.
            </p>
          </div>
          <Button onClick={() => openSheet(null, false)}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Nieuwe afspraak
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Laden…
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Wie is akkoord</CardTitle>
                <CardDescription>Per gepubliceerde afspraak (laatste versie) de stand van elke partner waarvoor hij geldt. Een partner krijgt in het portaal een melding zolang hij open staat.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {matrix.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Nog geen gepubliceerde afspraak. Publiceer een concept hieronder.</p>
                ) : (
                  matrix.map((rij) => (
                    <div key={rij.agreement.id} className="space-y-2">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                          <span className="font-medium">{rij.agreement.title}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            versie {rij.agreement.version}, geldt vanaf {kort(rij.agreement.effective_from)}, {daysOpen(rij.agreement, today)} dagen gepubliceerd
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {rij.accepted} akkoord, {rij.open} open
                        </span>
                      </div>
                      {rij.partners.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Geen partner waarvoor deze afspraak geldt.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Partner</TableHead>
                              <TableHead>Stand</TableHead>
                              <TableHead>Akkoord op</TableHead>
                              <TableHead>Door</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rij.partners.map((p) => (
                              <TableRow key={p.partner.id}>
                                <TableCell>
                                  <Link to={`/admin/partners/${p.partner.id}`} className="underline-offset-2 hover:underline">
                                    {p.partner.name}
                                  </Link>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={stateVariant(p.state)}>{AGREEMENT_STATE_LABEL[p.state]}</Badge>
                                  {p.state === "outdated" && p.previous && <span className="ml-2 text-xs text-muted-foreground">versie {p.previous.version} op {kort(p.previous.accepted_at.slice(0, 10))}</span>}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">{p.acceptance ? format(parseISO(p.acceptance.accepted_at), "d MMM yyyy HH:mm", { locale: nl }) : "–"}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{p.acceptance?.accepted_by_email || "–"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Afspraken en versies</CardTitle>
                <CardDescription>Een concept kun je bewerken en publiceren. Van een gepubliceerde versie maak je een nieuwe versie; intrekken haalt hem uit het portaal.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {perSleutel.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Nog geen afspraken.</p>
                ) : (
                  perSleutel.map(({ key, versies }) => (
                    <div key={key} className="space-y-2">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                          <span className="font-medium">{versies[0].title}</span>
                          <span className="ml-2 font-mono text-xs text-muted-foreground">{key}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{APPLIES_TO_LABEL[versies[0].applies_to as AgreementAppliesTo] ?? versies[0].applies_to}</span>
                        </div>
                        {versies.some((v) => v.status === "published") && !versies.some((v) => v.status === "draft") && (
                          <Button size="sm" variant="outline" onClick={() => openSheet(versies.find((v) => v.status === "published") ?? versies[0], true)}>
                            Nieuwe versie
                          </Button>
                        )}
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Versie</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Ingang</TableHead>
                            <TableHead>Toelichting</TableHead>
                            <TableHead className="text-right">Acties</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {versies.map((v) => (
                            <TableRow key={v.id}>
                              <TableCell className="tabular-nums">{v.version}</TableCell>
                              <TableCell>
                                <Badge variant={statusVariant(v.status)}>{AGREEMENT_STATUS_LABEL[v.status as AgreementStatus] ?? v.status}</Badge>
                                {v.published_at && <div className="mt-1 text-xs text-muted-foreground">gepubliceerd {kort(v.published_at.slice(0, 10))}</div>}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{kort(v.effective_from)}</TableCell>
                              <TableCell className="max-w-[360px] text-sm text-muted-foreground">{v.summary}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex flex-wrap justify-end gap-2">
                                  <Button size="sm" variant="ghost" onClick={() => setBekijk(v)}>
                                    <Eye className="mr-1 h-4 w-4" aria-hidden="true" />
                                    Lezen
                                  </Button>
                                  {v.status === "draft" && (
                                    <>
                                      <Button size="sm" variant="outline" onClick={() => openSheet(v, false)}>
                                        Bewerken
                                      </Button>
                                      <Button size="sm" onClick={() => setPubliceer(v)} disabled={zetStatus.isPending}>
                                        Publiceren
                                      </Button>
                                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => verwijder.mutate(v.id)} disabled={verwijder.isPending}>
                                        Verwijderen
                                      </Button>
                                    </>
                                  )}
                                  {v.status === "published" && (
                                    <Button size="sm" variant="ghost" onClick={() => zetStatus.mutate({ id: v.id, status: "withdrawn" })} disabled={zetStatus.isPending}>
                                      Intrekken
                                    </Button>
                                  )}
                                  {v.status === "withdrawn" && (
                                    <Button size="sm" variant="ghost" onClick={() => zetStatus.mutate({ id: v.id, status: "published" })} disabled={zetStatus.isPending}>
                                      Opnieuw publiceren
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <PartnerAgreementSheet open={sheetOpen} onOpenChange={setSheetOpen} agreement={sheetAgreement} asNewVersion={alsNieuweVersie} allAgreements={agreements} />

      <Dialog open={bekijk !== null} onOpenChange={(o) => !o && setBekijk(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {bekijk?.title} <span className="text-sm font-normal text-muted-foreground">versie {bekijk?.version}</span>
            </DialogTitle>
            <DialogDescription>
              Geldt vanaf {bekijk ? kort(bekijk.effective_from) : ""}. {bekijk?.summary}
            </DialogDescription>
          </DialogHeader>
          {bekijk && <MarkdownText>{bekijk.body_markdown}</MarkdownText>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={publiceer !== null} onOpenChange={(o) => !o && setPubliceer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Versie {publiceer?.version} publiceren?</AlertDialogTitle>
            <AlertDialogDescription>
              Partners waarvoor deze afspraak geldt zien hem direct in hun portaal met het verzoek om akkoord. De tekst is daarna niet meer te wijzigen; een
              aanpassing wordt een nieuwe versie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (publiceer) zetStatus.mutate({ id: publiceer.id, status: "published" });
                setPubliceer(null);
              }}
            >
              Publiceren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminPartnerAgreements;
