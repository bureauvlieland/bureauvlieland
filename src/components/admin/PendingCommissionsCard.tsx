import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Receipt, 
  Clock, 
  BedDouble,
  CheckCircle,
} from "lucide-react";
import { parseISO, differenceInDays } from "date-fns";
import { Link } from "react-router-dom";

interface PendingCommission {
  id: string;
  type: "activity" | "accommodation";
  name: string;
  partnerName: string;
  partnerId: string;
  customerName: string;
  customerCompany: string | null;
  requestId: string;
  commissionAmount: number;
  commissionStatus: string;
  proformaDeadline: string | null;
}

export const PendingCommissionsCard = () => {
  const { data: commissions, isLoading } = useQuery({
    queryKey: ["pending-commissions"],
    queryFn: async () => {
      const result: PendingCommission[] = [];

      // Fetch activity items with pending_confirmation or confirmed status
      const { data: items, error: itemsError } = await supabase
        .from("program_request_items")
        .select(`
          id,
          block_name,
          provider_name,
          provider_id,
          request_id,
          proforma_commission,
          commission_status,
          proforma_deadline,
          program_requests (
            customer_name,
            customer_company
          )
        `)
        .in("commission_status", ["pending_confirmation", "confirmed"])
        .not("proforma_commission", "is", null)
        .order("proforma_deadline", { ascending: true });

      if (!itemsError && items) {
        for (const item of items) {
          result.push({
            id: item.id,
            type: "activity",
            name: item.block_name,
            partnerName: item.provider_name,
            partnerId: item.provider_id,
            customerName: item.program_requests?.customer_name || "",
            customerCompany: item.program_requests?.customer_company || null,
            requestId: item.request_id,
            commissionAmount: item.proforma_commission || 0,
            commissionStatus: item.commission_status || "",
            proformaDeadline: item.proforma_deadline,
          });
        }
      }

      // Fetch accommodation quotes with pending_confirmation or confirmed status
      const { data: quotes, error: quotesError } = await supabase
        .from("accommodation_quotes")
        .select(`
          id,
          accommodation_name,
          partner_id,
          request_id,
          proforma_commission,
          commission_status,
          proforma_deadline,
          accommodation_requests (
            customer_name,
            customer_company
          )
        `)
        .in("commission_status", ["pending_confirmation", "confirmed"])
        .not("proforma_commission", "is", null)
        .order("proforma_deadline", { ascending: true });

      if (!quotesError && quotes) {
        // Get partner names
        const partnerIds = [...new Set(quotes.map(q => q.partner_id))];
        const { data: partners } = await supabase
          .from("partners")
          .select("id, name")
          .in("id", partnerIds);

        const partnerMap = new Map(partners?.map(p => [p.id, p.name]) || []);

        for (const quote of quotes) {
          result.push({
            id: quote.id,
            type: "accommodation",
            name: quote.accommodation_name,
            partnerName: partnerMap.get(quote.partner_id) || quote.partner_id,
            partnerId: quote.partner_id,
            customerName: quote.accommodation_requests?.customer_name || "",
            customerCompany: quote.accommodation_requests?.customer_company || null,
            requestId: quote.request_id,
            commissionAmount: quote.proforma_commission || 0,
            commissionStatus: quote.commission_status || "",
            proformaDeadline: quote.proforma_deadline,
          });
        }
      }

      // Sort by deadline (pending_confirmation first, then confirmed)
      return result.sort((a, b) => {
        if (a.commissionStatus !== b.commissionStatus) {
          return a.commissionStatus === "confirmed" ? -1 : 1;
        }
        if (!a.proformaDeadline) return 1;
        if (!b.proformaDeadline) return -1;
        return new Date(a.proformaDeadline).getTime() - new Date(b.proformaDeadline).getTime();
      });
    },
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  const confirmedCommissions = commissions?.filter(c => c.commissionStatus === "confirmed") || [];
  const pendingCommissions = commissions?.filter(c => c.commissionStatus === "pending_confirmation") || [];
  
  const totalConfirmed = confirmedCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);
  const totalPending = pendingCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);

  if (!commissions || commissions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Commissies
        </CardTitle>
        <CardDescription>
          {confirmedCommissions.length > 0 && (
            <span className="text-green-600 font-medium">
              €{totalConfirmed.toFixed(2)} te factureren
            </span>
          )}
          {confirmedCommissions.length > 0 && pendingCommissions.length > 0 && " • "}
          {pendingCommissions.length > 0 && (
            <span className="text-amber-600">
              €{totalPending.toFixed(2)} in afwachting
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {commissions.slice(0, 8).map((commission) => {
            const daysRemaining = commission.proformaDeadline 
              ? differenceInDays(parseISO(commission.proformaDeadline), new Date())
              : null;

            return (
              <Link
                key={`${commission.type}-${commission.id}`}
                to={commission.type === "activity" 
                  ? `/admin/aanvragen/${commission.requestId}`
                  : `/admin/logies/${commission.requestId}`
                }
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    commission.commissionStatus === "confirmed" 
                      ? "bg-green-100" 
                      : "bg-amber-100"
                  }`}>
                    {commission.commissionStatus === "confirmed" ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{commission.partnerName}</p>
                      <Badge variant="outline" className="text-xs">
                        {commission.type === "accommodation" ? (
                          <><BedDouble className="h-3 w-3 mr-1" />Logies</>
                        ) : (
                          "Activiteit"
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">
                      {commission.name} • {commission.customerCompany || commission.customerName}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    €{commission.commissionAmount.toFixed(2)}
                  </p>
                  {commission.commissionStatus === "pending_confirmation" && daysRemaining !== null && (
                    <p className={`text-xs ${daysRemaining <= 2 ? "text-red-600" : "text-muted-foreground"}`}>
                      {daysRemaining <= 0 ? "Deadline verstreken" : `Nog ${daysRemaining} dagen`}
                    </p>
                  )}
                  {commission.commissionStatus === "confirmed" && (
                    <p className="text-xs text-green-600">Klaar om te factureren</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {commissions.length > 8 && (
          <div className="mt-4 text-center">
            <Link 
              to="/admin/commissies" 
              className="text-sm text-primary hover:underline"
            >
              Bekijk alle {commissions.length} commissies →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
