import { Card, CardContent } from "@/components/ui/card";
import { Building2, CheckCircle, Clock, FileText, Receipt } from "lucide-react";

interface PartnerDashboardHeaderProps {
  partner: {
    id: string;
    name: string;
    email: string;
    commission_percentage: number;
  };
  summary: {
    pendingConfirmation: number;
    confirmed: number;
    executed: number;
    pendingInvoice: number;
    invoiced: number;
    total: number;
  };
}

export const PartnerDashboardHeader = ({ partner, summary }: PartnerDashboardHeaderProps) => {
  return (
    <div className="space-y-6">
      {/* Partner info */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{partner.name}</h1>
          <p className="text-muted-foreground">{partner.email}</p>
          {partner.commission_percentage > 0 && (
            <p className="text-sm text-muted-foreground">
              Commissie: {partner.commission_percentage}%
            </p>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.pendingConfirmation}</p>
                <p className="text-xs text-muted-foreground">Te bevestigen</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.confirmed}</p>
                <p className="text-xs text-muted-foreground">Bevestigd</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.pendingInvoice}</p>
                <p className="text-xs text-muted-foreground">Te factureren</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Receipt className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.invoiced}</p>
                <p className="text-xs text-muted-foreground">Gefactureerd</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
