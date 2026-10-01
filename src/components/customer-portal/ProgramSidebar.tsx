import { Mail, Phone, TreePine, Landmark, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaddenAmbassadeurBadge } from "@/components/WaddenAmbassadeurBadge";
import { cn } from "@/lib/utils";
import { useAppSettings } from "@/hooks/useAppSettings";
import { isFeeExcluded } from "@/lib/excludedFees";

/**
 * De zijbalk van het programma (klantportaal fase 2): alleen nog de heffingen
 * en het contact; de voortgang staat boven het programma en de horecatips
 * staan op Praktisch. Op een telefoon komt hij onder de inhoud.
 */
interface ProgramSidebarProps {
  /** Per-project uitgesloten automatische kostenposten (program_requests.excluded_fees). */
  excludedFees?: string[] | null;
  className?: string;
}

export const ProgramSidebar = ({ excludedFees, className }: ProgramSidebarProps) => {
  const { settings: appSettings } = useAppSettings();
  const showTouristTax = !isFeeExcluded(excludedFees, "tourist_tax");
  const showNature = !isFeeExcluded(excludedFees, "nature_contribution");

  return (
    <aside className={cn("space-y-4 lg:sticky lg:top-20 lg:h-fit", className)}>
      {(showTouristTax || showNature) && (
        <div className="space-y-3 rounded-lg bg-muted/50 p-4">
          {showTouristTax && (
            <div className="flex items-start gap-2.5">
              <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">Toeristenbelasting</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  €{appSettings.tourist_tax_pp_per_day.toFixed(2).replace(".", ",")} p.p. per dag. De gemeente Vlieland heft toeristenbelasting voor iedereen die op het eiland verblijft.
                </p>
              </div>
            </div>
          )}
          {showNature && (
            <div className="flex items-start gap-2.5">
              <TreePine className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">Natuurbijdrage</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Evenementenbureaus op Vlieland dragen €{appSettings.nature_contribution_pp.toFixed(2).replace(".", ",")} per persoon af aan Staatsbosbeheer als bijdrage voor het natuurbeheer van het recreatiegebied.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary" aria-hidden="true">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">Vragen of hulp nodig?</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Neem gerust contact met ons op.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a href="mailto:hallo@bureauvlieland.nl">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  E-mail
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href="tel:+31562700208">
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  Bellen
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-1">
        <WaddenAmbassadeurBadge variant="compact" />
      </div>
    </aside>
  );
};
