import { useState, useEffect, useMemo } from "react";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { nl } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Euro } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AdminPartnerRevenueChartProps {
  partnerId: string;
  monthsToShow?: number;
}

interface MonthlyData {
  month: string;
  monthLabel: string;
  activiteiten: number;
  logies: number;
  total: number;
}

export function AdminPartnerRevenueChart({ partnerId, monthsToShow = 6 }: AdminPartnerRevenueChartProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [activityItems, setActivityItems] = useState<Array<{
    invoiced_date: string | null;
    invoiced_amount: number | null;
  }>>([]);
  const [accommodationQuotes, setAccommodationQuotes] = useState<Array<{
    invoiced_date: string | null;
    invoiced_amount: number | null;
  }>>([]);

  useEffect(() => {
    fetchData();
  }, [partnerId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch activity items for this partner
      const { data: items, error: itemsError } = await supabase
        .from("program_request_items")
        .select("invoiced_date, invoiced_amount")
        .eq("provider_id", partnerId)
        .not("invoiced_amount", "is", null);

      if (itemsError) throw itemsError;
      setActivityItems(items || []);

      // Fetch accommodation quotes for this partner
      const { data: quotes, error: quotesError } = await supabase
        .from("accommodation_quotes")
        .select("invoiced_date, invoiced_amount")
        .eq("partner_id", partnerId)
        .not("invoiced_amount", "is", null);

      if (quotesError) throw quotesError;
      setAccommodationQuotes(quotes || []);
    } catch (error) {
      console.error("Error fetching partner revenue:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = useMemo(() => {
    const now = new Date();
    const months: MonthlyData[] = [];

    // Generate last N months
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthDate = startOfMonth(subMonths(now, i));
      const monthKey = format(monthDate, "yyyy-MM");
      months.push({
        month: monthKey,
        monthLabel: format(monthDate, "MMM", { locale: nl }),
        activiteiten: 0,
        logies: 0,
        total: 0,
      });
    }

    // Aggregate activity revenue by month
    activityItems.forEach((item) => {
      if (!item.invoiced_date || !item.invoiced_amount) return;
      const monthKey = format(parseISO(item.invoiced_date), "yyyy-MM");
      const monthEntry = months.find((m) => m.month === monthKey);
      if (monthEntry) {
        monthEntry.activiteiten += item.invoiced_amount;
        monthEntry.total += item.invoiced_amount;
      }
    });

    // Aggregate accommodation revenue by month
    accommodationQuotes.forEach((quote) => {
      if (!quote.invoiced_date || !quote.invoiced_amount) return;
      const monthKey = format(parseISO(quote.invoiced_date), "yyyy-MM");
      const monthEntry = months.find((m) => m.month === monthKey);
      if (monthEntry) {
        monthEntry.logies += quote.invoiced_amount;
        monthEntry.total += quote.invoiced_amount;
      }
    });

    return months;
  }, [activityItems, accommodationQuotes, monthsToShow]);

  const hasData = chartData.some((m) => m.total > 0);
  const hasLogies = chartData.some((m) => m.logies > 0);

  // Calculate totals for summary
  const totalActiviteiten = chartData.reduce((sum, m) => sum + m.activiteiten, 0);
  const totalLogies = chartData.reduce((sum, m) => sum + m.logies, 0);
  const grandTotal = totalActiviteiten + totalLogies;

  // YTD calculation
  const currentYear = new Date().getFullYear();
  const ytdActiviteiten = activityItems
    .filter(item => item.invoiced_date && parseISO(item.invoiced_date).getFullYear() === currentYear)
    .reduce((sum, item) => sum + (item.invoiced_amount || 0), 0);
  const ytdLogies = accommodationQuotes
    .filter(q => q.invoiced_date && parseISO(q.invoiced_date).getFullYear() === currentYear)
    .reduce((sum, q) => sum + (q.invoiced_amount || 0), 0);
  const ytdTotal = ytdActiviteiten + ytdLogies;

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `€${(value / 1000).toFixed(1)}k`;
    }
    return `€${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) => {
    if (!active || !payload) return null;
    
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-sm" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">€{entry.value.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Partner Omzet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Partner Omzet
            </CardTitle>
            <CardDescription>
              Gefactureerde omzet afgelopen {monthsToShow} maanden
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-muted-foreground" />
              <span className="text-xl font-bold">
                €{ytdTotal.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">YTD {currentYear}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary badges */}
        <div className="flex gap-2 mb-4">
          <Badge variant="outline" className="bg-primary/5">
            Activiteiten: €{totalActiviteiten.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
          </Badge>
          {totalLogies > 0 && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Logies: €{totalLogies.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
            </Badge>
          )}
        </div>

        {!hasData ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            <p>Nog geen gefactureerde omzet in de afgelopen {monthsToShow} maanden</p>
          </div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="monthLabel" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                {hasLogies && (
                  <Legend 
                    wrapperStyle={{ fontSize: 12 }}
                    iconType="square"
                    iconSize={10}
                  />
                )}
                <Bar 
                  dataKey="activiteiten" 
                  name="Activiteiten" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  stackId="stack"
                />
                {hasLogies && (
                  <Bar 
                    dataKey="logies" 
                    name="Logies" 
                    fill="hsl(45, 93%, 47%)" 
                    radius={[4, 4, 0, 0]}
                    stackId="stack"
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
