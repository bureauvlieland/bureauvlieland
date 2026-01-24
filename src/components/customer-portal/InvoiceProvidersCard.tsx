import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Building2, ExternalLink } from "lucide-react";
import type { ProgramRequestItem } from "@/types/programRequest";

interface InvoiceProvidersCardProps {
  items: ProgramRequestItem[];
  className?: string;
}

interface ProviderInfo {
  id: string;
  name: string;
  itemCount: number;
  blockType: string;
}

export const InvoiceProvidersCard = ({ items, className }: InvoiceProvidersCardProps) => {
  // Group items by provider, excluding cancelled and self-arranged
  const providers = items
    .filter((item) => item.status !== "cancelled" && item.block_type !== "self_arranged")
    .reduce((acc, item) => {
      const key = item.provider_id;
      if (!acc[key]) {
        acc[key] = {
          id: item.provider_id,
          name: item.provider_name,
          itemCount: 0,
          blockType: item.block_type,
        };
      }
      acc[key].itemCount++;
      return acc;
    }, {} as Record<string, ProviderInfo>);

  const providerList = Object.values(providers);

  // Separate Bureau Vlieland items from partner items
  const bureauItems = providerList.filter((p) => p.blockType === "bureau");
  const partnerItems = providerList.filter((p) => p.blockType === "partner");

  // Self-arranged items
  const selfArrangedItems = items.filter(
    (item) => item.status !== "cancelled" && item.block_type === "self_arranged"
  );

  if (providerList.length === 0 && selfArrangedItems.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Facturatie
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Voor dit programma ontvang je facturen van de volgende partijen:
        </p>

        <div className="space-y-3">
          {/* Bureau Vlieland items */}
          {bureauItems.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">Bureau Vlieland</p>
                <p className="text-sm text-muted-foreground">
                  {bureauItems.map((p) => p.name).join(", ")}
                  {" + organisatie & handling fee"}
                </p>
              </div>
            </div>
          )}

          {/* Partner items */}
          {partnerItems.map((provider) => (
            <div
              key={provider.id}
              className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
            >
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{provider.name}</p>
                <p className="text-sm text-muted-foreground">
                  {provider.itemCount} activiteit{provider.itemCount > 1 ? "en" : ""}
                </p>
              </div>
            </div>
          ))}

          {/* Self-arranged items info */}
          {selfArrangedItems.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-dashed">
              <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-muted-foreground">Zelf te regelen</p>
                <p className="text-sm text-muted-foreground">
                  {selfArrangedItems.map((item) => item.block_name).join(", ")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Deze boek en betaal je zelf rechtstreeks bij de aanbieder.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> Je ontvangt van elke partij een aparte factuur. 
            Heb je vragen over een specifieke factuur? Neem dan contact op met de betreffende aanbieder.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
