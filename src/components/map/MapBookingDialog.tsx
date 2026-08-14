import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, Calendar, Info, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MapActivity } from "@/hooks/useMapActivities";
import type { BundledTime } from "./MapActivityCard";
import {
  bookingReturnUrl,
  estimateBookingPrice,
  formatEuro,
  hasBookingErrors,
  storePendingBooking,
  validateBookingForm,
  type BookingFormErrors,
  normalizeWebsiteUrl,
} from "@/lib/mapBooking";
import { GENERAL_CONTACT_EMAIL } from "@/lib/bureauContact";


type EnrichedActivity = MapActivity & {
  _partnerId?: string;
  _partnerName?: string;
  _partnerSlug?: string;
  _image?: string | null;
};

interface Props {
  activity: EnrichedActivity | null;
  times: BundledTime[];
  /** MAP-activiteit-Id van het gekozen vertrekmoment */
  selectedTimeId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const trackEvent = (event: string, payload: Record<string, unknown>) => {
  try {
    (window as any).dataLayer?.push({ event, ...payload });
  } catch {
    // noop
  }
};

export const MapBookingDialog = ({
  activity,
  times,
  selectedTimeId,
  open,
  onOpenChange,
}: Props) => {
  const [timeId, setTimeId] = useState<number | null>(selectedTimeId);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [errors, setErrors] = useState<BookingFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [unavailable, setUnavailable] = useState<{
    providerName: string | null;
    providerUrl: string | null;
    providerPhone: string | null;
  } | null>(null);

  useEffect(() => {
    if (open) {
      setTimeId(selectedTimeId ?? times.find((t) => t.slotsLeft > 0)?.id ?? null);
      setErrors({});
      setUnavailable(null);
    }
  }, [open, selectedTimeId, times]);


  const selectedTime = useMemo(
    () => times.find((t) => t.id === timeId) ?? null,
    [times, timeId],
  );

  if (!activity) return null;

  const partnerName = activity._partnerName;
  const tenantSlug = activity._partnerSlug;
  const hasChildPrice = activity.PricePerChild !== null;
  const estimate = estimateBookingPrice(
    activity.PricePerPerson,
    activity.PricePerChild,
    adults,
    children,
  );

  const handleSubmit = async () => {
    if (!tenantSlug) {
      toast.error("Deze aanbieder is niet online boekbaar.");
      return;
    }
    if (!timeId) {
      setErrors({ persons: "Kies eerst een vertrektijd." });
      return;
    }

    const values = { name, email, phone, adults, children, couponCode };
    const validation = validateBookingForm(values, {
      slotsLeft: selectedTime?.slotsLeft,
    });
    setErrors(validation);
    if (hasBookingErrors(validation)) return;

    setSubmitting(true);
    trackEvent("activity_booking_started", {
      activity: activity.ActivityTypeName,
      partner: partnerName,
      adults,
      children,
    });

    try {
      const { data, error } = await supabase.functions.invoke("map-book", {
        body: {
          tenantSlug,
          activityId: timeId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          adults,
          children,
          couponCode: couponCode.trim() || undefined,
          returnUrl: bookingReturnUrl(window.location.origin),
        },
      });

      if (error) throw error;
      const payload = data as Record<string, any> | null;

      if (payload?.error) {
        toast.error(String(payload.error));
        return;
      }

      if (payload?.mode === "unavailable") {
        setUnavailable({
          providerName: payload.providerName ? String(payload.providerName) : null,
          providerUrl: normalizeWebsiteUrl(
            payload.providerUrl ? String(payload.providerUrl) : null,
          ),
          providerPhone: payload.providerPhone ? String(payload.providerPhone) : null,
        });
        return;
      }

      if (payload?.mode === "checkout" && payload.checkoutUrl) {
        storePendingBooking({
          bookingId: Number(payload.bookingId),
          paymentId: payload.paymentId ? String(payload.paymentId) : null,
          tenantSlug,
          activityName: activity.ActivityTypeName,
          departure: activity.Departure,
        });
        window.location.href = payload.checkoutUrl as string;
        return;
      }


      toast.error("Boeken lukte niet. Probeer het later opnieuw.");
    } catch (e) {
      toast.error("Boeken lukte niet. Probeer het later opnieuw.");
      console.error("map-book invoke failed", e);
    } finally {
      setSubmitting(false);
    }
  };

  const bookableTimes = times.filter((t) => t.slotsLeft > 0);

  if (unavailable) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl leading-tight">
              Online betalen lukt hier nog niet
            </DialogTitle>
            <DialogDescription>
              {unavailable.providerName ?? partnerName ?? "Deze aanbieder"} heeft online betalen
              via onze site nog niet aanstaan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <p>
              Er is nog niets geboekt en niets afgeschreven. U kunt dit moment direct bij de
              aanbieder reserveren, of wij regelen het voor u.
            </p>
            <div className="rounded-md border bg-muted/30 p-3 space-y-1">
              {unavailable.providerPhone && (
                <p>
                  Telefonisch:{" "}
                  <a className="underline" href={`tel:${unavailable.providerPhone}`}>
                    {unavailable.providerPhone}
                  </a>
                </p>
              )}
              <p>
                Via Bureau Vlieland:{" "}
                <a className="underline" href={`mailto:${GENERAL_CONTACT_EMAIL}`}>
                  {GENERAL_CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Sluiten
            </Button>
            {unavailable.providerUrl && (
              <Button asChild>
                <a href={unavailable.providerUrl} target="_blank" rel="noopener noreferrer">
                  Naar de site van de aanbieder
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl leading-tight">
            {activity.ActivityTypeName}
          </DialogTitle>
          <DialogDescription>
            {partnerName ? `Boeken bij ${partnerName}` : "Boeken"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">

          {/* Vast: datum + tijd */}
          <div className="rounded-md border bg-muted/30 p-3 space-y-2 text-sm">
            <p className="flex items-center gap-2 capitalize">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {format(new Date(activity.Departure), "EEEE d MMMM yyyy", { locale: nl })}
            </p>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-muted-foreground mt-1.5" />
              <div className="flex flex-wrap gap-1.5">
                {bookableTimes.length > 1 ? (
                  bookableTimes.map((t) => (
                    <Button
                      key={t.id}
                      type="button"
                      size="sm"
                      variant={t.id === timeId ? "default" : "outline"}
                      onClick={() => setTimeId(t.id)}
                    >
                      {t.time}
                    </Button>
                  ))
                ) : (
                  <Badge variant="secondary">{selectedTime?.time ?? "-"}</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Aantallen */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bv-adults">Volwassenen</Label>
              <Input
                id="bv-adults"
                type="number"
                min={0}
                max={50}
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
              />
            </div>
            {hasChildPrice && (
              <div className="space-y-1.5">
                <Label htmlFor="bv-children">Kinderen</Label>
                <Input
                  id="bv-children"
                  type="number"
                  min={0}
                  max={50}
                  value={children}
                  onChange={(e) => setChildren(Number(e.target.value))}
                />
              </div>
            )}
          </div>
          {errors.persons && <p className="text-xs text-destructive">{errors.persons}</p>}

          {/* Gegevens */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="bv-name">Naam</Label>
              <Input
                id="bv-name"
                value={name}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
                placeholder="Voor- en achternaam"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bv-email">E-mailadres</Label>
              <Input
                id="bv-email"
                type="email"
                value={email}
                maxLength={255}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="naam@voorbeeld.nl"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bv-phone">Telefoonnummer</Label>
              <Input
                id="bv-phone"
                type="tel"
                value={phone}
                maxLength={20}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06 12345678"
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bv-coupon">Kortingscode (optioneel)</Label>
              <Input
                id="bv-coupon"
                value={couponCode}
                maxLength={60}
                onChange={(e) => setCouponCode(e.target.value)}
              />
              {errors.couponCode && (
                <p className="text-xs text-destructive">{errors.couponCode}</p>
              )}
            </div>
          </div>

          {/* Prijsindicatie */}
          <div className="rounded-md border p-3 space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Indicatie totaal</span>
              <span className="text-lg font-bold">{formatEuro(estimate)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatEuro(activity.PricePerPerson)} p.p.
              {hasChildPrice && ` · kind ${formatEuro(activity.PricePerChild!)}`}. De aanbieder
              berekent het definitieve bedrag.
            </p>
          </div>

          {/* Melding */}
          <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              U boekt en betaalt rechtstreeks bij{" "}
              <span className="font-medium text-foreground">
                {partnerName ?? "de aanbieder"}
              </span>
              . De betaling verloopt via de beveiligde betaalpagina van de aanbieder.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Bezig…
              </>
            ) : (
              <>
                Doorgaan naar betalen
                <ExternalLink className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
