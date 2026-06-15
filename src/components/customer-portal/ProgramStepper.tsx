import { useState } from "react";
import {
  Check,
  BedDouble,
  Users,
  ThumbsUp,
  FileSignature,
  ChevronDown,
  HelpCircle,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * StepId is used by the parent to route a CTA click to the right section.
 */
export type StepId = "lodging" | "providers" | "approve" | "billing_terms";
export type StepState = "done" | "active" | "upcoming";

interface MiniStep {
  label: string;
  state: StepState;
  icon: React.ComponentType<{ className?: string }>;
}

type TrackId = "lodging" | "program" | "billing";
type TrackTone = "lodging" | "program" | "billing";

interface TrackViewModel {
  id: TrackId;
  tone: TrackTone;
  title: string;
  subtitle: string;
  steps: MiniStep[];
  statusLine: string;
  cta?: { label: string; stepId: StepId };
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
  accommodationQuoteReceivedCount?: number;
  customerApprovedCount: number;
  customerApprovableCount: number;
  quoteStatus?: string | null;
  onStepAction?: (stepId: StepId) => void;
  className?: string;
  variant?: "horizontal" | "vertical";
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

  const base = { id: "lodging" as const, tone: "lodging" as const, title: "Logies", subtitle: "Verblijf op het eiland", steps };

  if (!requestDone) {
    return {
      ...base,
      statusLine: "Logies nog niet aangevraagd.",
      cta: { label: "Logies aanvragen", stepId: "lodging" },
      done: false,
    };
  }
  if (lockedDone) {
    return { ...base, statusLine: "Logies vastgelegd.", done: true };
  }
  if (receivedCount > 0) {
    return {
      ...base,
      statusLine: `${receivedCount} offerte${receivedCount !== 1 ? "s" : ""} ontvangen — kies uw favoriet.`,
      cta: { label: "Offertes vergelijken", stepId: "lodging" },
      done: false,
    };
  }
  return {
    ...base,
    statusLine: "Wij verzamelen offertes voor u. U hoeft nu niets te doen.",
    done: false,
  };
}

function buildProgramTrack(
  statusSummary: ProgramStepperProps["statusSummary"],
  customerApprovedCount: number,
  customerApprovableCount: number,
): TrackViewModel {
  const approveDone =
    customerApprovableCount > 0 && customerApprovedCount >= customerApprovableCount;
  const providersDone =
    statusSummary.total > 0 &&
    statusSummary.pending === 0 &&
    statusSummary.alternative === 0 &&
    (statusSummary.counter_proposed || 0) === 0;

  const steps: MiniStep[] = [
    {
      label: "Onderdelen goedkeuren",
      icon: ThumbsUp,
      state: approveDone ? "done" : customerApprovableCount > 0 ? "active" : "upcoming",
    },
    {
      label: "Aanbieders bevestigen",
      icon: Users,
      state: providersDone ? "done" : approveDone && statusSummary.total > 0 ? "active" : "upcoming",
    },
  ];

  const base = { id: "program" as const, tone: "program" as const, title: "Programma", subtitle: "Activiteiten & beleving", steps };

  if (statusSummary.total === 0) {
    return {
      ...base,
      statusLine: "Wij stellen uw programma samen. U hoort van ons zodra het klaarstaat.",
      done: false,
    };
  }
  if (!approveDone) {
    const remaining = Math.max(0, customerApprovableCount - customerApprovedCount);
    return {
      ...base,
      statusLine: `Bekijk en keur uw onderdelen goed (${customerApprovedCount} van ${customerApprovableCount}). Wij benaderen aanbieders zodra u akkoord gaat.`,
      cta: {
        label: remaining > 1 ? "Onderdelen goedkeuren" : "Onderdeel goedkeuren",
        stepId: "approve",
      },
      done: false,
    };
  }
  if (!providersDone) {
    return {
      ...base,
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
  return { ...base, statusLine: "Programma bevestigd door alle aanbieders.", done: true };
}

function buildBillingTrack(billingComplete: boolean, termsAccepted: boolean): TrackViewModel {
  const steps: MiniStep[] = [
    {
      label: "Facturatiegegevens",
      icon: FileSignature,
      state: billingComplete ? "done" : "active",
    },
    {
      label: "Voorwaarden ondertekenen",
      icon: Check,
      state: termsAccepted ? "done" : billingComplete ? "active" : "upcoming",
    },
  ];

  const base = {
    id: "billing" as const,
    tone: "billing" as const,
    title: "Gegevens & voorwaarden",
    subtitle: "Boeking definitief maken",
    steps,
  };

  if (!billingComplete) {
    return {
      ...base,
      statusLine: "U kunt deze gegevens nu alvast invullen — dat versnelt de boeking.",
      cta: { label: "Gegevens invullen", stepId: "billing_terms" },
      done: false,
    };
  }
  if (!termsAccepted) {
    return {
      ...base,
      statusLine: "Onderteken de voorwaarden om de boeking definitief te maken.",
      cta: { label: "Ondertekenen", stepId: "billing_terms" },
      done: false,
    };
  }
  return { ...base, statusLine: "Gegevens en voorwaarden compleet.", done: true };
}

// ─── Tone classes ────────────────────────────────────────────────────────────

const toneAccent: Record<TrackTone, string> = {
  lodging: "from-sky-500/15 to-sky-500/0 text-sky-700 dark:text-sky-300",
  program: "from-primary/15 to-primary/0 text-primary",
  billing: "from-amber-500/15 to-amber-500/0 text-amber-700 dark:text-amber-300",
};

const toneIconBg: Record<TrackTone, string> = {
  lodging: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  program: "bg-primary/10 text-primary",
  billing: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

const toneIcon: Record<TrackTone, React.ComponentType<{ className?: string }>> = {
  lodging: BedDouble,
  program: Sparkles,
  billing: FileSignature,
};

// ─── Step pip ────────────────────────────────────────────────────────────────

const StepPip = ({
  step,
  size = "md",
}: {
  step: MiniStep;
  size?: "sm" | "md";
}) => {
  const Icon = step.icon;
  const dimensions = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div
      className={cn(
        "relative z-10 flex shrink-0 items-center justify-center rounded-full border-2 transition-all",
        dimensions,
        step.state === "done" && "bg-primary border-primary text-primary-foreground shadow-sm",
        step.state === "active" &&
          "bg-background border-primary text-primary ring-4 ring-primary/15",
        step.state === "upcoming" && "bg-background border-border text-muted-foreground",
      )}
    >
      {step.state === "done" ? <Check className={iconSize} /> : <Icon className={iconSize} />}
    </div>
  );
};

const Connector = ({ active, vertical = false }: { active: boolean; vertical?: boolean }) =>
  vertical ? (
    <span
      className={cn(
        "absolute left-[13px] top-7 bottom-0 w-0.5 -translate-x-1/2 rounded-full transition-colors",
        active ? "bg-primary" : "bg-border",
      )}
      aria-hidden
    />
  ) : (
    <div
      className={cn(
        "h-0.5 flex-1 rounded-full transition-colors",
        active ? "bg-primary" : "bg-border",
      )}
    />
  );

const GlossaryTooltip = () => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Uitleg termen"
          className="text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs space-y-1.5 text-xs">
        <p>
          <strong>U keurt goed</strong> = u accepteert het onderdeel. Wij sturen het daarna pas naar
          de aanbieder.
        </p>
        <p>
          <strong>Aanbieder bevestigt</strong> = de partij die het uitvoert, heeft toegezegd.
        </p>
        <p>
          <strong>Gegevens & voorwaarden</strong> = facturatie en akkoord. Kunt u alvast invullen.
        </p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// ─── Horizontal track card ───────────────────────────────────────────────────

const TrackCard = ({
  track,
  onAction,
}: {
  track: TrackViewModel;
  onAction?: (stepId: StepId) => void;
}) => {
  const TitleIcon = toneIcon[track.tone];
  const doneCount = track.steps.filter((s) => s.state === "done").length;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-sm",
        track.done && "bg-muted/30",
      )}
    >
      {/* Soft tone wash */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b",
          toneAccent[track.tone],
        )}
        aria-hidden
      />

      <div className="relative p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                toneIconBg[track.tone],
              )}
            >
              <TitleIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-foreground leading-tight">
                  {track.title}
                </h4>
                {track.done ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    <Check className="h-3 w-3" /> Gereed
                  </span>
                ) : (
                  <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                    {doneCount}/{track.steps.length}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                {track.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Stepper (horizontal, evenly spaced) */}
        <div className="flex items-center">
          {track.steps.map((s, i) => {
            const isLast = i === track.steps.length - 1;
            return (
              <div key={i} className="flex items-center flex-1 last:flex-none min-w-0">
                <div className="flex flex-col items-start gap-1.5 min-w-0">
                  <StepPip step={s} />
                  <p
                    className={cn(
                      "text-[10.5px] font-medium leading-tight max-w-[88px]",
                      s.state === "upcoming" ? "text-muted-foreground" : "text-foreground",
                    )}
                  >
                    {s.label}
                  </p>
                </div>
                {!isLast && (
                  <div className="flex-1 mx-2 pb-5 min-w-[12px]">
                    <Connector
                      active={track.steps[i + 1].state !== "upcoming" || s.state === "done"}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Status & CTA */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border/60">
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground leading-snug">
            {!track.cta && !track.done && (
              <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/70" />
            )}
            {track.done && <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />}
            <span>{track.statusLine}</span>
          </p>
          {track.cta && onAction && (
            <Button
              size="sm"
              variant={track.id === "program" ? "default" : "outline"}
              onClick={() => onAction(track.cta!.stepId)}
              className="shrink-0 gap-1.5"
            >
              {track.cta.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Vertical (sidebar) track card ───────────────────────────────────────────

const TrackCardVertical = ({
  track,
  onAction,
}: {
  track: TrackViewModel;
  onAction?: (stepId: StepId) => void;
}) => {
  const TitleIcon = toneIcon[track.tone];
  const doneCount = track.steps.filter((s) => s.state === "done").length;
  const pct = Math.round((doneCount / track.steps.length) * 100);

  return (
    <div
      className={cn(
        "rounded-lg border bg-card overflow-hidden",
        track.done && "bg-muted/30",
      )}
    >
      {/* Header strip */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border/60">
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            toneIconBg[track.tone],
          )}
        >
          <TitleIcon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-tight truncate">{track.title}</p>
          <p className="text-[10px] text-muted-foreground leading-tight tabular-nums">
            {doneCount}/{track.steps.length} · {pct}%
          </p>
        </div>
        {track.done && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="h-3 w-3" />
          </div>
        )}
      </div>

      {/* Steps vertical */}
      <ol className="relative px-3 py-3 space-y-2">
        {track.steps.map((s, i) => {
          const isLast = i === track.steps.length - 1;
          const nextState = !isLast ? track.steps[i + 1].state : "upcoming";
          const connectorActive = s.state === "done" || nextState !== "upcoming";
          return (
            <li key={i} className="relative flex items-center gap-2.5 pb-1 last:pb-0">
              {!isLast && <Connector active={connectorActive} vertical />}
              <StepPip step={s} size="sm" />
              <p
                className={cn(
                  "text-[11px] font-medium leading-tight",
                  s.state === "upcoming" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {s.label}
              </p>
            </li>
          );
        })}
      </ol>

      {/* Status & CTA */}
      <div className="px-3 pb-3 space-y-2">
        <p className="flex items-start gap-1.5 text-[10.5px] leading-snug text-muted-foreground">
          {!track.cta && !track.done && (
            <Clock className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground/70" />
          )}
          {track.done && <Check className="h-3 w-3 shrink-0 mt-0.5 text-primary" />}
          <span>{track.statusLine}</span>
        </p>
        {track.cta && onAction && (
          <Button
            size="sm"
            variant={track.id === "program" ? "default" : "outline"}
            onClick={() => onAction(track.cta!.stepId)}
            className="w-full gap-1.5"
          >
            {track.cta.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};

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
  );
  const billingTrack = buildBillingTrack(billingComplete, termsAccepted);

  const tracks = [lodgingTrack, programTrack, billingTrack].filter(Boolean) as TrackViewModel[];
  const allDone = tracks.every((t) => t.done);
  const totalSteps = tracks.reduce((sum, t) => sum + t.steps.length, 0);
  const doneSteps = tracks.reduce(
    (sum, t) => sum + t.steps.filter((s) => s.state === "done").length,
    0,
  );
  const overallPct = Math.round((doneSteps / totalSteps) * 100);

  const statusBadge = allDone
    ? { label: "Definitief", tone: "bg-primary/10 text-primary border-primary/20" }
    : programTrack.done && billingTrack.done
      ? {
          label: "Bijna klaar",
          tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
        }
      : {
          label: "In afstemming",
          tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
        };

  // ─── Vertical (sidebar) ──────────────────────────────────────────────────

  if (isVertical) {
    return (
      <div className={cn("bg-card border rounded-xl p-3", className)}>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Voortgang
          </h3>
          <span
            className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
              statusBadge.tone,
            )}
          >
            {statusBadge.label}
          </span>
        </div>

        {/* Overall progress bar */}
        <div className="px-1 mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">Totaal</span>
            <span className="text-[10px] font-medium tabular-nums text-foreground">
              {overallPct}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {tracks.map((t) => (
            <TrackCardVertical key={t.id} track={t} onAction={onStepAction} />
          ))}
        </div>
      </div>
    );
  }

  // ─── Horizontal (overview) ───────────────────────────────────────────────

  return (
    <div
      className={cn(
        "bg-gradient-to-br from-muted/40 via-card to-card border rounded-2xl p-4 sm:p-5",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold">Uw aanvraag</h3>
          <GlossaryTooltip />
        </div>
        <div className="flex items-center gap-2.5">
          <span className="hidden sm:inline text-[11px] text-muted-foreground tabular-nums">
            {doneSteps}/{totalSteps} stappen
          </span>
          <span
            className={cn(
              "text-[11px] font-medium px-2 py-0.5 rounded-full border",
              statusBadge.tone,
            )}
          >
            {statusBadge.label}
          </span>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="mb-4">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary via-primary to-primary/80 rounded-full transition-all duration-500"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* Mobile: collapsible toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="sm:hidden w-full flex items-center justify-between mb-3 text-xs text-muted-foreground"
        aria-expanded={mobileOpen}
      >
        <span>{mobileOpen ? "Verberg details" : "Toon details"}</span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", mobileOpen && "rotate-180")}
        />
      </button>

      <div
        className={cn(
          "grid gap-3 sm:gap-4",
          tracks.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2",
          !mobileOpen && "hidden sm:grid",
        )}
      >
        {tracks.map((t) => (
          <TrackCard key={t.id} track={t} onAction={onStepAction} />
        ))}
      </div>
    </div>
  );
};
