import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Download, ExternalLink, Loader2, Plus, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { WeddingReferralFeeSchedulesCard } from "@/components/admin/WeddingReferralFeeSchedulesCard";
import { WeddingReferralSheet } from "@/components/admin/WeddingReferralSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useWeddingFeeSchedules,
  useWeddingReferralPartners,
  useWeddingReferrals,
  type WeddingReferralRow,
} from "@/hooks/useWeddingReferrals";
import {
  INVOICE_STATUSES,
  INVOICE_STATUS_LABEL,
  REFERRAL_STATUSES,
  REFERRAL_STATUS_LABEL,
  buildControlList,
  controlListCsv,
  formatEuro,
  formatWeddingDate,
  isDueForAnonymization,
  seasonOf,
  summarizeBySeason,
  toIsoDate,
  type InvoiceStatus,
  type ReferralStatus,
} from "@/lib/weddingReferrals";

/**
 * Operationeel → Bruiloften (docs/plan-bruiloftsdoorverwijzingen.md, fase 1).
 * Bureau Vlieland voert geen bruiloften meer uit; aanvragen gaan naar een
 * partner en per geboekte bruiloft ontvangt het bureau een vaste vergoeding.
 * Hier staan de doorverwijzingen, de samenvatting per partner per seizoen,
 * de controlelijst voor na het seizoen en de staffel.
 */
const ALLE = "alle";

const statusVariant = (status: string): "default" | "secondary" | "outline" | "destructive" =>
  status === "booked" ? "default" : status === "referred" ? "secondary" : status === "expired" ? "destructive" : "outline";

const invoiceVariant = (status: string): "default" | "secondary" | "outline" =>
  status === "paid" ? "default" : status === "not_applicable" ? "outline" : "secondary";

const kort = (iso: string) => format(parseISO(iso), "d MMM yyyy", { locale: nl });

