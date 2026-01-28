import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Send, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmailLog {
  id: string;
  email_type: string;
  subject: string;
  recipient_email: string;
  recipient_name: string | null;
  related_request_id: string | null;
  related_accommodation_id: string | null;
  related_partner_id: string | null;
  status: string;
}

interface ResendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: EmailLog | null;
  onSuccess: () => void;
}

export function ResendEmailDialog({
  open,
  onOpenChange,
  email,
  onSuccess,
}: ResendEmailDialogProps) {
  const [recipientEmail, setRecipientEmail] = useState("");

  // Reset recipient email when dialog opens with new email
  useState(() => {
    if (email) {
      setRecipientEmail(email.recipient_email);
    }
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      if (!email) throw new Error("No email selected");

      const { data, error } = await supabase.functions.invoke("resend-email", {
        body: {
          email_log_id: email.id,
          recipient_email: recipientEmail || email.recipient_email,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Email opnieuw verzonden");
      onOpenChange(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error("Fout bij verzenden: " + error.message);
    },
  });

  if (!email) return null;

  const handleResend = () => {
    resendMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Email opnieuw versturen</DialogTitle>
          <DialogDescription>
            Verstuur deze email opnieuw naar de originele ontvanger of een ander adres.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {email.status === "failed" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Deze email is eerder mislukt. Controleer het email adres.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Onderwerp</Label>
            <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
              {email.subject}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient">Ontvanger email</Label>
            <Input
              id="recipient"
              type="email"
              value={recipientEmail || email.recipient_email}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder={email.recipient_email}
            />
            <p className="text-xs text-slate-500">
              Laat leeg om naar het originele adres te versturen
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleResend} disabled={resendMutation.isPending}>
            <Send className="h-4 w-4 mr-2" />
            {resendMutation.isPending ? "Versturen..." : "Versturen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
