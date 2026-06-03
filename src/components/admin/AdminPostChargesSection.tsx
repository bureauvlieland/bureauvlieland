import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, Pencil, Receipt, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { AdminAddCostSheet } from "@/components/admin/AdminAddCostSheet";

interface Props {
  requestId: string;
  accommodationRequestId?: string | null;
  onChanged?: () => void;
}

interface AdminPostCharge {
  id: string;
  partner_id: string;
  description: string;
  notes: string | null;
  amount_incl_vat: number;
  vat_rate: number;
  service_date: string | null;
  status: "submitted" | "processed" | "rejected";
  created_at: string;
  reject_reason: string | null;
  processed_item_id: string | null;
  partner_name?: string;
}

export function AdminPostChargesSection({ requestId, accommodationRequestId, onChanged }: Props) {
  const [charges, setCharges] = useState<AdminPostCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<AdminPostCharge | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [editingPrefill, setEditingPrefill] = useState<{
    charge: AdminPostCharge;
  } | null>(null);

  const fetchCharges = useCallback(async () => {
    setLoading(true);
    const filters: string[] = [`request_id.eq.${requestId}`];
    if (accommodationRequestId) {
      filters.push(`accommodation_request_id.eq.${accommodationRequestId}`);
    }

    const { data, error } = await supabase
      .from("partner_post_charges" as never)
      .select("*, partners(name)")
      .or(filters.join(","))
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }
    const mapped = ((data ?? []) as unknown as Array<AdminPostCharge & { partners?: { name: string } }>).map(
      (c) => ({ ...c, partner_name: c.partners?.name }),
    );
    setCharges(mapped);
    setLoading(false);
  }, [requestId, accommodationRequestId]);

  useEffect(() => {
    if (requestId) fetchCharges();
  }, [requestId, fetchCharges]);

  const handleQuickAccept = async (c: AdminPostCharge) => {
    // Create program_request_items entry (bureau cost) and link charge.
    const { data: item, error: itemErr } = await supabase
      .from("program_request_items")
      .insert({
        request_id: requestId,
        block_id: null as never,
        block_name: c.description,
        block_category: "overig",
        block_type: "bureau",
        provider_name: c.partner_name || "Partner",
        provider_id: "bureau",
        day_index: -1,
        status: "confirmed",
        admin_price_override: c.amount_incl_vat,
        admin_price_notes:
          `Nacalculatie van ${c.partner_name || c.partner_id}` +
          (c.notes ? ` — ${c.notes}` : ""),
        skip_partner_notification: true,
        price_type: "total",
        vat_rate: c.vat_rate,
      } as never)
      .select("id")
      .single();

    if (itemErr || !item) {
      console.error(itemErr);
      toast.error("Aanmaken kostenpost mislukt");
      return;
    }

    const { error: updErr } = await supabase
      .from("partner_post_charges" as never)
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
        processed_item_id: (item as { id: string }).id,
      } as never)
      .eq("id", c.id);

    if (updErr) {
      console.error(updErr);
      toast.error("Status updaten mislukt");
      return;
    }

    toast.success("Verwerkt als Overige kosten");
    fetchCharges();
    onChanged?.();
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    const { error } = await supabase
      .from("partner_post_charges" as never)
      .update({
        status: "rejected",
        reject_reason: rejectReason.trim() || null,
        processed_at: new Date().toISOString(),
      } as never)
      .eq("id", rejectTarget.id);
    if (error) {
      toast.error("Afwijzen mislukt");
      return;
    }
    toast.success("Regel afgewezen");
    setRejectTarget(null);
    setRejectReason("");
    fetchCharges();
    onChanged?.();
  };

  const submitted = charges.filter((c) => c.status === "submitted");
  const handled = charges.filter((c) => c.status !== "submitted");

  if (loading) return null;
  if (charges.length === 0) return null;

  return (
    <>
      <Card className="p-5 border-l-4 border-l-orange-500">
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="h-5 w-5 text-orange-500" />
          <h3 className="font-semibold">Partner-nacalculatie</h3>
          {submitted.length > 0 && (
            <Badge variant="destructive">{submitted.length} te verwerken</Badge>
          )}
        </div>

        {submitted.length > 0 && (
          <div className="space-y-2 mb-4">
            {submitted.map((c) => (
              <div
                key={c.id}
                className="flex items-start justify-between gap-3 p-3 rounded-md border bg-orange-50 dark:bg-orange-950/20"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <span className="font-medium">{c.partner_name || c.partner_id}</span>
                    <span className="text-muted-foreground">·</span>
                    <span>{c.description}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    €{Number(c.amount_incl_vat).toLocaleString("nl-NL", { minimumFractionDigits: 2 })} incl.{" "}
                    {c.vat_rate}% BTW
                    {c.service_date && (
                      <> · {format(parseISO(c.service_date), "d MMM yyyy", { locale: nl })}</>
                    )}
                    {" · ingediend "}
                    {format(parseISO(c.created_at), "d MMM HH:mm", { locale: nl })}
                  </div>
                  {c.notes && <p className="text-xs mt-1 italic">{c.notes}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="sm" onClick={() => handleQuickAccept(c)}>
                    <Check className="h-4 w-4 mr-1" /> Overnemen
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingPrefill({ charge: c })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRejectTarget(c)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {handled.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              {handled.length} eerder verwerkt / afgewezen
            </summary>
            <div className="space-y-1 mt-2">
              {handled.map((c) => (
                <div key={c.id} className="text-xs flex items-center gap-2 p-2 rounded bg-muted/40">
                  <Badge variant={c.status === "processed" ? "default" : "destructive"}>
                    {c.status === "processed" ? "Verwerkt" : "Afgewezen"}
                  </Badge>
                  <span className="font-medium">{c.partner_name || c.partner_id}</span>
                  <span>·</span>
                  <span>{c.description}</span>
                  <span className="ml-auto">
                    €{Number(c.amount_incl_vat).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </Card>

      {/* Edit-before-accept */}
      {editingPrefill && (
        <AdminAddCostSheet
          open={!!editingPrefill}
          onOpenChange={(open) => {
            if (!open) setEditingPrefill(null);
          }}
          requestId={requestId}
          onSuccess={fetchCharges}
          prefill={{
            description: editingPrefill.charge.description,
            amount: editingPrefill.charge.amount_incl_vat,
            vatRate: editingPrefill.charge.vat_rate,
            notes:
              `Nacalculatie van ${editingPrefill.charge.partner_name || editingPrefill.charge.partner_id}` +
              (editingPrefill.charge.notes ? ` — ${editingPrefill.charge.notes}` : ""),
            providerName: editingPrefill.charge.partner_name,
          }}
          onCreatedItem={async (newItemId) => {
            await supabase
              .from("partner_post_charges" as never)
              .update({
                status: "processed",
                processed_at: new Date().toISOString(),
                processed_item_id: newItemId,
              } as never)
              .eq("id", editingPrefill.charge.id);
            toast.success("Verwerkt als Overige kosten");
            setEditingPrefill(null);
            fetchCharges();
            onChanged?.();
          }}
        />
      )}

      {/* Reject dialog */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => {
          if (!o) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nacalculatie afwijzen</DialogTitle>
            <DialogDescription>
              De partner ziet de afwijzing en de reden in zijn portaal.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            placeholder="Reden van afwijzing (optioneel)…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Afwijzen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