function downloadCsv(inhoud: string, bestandsnaam: string) {
  const blob = new Blob(["﻿" + inhoud], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = bestandsnaam;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const AdminWeddingReferrals = () => {
  const today = toIsoDate(new Date());
  const { data: rows = [], isLoading } = useWeddingReferrals();
  const { data: schedules = [] } = useWeddingFeeSchedules();
  const { data: partners = [] } = useWeddingReferralPartners();

  const [partnerFilter, setPartnerFilter] = useState(ALLE);
  const [statusFilter, setStatusFilter] = useState(ALLE);
  const [invoiceFilter, setInvoiceFilter] = useState(ALLE);
  const [seizoenFilter, setSeizoenFilter] = useState(ALLE);
  const [controlePartner, setControlePartner] = useState<string>("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [geselecteerd, setGeselecteerd] = useState<WeddingReferralRow | null>(null);

  const partnerNaam = useMemo(() => Object.fromEntries(partners.map((p) => [p.id, p.name])), [partners]);
  const seizoenen = useMemo(() => [...new Set(rows.map(seasonOf))].sort((a, b) => b - a), [rows]);
  const partnersMetDoorverwijzingen = useMemo(() => {
    const ids = new Set(rows.map((r) => r.partner_id));
    return partners.filter((p) => p.receives_wedding_referrals || ids.has(p.id));
  }, [partners, rows]);

  const zichtbaar = useMemo(
    () =>
      rows.filter(
        (r) =>
          (partnerFilter === ALLE || r.partner_id === partnerFilter) &&
          (statusFilter === ALLE || r.status === statusFilter) &&
          (invoiceFilter === ALLE || r.invoice_status === invoiceFilter) &&
          (seizoenFilter === ALLE || String(seasonOf(r)) === seizoenFilter),
      ),
    [rows, partnerFilter, statusFilter, invoiceFilter, seizoenFilter],
  );

  const samenvatting = useMemo(() => summarizeBySeason(rows, partnerNaam), [rows, partnerNaam]);
  const controlelijst = useMemo(() => buildControlList(rows, today, controlePartner || undefined), [rows, today, controlePartner]);
  const teAnonimiseren = useMemo(() => rows.filter((r) => isDueForAnonymization(r, today)).length, [rows, today]);
  const staffelsInGebruik = useMemo(() => new Set(rows.map((r) => r.fee_schedule_id).filter((id): id is string => Boolean(id))), [rows]);

  const openNieuw = () => {
    setGeselecteerd(null);
    setSheetOpen(true);
  };
  const openBewerken = (r: WeddingReferralRow) => {
    setGeselecteerd(r);
    setSheetOpen(true);
  };

  const exporteerControlelijst = () => {
    if (!controlePartner) {
      toast.error("Kies eerst een partner.");
      return;
    }
    const naam = partnerNaam[controlePartner] ?? controlePartner;
    downloadCsv(controlListCsv(controlelijst, naam), `controlelijst-bruiloften-${naam.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${today}.csv`);
    toast.success("Controlelijst gedownload");
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Bruiloften – Admin</title>
      </Helmet>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bruiloften</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Doorverwezen bruiloftsaanvragen en de doorverwijsvergoeding per geboekte bruiloft. Alleen partners met de instelling "ontvangt
              bruiloftsdoorverwijzingen" zijn te kiezen.
            </p>
          </div>
          <Button onClick={openNieuw}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Nieuwe doorverwijzing
          </Button>
        </div>

        {teAnonimiseren > 0 && (
          <p className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground">
            <ShieldOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            {teAnonimiseren === 1 ? "Eén doorverwijzing is" : `${teAnonimiseren} doorverwijzingen zijn`} meer dan twee jaar afgerond en
            {teAnonimiseren === 1 ? " kan" : " kunnen"} geanonimiseerd worden. Open de doorverwijzing en kies "Anonimiseren".
          </p>
        )}

        <Tabs defaultValue="doorverwijzingen">
          <TabsList>
            <TabsTrigger value="doorverwijzingen">Doorverwijzingen ({rows.length})</TabsTrigger>
            <TabsTrigger value="seizoen">Per seizoen</TabsTrigger>
            <TabsTrigger value="controle">Controlelijst</TabsTrigger>
            <TabsTrigger value="staffel">Staffel</TabsTrigger>
          </TabsList>

          <TabsContent value="doorverwijzingen" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alle doorverwijzingen</CardTitle>
                <CardDescription>Klik op een regel om te bewerken. Zonder boeking vervalt een doorverwijzing 18 maanden na de datum doorverwezen.</CardDescription>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Select value={partnerFilter} onValueChange={setPartnerFilter}>
                    <SelectTrigger className="w-[190px]">
                      <SelectValue placeholder="Partner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALLE}>Alle partners</SelectItem>
                      {partnersMetDoorverwijzingen.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALLE}>Alle statussen</SelectItem>
                      {REFERRAL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {REFERRAL_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Factuurstatus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALLE}>Alle factuurstatussen</SelectItem>
                      {INVOICE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {INVOICE_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={seizoenFilter} onValueChange={setSeizoenFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Seizoen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALLE}>Alle seizoenen</SelectItem>
                      {seizoenen.map((j) => (
                        <SelectItem key={j} value={String(j)}>
                          {j}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Laden…
                  </div>
                ) : zichtbaar.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {rows.length === 0 ? "Nog geen doorverwijzingen. Maak de eerste aan met de knop rechtsboven." : "Geen doorverwijzingen binnen deze filters."}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">Bruidspaar</TableHead>
                        <TableHead>Partner</TableHead>
                        <TableHead>Doorverwezen</TableHead>
                        <TableHead>Trouwdatum</TableHead>
                        <TableHead className="text-right">Gasten</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Vergoeding</TableHead>
                        <TableHead>Factuur</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {zichtbaar.map((r) => (
                        <TableRow key={r.id} className="cursor-pointer" onClick={() => openBewerken(r)}>
                          <TableCell>
                            <div className="font-medium">{r.couple_names}</div>
                            <div className="text-xs text-muted-foreground">
                              {r.anonymized_at ? "Geanonimiseerd" : (r.couple_email ?? "")}
                              {r.request_id && (
                                <Link
                                  to={`/admin/projecten/${r.request_id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="ml-2 inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                                >
                                  Project
                                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                </Link>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{partnerNaam[r.partner_id] ?? r.partner_id}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {kort(r.referred_at)}
                            {r.status === "referred" && <div className="text-xs text-muted-foreground">vervalt {kort(r.expires_at)}</div>}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{formatWeddingDate(r)}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.final_day_guests ?? r.estimated_guests ?? "–"}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(r.status)}>{REFERRAL_STATUS_LABEL[r.status as ReferralStatus] ?? r.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatEuro(r.fee_amount)}
                            {r.fee_override_note && <div className="text-xs text-muted-foreground">afwijkend</div>}
                          </TableCell>
                          <TableCell>
                            {r.status === "booked" ? (
                              <>
                                <Badge variant={invoiceVariant(r.invoice_status)}>{INVOICE_STATUS_LABEL[r.invoice_status as InvoiceStatus] ?? r.invoice_status}</Badge>
                                {r.invoice_number && <div className="mt-1 text-xs text-muted-foreground">{r.invoice_number}</div>}
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">–</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seizoen" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Per partner per seizoen</CardTitle>
                <CardDescription>Seizoen = jaar van de (verwachte) trouwdatum. Bedragen excl. btw, alleen van geboekte bruiloften.</CardDescription>
              </CardHeader>
              <CardContent>
                {samenvatting.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nog niets samen te vatten.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Seizoen</TableHead>
                        <TableHead>Partner</TableHead>
                        <TableHead className="text-right">Doorverwezen</TableHead>
                        <TableHead className="text-right">Geboekt</TableHead>
                        <TableHead className="text-right">Niet doorgegaan</TableHead>
                        <TableHead className="text-right">Vervallen</TableHead>
                        <TableHead className="text-right">Te factureren</TableHead>
                        <TableHead className="text-right">Gefactureerd</TableHead>
                        <TableHead className="text-right">Betaald</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {samenvatting.map((s) => (
                        <TableRow key={`${s.partnerId}-${s.season}`}>
                          <TableCell className="tabular-nums">{s.season}</TableCell>
                          <TableCell>{s.partnerName}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.referred}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.booked}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.notProceeded}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.expired}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatEuro(s.toInvoice)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatEuro(s.invoiced)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatEuro(s.paid)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-medium">
                        <TableCell colSpan={2}>Totaal</TableCell>
                        <TableCell className="text-right tabular-nums">{samenvatting.reduce((a, s) => a + s.referred, 0)}</TableCell>
                        <TableCell className="text-right tabular-nums">{samenvatting.reduce((a, s) => a + s.booked, 0)}</TableCell>
                        <TableCell className="text-right tabular-nums">{samenvatting.reduce((a, s) => a + s.notProceeded, 0)}</TableCell>
                        <TableCell className="text-right tabular-nums">{samenvatting.reduce((a, s) => a + s.expired, 0)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatEuro(samenvatting.reduce((a, s) => a + s.toInvoice, 0))}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatEuro(samenvatting.reduce((a, s) => a + s.invoiced, 0))}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatEuro(samenvatting.reduce((a, s) => a + s.paid, 0))}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="controle" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
                <div className="space-y-1.5">
                  <CardTitle className="text-base">Controlelijst</CardTitle>
                  <CardDescription>
                    Doorverwijzingen waarvan de (verwachte) trouwdatum verstreken is en de status nog "doorverwezen" is. Na het seizoen ter bevestiging naar de
                    partner: geboekt, niet doorgegaan, of nog open.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={controlePartner} onValueChange={setControlePartner}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Kies een partner" />
                    </SelectTrigger>
                    <SelectContent>
                      {partnersMetDoorverwijzingen.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={exporteerControlelijst} disabled={!controlePartner || controlelijst.length === 0}>
                    <Download className="mr-1 h-4 w-4" aria-hidden="true" />
                    Exporteer CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {controlelijst.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {controlePartner ? "Niets te controleren voor deze partner." : "Kies een partner, of bekijk hieronder alle partners: niets staat open."}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {!controlePartner && <TableHead>Partner</TableHead>}
                        <TableHead>Bruidspaar</TableHead>
                        <TableHead>Doorverwezen</TableHead>
                        <TableHead>Verwachte trouwdatum</TableHead>
                        <TableHead className="text-right">Geschat</TableHead>
                        <TableHead>Vervalt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {controlelijst.map((r) => (
                        <TableRow key={r.id} className="cursor-pointer" onClick={() => openBewerken(r)}>
                          {!controlePartner && <TableCell>{partnerNaam[r.partner_id] ?? r.partner_id}</TableCell>}
                          <TableCell>
                            <div className="font-medium">{r.couple_names}</div>
                            <div className="text-xs text-muted-foreground">{r.couple_email ?? ""}</div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{kort(r.referred_at)}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatWeddingDate(r)}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.estimated_guests ?? "–"}</TableCell>
                          <TableCell className="whitespace-nowrap">{kort(r.expires_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staffel" className="mt-4">
            <WeddingReferralFeeSchedulesCard schedules={schedules} inUse={staffelsInGebruik} />
          </TabsContent>
        </Tabs>
      </div>

      <WeddingReferralSheet open={sheetOpen} onOpenChange={setSheetOpen} referral={geselecteerd} partners={partners} schedules={schedules} />
    </AdminLayout>
  );
};

export default AdminWeddingReferrals;
