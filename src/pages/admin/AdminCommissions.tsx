import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Percent, Receipt, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CommissionWorklist } from "@/components/admin/CommissionWorklist";

/**
 * Commissies: de werklijst van te factureren, verwachte en afwijkende regels.
 * De facturen zelf staan op /admin/commissies/facturen; de bronregels worden
 * via `commission_invoice_id` en de factuurstatus bijgehouden (fase 2–4 van
 * docs/plan-commissiefacturen.md).
 */
export default function AdminCommissions() {
  const [partnerFilter, setPartnerFilter] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: partners = [] } = useQuery({
    queryKey: ["partners-for-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AdminLayout>
      <Helmet>
        <title>Commissies | Admin | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Percent className="h-7 w-7" aria-hidden="true" />
              Commissies
            </h1>
            <p className="text-muted-foreground">
              Werklijst van partnerregels die commissie opleveren. Selecteer regels en maak er een factuur van.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/admin/commissies/facturen">
                <Receipt className="mr-2 h-4 w-4" aria-hidden="true" />
                Commissiefacturen
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["commission-worklist"] })}
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Vernieuwen
            </Button>
          </div>
        </div>

        <Select value={partnerFilter ?? "all"} onValueChange={(val) => setPartnerFilter(val === "all" ? null : val)}>
          <SelectTrigger className="w-full sm:w-64" aria-label="Partner">
            <Building2 className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
            <SelectValue placeholder="Alle partners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle partners</SelectItem>
            {partners.map((partner) => (
              <SelectItem key={partner.id} value={partner.id}>
                {partner.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <CommissionWorklist partnerId={partnerFilter} />
      </div>
    </AdminLayout>
  );
}
