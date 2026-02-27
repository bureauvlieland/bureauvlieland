import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Building2, Mail, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface BureauCentralBadgeProps {
  bureauDetails?: {
    companyName?: string;
    kvkNumber?: string;
    vatNumber?: string;
    address?: string;
    email?: string;
  };
  variant?: "compact" | "full";
}

export const BureauCentralBadge = ({ bureauDetails, variant = "full" }: BureauCentralBadgeProps) => {
  const [copied, setCopied] = useState(false);

  const defaultDetails = {
    companyName: bureauDetails?.companyName || "Bureau Vlieland",
    kvkNumber: bureauDetails?.kvkNumber || "",
    vatNumber: bureauDetails?.vatNumber || "",
    address: bureauDetails?.address || "Vlieland",
    email: bureauDetails?.email || "administratie@bureauvlieland.nl",
  };

  const handleCopyDetails = () => {
    const text = [
      defaultDetails.companyName,
      defaultDetails.kvkNumber && `KvK: ${defaultDetails.kvkNumber}`,
      defaultDetails.vatNumber && `BTW: ${defaultDetails.vatNumber}`,
      defaultDetails.address,
      defaultDetails.email,
    ].filter(Boolean).join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Gegevens gekopieerd");
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === "compact") {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 rounded-md text-xs font-medium">
        <Building2 className="h-3 w-3" />
        <span>Centrale facturatie</span>
      </div>
    );
  }

  return (
    <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
      <Building2 className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-300">
        Facturatie via Bureau Vlieland
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-400">
        <p className="mb-3">
          Dit project wordt centraal gefactureerd. U stuurt uw factuur voor de geoffreerde prijs naar Bureau Vlieland (niet naar de klant). Bureau Vlieland stuurt u vervolgens een commissiefactuur.
        </p>
        <div className="bg-white dark:bg-amber-950/50 rounded-md p-3 space-y-1 text-sm">
          <p className="font-semibold">{defaultDetails.companyName}</p>
          {defaultDetails.kvkNumber && (
            <p className="text-muted-foreground">KvK: {defaultDetails.kvkNumber}</p>
          )}
          {defaultDetails.vatNumber && (
            <p className="text-muted-foreground">BTW: {defaultDetails.vatNumber}</p>
          )}
          {defaultDetails.address && (
            <p className="text-muted-foreground">{defaultDetails.address}</p>
          )}
          {defaultDetails.email && (
            <a 
              href={`mailto:${defaultDetails.email}`} 
              className="flex items-center gap-1 text-amber-700 dark:text-amber-400 hover:underline"
            >
              <Mail className="h-3 w-3" />
              {defaultDetails.email}
            </a>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
          onClick={handleCopyDetails}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Gekopieerd
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Kopieer facturatiegegevens
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
};
