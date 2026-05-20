import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PendingChangeItem {
  id: string;
  block_name: string;
  provider_id: string | null;
  provider_name: string | null;
  block_type: string;
  // Live waardes
  preferred_time: string | null;
  day_index: number;
  customer_notes: string | null;
  override_people: number | null;
  admin_price_override: number | null;
  admin_price_notes: string | null;
  price_type: string | null;
  location_address: string | null;
  // Pending waardes
  pending_preferred_time: string | null;
  pending_day_index: number | null;
  pending_customer_notes: string | null;
  pending_override_people: number | null;
  pending_marked_for_removal: boolean | null;
  pending_added: boolean | null;
  pending_block_name: string | null;
  pending_admin_price_override: number | null;
  pending_price_type: string | null;
  pending_admin_price_notes: string | null;
  pending_location_lat: number | null;
  pending_location_lng: number | null;
  pending_location_address: string | null;
  pending_provider_id: string | null;
  pending_provider_name: string | null;
  pending_provider_email: string | null;
  pending_block_type: string | null;
}

interface PartnerOpt {
  id: string;
  name: string;
  contact_email: string | null;
  email: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  requestId: string;
  customerEmail: string;
  customerName: string;
  pendingItems: PendingChangeItem[];
  partners: PartnerOpt[];
  onPublished: () => void;
}

