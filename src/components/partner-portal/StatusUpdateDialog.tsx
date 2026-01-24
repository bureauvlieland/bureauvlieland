import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle, XCircle, MessageSquare, Loader2 } from "lucide-react";
import type { PartnerItem } from "@/types/partner";

interface StatusUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (status: string, note?: string) => Promise<void>;
  item: PartnerItem | null;
}

export const StatusUpdateDialog = ({
  isOpen,
  onClose,
  onSubmit,
  item,
}: StatusUpdateDialogProps) => {
  const [status, setStatus] = useState<string>("confirmed");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(status, note || undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStatus("confirmed");
    setNote("");
    onClose();
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reageer op aanvraag</DialogTitle>
          <DialogDescription>
            {item.block_name} voor {item.program_requests.customer_company || item.program_requests.customer_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup value={status} onValueChange={setStatus} className="space-y-3">
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="confirmed" id="confirmed" />
              <Label htmlFor="confirmed" className="flex items-center gap-2 cursor-pointer flex-1">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Bevestigen</p>
                  <p className="text-sm text-muted-foreground">
                    De activiteit kan plaatsvinden zoals aangevraagd
                  </p>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="alternative" id="alternative" />
              <Label htmlFor="alternative" className="flex items-center gap-2 cursor-pointer flex-1">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Alternatief voorstellen</p>
                  <p className="text-sm text-muted-foreground">
                    Stel een andere tijd of aanpassing voor
                  </p>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="unavailable" id="unavailable" />
              <Label htmlFor="unavailable" className="flex items-center gap-2 cursor-pointer flex-1">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium">Niet beschikbaar</p>
                  <p className="text-sm text-muted-foreground">
                    De activiteit kan niet plaatsvinden
                  </p>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {(status === "alternative" || status === "unavailable") && (
            <div className="space-y-2">
              <Label htmlFor="note">
                {status === "alternative" ? "Alternatief voorstel" : "Reden"}
              </Label>
              <Textarea
                id="note"
                placeholder={
                  status === "alternative"
                    ? "Bijv. 'Beschikbaar op 10:00 of 14:00 in plaats van 12:00'"
                    : "Bijv. 'Volgeboekt op deze datum'"
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Bevestigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
