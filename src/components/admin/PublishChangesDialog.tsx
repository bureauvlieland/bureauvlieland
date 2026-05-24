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
import { Send, Loader2, AlertTriangle, Info, Eye, ArrowRight } from "lucide-react";
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

type DiffRow =
  | { kind: "added" }
  | { kind: "removed" }
  | { kind: "field"; label: string; before: string; after: string; warn?: boolean };

function diffRows(it: PendingChangeItem): DiffRow[] {
  if (it.pending_added) return [{ kind: "added" }];
  if (it.pending_marked_for_removal) return [{ kind: "removed" }];
  const rows: DiffRow[] = [];
  const f = (label: string, before: unknown, after: unknown, warn = false) =>
    rows.push({
      kind: "field",
      label,
      before: before === null || before === undefined || before === "" ? "—" : String(before),
      after: after === null || after === undefined || after === "" ? "—" : String(after),
      warn,
    });
  if (it.pending_block_name !== null) f("Naam", it.block_name, it.pending_block_name);
  if (it.pending_preferred_time !== null) f("Tijd", it.preferred_time, it.pending_preferred_time);
  if (it.pending_day_index !== null) f("Dag", it.day_index + 1, it.pending_day_index + 1);
  if (it.pending_customer_notes !== null)
    f("Opmerking", it.customer_notes, it.pending_customer_notes);
  if (it.pending_override_people !== null)
    f("Aantal personen", it.override_people, it.pending_override_people);
  if (it.pending_admin_price_override !== null)
    f("Prijs", fmtPrice(it.admin_price_override), fmtPrice(it.pending_admin_price_override));
  if (it.pending_price_type !== null) f("Prijstype", it.price_type, it.pending_price_type);
  if (it.pending_admin_price_notes !== null) f("Beschrijving", "(gewijzigd)", "(zie portaal)");
  if (it.pending_location_address !== null || it.pending_location_lat !== null) {
    const newAddr = it.pending_location_address ?? it.location_address;
    const coordsMissing =
      it.pending_location_address !== null &&
      it.pending_location_address !== "" &&
      (it.pending_location_lat === null || it.pending_location_lng === null);
    f("Locatie", it.location_address, newAddr || "(adres leeggemaakt)", coordsMissing);
  }
  if (it.pending_provider_id !== null || it.pending_provider_name !== null)
    f("Uitvoerder", it.provider_name, it.pending_provider_name ?? it.pending_provider_id);
  if (it.pending_block_type !== null)
    f("Facturatie", it.block_type, it.pending_block_type);
  return rows;
}

interface DryRunRecipient {
  kind: "customer" | "partner";
  partnerName?: string;
  email: string;
  change_count: number;
}
interface DryRunResult {
  would_publish: number;
  would_email: DryRunRecipient[];
  test_mode: boolean;
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
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);

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

  // Waarschuwingen vóór publicatie:
  // - blocking: providerwijziging waarbij naam/ID niet samen zijn bijgewerkt
  //   (edge function blokkeert dit met 400 → toon hier vooraf)
  // - soft: adreswijziging zonder nieuwe lat/lng (kaart-pin gaat verloren)
  const warnings = useMemo(() => {
    const out: { severity: "blocking" | "soft"; message: string }[] = [];
    pendingItems.forEach((it) => {
      // Provider: pending_provider_name gezet maar pending_provider_id niet (of andersom)
      const nameSet = it.pending_provider_name !== null && it.pending_provider_name !== "";
      const idSet = it.pending_provider_id !== null && it.pending_provider_id !== "";
      if (nameSet !== idSet) {
        out.push({
          severity: "blocking",
          message: `'${it.block_name}': providerwijziging zonder bijbehorende provider-ID — selecteer een bestaande uitvoerder. Publicatie wordt geblokkeerd.`,
        });
      }
      // Locatie: adres ingevuld maar geen lat/lng → kaart-pin verdwijnt
      const addrSet =
        it.pending_location_address !== null && it.pending_location_address !== "";
      const coordsSet =
        it.pending_location_lat !== null && it.pending_location_lng !== null;
      if (addrSet && !coordsSet) {
        out.push({
          severity: "soft",
          message: `'${it.block_name}': nieuw adres zonder coördinaten — de kaart-pin wordt verwijderd. Zoek het adres opnieuw op om lat/lng te bepalen.`,
        });
      }
    });
    return out;
  }, [pendingItems]);

  const hasBlocking = warnings.some((w) => w.severity === "blocking");

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

  const handleDryRun = async () => {
    setDryRunLoading(true);
    setDryRunResult(null);
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
          dryRun: true,
        },
      });
      if (error) throw new Error(error.message ?? "Onbekende fout");
      const d = data as any;
      setDryRunResult({
        would_publish: d?.would_publish ?? 0,
        would_email: d?.would_email ?? [],
        test_mode: !!d?.test_mode,
      });
      toast.success("Dry-run voltooid — niets verzonden of opgeslagen");
    } catch (e: any) {
      console.error(e);
      toast.error(`Dry-run mislukt: ${e?.message ?? e}`);
    } finally {
      setDryRunLoading(false);
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
            <ScrollArea className="mt-2 max-h-64 rounded-md border">
              <div className="divide-y">
                {pendingItems.map((it) => {
                  const rows = diffRows(it);
                  return (
                    <div key={it.id} className="p-3 text-sm">
                      <div className="mb-2 font-medium">{it.block_name}</div>
                      {rows.length === 0 ? (
                        <div className="text-xs text-muted-foreground">Geen velddiffs</div>
                      ) : (
                        <div className="space-y-1">
                          {rows.map((r, idx) => {
                            if (r.kind === "added")
                              return (
                                <div key={idx} className="text-emerald-700 dark:text-emerald-400">
                                  + Toegevoegd aan programma
                                </div>
                              );
                            if (r.kind === "removed")
                              return (
                                <div key={idx} className="text-destructive">
                                  − Geannuleerd
                                </div>
                              );
                            return (
                              <div
                                key={idx}
                                className="grid grid-cols-[120px_1fr_auto_1fr] items-center gap-2"
                              >
                                <span className="text-xs font-medium text-muted-foreground">
                                  {r.label}
                                </span>
                                <span className="truncate rounded bg-muted/50 px-2 py-0.5 text-xs line-through decoration-muted-foreground/40">
                                  {r.before}
                                </span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span
                                  className={`truncate rounded px-2 py-0.5 text-xs font-medium ${
                                    r.warn
                                      ? "bg-amber-500/20 text-amber-900 dark:text-amber-200"
                                      : "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
                                  }`}
                                >
                                  {r.after}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {warnings.length > 0 && (
            <div className="space-y-2">
              {warnings.map((w, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
                    w.severity === "blocking"
                      ? "border-destructive/50 bg-destructive/10 text-destructive"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                  }`}
                >
                  {w.severity === "blocking" ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span>{w.message}</span>
                </div>
              ))}
            </div>
          )}

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
          <Button onClick={handlePublish} disabled={publishing || hasBlocking}>
            {publishing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {hasBlocking ? "Eerst fouten oplossen" : "Publiceer & verstuur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