function fmtPrice(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function describeChange(it: PendingChangeItem): string[] {
  if (it.pending_added) return ["Toegevoegd aan programma"];
  if (it.pending_marked_for_removal) return ["Geannuleerd"];
  const lines: string[] = [];
  if (it.pending_block_name !== null) {
    lines.push(`Naam: ${it.block_name} → ${it.pending_block_name}`);
  }
  if (it.pending_preferred_time !== null) {
    lines.push(`Tijd: ${it.preferred_time ?? "—"} → ${it.pending_preferred_time}`);
  }
  if (it.pending_day_index !== null) {
    lines.push(`Dag: ${it.day_index + 1} → ${it.pending_day_index + 1}`);
  }
  if (it.pending_customer_notes !== null) {
    lines.push(`Opmerking gewijzigd`);
  }
  if (it.pending_override_people !== null) {
    lines.push(`Aantal personen: ${it.override_people ?? "—"} → ${it.pending_override_people}`);
  }
  if (it.pending_admin_price_override !== null) {
    lines.push(`Prijs: ${fmtPrice(it.admin_price_override)} → ${fmtPrice(it.pending_admin_price_override)}`);
  }
  if (it.pending_price_type !== null) {
    lines.push(`Prijstype: ${it.price_type ?? "—"} → ${it.pending_price_type}`);
  }
  if (it.pending_admin_price_notes !== null) {
    lines.push(`Beschrijving gewijzigd`);
  }
  if (it.pending_location_address !== null || it.pending_location_lat !== null) {
    const addr = it.pending_location_address && it.pending_location_address !== "" ? it.pending_location_address : "(adres leeggemaakt)";
    lines.push(`Locatie gewijzigd: ${addr}`);
  }
  if (it.pending_provider_id !== null || it.pending_provider_name !== null) {
    lines.push(`Uitvoerder: ${it.provider_name ?? "—"} → ${it.pending_provider_name ?? it.pending_provider_id}`);
  }
  if (it.pending_block_type !== null) {
    lines.push(`Facturatie: ${it.block_type} → ${it.pending_block_type}`);
  }
  return lines;
}

export function PublishChangesDialog({
  open,
  onOpenChange,
  requestId,
  customerEmail,
  customerName,
  pendingItems,
  partners,
  onPublished,
}: Props) {
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [notifyPartners, setNotifyPartners] = useState<Record<string, boolean>>({});
  const [adminNote, setAdminNote] = useState("");
  const [publishing, setPublishing] = useState(false);

  // Welke partners zijn betrokken bij wijzigingen? Zowel huidige uitvoerder
  // als (bij wissel) de nieuwe uitvoerder krijgen een notificatie-optie.
  const involvedPartners = useMemo(() => {
    const ids = new Set<string>();
    pendingItems.forEach((i) => {
      if (i.provider_id && i.block_type !== "bureau") ids.add(i.provider_id);
      const newType = i.pending_block_type ?? i.block_type;
      const newProvider = i.pending_provider_id ?? i.provider_id;
      if (newProvider && newType !== "bureau") ids.add(newProvider);
    });
    return partners.filter((p) => ids.has(p.id));
  }, [pendingItems, partners]);

  // Initial: alle partners aangevinkt
  useMemo(() => {
    const map: Record<string, boolean> = {};
    involvedPartners.forEach((p) => {
      if (p.contact_email || p.email) map[p.id] = true;
    });
    setNotifyPartners(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [involvedPartners.length, open]);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const partnerIds = Object.entries(notifyPartners)
        .filter(([, v]) => v)
        .map(([k]) => k);
      const { data, error } = await supabase.functions.invoke("publish-program-changes", {
        body: {
          requestId,
          notifyCustomer,
          notifyPartnerIds: partnerIds,
          adminNote: adminNote.trim(),
          origin: window.location.origin,
        },
      });
      if (error) {
        // Probeer de structured error body uit te lezen (bv. provider_inconsistent)
        let serverMsg: string | null = null;
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx) {
            const body = await ctx.clone().json();
            serverMsg = body?.message ?? body?.error ?? null;
          }
        } catch {
          // ignore parse errors, val terug op generieke melding
        }
        throw new Error(serverMsg ?? error.message ?? "Onbekende fout");
      }
      const sent = (data as any)?.emails_sent ?? 0;
      toast.success(
        sent > 0
          ? `${pendingItems.length} wijziging(en) gepubliceerd · ${sent} mail(s) verstuurd`
          : `${pendingItems.length} wijziging(en) gepubliceerd (zonder mail)`,
      );
      onPublished();
      onOpenChange(false);
      setAdminNote("");
    } catch (e: any) {
      console.error(e);
      toast.error(`Publiceren mislukt: ${e?.message ?? e}`);
    } finally {
      setPublishing(false);
    }
  };

  const totalRecipients =
    (notifyCustomer ? 1 : 0) + Object.values(notifyPartners).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Wijzigingen publiceren & notificeren</DialogTitle>
          <DialogDescription>
            Deze wijzigingen worden nu zichtbaar in het klant- en partnerportaal. Geselecteerde
            ontvangers krijgen één gebundelde e-mail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">
              {pendingItems.length} wijziging{pendingItems.length !== 1 ? "en" : ""}
            </Label>
            <ScrollArea className="mt-2 max-h-48 rounded-md border p-3">
              <ul className="space-y-2 text-sm">
                {pendingItems.map((it) => (
                  <li key={it.id}>
                    <div className="font-medium">{it.block_name}</div>
                    <ul className="ml-3 list-disc text-muted-foreground">
                      {describeChange(it).map((l, idx) => (
                        <li key={idx}>{l}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Ontvangers</Label>
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notify-customer"
                  checked={notifyCustomer}
                  onCheckedChange={(v) => setNotifyCustomer(!!v)}
                />
                <Label htmlFor="notify-customer" className="cursor-pointer text-sm">
                  Klant — {customerName} <span className="text-muted-foreground">({customerEmail})</span>
                </Label>
              </div>
              {involvedPartners.length === 0 && (
                <p className="text-xs text-muted-foreground">Geen partners betrokken bij deze wijzigingen.</p>
              )}
              {involvedPartners.map((p) => {
                const mail = p.contact_email || p.email;
                const disabled = !mail;
                return (
                  <div key={p.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`notify-${p.id}`}
                      disabled={disabled}
                      checked={!!notifyPartners[p.id]}
                      onCheckedChange={(v) =>
                        setNotifyPartners((s) => ({ ...s, [p.id]: !!v }))
                      }
                    />
                    <Label
                      htmlFor={`notify-${p.id}`}
                      className={`cursor-pointer text-sm ${disabled ? "text-muted-foreground" : ""}`}
                    >
                      {p.name}{" "}
                      <span className="text-muted-foreground">
                        ({mail || "geen e-mail bekend"})
                      </span>
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="admin-note" className="text-sm font-medium">
              Toelichting in mail (optioneel)
            </Label>
            <Textarea
              id="admin-note"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Bijvoorbeeld: in overleg met u verzet naar 14:00."
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Badge variant="outline" className="mr-auto">
            {totalRecipients > 0
              ? `${totalRecipients} mail${totalRecipients !== 1 ? "s" : ""}`
              : "Geen mail"}
          </Badge>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={publishing}>
            Annuleren
          </Button>
          <Button onClick={handlePublish} disabled={publishing}>
            {publishing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Publiceer & verstuur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
