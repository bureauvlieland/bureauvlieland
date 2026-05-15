import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Share2, Mail, QrCode, Download } from "lucide-react";

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

interface ShareWithParticipantsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  programLabel?: string;
}

export const ShareWithParticipantsDialog = ({
  isOpen,
  onClose,
  shareUrl,
  programLabel,
}: ShareWithParticipantsDialogProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link gekopieerd", description: "Plak de link in WhatsApp, e-mail of een chatbericht." });
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = shareUrl;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Link gekopieerd" });
      } catch {
        toast({ title: "Kopiëren mislukt", description: "Selecteer de link en kopieer handmatig.", variant: "destructive" });
      }
    }
  };

  const shareNative = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: "Programma Bureau Vlieland",
          text: "Hier is ons programma op Vlieland:",
          url: shareUrl,
        });
      } catch (err: any) {
        if (err?.name !== "AbortError") copy();
      }
    } else {
      copy();
    }
  };

  const shareWhatsApp = () => {
    const text = `Hier is ons programma op Vlieland: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareEmail = () => {
    const subject = "Ons programma op Vlieland";
    const body = `Hi,\n\nHier is de deelnemerslink voor ons programma op Vlieland:\n${shareUrl}\n\nJe vindt hier het programma per dag, de kaart met locaties en alle praktische info.\n\nGroet`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const downloadQr = () => {
    const canvas = document.querySelector<HTMLCanvasElement>("#participants-qr-canvas canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-deelnemerslink${programLabel ? `-${programLabel}` : ""}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) { setShowQr(false); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Delen met deelnemers
          </DialogTitle>
          <DialogDescription>
            Deelnemers krijgen een vereenvoudigde weergave van het programma — zonder facturatie of akkoordstappen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <Input value={shareUrl} readOnly className="text-sm" onFocus={(e) => e.currentTarget.select()} />
            <Button size="icon" variant="outline" onClick={copy} className="shrink-0" aria-label="Link kopiëren">
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={shareWhatsApp} variant="outline" className="gap-2">
              <WhatsAppIcon />
              WhatsApp
            </Button>
            <Button onClick={shareEmail} variant="outline" className="gap-2">
              <Mail className="h-4 w-4" />
              E-mail
            </Button>
          </div>

          {typeof navigator !== "undefined" && (navigator as any).share && (
            <Button onClick={shareNative} variant="outline" className="w-full gap-2">
              <Share2 className="h-4 w-4" />
              Meer deelopties…
            </Button>
          )}

          <div className="border-t pt-4">
            {!showQr ? (
              <Button onClick={() => setShowQr(true)} variant="ghost" className="w-full gap-2">
                <QrCode className="h-4 w-4" />
                Toon QR-code voor on-site delen
              </Button>
            ) : (
              <div className="space-y-3">
                <div id="participants-qr-canvas" className="flex justify-center bg-white p-4 rounded-lg border">
                  <QRCodeCanvas value={shareUrl} size={220} level="M" includeMargin />
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Laat deelnemers scannen met hun telefooncamera om het programma te openen.
                </p>
                <Button onClick={downloadQr} variant="outline" className="w-full gap-2">
                  <Download className="h-4 w-4" />
                  QR-code downloaden
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
