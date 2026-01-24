import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, Share2, Printer, Loader2 } from "lucide-react";
import { type CartItemDetail } from "@/data/configuratorMockData";

// WhatsApp icon as inline SVG
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

// Email icon
const EmailIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

interface ShareProgramDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItemDetail[];
  numberOfPeople: number;
  selectedDate: Date | undefined;
}

function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const ShareProgramDialog = ({
  isOpen,
  onClose,
  cartItems,
  numberOfPeople,
  selectedDate,
}: ShareProgramDialogProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateShareLink = async () => {
    setIsGenerating(true);
    try {
      const shareCode = generateShareCode();
      
      // Use type assertion to handle the JSONB field properly
      const insertData = {
        share_code: shareCode,
        cart_items: cartItems,
        number_of_people: numberOfPeople,
        selected_date: selectedDate?.toISOString().split('T')[0] || null,
      };
      
      const { error } = await supabase
        .from('shared_programs')
        .insert(insertData as never);

      if (error) throw error;

      const url = `${window.location.origin}/programma/${shareCode}`;
      setShareUrl(url);
    } catch (error) {
      console.error('Error generating share link:', error);
      toast({
        title: "Fout bij delen",
        description: "Er ging iets mis bij het genereren van de deellink.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Link gekopieerd",
        description: "De deellink is naar je klembord gekopieerd.",
      });
    } catch {
      toast({
        title: "Kopiëren mislukt",
        description: "Selecteer en kopieer de link handmatig.",
        variant: "destructive",
      });
    }
  };

  const shareViaWhatsApp = () => {
    if (!shareUrl) return;
    const text = `Bekijk mijn Vlieland programma: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareViaEmail = () => {
    if (!shareUrl) return;
    const subject = 'Mijn Vlieland programma';
    const body = `Bekijk mijn samengestelde programma voor Vlieland:\n\n${shareUrl}\n\nAantal personen: ${numberOfPeople}${selectedDate ? `\nDatum: ${selectedDate.toLocaleDateString('nl-NL')}` : ''}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const openPrintView = () => {
    if (!shareUrl) return;
    window.open(shareUrl, '_blank');
  };

  const handleClose = () => {
    setShareUrl(null);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Deel je programma
          </DialogTitle>
          <DialogDescription>
            Deel je samengestelde programma met collega's of sla het op voor later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {!shareUrl ? (
            <Button
              onClick={generateShareLink}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Link genereren...
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  Genereer deellink
                </>
              )}
            </Button>
          ) : (
            <>
              {/* Share URL input */}
              <div className="flex items-center gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="text-sm"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Copy button (full width) */}
              <Button
                onClick={copyToClipboard}
                variant="outline"
                className="w-full"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-600" />
                    Gekopieerd!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Link kopiëren
                  </>
                )}
              </Button>

              {/* Share buttons row */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={shareViaWhatsApp}
                  variant="outline"
                  className="gap-2"
                >
                  <WhatsAppIcon />
                  WhatsApp
                </Button>
                <Button
                  onClick={shareViaEmail}
                  variant="outline"
                  className="gap-2"
                >
                  <EmailIcon />
                  Email
                </Button>
              </div>

              {/* Print button */}
              <Button
                onClick={openPrintView}
                variant="outline"
                className="w-full"
              >
                <Printer className="mr-2 h-4 w-4" />
                Bekijk & print
              </Button>

              {/* Expiry note */}
              <p className="text-xs text-center text-muted-foreground">
                Link is 30 dagen geldig
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};