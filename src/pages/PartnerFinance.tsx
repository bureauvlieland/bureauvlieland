import { useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerPage } from "@/components/partner-portal/PartnerPage";
import { usePartnerPortal, usePartnerCommissionInvoices } from "@/hooks/usePartnerPortal";
import { PartnerMonthlyRevenueChart } from "@/components/partner-portal/PartnerMonthlyRevenueChart";
import { ExportInvoicesButton } from "@/components/partner-portal/ExportInvoicesButton";
import { Button } from "@/components/ui/button";
import { EmptyState, FactList, Notice, Pill, PortalTabs, type PillTone, type PortalTab } from "@/components/system";
import { InvoiceRegistrationDialog, type InvoiceTarget } from "@/components/partner-portal/InvoiceRegistrationDialog";
import { RegisterCollectivePartnerInvoiceDialog, type CollectiveInvoiceSubmitPayload } from "@/components/partner-portal/RegisterCollectivePartnerInvoiceDialog";
import { UploadInvoicePdfPartnerDialog, type UploadPdfTarget } from "@/components/partner-portal/UploadInvoicePdfPartnerDialog";
import { MissingPdfBanner } from "@/components/partner-portal/MissingPdfBanner";
import { PartnerCommissionInvoiceList } from "@/components/partner-portal/PartnerCommissionInvoiceList";
import { summarizePartnerCommissionInvoices } from "@/lib/partnerCommissionInvoices";
import { sumPendingCommission } from "@/lib/partnerPendingCommission";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, FileText, Mail, Receipt, Upload } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import type { PartnerItem, PartnerAccommodationQuote } from "@/types/partner";
import { useAppSettings } from "@/hooks/useAppSettings";
import { reportError } from "@/lib/errorReporting";
import { canPartnerInvoiceItem } from "@/lib/partnerInvoicing";
import { getPartnerBillableAmount, isPartnerEstimatedAmount } from "@/lib/partnerBillableAmount";
import { PURCHASE_INVOICE_INBOX } from "@/lib/bureauContact";
import { formatEuro } from "@/lib/formatEuro";

/**
 * Facturatie (partnerportaal fase 3): de cijfers als `FactList` "In het
 * kort" naast de maandgrafiek, de drie tabbladen in de URL op `PortalTabs`,
 * elke factuur als dezelfde kaart met `Pill`s, en één factuurdialoog voor
 * onderdelen en logies. De jaarcijfers staan sinds fase 1 hier.
 */
type FinanceTab = "to-invoice" | "invoiced" | "commission";

const COMMISSION_PILL: Record<string, { label: string; tone: PillTone }> = {
  pending: { label: "Commissie open", tone: "warning" },
  invoiced: { label: "Commissie gefactureerd", tone: "info" },
  paid: { label: "Commissie betaald", tone: "success" },
};

/** Dezelfde kaart voor een onderdeel en voor logies, te factureren of gefactureerd. */
const InvoiceCard = ({ title, kind, meta, pills, amount, amountLabel, note, actions }: { title: string; kind: string; meta: string; pills?: ReactNode; amount: number | null; amountLabel: string; note?: ReactNode; actions?: ReactNode }) => (
  <article className="rounded-lg border bg-card p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="font-medium">{title}</h3>
          <Pill tone="neutral" size="sm">
            {kind}
          </Pill>
          {pills}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end sm:text-right">
        <div>
          <p className="font-semibold tabular-nums">{formatEuro(amount)}</p>
          <p className="text-xs text-muted-foreground">{amountLabel}</p>
          {note}
        </div>
        {actions}
      </div>
    </div>
  </article>
);

