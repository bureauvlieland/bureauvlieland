import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ResetPartnerConnectionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectedCount: number;
  onComplete: () => void;
}

export function ResetPartnerConnectionsDialog({
  open,
  onOpenChange,
  connectedCount,
  onComplete,
}: ResetPartnerConnectionsDialogProps) {
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleReset = async () => {
    setIsResetting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("reset-partner-connections");

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data as { 
        results: { success: boolean; partnerName: string }[] 
      };
      
      const successful = data.results.filter(r => r.success).length;

      toast({
        title: "Partner koppelingen gereset",
        description: `${successful} partner account${successful === 1 ? "" : "s"} succesvol ontkoppeld.`,
      });

      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Error resetting partner connections:", error);
      toast({
        title: "Fout",
        description: "Kon partner koppelingen niet resetten",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
      setConfirmText("");
    }
  };

  const isConfirmed = confirmText.toLowerCase() === "reset";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Alle partner koppelingen resetten?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Deze actie zal <strong>{connectedCount} partner accounts</strong> ontkoppelen. 
                Dit betekent:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                <li>Alle bestaande partner logins worden verwijderd</li>
                <li>Partners moeten opnieuw worden uitgenodigd</li>
                <li>Deze actie kan niet ongedaan worden gemaakt</li>
              </ul>
              <div className="pt-2">
                <p className="text-sm font-medium mb-2">
                  Typ "reset" om te bevestigen:
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="reset"
                  disabled={isResetting}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>Annuleren</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            disabled={isResetting || !isConfirmed}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isResetting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Resetten...
              </>
            ) : (
              "Alle koppelingen resetten"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
