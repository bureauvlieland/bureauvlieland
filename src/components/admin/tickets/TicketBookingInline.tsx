import { useRef, useState } from "react";
import { Ticket, Paperclip, Upload, Download, X, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  isTicketItem,
  getTicketKind,
  getTicketKindLabel,
  type TicketKind,
} from "@/lib/ticketItems";

export interface TicketBookingInlineItem {
  id: string;
  block_id: string | null;
  block_name: string | null;
  day_index: number | null;
  booking_reference: string | null;
  booking_document_path: string | null;
  booking_group_id: string | null;
}

interface Props {
  item: TicketBookingInlineItem;
  /** All other ticket items in the same project (for grouping dropdown) */
  siblings: TicketBookingInlineItem[];
  requestId: string;
  onChanged?: () => void;
}

export function TicketBookingInline({ item, siblings, requestId, onChanged }: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState(item.booking_reference ?? "");
  const [busy, setBusy] = useState(false);

  if (!isTicketItem(item)) return null;
  const kind: TicketKind | null = getTicketKind(item);
  const hasBooking = !!(item.booking_reference || item.booking_document_path);
  const refLabel = kind === "bike" ? "Bonnummer" : "Boekingsnummer";

  const groupOptions = siblings
    .filter((s) => s.id !== item.id && isTicketItem(s))
    .map((s) => ({ id: s.id, label: `${s.block_name ?? "Ticket"}${s.booking_reference ? ` · ${s.booking_reference}` : ""}` }));

  const saveRef = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("program_request_items")
      .update({ booking_reference: ref.trim() || null })
      .eq("id", item.id);
    setBusy(false);
    if (error) {
      toast({ title: "Opslaan mislukt", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Boekingsnummer opgeslagen" });
    onChanged?.();
  };

  const handleUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast({ title: "Alleen PDF toegestaan", variant: "destructive" });
      return;
    }
    setBusy(true);
    const path = `${requestId}/${item.id}-${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage
      .from("ticket-documents")
      .upload(path, file, { contentType: "application/pdf", upsert: false });
    if (upErr) {
      setBusy(false);
      toast({ title: "Upload mislukt", description: upErr.message, variant: "destructive" });
      return;
    }
    if (item.booking_document_path) {
      await supabase.storage.from("ticket-documents").remove([item.booking_document_path]);
    }
    const { error } = await supabase
      .from("program_request_items")
      .update({ booking_document_path: path })
      .eq("id", item.id);
    setBusy(false);
    if (error) {
      toast({ title: "Opslaan mislukt", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "PDF geüpload" });
    onChanged?.();
  };

  const removePdf = async () => {
    if (!item.booking_document_path) return;
    setBusy(true);
    await supabase.storage.from("ticket-documents").remove([item.booking_document_path]);
    const { error } = await supabase
      .from("program_request_items")
      .update({ booking_document_path: null })
      .eq("id", item.id);
    setBusy(false);
    if (error) {
      toast({ title: "Verwijderen mislukt", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "PDF verwijderd" });
    onChanged?.();
  };

  const downloadPdf = async () => {
    if (!item.booking_document_path) return;
    const { data, error } = await supabase.storage
      .from("ticket-documents")
      .createSignedUrl(item.booking_document_path, 60 * 5);
    if (error || !data) {
      toast({ title: "Download mislukt", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "mt-1 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition-colors",
            hasBooking
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
          )}
        >
          <Ticket className="h-3 w-3" />
          {hasBooking ? (
            <>
              <Check className="h-3 w-3" />
              <span className="font-medium">{item.booking_reference || "PDF"}</span>
              {item.booking_document_path && <Paperclip className="h-3 w-3 opacity-70" />}
            </>
          ) : (
            <span>Boeking toevoegen</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {getTicketKindLabel(kind)} — boeking
            </div>
            <Badge variant={hasBooking ? "default" : "outline"} className="text-[10px]">
              {hasBooking ? "Geboekt" : "Open"}
            </Badge>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`ref-${item.id}`} className="text-xs">{refLabel}</Label>
            <div className="flex gap-1.5">
              <Input
                id={`ref-${item.id}`}
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder={kind === "bike" ? "bv. B-12345" : "bv. DOK-78910"}
                className="h-8 text-sm"
                disabled={busy}
              />
              <Button
                size="sm"
                onClick={saveRef}
                disabled={busy || ref === (item.booking_reference ?? "")}
              >
                Opslaan
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">PDF</Label>
            {item.booking_document_path ? (
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={downloadPdf} className="flex-1 h-8">
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Bekijk PDF
                </Button>
                <Button size="sm" variant="ghost" onClick={removePdf} disabled={busy} className="h-8 px-2">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                PDF uploaden
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
          </div>

          {groupOptions.length > 0 && item.booking_group_id && (
            <p className="text-[10px] text-muted-foreground">
              Gekoppeld aan andere boeking. Beheer koppelingen via <span className="font-medium">Admin → Tickets</span>.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
