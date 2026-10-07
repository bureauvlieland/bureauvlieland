import { useMemo } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Pill } from "@/components/system";
import { supabase } from "@/integrations/supabase/client";
import {
  COMMISSION_INVOICE_STATUS_LABELS,
  countsTowardsTotal,
  type CommissionInvoiceStatus,
} from "@/lib/commissionInvoiceStatus";
import { OPEN_STATUSES, STATUS_PILL_TONE } from "@/lib/commissionInvoiceView";
import { tabTotals } from "@/lib/commissionWorklistView";
import type { ReconRow } from "@/lib/commissionReconciliation";
import { Link } from "react-router-dom";
import { format, startOfMonth, subMonths } from "date-fns";
import { nl } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Euro,
  TrendingUp,
  Receipt,
  HandCoins,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);

const KPICard = ({
  label,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  subtitle?: string;
}) => (
  <Card>
    <CardContent className="pt-5 pb-4 px-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center bg-muted`}>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const AdminFinancialDashboardContent = () => {
  // Fetch bureau invoices (customer invoices)
  const { data: bureauInvoices, isLoading: loadingBI } = useQuery({
    queryKey: ["financial-bureau-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bureau_invoices")
        .select("id, invoice_date, amount_excl_vat, vat_amount, amount_incl_vat, invoice_type, request_id");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch partner purchase invoices
  const { data: purchaseInvoices, isLoading: loadingPI } = useQuery({
    queryKey: ["financial-purchase-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_purchase_invoices")
        .select("id, invoice_date, amount_excl_vat, vat_amount, amount_incl_vat, status, partner_id, request_id");
      if (error) throw error;
      return data || [];
    },
  });

  // Commissiefacturen: de bron voor gefactureerde, openstaande en betaalde commissie.
  const { data: commissionInvoices, isLoading: loadingCI } = useQuery({
    queryKey: ["financial-commission-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_invoices")
        .select("id, status, amount_excl_vat, amount_incl_vat, invoice_date, credits_invoice_id");
      if (error) throw error;
      return data || [];
    },
  });

  // De werklijst: wat er nog te factureren is, uit dezelfde reconciliatie als Commissies.
  const { data: worklist, isLoading: loadingWL } = useQuery({
    queryKey: ["commission-worklist", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-commission-reconciliation", {
        body: { partnerId: null },
      });
      if (error) throw error;
      return data as { rows: ReconRow[] };
    },
  });

  // Fetch projects ready for invoicing
  const { data: readyForInvoice, isLoading: loadingRFI } = useQuery({
    queryKey: ["financial-ready-for-invoice"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_requests")
        .select("id, reference_number, customer_name, customer_company, completion_status")
        .eq("completion_status", "ready_for_invoice")
        // Geannuleerde/verwijderde projecten horen niet in "te factureren"
        .not("status", "in", "(cancelled,deleted)")
        .is("cancelled_at", null);
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingBI || loadingPI || loadingCI || loadingWL || loadingRFI;

  // KPIs
  const kpis = useMemo(() => {
    if (!bureauInvoices || !purchaseInvoices || !commissionInvoices) {
      return null;
    }

    const totalInvoiced = bureauInvoices.reduce((sum, i) => sum + (i.amount_excl_vat || 0), 0);
    const totalPurchased = purchaseInvoices.reduce((sum, i) => sum + (i.amount_excl_vat || 0), 0);
    const pendingPurchase = purchaseInvoices.filter(i => i.status === "pending").reduce((sum, i) => sum + (i.amount_excl_vat || 0), 0);

    // Commissie ex btw: alles wat geen concept is (creditnota's tellen negatief mee),
    // daarvan wat nog openstaat (verstuurd/doorgestuurd) en wat betaald is.
    const amountOf = (status: (s: CommissionInvoiceStatus) => boolean) =>
      commissionInvoices
        .filter((i) => status(i.status as CommissionInvoiceStatus))
        .reduce((sum, i) => sum + (Number(i.amount_excl_vat) || 0), 0);
    const invoicedCommission = amountOf(countsTowardsTotal);
    const openCommission = amountOf((status) => OPEN_STATUSES.includes(status));
    const paidCommission = amountOf((status) => status === "paid");
    const billableCommission = worklist ? tabTotals(worklist.rows).billable.amount : 0;

    return {
      totalInvoiced,
      totalPurchased,
      margin: totalInvoiced - totalPurchased,
      pendingPurchase,
      invoicedCommission,
      openCommission,
      paidCommission,
      billableCommission,
    };
  }, [bureauInvoices, purchaseInvoices, commissionInvoices, worklist]);

  // Monthly chart data (last 12 months)
  const chartData = useMemo(() => {
    if (!bureauInvoices || !purchaseInvoices) return [];

    const months: { key: string; label: string; omzet: number; inkoop: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, "yyyy-MM");
      months.push({
        key,
        label: format(d, "MMM yy", { locale: nl }),
        omzet: 0,
        inkoop: 0,
      });
    }

    bureauInvoices.forEach((inv) => {
      const key = inv.invoice_date?.substring(0, 7);
      const month = months.find((m) => m.key === key);
      if (month) month.omzet += inv.amount_excl_vat || 0;
    });

    purchaseInvoices.forEach((inv) => {
      const key = inv.invoice_date?.substring(0, 7);
      const month = months.find((m) => m.key === key);
      if (month) month.inkoop += inv.amount_excl_vat || 0;
    });

    return months;
  }, [bureauInvoices, purchaseInvoices]);

  // Commissie per factuurstatus (concepten tellen niet mee in het totaal, wel in het overzicht).
  const commissionSummary = useMemo(() => {
    if (!commissionInvoices) return null;
    const order: CommissionInvoiceStatus[] = ["draft", "final", "sent", "forwarded", "paid", "credited"];
    const grouped = new Map<CommissionInvoiceStatus, { count: number; total: number }>();
    for (const invoice of commissionInvoices) {
      const status = invoice.status as CommissionInvoiceStatus;
      const entry = grouped.get(status) ?? { count: 0, total: 0 };
      entry.count += 1;
      entry.total += Number(invoice.amount_excl_vat) || 0;
      grouped.set(status, entry);
    }
    return order
      .filter((status) => grouped.has(status))
      .map((status) => ({ status, ...grouped.get(status)! }));
  }, [commissionInvoices]);

  const billableCount = worklist ? tabTotals(worklist.rows).billable.count : 0;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financieel Overzicht</h1>
        <p className="text-sm text-muted-foreground">Omzet, inkoop, marges en commissies</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Totaal gefactureerd"
          value={formatCurrency(kpis?.totalInvoiced || 0)}
          icon={Euro}
          color="text-green-700"
          subtitle="excl. BTW"
        />
        <KPICard
          label="Totaal inkoop"
          value={formatCurrency(kpis?.totalPurchased || 0)}
          icon={Receipt}
          color="text-blue-700"
          subtitle={`${formatCurrency(kpis?.pendingPurchase || 0)} openstaand`}
        />
        <KPICard
          label="Bruto marge"
          value={formatCurrency(kpis?.margin || 0)}
          icon={TrendingUp}
          color={(kpis?.margin || 0) >= 0 ? "text-green-700" : "text-red-700"}
          subtitle="omzet − inkoop"
        />
        <KPICard
          label="Commissie gefactureerd"
          value={formatCurrency(kpis?.invoicedCommission || 0)}
          icon={HandCoins}
          color="text-amber-700"
          subtitle={`${formatCurrency(kpis?.openCommission || 0)} open · ${formatCurrency(kpis?.billableCommission || 0)} te factureren`}
        />
      </div>

      {/* Monthly chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Omzet vs. Inkoop per maand</CardTitle>
          <CardDescription className="text-xs">Laatste 12 maanden, excl. BTW</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ fontSize: "12px" }}
              />
              <Legend />
              <Bar dataKey="omzet" name="Omzet" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="inkoop" name="Inkoop" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Open items for invoicing */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Te factureren projecten
            </CardTitle>
            <CardDescription className="text-xs">Projecten met status 'klaar voor facturatie'</CardDescription>
          </CardHeader>
          <CardContent>
            {(readyForInvoice?.length || 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Geen openstaande posten</p>
            ) : (
              <div className="space-y-2">
                {readyForInvoice?.map((r) => (
                  <Link
                    key={r.id}
                    to={`/admin/projecten/${r.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{r.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.reference_number} · {r.customer_company || "Particulier"}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commission summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <HandCoins className="h-4 w-4" />
              Commissiefacturen
            </CardTitle>
            <CardDescription className="text-xs">Per status, excl. BTW. Creditnota's tellen negatief mee.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link
                to="/admin/commissies"
                className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Pill tone="warning">Te factureren</Pill>
                  <span className="text-xs text-muted-foreground">{billableCount} regels in de werklijst</span>
                </div>
                <span className="text-sm font-semibold tabular-nums">{formatCurrency(kpis?.billableCommission || 0)}</span>
              </Link>
              {commissionSummary && commissionSummary.length > 0 ? (
                commissionSummary.map(({ status, count, total }) => (
                  <Link
                    key={status}
                    to="/admin/commissies/facturen"
                    className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Pill tone={STATUS_PILL_TONE[status]}>{COMMISSION_INVOICE_STATUS_LABELS[status]}</Pill>
                      <span className="text-xs text-muted-foreground">
                        {count} {count === 1 ? "factuur" : "facturen"}
                      </span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{formatCurrency(total)}</span>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Nog geen commissiefacturen</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const AdminFinancialDashboard = () => (
  <>
    <Helmet>
      <title>Financieel Dashboard | Bureau Vlieland</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    <AdminLayout>
      <AdminFinancialDashboardContent />
    </AdminLayout>
  </>
);

export default AdminFinancialDashboard;
