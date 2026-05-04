import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, MessageSquare, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusSummaryProps {
  total: number;
  confirmed: number;
  pending: number;
  alternative: number;
  progress: number;
  className?: string;
  variant?: "default" | "compact" | "checklist";
  // Additional props for checklist variant
  billingComplete?: boolean;
  hasAccommodation?: boolean;
  accommodationStatus?: "none" | "requested" | "selected";
  termsAccepted?: boolean;
  isMultiDay?: boolean;
  isPreApproval?: boolean;
  quoteStatus?: string | null;
  customerApprovedCount?: number;
  customerApprovableCount?: number;
}

export const StatusSummary = ({
  total,
  confirmed,
  pending,
  alternative,
  progress,
  className,
  variant = "default",
  billingComplete = false,
  hasAccommodation = false,
  accommodationStatus,
  termsAccepted = false,
  isMultiDay = false,
  isPreApproval = false,
  quoteStatus,
  customerApprovedCount = 0,
  customerApprovableCount = 0,
}: StatusSummaryProps) => {
  // Derive effective accommodation status: prefer explicit prop, fall back to boolean
  const effectiveAccommodationStatus = accommodationStatus ?? (hasAccommodation ? "selected" : "none");
  // Checklist variant - new design per repositioning
  if (variant === "checklist") {
    const activitiesConfirmed = pending === 0 && alternative === 0 && total > 0;
    
    const StatusItem = ({ 
      icon, 
      label, 
      color 
    }: { 
      icon: React.ReactNode; 
      label: string; 
      color: "green" | "amber" | "muted";
    }) => (
      <div className="flex items-center gap-2">
        {icon}
        <span className={
          color === "green" ? "text-foreground" 
          : color === "amber" ? "text-amber-700" 
          : "text-muted-foreground"
        }>
          {label}
        </span>
      </div>
    );

    return (
      <div className={cn("bg-muted/50 rounded-lg p-4 space-y-4", className)}>
        <h3 className="text-sm font-semibold">Status programma</h3>
        
        <div className="space-y-3 text-sm">
          {/* Logies */}
          {isMultiDay && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Logies</p>
              <StatusItem
                icon={effectiveAccommodationStatus === "selected"
                  ? <CheckCircle className="h-4 w-4 text-green-600" />
                  : effectiveAccommodationStatus === "requested"
                    ? <Clock className="h-4 w-4 text-amber-500" />
                    : <Circle className="h-4 w-4 text-muted-foreground" />
                }
                label={effectiveAccommodationStatus === "selected"
                  ? "Logies geregeld"
                  : effectiveAccommodationStatus === "requested"
                    ? "Offertes worden verzameld"
                    : "Logies regelen"
                }
                color={effectiveAccommodationStatus === "selected" ? "green" : effectiveAccommodationStatus === "requested" ? "amber" : "muted"}
              />
            </div>
          )}

          {/* Programma — labels passen zich aan op fase */}
          {(() => {
            const isAwaitingCustomerApproval =
              quoteStatus === "offerte_verstuurd" &&
              customerApprovedCount < customerApprovableCount;

            const programIcon = activitiesConfirmed
              ? <CheckCircle className="h-4 w-4 text-green-600" />
              : isAwaitingCustomerApproval
                ? <Clock className="h-4 w-4 text-primary" />
                : isPreApproval && (!quoteStatus || ["concept", "in_afstemming"].includes(quoteStatus))
                  ? <Clock className="h-4 w-4 text-muted-foreground" />
                  : alternative > 0
                    ? <AlertCircle className="h-4 w-4 text-amber-500" />
                    : <Clock className="h-4 w-4 text-amber-500" />;

            const programLabel = activitiesConfirmed
              ? `Bevestigd (${total}/${total})`
              : isAwaitingCustomerApproval
                ? `Wachten op uw akkoord (${total} onderdelen)`
                : isPreApproval && (!quoteStatus || ["concept", "in_afstemming"].includes(quoteStatus))
                  ? `In voorbereiding (${total} onderdelen)`
                  : alternative > 0
                    ? `Alternatief bekijken (${confirmed}/${total})`
                    : `Wachten op aanbieders (${confirmed}/${total} bevestigd)`;

            const programColor: "green" | "amber" | "muted" = activitiesConfirmed
              ? "green"
              : isAwaitingCustomerApproval
                ? "muted"
                : isPreApproval && (!quoteStatus || ["concept", "in_afstemming"].includes(quoteStatus))
                  ? "muted"
                  : "amber";

            return (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Programma</p>
                <StatusItem icon={programIcon} label={programLabel} color={programColor} />
              </div>
            );
          })()}

          {/* Klant akkoord — alleen tonen bij offerte_verstuurd of akkoord_ontvangen */}
          {customerApprovableCount > 0 && quoteStatus && ["offerte_verstuurd", "akkoord_ontvangen"].includes(quoteStatus) && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Uw akkoord</p>
              <StatusItem
                icon={customerApprovedCount >= customerApprovableCount
                  ? <CheckCircle className="h-4 w-4 text-green-600" />
                  : <Circle className="h-4 w-4 text-muted-foreground" />
                }
                label={customerApprovedCount >= customerApprovableCount
                  ? quoteStatus === "offerte_verstuurd" ? "Voorstel akkoord" : "Alle onderdelen geaccordeerd"
                  : quoteStatus === "offerte_verstuurd"
                    ? "Voorstel beoordelen"
                    : `${customerApprovedCount} van ${customerApprovableCount} geaccordeerd`
                }
                color={customerApprovedCount >= customerApprovableCount ? "green" : "muted"}
              />
            </div>
          )}
          {/* Facturatie */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Facturatie</p>
            <StatusItem
              icon={billingComplete 
                ? <CheckCircle className="h-4 w-4 text-green-600" />
                : <Circle className="h-4 w-4 text-muted-foreground" />
              }
              label={billingComplete ? "Gegevens compleet" : "Gegevens aanleveren"}
              color={billingComplete ? "green" : "muted"}
            />
          </div>

          {/* Voorwaarden */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Voorwaarden</p>
            <StatusItem
              icon={termsAccepted 
                ? <CheckCircle className="h-4 w-4 text-green-600" />
                : <Circle className="h-4 w-4 text-muted-foreground" />
              }
              label={termsAccepted ? "Geaccepteerd" : "Nog accepteren"}
              color={termsAccepted ? "green" : "muted"}
            />
          </div>
        </div>
      </div>
    );
  }

  // Compact variant for sidebar
  if (variant === "compact") {
    return (
      <div className={cn("bg-muted/50 rounded-lg p-3", className)}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Status</span>
          <span className="text-xs text-muted-foreground">
            {confirmed}/{total}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-600" />
            {confirmed}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-amber-600" />
            {pending}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3 text-blue-600" />
            {alternative}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-muted/50 rounded-lg p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Status</h3>
        <span className="text-sm text-muted-foreground">
          {confirmed} van {total} bevestigd
        </span>
      </div>
      
      <Progress value={progress} className="h-2 mb-4" />
      
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span>
            <span className="font-medium">{confirmed}</span>{" "}
            <span className="text-muted-foreground">bevestigd</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600" />
          <span>
            <span className="font-medium">{pending}</span>{" "}
            <span className="text-muted-foreground">wachtend</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-600" />
          <span>
            <span className="font-medium">{alternative}</span>{" "}
            <span className="text-muted-foreground">{alternative === 1 ? "alternatief" : "alternatieven"}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
