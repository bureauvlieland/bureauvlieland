import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Bed, Sparkles, UtensilsCrossed } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { clearPendingBooking, formatEuro, readPendingBooking } from "@/lib/mapBooking";

type State = "loading" | "paid" | "failed" | "pending" | "unknown";

const trackEvent = (event: string, payload: Record<string, unknown>) => {
  try {
    (window as any).dataLayer?.push({ event, ...payload });
  } catch {
    // noop
  }
};

const BookingStatus = () => {
  const [params] = useSearchParams();
  const bookingIdParam = params.get("b");
  const tenantParam = params.get("t");

  const pending = useMemo(
    () => readPendingBooking(bookingIdParam ? Number(bookingIdParam) : null),
    [bookingIdParam],
  );

  const bookingId = bookingIdParam ? Number(bookingIdParam) : pending?.bookingId ?? null;
  const tenantSlug = tenantParam ?? pending?.tenantSlug ?? null;
  const paymentId = pending?.paymentId ?? null;

  const [state, setState] = useState<State>("loading");
  const [amount, setAmount] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!tenantSlug || !paymentId) {
        setState(bookingId ? "pending" : "unknown");
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke("map-payment-status", {
          body: { paymentId, tenantSlug, bookingId },
        });
        if (error) throw error;
        const payload = data as Record<string, any> | null;
        if (cancelled) return;

        if (payload?.state === "paid") {
          setAmount(typeof payload.amount === "number" ? payload.amount : null);
          setState("paid");
          clearPendingBooking();
          trackEvent("activity_booking_paid", {
            activity: pending?.activityName,
            bookingId,
          });
          return;
        }
        if (payload?.state === "failed") {
          setState("failed");
          clearPendingBooking();
          return;
        }
        setState("pending");
        if (attempt < 5) {
          window.setTimeout(() => !cancelled && setAttempt((a) => a + 1), 3000);
        }
      } catch {
        if (!cancelled) setState("pending");
      }
    };

    check();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug, paymentId, bookingId, attempt]);

  return (
    <>
      <Helmet>
        <title>Boekingsstatus | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Navigation />

      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-2xl space-y-6">
          <Card>
            <CardContent className="py-10 text-center space-y-4">
              {state === "loading" && (
                <>
                  <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
                  <h1 className="text-xl font-semibold">Betaling controleren…</h1>
                </>
              )}

              {state === "paid" && (
                <>
                  <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
                  <h1 className="text-2xl font-bold">Uw boeking is bevestigd</h1>
                  <p className="text-muted-foreground">
                    {pending?.activityName ? `${pending.activityName}. ` : ""}
                    Boekingsnummer {bookingId ?? "-"}
                    {amount !== null ? ` · ${formatEuro(amount)}` : ""}.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    U ontvangt de bevestiging per e-mail van de aanbieder.
                  </p>
                </>
              )}

              {state === "failed" && (
                <>
                  <XCircle className="h-12 w-12 mx-auto text-destructive" />
                  <h1 className="text-2xl font-bold">De betaling is niet gelukt</h1>
                  <p className="text-muted-foreground">
                    Uw plek is weer vrijgegeven. U kunt het opnieuw proberen.
                  </p>
                  <Button asChild>
                    <Link to="/activiteiten-boeken">Opnieuw proberen</Link>
                  </Button>
                </>
              )}

              {state === "pending" && (
                <>
                  <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
                  <h1 className="text-xl font-semibold">Betaling wordt verwerkt</h1>
                  <p className="text-muted-foreground text-sm">
                    Dit kan een moment duren. Zodra de betaling is verwerkt ontvangt u de
                    bevestiging per e-mail van de aanbieder.
                  </p>
                </>
              )}

              {state === "unknown" && (
                <>
                  <h1 className="text-xl font-semibold">Geen boeking gevonden</h1>
                  <p className="text-muted-foreground text-sm">
                    We konden deze boeking niet terugvinden in deze browser.
                  </p>
                  <Button asChild variant="outline">
                    <Link to="/activiteiten-boeken">Terug naar activiteiten</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <div>
            <h2 className="text-sm font-semibold mb-3">Andere opties</h2>
            <div className="grid sm:grid-cols-3 gap-2">
              <Link to="/activiteiten-boeken" className="block">
                <Card className="p-3 h-full hover:bg-accent/50 transition-colors border">
                  <Sparkles className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm font-medium leading-tight">Meer activiteiten</p>
                  <p className="text-xs text-muted-foreground mt-1">Direct boekbaar</p>
                </Card>
              </Link>
              <Link to="/logies-aanvragen" className="block">
                <Card className="p-3 h-full hover:bg-accent/50 transition-colors border">
                  <Bed className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm font-medium leading-tight">Ook overnachten?</p>
                  <p className="text-xs text-muted-foreground mt-1">Logies aanvragen</p>
                </Card>
              </Link>
              <Link to="/programma-samenstellen" className="block">
                <Card className="p-3 h-full hover:bg-accent/50 transition-colors border">
                  <UtensilsCrossed className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm font-medium leading-tight">Compleet programma?</p>
                  <p className="text-xs text-muted-foreground mt-1">Stel zelf samen</p>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default BookingStatus;
