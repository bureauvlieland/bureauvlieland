import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Loader2, Mail, Reply } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/system";
import { EmailAttachments } from "@/components/admin/EmailAttachments";
import { formatEmailBodyText } from "@/lib/emailBodyText";
import { stripSourcePrefix } from "@/lib/emailThreadArchive";
import { ORIGIN_LABEL, ORIGIN_TONE, type EmailItem } from "@/lib/emailThreads";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: EmailItem | null;
  /** rol van de afzender binnen het dossier, voor de kop */
  role: "klant" | "partner" | null;
  onReply: (item: EmailItem) => void;
}

/**
 * Eén bericht uit het Berichtencentrum op volle grootte: de opgemaakte mail
 * zoals de afzender hem stuurde (html_body, bewaard sinds november 2026) of
 * anders de tekst met regeleinden. De HTML draait in een afgeschermd frame
 * zonder scripts; links openen in een nieuw tabblad.
 */
export function EmailMessageDialog({ open, onOpenChange, item, role, onReply }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const communicationId = item && item.source === "communication" ? stripSourcePrefix(item.id) : null;

  useEffect(() => {
    setHtml(null);
    if (!open || !communicationId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase.from("project_communications").select("html_body").eq("id", communicationId).maybeSingle();
      if (cancelled) return;
      setHtml(data?.html_body?.trim() ? data.html_body : null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, communicationId]);

  const srcDoc = useMemo(() => {
    if (!html) return "";
    return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>body{margin:0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0f172a;background:#fff;font-size:14px;line-height:1.5;word-break:break-word}img{max-width:100%;height:auto}</style></head><body>${html}</body></html>`;
  }, [html]);

  const text = formatEmailBodyText(item?.content);
  const isInbound = item?.origin === "inbound";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{item?.subject || "(geen onderwerp)"}</span>
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 text-xs">
            {item && <Pill tone={ORIGIN_TONE[item.origin]}>{ORIGIN_LABEL[item.origin]}</Pill>}
            <span>
              {isInbound ? "van " : "naar "}
              <span className="font-medium text-foreground">{item?.contact_name || item?.contact_email || "onbekend"}</span>
              {item?.contact_name && item.contact_email ? ` · ${item.contact_email}` : ""}
              {role ? ` (${role})` : ""}
            </span>
            {item?.date && <span className="text-muted-foreground">{format(new Date(item.date), "d MMM yyyy, HH:mm", { locale: nl })}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-[300px] overflow-hidden border rounded-md bg-white">
          {loading ? (
            <div className="h-full min-h-[300px] flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Bericht laden…
            </div>
          ) : html ? (
            <iframe title="Bericht" srcDoc={srcDoc} sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" className="w-full h-[60vh] bg-white" />
          ) : (
            <div className="max-h-[60vh] overflow-auto p-4 text-sm whitespace-pre-wrap text-foreground/90">
              {text || <span className="text-muted-foreground">Dit bericht heeft geen inhoud.</span>}
            </div>
          )}
        </div>
        {item?.source === "communication" && <EmailAttachments metadata={item.metadata} />}

        <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
          <span className="text-[11px] text-muted-foreground self-center">
            {!loading && !html && item?.source === "communication" ? "Van dit bericht is alleen de tekst bewaard." : ""}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Sluiten
            </Button>
            {item?.contact_email && (
              <Button
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onReply(item);
                }}
              >
                <Reply className="h-4 w-4 mr-1" /> Beantwoorden
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
