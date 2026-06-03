import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Receipt, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

interface Props {
  partnerId: string;
  requestId?: string | null;
  accommodationRequestId?: string | null;
}

interface PostCharge {
  id: string;
  description: string;
  notes: string | null;
  amount_incl_vat: number;
  vat_rate: number;
  service_date: string | null;
  status: "submitted" | "processed" | "rejected";
  created_at: string;
  reject_reason: string | null;
}

const STATUS_LABEL: Record<PostCharge["status"], string> = {
  submitted: "Ingediend",
  processed: "Verwerkt",
  rejected: "Afgewezen",
};

const STATUS_VARIANT: Record<PostCharge["status"], "default" | "secondary" | "destructive"> = {
  submitted: "secondary",
  processed: "default",
  rejected: "destructive",
};

export function PartnerPostChargesSection({ partnerId, requestId, accommodationRequestId }: Props) {
  const [charges, setCharges] = useState<PostCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetch = async () => {
    setLoading(true);
    let q = supabase
      .from("partner_post_charges" as never)
      .select("*")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false });
    if (requestId) q = q.eq("request_id", requestId);
    else if (accommodationRequestId) q = q.eq("accommodation_request_id", accommodationRequestId);
    const { data, error } = await q;
    if (error) {
      console.error(error);
    } else {
      setCharges((data ?? []) as unknown as PostCharge[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (partnerId && (requestId || accommodationRequestId)) fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId, requestId, accommodationRequestId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Deze regel verwijderen?")) return;
    const { error } = await supabase.from("partner_post_charges" as never).delete().eq("id", id);
    if (error) toast.error("Verwijderen mislukt");
    else {
      toast.success("Verwijderd");
      fetch();
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">Nacalculatie / nabookingen</h3>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
              Voeg hier kosten toe die achteraf zijn ontstaan of afwijken van de offerte (p.m.-posten,
              meerverbruik). Bureau Vlieland verwerkt deze in de eindfactuur.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Regel
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Laden…</p>
      ) : charges.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Nog geen nacalculatieregels.</p>
      ) : (
        <div className="space-y-2">
          {charges.map((c) => (
            <div
              key={c.id}
              className="flex items-start justify-between gap-3 p-3 rounded-md border bg-muted/30"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{c.description}</span>
                  <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  €{Number(c.amount_incl_vat).toLocaleString("nl-NL", { minimumFractionDigits: 2 })} incl.{" "}
                  {c.vat_rate}% BTW
                  {c.service_date && (
                    <> · {format(parseISO(c.service_date), "d MMM yyyy", { locale: nl })}</>
                  )}
                </div>
                {c.notes && <p className="text-xs mt-1 italic">{c.notes}</p>}
                {c.status === "rejected" && c.reject_reason && (
                  <p className="text-xs mt-1 text-destructive">Afgewezen: {c.reject_reason}</p>
                )}
              </div>
              {c.status === "submitted" && (
                <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <AddPostChargeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        partnerId={partnerId}
        requestId={requestId ?? null}
        accommodationRequestId={accommodationRequestId ?? null}
        onCreated={fetch}
      />
    </Card>
  );
}

function AddPostChargeDialog({
  open,
  onOpenChange,
  partnerId,
  requestId,
  accommodationRequestId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  partnerId: string;
  requestId: string | null;
  accommodationRequestId: string | null;
  onCreated: () => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [vatRate, setVatRate] = useState("21");
  const [serviceDate, setServiceDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDescription("");
      setAmount("");
      setVatRate("21");
      setServiceDate("");
      setNotes("");
    }
  }, [open]);

  const handleSave = async () => {
    if (!description.trim()) return toast.error("Omschrijving is verplicht");
    const parsed = parseFloat(amount.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) return toast.error("Voer een geldig bedrag in");

    setSaving(true);
    const { error } = await supabase.from("partner_post_charges" as never).insert({
      partner_id: partnerId,
      request_id: requestId,
      accommodation_request_id: accommodationRequestId,
      description: description.trim(),
      notes: notes.trim() || null,
      amount_incl_vat: parsed,
      vat_rate: Number(vatRate),
      service_date: serviceDate || null,
      status: "submitted",
    } as never);
    setSaving(false);
    if (error) {
      console.error(error);
      toast.error("Opslaan mislukt");
      return;
    }
    toast.success("Ingediend bij Bureau Vlieland");
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nacalculatie indienen</DialogTitle>
          <DialogDescription>
            Bureau Vlieland verwerkt deze regel handmatig op de eindfactuur. De klant ziet het bedrag pas
            als wij het hebben goedgekeurd.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pc-desc">Omschrijving *</Label>
            <Input
              id="pc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Bijv. Extra drankgebruik diner, meerverbruik schoonmaak…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pc-amount">Bedrag incl. BTW *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                <Input
                  id="pc-amount"
                  type="text"
                  inputMode="decimal"
                  className="pl-7"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-vat">BTW</Label>
              <Select value={vatRate} onValueChange={setVatRate}>
                <SelectTrigger id="pc-vat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="21">21%</SelectItem>
                  <SelectItem value="9">9%</SelectItem>
                  <SelectItem value="0">0%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pc-date">Datum (optioneel)</Label>
            <Input
              id="pc-date"
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pc-notes">Notitie (optioneel)</Label>
            <Textarea
              id="pc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Toelichting voor Bureau Vlieland…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Opslaan…" : "Indienen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
