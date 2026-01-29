import { TrendingUp, ArrowRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PartnerYtdModuleProps {
  ytdRevenue: number;
  pendingCommission: number;
}

export const PartnerYtdModule = ({
  ytdRevenue,
  pendingCommission,
}: PartnerYtdModuleProps) => {
  const [searchParams] = useSearchParams();
  const impersonateParam = searchParams.get("impersonate");
  const urlSuffix = impersonateParam ? `?impersonate=${impersonateParam}` : "";

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">YTD Omzet</p>
              <p className="text-2xl font-bold">
                €
                {ytdRevenue.toLocaleString("nl-NL", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
              {pendingCommission > 0 && (
                <p className="text-xs text-muted-foreground">
                  €{pendingCommission.toFixed(0)} commissie open
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/partner/facturatie${urlSuffix}`}>
              Facturatie
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