const PartnerFinanceContent = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, partnerToken, isLoading, error, refetch, isDemo } = usePartnerPortal();
  const { invoices: commissionInvoices, refetch: refetchCommissionInvoices } = usePartnerCommissionInvoices();
  const [invoiceTarget, setInvoiceTarget] = useState<InvoiceTarget | null>(null);
  const [uploadPdfTarget, setUploadPdfTarget] = useState<UploadPdfTarget | null>(null);
  const [collectiveRequestId, setCollectiveRequestId] = useState<string | null>(null);
  const [collectiveInitialIds, setCollectiveInitialIds] = useState<string[]>([]);
  const [collectiveMode, setCollectiveMode] = useState<"upload" | "email">("upload");
  const { getSetting } = useAppSettings();
  const bureauDetails = {
    companyName: getSetting<string>("bureau_company_name", "Bureau Vlieland"),
    legalName: getSetting<string>("bureau_legal_name", "Bureau Vlieland B.V."),
    street: getSetting<string>("bureau_street", ""),
    postalCode: getSetting<string>("bureau_postal_code", ""),
    city: getSetting<string>("bureau_city", ""),
    kvkNumber: getSetting<string>("bureau_kvk_number", ""),
    vatNumber: getSetting<string>("bureau_vat_number", ""),
    iban: getSetting<string>("bureau_iban", ""),
  };

  // Na een registratie of upload: dashboard en commissiefacturen opnieuw.
  const refetchData = async () => {
    await Promise.all([refetch(), refetchCommissionInvoices()]);
  };

  // Verzamelfactuur: meerdere onderdelen, één pdf, één factuurnummer.
  const handleCollectiveInvoiceRegister = async (payload: CollectiveInvoiceSubmitPayload): Promise<{ success: boolean }> => {
    if (!partnerToken) return { success: false };
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-partner-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({
          partnerToken,
          items: payload.items,
          invoicedNumber: payload.invoicedNumber,
          invoicedDate: payload.invoicedDate,
          notes: payload.notes,
          filePath: payload.filePath,
          viaEmail: payload.viaEmail,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}) as { error?: string });
        throw new Error(err.error || "Kon de factuur niet registreren.");
      }
      toast({ title: payload.viaEmail ? "Bedankt, we koppelen uw mail zodra hij binnen is" : payload.items.length > 1 ? `Verzamelfactuur met ${payload.items.length} onderdelen geregistreerd` : "Factuur geregistreerd" });
      setCollectiveRequestId(null);
      setCollectiveInitialIds([]);
      await refetchData();
      return { success: true };
    } catch (err) {
      reportError(err, { where: "PartnerFinance: Error registering collective invoice" });
      toast({ title: err instanceof Error && err.message ? err.message : "Kon de factuur niet registreren.", variant: "destructive" });
      return { success: false };
    }
  };

  if (isLoading || error || !data) {
    return <PartnerPage title="Facturatie" icon={<Receipt />} loading={isLoading} error={error ?? "Er is een fout opgetreden."} />;
  }

  const activityCommission = data.partner.commission_percentage;
  const accommodationCommission = data.partner.accommodation_commission_percentage ?? 10;

  const expectedActivityCommission = (amountInclVat: number, itemCommissionPercentage?: number | null) => (amountInclVat / 1.21) * ((itemCommissionPercentage ?? activityCommission) / 100);
  const expectedAccommodationCommission = (q: PartnerAccommodationQuote) => {
    const vat = q.vat_rate ?? 9;
    const excl = (q.price_includes_vat ?? true) ? q.price_total / (1 + vat / 100) : q.price_total;
    return excl * ((q.commission_percentage ?? accommodationCommission) / 100);
  };

  const invoicedItems = data.items.filter((i) => i.invoiced_number !== null);
  const toBeInvoicedItems = data.items.filter((i) => canPartnerInvoiceItem(i, i.program_requests));
  const accommodationQuotes = data.accommodationQuotes || [];
  const invoicedAccommodations = accommodationQuotes.filter((q) => q.invoiced_number !== null);
  const toBeInvoicedAccommodations = accommodationQuotes.filter((q) => q.status === "selected" && !q.invoiced_number);

  const totalInvoiced = invoicedItems.reduce((sum, i) => sum + (i.invoiced_amount || 0), 0) + invoicedAccommodations.reduce((sum, q) => sum + (q.invoiced_amount || 0), 0);
  const totalToBeInvoiced = toBeInvoicedItems.reduce((sum, i) => sum + getPartnerBillableAmount(i), 0) + toBeInvoicedAccommodations.reduce((sum, q) => sum + (q.price_total || 0), 0);
  // Commissie: wat het bureau werkelijk factureerde (commissiefacturen), niet het snapshot op de onderdelen.
  const commissionTotals = summarizePartnerCommissionInvoices(commissionInvoices);
  // Verwacht: over wat de partner al factureerde maar het bureau nog niet in
  // rekening bracht (commission_status = pending), plus over wat de partner zelf nog factureert.
  const pendingCommission = sumPendingCommission(invoicedItems, activityCommission) + sumPendingCommission(invoicedAccommodations, accommodationCommission);
  const totalExpectedCommission =
    toBeInvoicedItems.reduce((sum, i) => sum + (getPartnerBillableAmount(i) ? expectedActivityCommission(getPartnerBillableAmount(i), i.commission_percentage) : 0), 0) +
    toBeInvoicedAccommodations.reduce((sum, q) => sum + (q.price_total ? expectedAccommodationCommission(q) : 0), 0);
  const expectedCommissionParts = [
    pendingCommission > 0 ? `${formatEuro(pendingCommission)} over wat u al factureerde` : null,
    totalExpectedCommission > 0 ? `${formatEuro(totalExpectedCommission)} over wat u nog factureert` : null,
  ].filter((part): part is string => part !== null);
  const expectedCommissionValue = expectedCommissionParts.length > 1 ? `${formatEuro(pendingCommission + totalExpectedCommission)}: ${expectedCommissionParts.join(", ")}` : expectedCommissionParts[0];

  const toBeInvoicedCount = toBeInvoicedItems.length + toBeInvoicedAccommodations.length;
  const invoicedCount = invoicedItems.length + invoicedAccommodations.length;
  const missingPdf = invoicedItems.filter((i) => !i.invoiced_file_path).length + invoicedAccommodations.filter((q) => !q.invoiced_file_path).length;
  const commissionLabel = data.partner.accommodation_commission_percentage ? `${activityCommission}% op onderdelen, ${accommodationCommission}% op logies` : `${activityCommission}%`;

  // Jaarcijfers (sinds fase 1 hier, niet meer op de werkbank).
  const year = new Date().getFullYear();
  const inYear = (date: string | null) => !!date && new Date(date).getFullYear() === year;
  const ytdRevenue = invoicedItems.filter((i) => inYear(i.invoiced_date)).reduce((s, i) => s + (i.invoiced_amount || 0), 0) + invoicedAccommodations.filter((q) => inYear(q.invoiced_date)).reduce((s, q) => s + (q.invoiced_amount || 0), 0);
  const openCommission = data.openCommissionInvoices;

  // De tab staat in de URL (?tab=to-invoice|invoiced|commission), zodat "Ga naar facturen" op het juiste tabblad uitkomt.
  const tabParam = searchParams.get("tab");
  const activeTab: FinanceTab = tabParam === "invoiced" || tabParam === "commission" ? tabParam : "to-invoice";
  const setTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "to-invoice") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };
  const tabs: PortalTab[] = [
    { key: "to-invoice", label: "Nog te factureren", badge: toBeInvoicedCount > 0 ? { label: String(toBeInvoicedCount), tone: "warning" } : null },
    { key: "invoiced", label: "Gefactureerd", badge: invoicedCount > 0 ? { label: String(invoicedCount), tone: "neutral" } : null },
    { key: "commission", label: "Commissiefacturen", badge: commissionTotals.count > 0 ? { label: String(commissionTotals.count), tone: openCommission?.count ? "warning" : "neutral" } : null },
  ];

  const parts = [toBeInvoicedItems.length > 0 ? `${toBeInvoicedItems.length} ${toBeInvoicedItems.length === 1 ? "onderdeel" : "onderdelen"}` : null, toBeInvoicedAccommodations.length > 0 ? `${toBeInvoicedAccommodations.length} logies` : null].filter(Boolean);
  const facts = [
    { label: "Gefactureerd", value: `${formatEuro(totalInvoiced)}${invoicedCount > 0 ? ` (${invoicedCount} ${invoicedCount === 1 ? "factuur" : "facturen"})` : ""}` },
    { label: "Nog te factureren", value: toBeInvoicedCount > 0 ? `${formatEuro(totalToBeInvoiced)} (${parts.join(", ")})` : "Niets" },
    { label: "Commissie", value: `${commissionLabel}: ${formatEuro(commissionTotals.invoiced)} gefactureerd, ${formatEuro(commissionTotals.open)} open, ${formatEuro(commissionTotals.paid)} betaald` },
    ...(expectedCommissionValue ? [{ label: "Verwachte commissie", value: expectedCommissionValue }] : []),
    { label: `Omzet ${year}`, value: formatEuro(ytdRevenue) },
    ...(openCommission?.count ? [{ label: "Open commissiefactuur", value: `${formatEuro(openCommission.amountInclVat)} (${openCommission.count === 1 ? "1 factuur" : `${openCommission.count} facturen`})` }] : []),
  ];

  const projectGroups = Object.entries(
    toBeInvoicedItems.reduce<Record<string, PartnerItem[]>>((acc, it) => {
      (acc[it.request_id] ||= []).push(it);
      return acc;
    }, {}),
  );

  const openCollective = (requestId: string, items: PartnerItem[], mode: "upload" | "email") => {
    setCollectiveMode(mode);
    setCollectiveRequestId(requestId);
    setCollectiveInitialIds(items.map((i) => i.id));
  };

  const accommodationTarget = (q: PartnerAccommodationQuote): InvoiceTarget => ({
    kind: "accommodation",
    quoteId: q.id,
    partnerId: q.partner_id,
    requestId: q.request_id,
    accommodationName: q.accommodation_name,
    customerLabel: q.accommodation_requests.customer_company || q.accommodation_requests.customer_name,
    stayLabel: `${format(parseISO(q.accommodation_requests.arrival_date), "d MMM", { locale: nl })} tot ${format(parseISO(q.accommodation_requests.departure_date), "d MMM yyyy", { locale: nl })}`,
    priceTotal: q.price_total,
    priceIncludesVat: q.price_includes_vat ?? true,
    vatRate: Number(q.vat_rate ?? 9),
  });

  const pdfButton = (onClick: () => void) => (
    <Button size="sm" variant="outline" onClick={onClick} disabled={isDemo}>
      <Upload className="mr-1.5 h-4 w-4" aria-hidden="true" />
      Pdf toevoegen
    </Button>
  );
  const commissionPill = (status: string | null) => (status && COMMISSION_PILL[status] ? <Pill tone={COMMISSION_PILL[status].tone} size="sm">{COMMISSION_PILL[status].label}</Pill> : null);
  const missingPdfPill = <Pill tone="danger" size="sm" title="Niet in behandeling: voeg de pdf toe">Pdf ontbreekt</Pill>;

  return (
    <PartnerPage title="Facturatie" icon={<Receipt />} description="Uw facturen aan Bureau Vlieland en de commissiefacturen van het bureau aan u." status={missingPdf > 0 ? { label: missingPdf === 1 ? "1 pdf ontbreekt" : `${missingPdf} pdf's ontbreken`, tone: "danger" } : null}>
      {missingPdf > 0 && <MissingPdfBanner count={missingPdf} showCta={false} />}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <PartnerMonthlyRevenueChart items={data.items} accommodationQuotes={accommodationQuotes} />
        <FactList title="In het kort" items={facts} />
      </div>

      <PortalTabs tabs={tabs} current={activeTab} onChange={setTab} label="Facturatie" embedded />

      {activeTab === "to-invoice" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Per project één factuur; de pdf gaat direct naar de boekhouding.</p>
            <ExportInvoicesButton items={toBeInvoicedItems} accommodationQuotes={toBeInvoicedAccommodations} variant="to-invoice" />
          </div>
          {toBeInvoicedCount === 0 ? (
            <EmptyState icon={<CheckCircle2 />} title="Alles is gefactureerd" description="Er staat niets meer open om te factureren." />
          ) : (
            <>
              <Notice tone="info" title="Mailen kan ook">
                <p>
                  Stuur uw factuur naar{" "}
                  <a href={`mailto:${PURCHASE_INVOICE_INBOX}`} className="font-medium underline">
                    {PURCHASE_INVOICE_INBOX}
                  </a>
                  . Bureau Vlieland leest de pdf in en koppelt hem aan uw project.
                </p>
              </Notice>

              {projectGroups.map(([requestId, items]) => {
                const project = items[0].program_requests;
                const total = items.reduce((s, i) => s + getPartnerBillableAmount(i), 0);
                return (
                  <article key={requestId} className="space-y-3 rounded-lg border bg-card p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="font-medium">{project.customer_company || project.customer_name}</h3>
                          {project.reference_number && (
                            <Pill tone="neutral" size="sm">
                              {project.reference_number}
                            </Pill>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {items.length === 1 ? "1 onderdeel" : `${items.length} onderdelen`}
                          {project.selected_dates?.[0] && ` · ${format(parseISO(project.selected_dates[0]), "d MMMM yyyy", { locale: nl })}`}
                        </p>
                      </div>
                      <div className="sm:text-right">
                        <p className="font-semibold tabular-nums">{formatEuro(total)}</p>
                        <p className="text-xs text-muted-foreground">te factureren, incl. btw</p>
                      </div>
                    </div>
                    <ul className="divide-y rounded-md border text-sm">
                      {items.map((it) => (
                        <li key={it.id} className="flex items-center justify-between gap-2 px-3 py-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate">{it.block_name}</span>
                            {isPartnerEstimatedAmount(it) && (
                              <Pill tone="warning" size="sm">
                                inschatting
                              </Pill>
                            )}
                          </span>
                          <span className="whitespace-nowrap font-medium tabular-nums">{formatEuro(getPartnerBillableAmount(it))}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openCollective(requestId, items, "email")} disabled={isDemo}>
                        <Mail className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        Gefactureerd via e-mail
                      </Button>
                      <Button size="sm" onClick={() => openCollective(requestId, items, "upload")} disabled={isDemo}>
                        <Receipt className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        {items.length > 1 ? "Verzamelfactuur registreren" : "Factuur registreren"}
                      </Button>
                    </div>
                  </article>
                );
              })}

              {toBeInvoicedAccommodations.map((q) => (
                <InvoiceCard
                  key={q.id}
                  title={q.accommodation_name}
                  kind="Logies"
                  meta={`${q.accommodation_requests.customer_company || q.accommodation_requests.customer_name} · ${format(parseISO(q.accommodation_requests.arrival_date), "d MMM", { locale: nl })} tot ${format(parseISO(q.accommodation_requests.departure_date), "d MMM yyyy", { locale: nl })}`}
                  amount={q.price_total}
                  amountLabel="offertebedrag"
                  note={q.price_total ? <p className="text-xs text-muted-foreground">verwachte commissie {formatEuro(expectedAccommodationCommission(q))}</p> : undefined}
                  actions={
                    <Button size="sm" onClick={() => setInvoiceTarget(accommodationTarget(q))} disabled={isDemo || !partnerToken}>
                      <Receipt className="mr-1.5 h-4 w-4" aria-hidden="true" />
                      Factuur registreren
                    </Button>
                  }
                />
              ))}
            </>
          )}
        </div>
      )}

      {activeTab === "invoiced" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Uw geregistreerde facturen, met de commissie die Bureau Vlieland erover rekent.</p>
            <ExportInvoicesButton items={invoicedItems} accommodationQuotes={invoicedAccommodations} variant="invoiced" />
          </div>
          {invoicedCount === 0 ? (
            <EmptyState icon={<FileText />} title="Nog geen facturen" description="U heeft nog geen facturen geregistreerd." />
          ) : (
            <>
              {invoicedItems.map((item) => {
                const request = item.program_requests;
                const activityDate = (request.selected_dates || [])[item.day_index];
                return (
                  <InvoiceCard
                    key={item.id}
                    title={item.block_name}
                    kind="Onderdeel"
                    meta={`${request.customer_company || request.customer_name}${activityDate ? ` · ${format(parseISO(activityDate), "d MMM yyyy", { locale: nl })}` : ""}`}
                    pills={
                      <>
                        {commissionPill(item.commission_status)}
                        {!item.invoiced_file_path && missingPdfPill}
                      </>
                    }
                    amount={item.invoiced_amount}
                    amountLabel={`factuur ${item.invoiced_number}`}
                    note={item.commission_amount ? <p className="text-xs text-muted-foreground">commissie {formatEuro(item.commission_amount)}</p> : undefined}
                    actions={!item.invoiced_file_path ? pdfButton(() => setUploadPdfTarget({ kind: "item", item })) : undefined}
                  />
                );
              })}
              {invoicedAccommodations.map((q) => (
                <InvoiceCard
                  key={q.id}
                  title={q.accommodation_name}
                  kind="Logies"
                  meta={`${q.accommodation_requests.customer_company || q.accommodation_requests.customer_name} · ${format(parseISO(q.accommodation_requests.arrival_date), "d MMM", { locale: nl })} tot ${format(parseISO(q.accommodation_requests.departure_date), "d MMM yyyy", { locale: nl })}`}
                  pills={
                    <>
                      {commissionPill(q.commission_status)}
                      {!q.invoiced_file_path && missingPdfPill}
                    </>
                  }
                  amount={q.invoiced_amount}
                  amountLabel={`factuur ${q.invoiced_number}`}
                  note={q.commission_amount ? <p className="text-xs text-muted-foreground">commissie {formatEuro(q.commission_amount)}</p> : undefined}
                  actions={!q.invoiced_file_path && partnerToken ? pdfButton(() => setUploadPdfTarget({ kind: "accommodation", quote: q, partnerToken })) : undefined}
                />
              ))}
            </>
          )}
        </div>
      )}

      {activeTab === "commission" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Facturen van Bureau Vlieland aan u voor de commissie over uw gefactureerde onderdelen. De pdf-link is een uur geldig; ververs de pagina voor een nieuwe.</p>
          <PartnerCommissionInvoiceList invoices={commissionInvoices} />
        </div>
      )}

      <InvoiceRegistrationDialog target={invoiceTarget} onClose={() => setInvoiceTarget(null)} partnerToken={partnerToken ?? ""} commissionPercentage={invoiceTarget?.kind === "accommodation" ? accommodationCommission : activityCommission} onRegistered={refetchData} />

      <UploadInvoicePdfPartnerDialog target={uploadPdfTarget} onClose={() => setUploadPdfTarget(null)} onUploaded={refetchData} />

      <RegisterCollectivePartnerInvoiceDialog
        isOpen={!!collectiveRequestId}
        onClose={() => {
          setCollectiveRequestId(null);
          setCollectiveInitialIds([]);
          setCollectiveMode("upload");
        }}
        projectItems={collectiveRequestId ? data.items.filter((i) => i.request_id === collectiveRequestId && canPartnerInvoiceItem(i, i.program_requests)) : []}
        initialSelectedIds={collectiveInitialIds}
        commissionPercentage={activityCommission}
        mode={collectiveMode}
        bureauDetails={bureauDetails}
        onSubmit={handleCollectiveInvoiceRegister}
      />
    </PartnerPage>
  );
};

const PartnerFinance = () => (
  <PartnerLayout>
    <PartnerFinanceContent />
  </PartnerLayout>
);

export { PartnerFinanceContent };

export default PartnerFinance;
