import { useMemo } from "react";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { nl } from "date-fns/locale";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/system";
import type { PartnerAccommodationQuote, PartnerItem } from "@/types/partner";
import { formatEuro } from "@/lib/formatEuro";
import { cn } from "@/lib/utils";

/**
 * Gefactureerde omzet per maand (partnerportaal fase 3): de staven op de
 * tokens (`currentColor` via een tekstkleurklasse, geen losse hsl-waarde),
 * een eigen legenda en tooltip op de kaartstijl, en de lege staat als
 * `EmptyState`.
 */
interface PartnerMonthlyRevenueChartProps {
  items: PartnerItem[];
  accommodationQuotes: PartnerAccommodationQuote[];
  monthsToShow?: number;
}

interface MonthlyData {
  month: string;
  monthLabel: string;
  activiteiten: number;
  logies: number;
  total: number;
}

const SERIES: { key: "activiteiten" | "logies"; label: string; className: string; swatch: string }[] = [
  { key: "activiteiten", label: "Activiteiten", className: "text-primary", swatch: "bg-primary" },
  { key: "logies", label: "Logies", className: "text-sunset", swatch: "bg-sunset" },
];

const axisTick = (value: number) => (value >= 1000 ? `€${(value / 1000).toFixed(1)}k` : `€${value.toFixed(0)}`);

export const PartnerMonthlyRevenueChart = ({ items, accommodationQuotes, monthsToShow = 6 }: PartnerMonthlyRevenueChartProps) => {
  const chartData = useMemo(() => {
    const now = new Date();
    const months: MonthlyData[] = [];
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthDate = startOfMonth(subMonths(now, i));
      months.push({ month: format(monthDate, "yyyy-MM"), monthLabel: format(monthDate, "MMM", { locale: nl }), activiteiten: 0, logies: 0, total: 0 });
    }
    const add = (date: string | null, amount: number | null, key: "activiteiten" | "logies") => {
      if (!date || !amount) return;
      const entry = months.find((m) => m.month === format(parseISO(date), "yyyy-MM"));
      if (!entry) return;
      entry[key] += amount;
      entry.total += amount;
    };
    items.forEach((item) => add(item.invoiced_date, item.invoiced_amount, "activiteiten"));
    accommodationQuotes.forEach((quote) => add(quote.invoiced_date, quote.invoiced_amount, "logies"));
    return months;
  }, [items, accommodationQuotes, monthsToShow]);

  const hasData = chartData.some((m) => m.total > 0);
  const hasLogies = chartData.some((m) => m.logies > 0);
  const grandTotal = chartData.reduce((sum, m) => sum + m.total, 0);
  const series = hasLogies ? SERIES : SERIES.slice(0, 1);

  const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey?: string | number }[]; label?: string }) => {
    if (!active || !payload) return null;
    return (
      <div className="rounded-md border bg-popover p-3 text-sm shadow-medium">
        <p className="mb-1 font-medium">{label}</p>
        {payload.map((entry) => {
          const s = SERIES.find((x) => x.key === entry.dataKey);
          return (
            <div key={String(entry.dataKey)} className="flex items-center gap-2">
              <span className={cn("h-3 w-3 rounded-sm", s?.swatch)} aria-hidden="true" />
              <span className="text-muted-foreground">{s?.label ?? entry.dataKey}:</span>
              <span className="font-medium">{formatEuro(entry.value)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <section className="rounded-lg border bg-card p-4" aria-label="Omzet per maand">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-medium">
          <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
          Omzet per maand
        </h3>
        {hasData && <span className="text-sm text-muted-foreground">Totaal {formatEuro(grandTotal)}</span>}
      </div>
      {!hasData ? (
        <EmptyState className="mt-3" title="Nog geen gefactureerde omzet" description={`In de afgelopen ${monthsToShow} maanden is nog niets gefactureerd.`} />
      ) : (
        <>
          <div className="mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={axisTick} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={60} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "transparent" }} />
                {series.map((s) => (
                  <Bar key={s.key} dataKey={s.key} name={s.label} className={s.className} fill="currentColor" radius={[4, 4, 0, 0]} stackId="stack" />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          {hasLogies && (
            <ul className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground" aria-label="Legenda">
              {series.map((s) => (
                <li key={s.key} className="flex items-center gap-1.5">
                  <span className={cn("h-2.5 w-2.5 rounded-sm", s.swatch)} aria-hidden="true" />
                  {s.label}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
};
