import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronDown, ChevronUp, Link2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { normalizeInvoiceNumber } from "@/lib/purchaseInvoiceDuplicateCheck";

interface RegistrationRow {
  id: string;
  invoice_number: string;
  invoice_date: string;
  amount_incl_vat: number | null;
  amount_excl_vat: number;
  file_path: string | null;
  partner_id: string;
  partner: { name: string } | null;
}

interface InboxRow {
  id: string;
  created_at: string;
  attachment_filename: string | null;
  attachment_path: string | null;
  scan_result: {
    supplier_name?: string | null;
    invoice_number?: string | null;
    invoice_date?: string | null;
    amount_incl_vat?: number | null;
    amount_excl_vat?: number | null;
    vat_amount?: number | null;
  } | null;
}

interface Pair {
  registration: RegistrationRow;
  inbox: InboxRow;
  inboxAmountIncl: number;
}

/**
 * Vindt waarschijnlijke duplicaten: registraties zonder PDF die qua partner +
 * bedrag (±€0,02) + datum (≤120 dagen) overeenkomen met een nog niet verwerkt
 * inbox-PDF. Toont één paneel bovenaan /admin/inkoopfacturen zodat de admin
 * niet eerst de inbox hoeft te bezoeken om dubbele registraties te ontdekken.
 */
export function DuplicateCandidatesBanner() {
  const [expanded, setExpanded] = useState(false);

  const { data: registrations } = useQuery({
    queryKey: ["dup-banner-registrations"],
    queryFn: async (): Promise<RegistrationRow[]> => {
      const { data, error } = await supabase
        .from("partner_purchase_invoices")
        .select(
          `id, invoice_number, invoice_date, amount_incl_vat, amount_excl_vat, file_path, partner_id,
           partner:partners!partner_purchase_invoices_partner_id_fkey(name)`,
        )
        .is("file_path", null)
        .order("invoice_date", { ascending: false })
        .limit(500);
      if (error) {
        console.error(error);
        return [];
      }
      return (data || []) as unknown as RegistrationRow[];
    },
    refetchInterval: 60_000,
  });

  const { data: inboxItems } = useQuery({
    queryKey: ["dup-banner-inbox"],
    queryFn: async (): Promise<InboxRow[]> => {
      const { data, error } = await supabase
        .from("purchase_invoice_inbox")
        .select("id, created_at, attachment_filename, attachment_path, scan_result")
        .eq("status", "new")
        .eq("scan_status", "scanned")
        .not("attachment_path", "is", null)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) {
        console.error(error);
        return [];
      }
      return (data || []) as unknown as InboxRow[];
    },
    refetchInterval: 60_000,
  });

  const pairs = useMemo<Pair[]>(() => {
    if (!registrations || !inboxItems) return [];
    const out: Pair[] = [];
    for (const inbox of inboxItems) {
      const r = inbox.scan_result;
      if (!r) continue;
      const supplier = (r.supplier_name || "").toLowerCase().trim();
      if (!supplier) continue;
      const inboxIncl =
        typeof r.amount_incl_vat === "number"
          ? r.amount_incl_vat
          : typeof r.amount_excl_vat === "number"
            ? r.amount_excl_vat + (r.vat_amount ?? 0)
            : null;
      if (inboxIncl == null) continue;
      const inboxDate = r.invoice_date ? new Date(r.invoice_date).getTime() : new Date(inbox.created_at).getTime();
      const inboxNr = normalizeInvoiceNumber(r.invoice_number || "");

      for (const reg of registrations) {
        const pname = (reg.partner?.name || "").toLowerCase();
        if (!pname) continue;
        const partnerHit = pname.includes(supplier) || supplier.includes(pname);
        if (!partnerHit) continue;
        const regIncl = Number(reg.amount_incl_vat ?? reg.amount_excl_vat ?? 0);
        if (Math.abs(regIncl - inboxIncl) > 0.02) continue;
        const regDate = reg.invoice_date ? new Date(reg.invoice_date).getTime() : 0;
        if (regDate) {
          const diffDays = Math.abs(inboxDate - regDate) / (1000 * 60 * 60 * 24);
          if (diffDays > 120) continue;
        }
        // Skip als nummers exact gelijk zijn én registratie al een PDF zou hebben (al gefilterd).
        // Voor placeholders ("1", "2"…) wijkt het nummer af — dat is juist het signaal.
        out.push({ registration: reg, inbox, inboxAmountIncl: inboxIncl });
        break; // 1 inbox-PDF kan slechts 1 registratie matchen
      }
    }
    return out;
  }, [registrations, inboxItems]);

  if (pairs.length === 0) return null;

  return (
    <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-700 mt-0.5" />
            <div>
              <CardTitle className="text-base text-amber-900 dark:text-amber-100">
                {pairs.length} mogelijke dubbele registratie{pairs.length === 1 ? "" : "s"} gedetecteerd
              </CardTitle>
              <CardDescription className="text-amber-800 dark:text-amber-200">
                Deze registraties hebben nog geen PDF, maar er staat een gescande factuur in de inbox met dezelfde partner en
                hetzelfde bedrag. Koppel de PDF vanuit de inbox in plaats van een nieuwe inkoopfactuur aan te maken.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/inkoopfacturen/inbox">Naar inkoop-inbox</Link>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setExpanded((v) => !v)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 space-y-2">
          {pairs.map((p) => (
            <div
              key={`${p.registration.id}-${p.inbox.id}`}
              className="flex items-center justify-between gap-3 rounded border border-amber-200 bg-background/70 p-2 text-xs"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {p.registration.partner?.name || "—"} · registratie #{p.registration.invoice_number}{" "}
                  <Badge variant="outline" className="ml-1 text-[10px] py-0">geen PDF</Badge>
                </div>
                <div className="text-muted-foreground truncate">
                  {format(new Date(p.registration.invoice_date), "d MMM yyyy", { locale: nl })} · €
                  {Number(p.registration.amount_incl_vat ?? p.registration.amount_excl_vat).toLocaleString("nl-NL", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
              <Link2 className="h-3 w-3 text-amber-700 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  Inbox: {p.inbox.scan_result?.supplier_name || "—"} · #{p.inbox.scan_result?.invoice_number || "—"}
                </div>
                <div className="text-muted-foreground truncate">
                  {p.inbox.scan_result?.invoice_date
                    ? format(new Date(p.inbox.scan_result.invoice_date), "d MMM yyyy", { locale: nl })
                    : format(new Date(p.inbox.created_at), "d MMM yyyy", { locale: nl })}{" "}
                  · €{p.inboxAmountIncl.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link to="/admin/inkoopfacturen/inbox">Koppel</Link>
              </Button>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
