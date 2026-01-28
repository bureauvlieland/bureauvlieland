import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Bell, CheckCircle, Receipt, Play, BedDouble, Send, ThumbsUp } from "lucide-react";

interface ActivitySummary {
  pending: number;
  confirmed: number;
  accepted: number;
  executed: number;
  closed: number;
  readyForInvoice: number;
  invoiced: number;
  total: number;
}

interface AccommodationSummary {
  pending: number;
  submitted: number;
  selected: number;
  closed: number;
  total: number;
}

interface Financials {
  ytdRevenue: number;
  ytdCommission: number;
  pendingCommission: number;
}

interface PartnerStatsGridProps {
  isActivityPartner: boolean;
  isAccommodationPartner: boolean;
  activitySummary?: ActivitySummary;
  accommodationSummary?: AccommodationSummary;
  financials?: Financials;
}

export const PartnerStatsGrid = ({
  isActivityPartner,
  isAccommodationPartner,
  activitySummary,
  accommodationSummary,
  financials,
}: PartnerStatsGridProps) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {/* YTD Revenue - always show */}
      {financials && (
        <Card className="col-span-2 lg:col-span-2 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">YTD Omzet</p>
                <p className="text-2xl font-bold">
                  €{financials.ytdRevenue.toLocaleString("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                {financials.pendingCommission > 0 && (
                  <p className="text-xs text-muted-foreground">
                    €{financials.pendingCommission.toFixed(0)} commissie open
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity-specific stats */}
      {isActivityPartner && activitySummary && (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activitySummary.pending}</p>
                  <p className="text-xs text-muted-foreground">Nieuw</p>
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
                  <p className="text-2xl font-bold">{activitySummary.confirmed}</p>
                  <p className="text-xs text-muted-foreground">Voorstel verstuurd</p>
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
                  <p className="text-2xl font-bold">{activitySummary.accepted + activitySummary.executed}</p>
                  <p className="text-xs text-muted-foreground">Akkoord</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activitySummary.readyForInvoice}</p>
                  <p className="text-xs text-muted-foreground">Te factureren</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Accommodation-specific stats */}
      {isAccommodationPartner && accommodationSummary && (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                  <BedDouble className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{accommodationSummary.pending}</p>
                  <p className="text-xs text-muted-foreground">Te beantwoorden</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                  <Send className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{accommodationSummary.submitted}</p>
                  <p className="text-xs text-muted-foreground">Offerte verstuurd</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                  <ThumbsUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{accommodationSummary.selected}</p>
                  <p className="text-xs text-muted-foreground">Gekozen</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
