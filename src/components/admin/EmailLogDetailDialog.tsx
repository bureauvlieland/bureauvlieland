import { useMemo, useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Reply, RefreshCw, Mail } from "lucide-react";
import { useResendEmail } from "@/hooks/useResendEmail";
import type { ProjectCommunication } from "@/types/projectCommunication";
import { EMAIL_TYPE_LABELS } from "@/types/projectCommunication";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communication: ProjectCommunication | null;
  onReply?: (comm: ProjectCommunication) => void;
}

export function EmailLogDetailDialog({ open, onOpenChange, communication, onReply }: Props) {
  const [overrideEmail, setOverrideEmail] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const resend = useResendEmail();

  const hasBody = !!(communication?.html_body || communication?.text_body);
  const emailLogId = communication?.email_log_id;

  const srcDoc = useMemo(() => {
    if (!communication?.html_body) return "";
    // Wrap in minimal doctype so relative sizing is consistent
    return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>body{margin:0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0f172a;background:#fff;font-size:14px;line-height:1.5}img{max-width:100%;height:auto}</style></head><body>${communication.html_body}</body></html>`;
  }, [communication?.html_body]);

  const handleResend = async () => {
    if (!emailLogId) return;
    try {
      await resend.mutateAsync({
        email_log_id: emailLogId,
        override_recipient_email: overrideEmail.trim() || undefined,
      });
      toast.success("E-mail opnieuw verstuurd");
      setShowOverride(false);
      setOverrideEmail("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Opnieuw versturen mislukt");
    }
  };

  const emailTypeLabel = communication?.email_type
    ? EMAIL_TYPE_LABELS[communication.email_type] || communication.email_type
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <span className="truncate">{communication?.subject || "(Geen onderwerp)"}</span>
          </DialogTitle>
          <DialogDescription className="flex flex-wrap gap-2 items-center text-xs">
            {emailTypeLabel && <Badge variant="outline">{emailTypeLabel}</Badge>}
            {communication?.metadata?.status ? (
              <Badge
                variant="outline"
                className={
                  communication.metadata.status === "sent"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }
              >
                {String(communication.metadata.status)}
              </Badge>
            ) : null}
            {communication?.communication_date && (
              <span className="text-muted-foreground">
                {format(new Date(communication.communication_date), "d MMM yyyy, HH:mm", { locale: nl })}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm border rounded-md p-3 bg-muted/30">
          <div className="grid grid-cols-[80px_1fr] gap-1">
            <span className="text-muted-foreground">Aan</span>
            <span className="font-medium">
              {communication?.contact_name ? `${communication.contact_name} · ` : ""}
              {communication?.contact_email || "—"}
            </span>
            {communication?.from_email && (
              <>
                <span className="text-muted-foreground">Van</span>
                <span>{communication.from_email}</span>
              </>
            )}
            {communication?.reply_to && (
              <>
                <span className="text-muted-foreground">Reply-To</span>
                <span className="truncate">{communication.reply_to}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-[300px] overflow-hidden border rounded-md">
          {hasBody ? (
            communication?.html_body ? (
              <iframe
                title="E-mail voorbeeld"
                srcDoc={srcDoc}
                sandbox="allow-same-origin allow-popups"
                className="w-full h-[420px] bg-white"
              />
            ) : (
              <pre className="w-full h-full max-h-[420px] overflow-auto p-4 text-sm whitespace-pre-wrap">
                {communication?.text_body}
              </pre>
            )
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground space-y-2">
              <p>De volledige inhoud van dit bericht is niet bewaard.</p>
              <p className="text-xs">
                Berichten die vóór deze update zijn verstuurd hebben alleen metadata (onderwerp, ontvanger, tijdstip).
                Gebruik <strong>Beantwoorden</strong> om een nieuwe mail te schrijven op basis van hetzelfde adres/onderwerp.
              </p>
            </div>
          )}
        </div>

        {showOverride && (
          <div className="space-y-1">
            <Label htmlFor="override-email" className="text-xs">Verstuur naar (afwijkend adres)</Label>
            <Input
              id="override-email"
              type="email"
              placeholder={communication?.contact_email || "naam@voorbeeld.nl"}
              value={overrideEmail}
              onChange={(e) => setOverrideEmail(e.target.value)}
            />
          </div>
        )}

        <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
          <div className="flex gap-2">
            {communication && onReply && communication.contact_email && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onReply(communication);
                  onOpenChange(false);
                }}
              >
                <Reply className="h-4 w-4 mr-1" /> Beantwoorden
              </Button>
            )}
            {emailLogId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOverride((v) => !v)}
              >
                {showOverride ? "Zelfde ontvanger" : "Ander adres"}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Sluiten
            </Button>
            <Button
              size="sm"
              disabled={!emailLogId || resend.isPending}
              onClick={handleResend}
              title={!hasBody ? "Inhoud wordt opnieuw opgebouwd uit het sjabloon" : "Opnieuw versturen"}
            >
              {resend.isPending ? (
                <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Versturen…</>
              ) : (
                <><Send className="h-4 w-4 mr-1" /> Opnieuw versturen</>
              )}
            </Button>

          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
