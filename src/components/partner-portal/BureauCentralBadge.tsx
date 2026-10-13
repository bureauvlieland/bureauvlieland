import { Building2 } from "lucide-react";
import { Notice, Pill } from "@/components/system";

/**
 * Centrale facturatie: de partner factureert dit onderdeel aan Bureau
 * Vlieland, niet aan de klant. Compact als `Pill`, voluit als `Notice`
 * (partnerportaal fase 4).
 */
interface BureauCentralBadgeProps {
  variant?: "compact" | "full";
}

export const BureauCentralBadge = ({ variant = "full" }: BureauCentralBadgeProps) => {
  if (variant === "compact") {
    return (
      <Pill tone="warning" title="U factureert dit onderdeel aan Bureau Vlieland, niet aan de klant.">
        <Building2 className="h-3 w-3" aria-hidden="true" />
        Centrale facturatie
      </Pill>
    );
  }
  return (
    <Notice tone="warning" title="Facturatie via Bureau Vlieland" icon={<Building2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}>
      <p>U factureert dit onderdeel aan Bureau Vlieland, niet aan de klant. Registreer uw factuur met de pdf onder Facturatie; Bureau Vlieland verwerkt en betaalt hem namens de klant.</p>
    </Notice>
  );
};
