import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Building2 } from "lucide-react";

interface BureauCentralBadgeProps {
  variant?: "compact" | "full";
}

export const BureauCentralBadge = ({ variant = "full" }: BureauCentralBadgeProps) => {
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
        Je factureert dit onderdeel aan Bureau Vlieland (niet aan de klant).
        Gebruik de knop <strong>“Factuur registreren”</strong> om je factuur te uploaden —
        Bureau Vlieland verwerkt en betaalt deze namens de klant.
      </AlertDescription>
    </Alert>
  );
};
