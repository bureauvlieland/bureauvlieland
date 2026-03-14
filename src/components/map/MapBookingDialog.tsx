import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Loader2, CheckCircle2 } from "lucide-react";
import type { MapActivity } from "@/hooks/useMapActivities";

interface MapBookingDialogProps {
  activity:
    | (MapActivity & { _partnerId?: string; _partnerSlug?: string; _partnerName?: string })
    | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commissionMarkup?: number;
}

export const MapBookingDialog = ({
  activity,
  open,
  onOpenChange,
  commissionMarkup = 1.1,
}: MapBookingDialogProps) => {
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    numberOfAdults: 1,
    numberOfChildren: 0,
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!activity) return null;

  const unitPrice = Math.ceil(activity.Price * commissionMarkup * 100) / 100;
  const childUnitPrice = activity.ChildPrice
    ? Math.ceil(activity.ChildPrice * commissionMarkup * 100) / 100
    : 0;
  const totalPrice =
    unitPrice * form.numberOfAdults + childUnitPrice * form.numberOfChildren;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.customerEmail.trim()) {
      toast.error("Naam en e-mailadres zijn verplicht");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("map-create-booking", {
        body: {
          slug: activity._partnerSlug,
          activityId: activity.Id,
          activityName: activity.Name,
          departure: activity.Departure,
          partnerId: activity._partnerId,
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          numberOfAdults: form.numberOfAdults,
          numberOfChildren: form.numberOfChildren,
          totalPrice,
          notes: form.notes,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setIsSuccess(true);
      toast.success("Boeking bevestigd!");
    } catch (err: any) {
      console.error("Booking error:", err);
      toast.error(err.message || "Er ging iets mis bij het boeken");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setForm({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      numberOfAdults: 1,
      numberOfChildren: 0,
      notes: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isSuccess ? "Boeking bevestigd!" : "Activiteit boeken"}</DialogTitle>
          <DialogDescription>
            {activity.Name} — {format(new Date(activity.Departure), "EEEE d MMMM yyyy", { locale: nl })}
            {activity.StartTime && ` om ${activity.StartTime}`}
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <p className="text-center text-sm text-muted-foreground">
              De boeking is geplaatst. De klant ontvangt een bevestiging op{" "}
              <strong>{form.customerEmail}</strong>.
            </p>
            <Button onClick={handleClose}>Sluiten</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bk-name">Naam *</Label>
                <Input
                  id="bk-name"
                  value={form.customerName}
                  onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bk-email">E-mailadres *</Label>
                <Input
                  id="bk-email"
                  type="email"
                  value={form.customerEmail}
                  onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bk-phone">Telefoon</Label>
                <Input
                  id="bk-phone"
                  type="tel"
                  value={form.customerPhone}
                  onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bk-adults">Volwassenen</Label>
                <Input
                  id="bk-adults"
                  type="number"
                  min={1}
                  max={activity.RemainingSlots}
                  value={form.numberOfAdults}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, numberOfAdults: parseInt(e.target.value) || 1 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bk-children">Kinderen</Label>
                <Input
                  id="bk-children"
                  type="number"
                  min={0}
                  value={form.numberOfChildren}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, numberOfChildren: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bk-notes">Opmerkingen</Label>
              <Textarea
                id="bk-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="bg-muted rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span>
                  {form.numberOfAdults}x volwassene à € {unitPrice.toFixed(2).replace(".", ",")}
                </span>
                <span>€ {(unitPrice * form.numberOfAdults).toFixed(2).replace(".", ",")}</span>
              </div>
              {form.numberOfChildren > 0 && childUnitPrice > 0 && (
                <div className="flex justify-between text-sm">
                  <span>
                    {form.numberOfChildren}x kind à € {childUnitPrice.toFixed(2).replace(".", ",")}
                  </span>
                  <span>
                    € {(childUnitPrice * form.numberOfChildren).toFixed(2).replace(".", ",")}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                <span>Totaal</span>
                <span>€ {totalPrice.toFixed(2).replace(".", ",")}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Facturatie via Bureau Vlieland
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Boeking bevestigen
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
