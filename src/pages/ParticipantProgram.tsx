import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useCustomerProgram } from "@/hooks/useCustomerProgram";
import { useEventMode } from "@/hooks/useEventMode";
import { parseISO } from "date-fns";
import { ArrowLeft, AlertCircle, Users, Share2 } from "lucide-react";
import logoImage from "@/assets/logo.png";
import { ParticipantView } from "@/components/customer-portal/ParticipantView";
import { ShareWithParticipantsDialog } from "@/components/customer-portal/ShareWithParticipantsDialog";

const ParticipantProgram = () => {
  const { token } = useParams<{ token: string }>();
  const [showShare, setShowShare] = useState(false);
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/programma-deelnemers/${token}`
    : "";

  const { program, isLoading, error, accommodation } = useCustomerProgram(token || "");

  const selectedDates = useMemo(() => {
    if (!program?.selected_dates) return [] as Date[];
    const parsed = (program.selected_dates as string[]).map((d) => {
      try {
        return parseISO(d);
      } catch {
        return new Date(d);
      }
    });
    if (program?.items) {
      const maxDayIndex = Math.max(
        ...program.items
          .filter((i: any) => i.status !== "cancelled")
          .map((i: any) => i.day_index),
        -1
      );
      while (parsed.length <= maxDayIndex && parsed.length > 0) {
        const last = parsed[parsed.length - 1];
        const next = new Date(last);
        next.setDate(next.getDate() + 1);
        parsed.push(next);
      }
    }
    return parsed;
  }, [program?.selected_dates, program?.items]);

  const eventMode = useEventMode(
    selectedDates,
    token ? `bv:event-mode:${token}:share` : undefined
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <img src={logoImage} alt="Bureau Vlieland" className="h-8" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-12 max-w-3xl">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-64 mb-8" />
          <Skeleton className="h-32 w-full mb-6" />
          <Skeleton className="h-48 w-full" />
        </main>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-12 max-w-2xl text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Programma niet gevonden</h1>
          <p className="text-muted-foreground mb-6">
            {error || "Dit programma bestaat niet of is verlopen."}
          </p>
          <Link to="/">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Terug naar home
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Programma | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={logoImage} alt="Bureau Vlieland" className="h-7 sm:h-8" />
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 hidden sm:inline-flex">
              <Users className="h-3 w-3" />
              Deelnemersweergave
            </Badge>
            <Button size="sm" variant="outline" onClick={() => setShowShare(true)} aria-label="Delen">
              <Share2 className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Delen</span>
            </Button>
          </div>
        </div>
      </header>

      <ParticipantView
        program={program}
        accommodation={accommodation}
        selectedDates={selectedDates}
        eventMode={eventMode}
        onShare={() => setShowShare(true)}
      />

      <ShareWithParticipantsDialog
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        shareUrl={shareUrl}
      />
    </div>
  );
};

export default ParticipantProgram;
