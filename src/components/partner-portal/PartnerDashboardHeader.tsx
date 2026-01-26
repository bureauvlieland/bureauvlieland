import { Card, CardContent } from "@/components/ui/card";
import { Building2, Bell, CheckCircle, Receipt, Play } from "lucide-react";

interface PartnerDashboardHeaderProps {
  partner: {
    id: string;
    name: string;
    email: string;
    commission_percentage: number;
  };
  summary: {
    pending: number;
    confirmed: number;
    accepted: number;
    executed: number;
    closed: number;
    readyForInvoice: number;
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
        </div>
      </div>

      {/* Stats cards - action-focused */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.pending}</p>
                <p className="text-xs text-muted-foreground">Nieuw</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.confirmed}</p>
                <p className="text-xs text-muted-foreground">Wacht op klant</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <Play className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.accepted + summary.executed}</p>
                <p className="text-xs text-muted-foreground">Akkoord</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.readyForInvoice}</p>
                <p className="text-xs text-muted-foreground">Te factureren</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
