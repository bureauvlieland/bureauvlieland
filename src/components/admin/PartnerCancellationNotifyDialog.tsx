import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, AlertTriangle, Hotel, Activity } from "lucide-react";

export interface ActivityPartner {
  partner_id: string;
  name: string;
  email: string | null;
  item_names: string[];
}

export interface AccommodationPartner {
  partner_id: string;
  name: string;
  email: string | null;
  accommodation_name: string;
  quote_status?: string | null;
}

const ACC_STATUS_LABEL: Record<string, string> = {
  pending: "Niet gereageerd",
  submitted: "Offerte ingediend",
  expired: "Offerte verlopen",
  declined: "Afgewezen door partner",
  rejected: "Afgewezen",
  selected: "Geselecteerd",
  accepted: "Geaccepteerd",
};
// Partners die default-aangevinkt worden: degenen die mogelijk nog een optie open hebben.
const ACC_DEFAULT_CHECKED = new Set(["pending", "submitted", "expired", "selected", "accepted"]);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  activityPartners: ActivityPartner[];
  accommodationPartners: AccommodationPartner[];
  onSent?: () => void;
}

export const PartnerCancellationNotifyDialog = ({
  open,
  onOpenChange,
  requestId,
  activityPartners,
  accommodationPartners,
  onSent,
}: Props) => {
  const defaultActivityIds = useMemo(
    () => activityPartners.filter((p) => p.email).map((p) => p.partner_id),
    [activityPartners],
  );
  // Alle logies-partners met e-mail mogen worden aangevinkt (= "Alles selecteren").
  const allAccommodationIds = useMemo(
    () => accommodationPartners.filter((p) => p.email).map((p) => p.partner_id),
    [accommodationPartners],
  );
  // Voorgevinkt: alleen partners die mogelijk nog een optie open hebben staan
  // (pending / submitted / expired / selected). Afgewezen partners niet, maar
  // ze blijven wel zichtbaar zodat admin ze handmatig kan aanvinken.
  const defaultAccommodationIds = useMemo(
    () =>
      accommodationPartners
        .filter((p) => p.email && ACC_DEFAULT_CHECKED.has((p.quote_status || "").toLowerCase()))
        .map((p) => p.partner_id),
    [accommodationPartners],
  );

  const [selectedActivity, setSelectedActivity] = useState<Set<string>>(new Set());
  const [selectedAccommodation, setSelectedAccommodation] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedActivity(new Set(defaultActivityIds));
      setSelectedAccommodation(new Set(defaultAccommodationIds));
    }
  }, [open, defaultActivityIds, defaultAccommodationIds]);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const totalSelected = selectedActivity.size + selectedAccommodation.size;
  const totalAvailable = defaultActivityIds.length + allAccommodationIds.length;

  const selectAll = () => {
    setSelectedActivity(new Set(defaultActivityIds));
    setSelectedAccommodation(new Set(allAccommodationIds));
  };
  const selectNone = () => {
    setSelectedActivity(new Set());
    setSelectedAccommodation(new Set());
  };

  const handleSend = async () => {
    if (totalSelected === 0) {
      onOpenChange(false);
      return;
    }
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("notify-partner-cancellation", {
        body: {
          request_id: requestId,
          origin: window.location.origin,
          partner_ids: Array.from(selectedActivity),
          accommodation_partner_ids: Array.from(selectedAccommodation),
          skip_item_cancel: true,
        },
      });
      if (error) throw error;
      const sent =
        (data?.emails_sent ?? 0) + (data?.accommodation_emails_sent ?? 0);
      toast.success(`${sent} annuleringsmail(s) verstuurd`);
      onOpenChange(false);
      onSent?.();
    } catch (err) {
      console.error("notify-partner-cancellation failed", err);
      toast.error("Versturen mislukt — probeer opnieuw");
    } finally {
      setIsSending(false);
    }
  };

  const hasAny = activityPartners.length + accommodationPartners.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Partners informeren over annulering
          </DialogTitle>
          <DialogDescription>
            Kies welke partners een annuleringsmail moeten ontvangen. Alleen geselecteerde
            partners krijgen bericht; de items zijn al geannuleerd in het project.
          </DialogDescription>
        </DialogHeader>

        {!hasAny ? (
          <div className="py-6 text-sm text-muted-foreground">
            Er waren geen partners gekoppeld aan dit project — er hoeft niemand geïnformeerd te
            worden.
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {totalSelected} van {totalAvailable} geselecteerd
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-primary hover:underline"
                >
                  Alles selecteren
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={selectNone}
                  className="text-muted-foreground hover:underline"
                >
                  Niets
                </button>
              </div>
            </div>

            {activityPartners.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  Activiteitenpartners ({activityPartners.length})
                </h4>
                <ul className="space-y-1.5 border rounded-md divide-y">
                  {activityPartners.map((p) => {
                    const disabled = !p.email;
                    return (
                      <li key={p.partner_id} className="flex items-start gap-3 p-3">
                        <Checkbox
                          checked={selectedActivity.has(p.partner_id)}
                          disabled={disabled}
                          onCheckedChange={() =>
                            toggle(selectedActivity, setSelectedActivity, p.partner_id)
                          }
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{p.name}</span>
                            {disabled && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" /> geen e-mail
                              </Badge>
                            )}
                          </div>
                          {p.email && (
                            <div className="text-xs text-muted-foreground">{p.email}</div>
                          )}
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {p.item_names.join(", ")}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {accommodationPartners.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Hotel className="h-3.5 w-3.5" />
                  Logiespartners ({accommodationPartners.length})
                </h4>
                <ul className="space-y-1.5 border rounded-md divide-y">
                  {accommodationPartners.map((p) => {
                    const disabled = !p.email;
                    return (
                      <li key={p.partner_id} className="flex items-start gap-3 p-3">
                        <Checkbox
                          checked={selectedAccommodation.has(p.partner_id)}
                          disabled={disabled}
                          onCheckedChange={() =>
                            toggle(
                              selectedAccommodation,
                              setSelectedAccommodation,
                              p.partner_id,
                            )
                          }
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{p.name}</span>
                            {disabled && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" /> geen e-mail
                              </Badge>
                            )}
                          </div>
                          {p.email && (
                            <div className="text-xs text-muted-foreground">{p.email}</div>
                          )}
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {p.accommodation_name}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Niet nu versturen
          </Button>
          <Button onClick={handleSend} disabled={isSending || !hasAny}>
            {isSending
              ? "Versturen..."
              : totalSelected === 0
                ? "Sluiten"
                : `Verstuur annuleringsmails (${totalSelected})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
