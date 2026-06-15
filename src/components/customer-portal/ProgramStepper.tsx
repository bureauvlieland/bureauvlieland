import { useState } from "react";
import { Check, BedDouble, Users, ThumbsUp, FileSignature, ChevronDown, HelpCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * StepId is used by the parent to route a CTA click to the right section.
 * - "lodging" → scrollt naar #accommodation
 * - "providers" / "approve" → scrollt naar #program
 * - "billing_terms" → opent billing-dialog of scrollt naar #terms-section
 */
export type StepId = "lodging" | "providers" | "approve" | "billing_terms";
export type StepState = "done" | "active" | "upcoming";

interface MiniStep {
  label: string;
  state: StepState;
  icon: React.ComponentType<{ className?: string }>;
}

interface TrackViewModel {
  id: "lodging" | "program";
  title: string;
  steps: MiniStep[];
  /** Korte status-zin onder de track. */
  statusLine: string;
  /** CTA tonen alleen wanneer de klant nu daadwerkelijk aan zet is. */
  cta?: { label: string; stepId: StepId };
  /** True wanneer alle stappen in deze track 'done' zijn. */
  done: boolean;
}

export interface ProgramStepperProps {
  statusSummary: {
    total: number;
    confirmed: number;
    pending: number;
    alternative: number;
    counter_proposed?: number;
  };
  billingComplete: boolean;
  termsAccepted: boolean;
  isMultiDay: boolean;
  accommodationStatus?: "none" | "requested" | "selected";
  /** Aantal logies-offertes dat daadwerkelijk binnen is en vergelijkbaar (status = submitted). */
  accommodationQuoteReceivedCount?: number;
  customerApprovedCount: number;
  customerApprovableCount: number;
  quoteStatus?: string | null;
  onStepAction?: (stepId: StepId) => void;
  className?: string;
  /** "horizontal" (default) = hero/overzicht. "vertical" = compacte sidebar-variant. */
  variant?: "horizontal" | "vertical";
  /** Mobile: initieel ingeklapt (standaard true bij vertical, false bij horizontal). */
  defaultCollapsedOnMobile?: boolean;
}

// ─── Track-builders ──────────────────────────────────────────────────────────

function buildLodgingTrack(
  accommodationStatus: "none" | "requested" | "selected",
  receivedCount: number,
): TrackViewModel {
  const requestDone = accommodationStatus !== "none";
  const compareDone = accommodationStatus === "selected";
  const lockedDone = accommodationStatus === "selected";

  const steps: MiniStep[] = [
    {
      label: "Aanvraag ingediend",
      icon: BedDouble,
      state: requestDone ? "done" : "active",
    },
    {
      label: "Offertes vergelijken",
      icon: Users,
      state: compareDone ? "done" : requestDone && receivedCount > 0 ? "active" : "upcoming",
    },
    {
      label: "Logies vastgelegd",
      icon: Check,
      state: lockedDone ? "done" : "upcoming",
    },
  ];

  if (!requestDone) {
    return {
      id: "lodging",
      title: "Logies",
      steps,
      statusLine: "Logies nog niet aangevraagd.",
      cta: { label: "Logies aanvragen", stepId: "lodging" },
      done: false,
    };
  }
  if (lockedDone) {
    return {
      id: "lodging",
      title: "Logies",
      steps,
      statusLine: "Logies vastgelegd.",
      done: true,
    };
  }
  if (receivedCount > 0) {
    return {
      id: "lodging",
      title: "Logies",
      steps,
      statusLine: `${receivedCount} logies-offerte${receivedCount !== 1 ? "s" : ""} ontvangen — vergelijk en kies uw favoriet.`,
      cta: { label: "Logies-offertes vergelijken", stepId: "lodging" },
      done: false,
    };
  }
  return {
    id: "lodging",
    title: "Logies",
    steps,
    statusLine: "Wij verzamelen logies-offertes voor u. U hoeft nu niets te doen.",
    done: false,
  };
}

function buildProgramTrack(
  statusSummary: ProgramStepperProps["statusSummary"],
  customerApprovedCount: number,
  customerApprovableCount: number,
  billingComplete: boolean,
  termsAccepted: boolean,
): TrackViewModel {
  const providersDone =
    statusSummary.total > 0 &&
    statusSummary.pending === 0 &&
    statusSummary.alternative === 0 &&
    (statusSummary.counter_proposed || 0) === 0;
  const approveDone =
    customerApprovableCount > 0 && customerApprovedCount >= customerApprovableCount;
  const billingTermsDone = billingComplete && termsAccepted;

  const steps: MiniStep[] = [
    {
      label: "Aanbieders bevestigen",
      icon: Users,
      state: providersDone ? "done" : statusSummary.total > 0 ? "active" : "upcoming",
    },
    {
      label: "Onderdelen goedkeuren",
      icon: ThumbsUp,
      state: approveDone ? "done" : providersDone ? "active" : "upcoming",
    },
    {
      label: "Gegevens & voorwaarden",
      icon: FileSignature,
      state: billingTermsDone ? "done" : approveDone ? "active" : "upcoming",
    },
  ];

  if (statusSummary.total === 0) {
    return {
      id: "program",
      title: "Programma",
      steps,
      statusLine: "Wij stellen uw programma samen. U hoort van ons zodra het klaarstaat.",
      done: false,
    };
  }
  if (!providersDone) {
    return {
      id: "program",
      title: "Programma",
      steps,
      statusLine:
        statusSummary.alternative > 0
          ? `${statusSummary.alternative} alternatief voorgesteld — uw aandacht is gewenst.`
          : `${statusSummary.confirmed} van ${statusSummary.total} onderdelen bevestigd door aanbieders.`,
      cta:
        statusSummary.alternative > 0 || (statusSummary.counter_proposed || 0) > 0
          ? { label: "Programma bekijken", stepId: "providers" }
          : undefined,
      done: false,
    };
  }
  if (!approveDone) {
    return {
      id: "program",
      title: "Programma",
      steps,
      statusLine: `U kunt nu uw onderdelen goedkeuren (${customerApprovedCount} van ${customerApprovableCount}).`,
      cta: { label: "Onderdelen goedkeuren", stepId: "approve" },
      done: false,
    };
  }
  if (!billingTermsDone) {
    return {
      id: "program",
      title: "Programma",
      steps,
      statusLine: !billingComplete
        ? "Vul uw factuurgegevens aan om de boeking definitief te maken."
        : "Onderteken de voorwaarden om de boeking definitief te maken.",
      cta: {
        label: !billingComplete ? "Gegevens invullen" : "Ondertekenen",
        stepId: "billing_terms",
      },
      done: false,
    };
  }
  return {
    id: "program",
    title: "Programma",
    steps,
    statusLine: "Programma definitief — wij gaan ermee aan de slag.",
    done: true,
  };
}

// ─── Visual helpers ──────────────────────────────────────────────────────────

const stepCircleClasses = (state: StepState) =>
  cn(
    "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
    state === "done" && "bg-primary border-primary text-primary-foreground",
    state === "active" && "bg-background border-primary text-primary ring-4 ring-primary/15",
    state === "upcoming" && "bg-background border-border text-muted-foreground",
  );

const miniDotClasses = (state: StepState) =>
  cn(
    "h-2 w-2 rounded-full transition-colors",
    state === "done" && "bg-primary",
    state === "active" && "bg-primary ring-2 ring-primary/25",
    state === "upcoming" && "bg-border",
  );

const GlossaryTooltip = () => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Uitleg termen"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs space-y-1.5 text-xs">
        <p>
          <strong>Aanbieder bevestigt</strong> = de partij die het onderdeel uitvoert, heeft toegezegd.
        </p>
        <p>
          <strong>U keurt goed</strong> = u accepteert het onderdeel zoals voorgesteld.
        </p>
        <p>
          <strong>U ondertekent</strong> = u accepteert de algemene voorwaarden.
        </p>
        <p>
          <strong>Logies-offerte</strong> = aanbod van een logies-aanbieder (los van de programma-offerte).
        </p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// ─── Track component (één rij stappen + statusregel + optionele CTA) ────────

const TrackRow = ({
  track,
  onAction,
}: {
  track: TrackViewModel;
  onAction?: (stepId: StepId) => void;
}) => (
  <div>
    <div className="mb-2 flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {track.title}
      </span>
      {track.done && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          <Check className="h-3 w-3" /> Gereed
        </span>
      )}
    </div>

    {/* Horizontal mini-stepper */}
    <div className="hidden sm:flex items-start">
      {track.steps.map((s, i) => {
        const Icon = s.icon;
        const isLast = i === track.steps.length - 1;
        return (
          <div key={i} className="flex flex-1 items-start min-w-0">
            <div className="flex flex-col items-center text-center gap-1.5 min-w-0 px-1 flex-1">
              <div className={stepCircleClasses(s.state)}>
                {s.state === "done" ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <p
                className={cn(
                  "text-[11px] font-medium leading-tight",
                  s.state === "upcoming" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {s.label}
              </p>
            </div>
            {!isLast && (
              <div className="flex-1 pt-[15px] px-1 min-w-[16px]">
                <div
                  className={cn(
                    "h-0.5 rounded-full transition-colors",
                    track.steps[i + 1].state !== "upcoming" || s.state === "done"
                      ? "bg-primary"
                      : "bg-border",
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>

    {/* Mobile dots only — single line of status under */}
    <div className="sm:hidden flex items-center gap-1.5 mb-2">
      {track.steps.map((s, i) => (
        <div key={i} className={miniDotClasses(s.state)} />
      ))}
    </div>

    {/* Status line + optional CTA */}
    <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        {!track.cta && !track.done && <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/70" />}
        <span>{track.statusLine}</span>
      </p>
      {track.cta && onAction && (
        <Button
          size="sm"
          variant={track.id === "lodging" ? "outline" : "default"}
          onClick={() => onAction(track.cta!.stepId)}
          className="shrink-0"
        >
          {track.cta.label}
        </Button>
      )}
    </div>
  </div>
);

// ─── Vertical (sidebar) track component ──────────────────────────────────────

const TrackRowVertical = ({
  track,
  onAction,
}: {
  track: TrackViewModel;
  onAction?: (stepId: StepId) => void;
}) => (
  <div>
    <div className="mb-2 flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {track.title}
      </span>
      {track.done && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          <Check className="h-3 w-3" />
        </span>
      )}
    </div>

    <ol className="relative">
      {track.steps.map((s, i) => {
        const Icon = s.icon;
        const isLast = i === track.steps.length - 1;
        const nextState = !isLast ? track.steps[i + 1].state : "upcoming";
        const connectorActive = s.state === "done" || nextState !== "upcoming";
        return (
          <li key={i} className="relative flex items-start gap-3 pb-3 last:pb-0">
            {/* Vertical connector */}
            {!isLast && (
              <span
                className={cn(
                  "absolute left-[15px] top-8 bottom-0 w-0.5 -translate-x-1/2",
                  connectorActive ? "bg-primary" : "bg-border",
                )}
                aria-hidden
              />
            )}
            <div className={cn(stepCircleClasses(s.state), "h-8 w-8")}>
              {s.state === "done" ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <p
              className={cn(
                "pt-1.5 text-xs font-medium leading-tight",
                s.state === "upcoming" ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {s.label}
            </p>
          </li>
        );
      })}
    </ol>

    {/* Status line + optional CTA full-width */}
    <div className="mt-2 space-y-2">
      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
        {!track.cta && !track.done && (
          <Clock className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground/70" />
        )}
        <span>{track.statusLine}</span>
      </p>
      {track.cta && onAction && (
        <Button
          size="sm"
          variant={track.id === "lodging" ? "outline" : "default"}
          onClick={() => onAction(track.cta!.stepId)}
          className="w-full"
        >
          {track.cta.label}
        </Button>
      )}
    </div>
  </div>
);


// ─── Main component ──────────────────────────────────────────────────────────

export const ProgramStepper = ({
  statusSummary,
  billingComplete,
  termsAccepted,
  isMultiDay,
  accommodationStatus = "none",
  accommodationQuoteReceivedCount = 0,
  customerApprovedCount,
  customerApprovableCount,
  onStepAction,
  className,
  variant = "horizontal",
  defaultCollapsedOnMobile,
}: ProgramStepperProps) => {
  const isVertical = variant === "vertical";
  const [mobileOpen, setMobileOpen] = useState(
    defaultCollapsedOnMobile !== undefined ? !defaultCollapsedOnMobile : !isVertical,
  );

  const lodgingTrack = isMultiDay
    ? buildLodgingTrack(accommodationStatus, accommodationQuoteReceivedCount)
    : null;
  const programTrack = buildProgramTrack(
    statusSummary,
    customerApprovedCount,
    customerApprovableCount,
    billingComplete,
    termsAccepted,
  );

  const allDone = (!lodgingTrack || lodgingTrack.done) && programTrack.done;
  const statusBadge = allDone
    ? { label: "Definitief", tone: "bg-primary/10 text-primary" }
    : programTrack.done
      ? { label: "Bijna klaar", tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" }
      : { label: "In afstemming", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300" };

  const Row = isVertical ? TrackRowVertical : TrackRow;

  return (
    <div
      className={cn(
        "bg-card border rounded-xl",
        isVertical ? "p-4" : "p-4 sm:p-5",
        className,
      )}
    >
      {/* Header */}
      <div className={cn("flex items-center justify-between", isVertical ? "mb-3" : "mb-4")}>
        <div className="flex items-center gap-1.5">
          <h3 className={cn("font-semibold", isVertical ? "text-xs uppercase tracking-wider text-muted-foreground" : "text-sm")}>
            {isVertical ? "Voortgang" : "Uw aanvraag"}
          </h3>
          {!isVertical && <GlossaryTooltip />}
        </div>
        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", statusBadge.tone)}>
          {statusBadge.label}
        </span>
      </div>

      {/* Mobile: collapsible toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="sm:hidden w-full flex items-center justify-between mb-3 text-xs text-muted-foreground"
        aria-expanded={mobileOpen}
      >
        <span>{mobileOpen ? "Verberg voortgang" : "Toon voortgang"}</span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", mobileOpen && "rotate-180")}
        />
      </button>

      <div
        className={cn(
          isVertical ? "space-y-4" : "space-y-5",
          !mobileOpen && "hidden sm:block",
          !mobileOpen && (isVertical ? "sm:space-y-4" : "sm:space-y-5"),
        )}
      >
        {lodgingTrack && (
          <>
            <Row track={lodgingTrack} onAction={onStepAction} />
            <div className="border-t" />
          </>
        )}
        <Row track={programTrack} onAction={onStepAction} />
      </div>

      {allDone && (
        <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-primary" />
          <span className={cn("font-medium", isVertical && "text-xs")}>
            {isVertical ? "Alles geregeld." : "Alles geregeld — wij gaan ermee aan de slag."}
          </span>
        </div>
      )}
    </div>
  );
};

// Backwards-compat export used by other modules (no behavior change here).
export function getProgramSteps(_: Omit<ProgramStepperProps, "onStepAction" | "className" | "quoteStatus">) {
  // Deprecated: kept as no-op for any external callers; new UI builds tracks inline.
  return [] as Array<{ id: StepId; number: number; label: string; sub: string; state: StepState }>;
}
