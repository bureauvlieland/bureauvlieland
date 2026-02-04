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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Partner {
  id: string;
  name: string;
  email: string;
}

interface BulkInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partners: Partner[];
  onComplete: () => void;
}

interface InviteResult {
  partnerId: string;
  partnerName: string;
  success: boolean;
  error?: string;
}

export function BulkInviteDialog({
  open,
  onOpenChange,
  partners,
  onComplete,
}: BulkInviteDialogProps) {
  const { toast } = useToast();
  const [isInviting, setIsInviting] = useState(false);
  const [results, setResults] = useState<InviteResult[] | null>(null);
  const [progress, setProgress] = useState(0);

  const handleInvite = async () => {
    setIsInviting(true);
    setResults(null);
    setProgress(10);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      setProgress(30);

      const response = await supabase.functions.invoke("bulk-invite-partners", {
        body: { partnerIds: partners.map(p => p.id) },
      });

      setProgress(100);

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data as { results: InviteResult[] };
      setResults(data.results);

      const successful = data.results.filter(r => r.success).length;
      const failed = data.results.filter(r => !r.success).length;

      if (failed === 0) {
        toast({
          title: "Uitnodigingen verstuurd",
          description: `${successful} partner${successful === 1 ? "" : "s"} succesvol uitgenodigd.`,
        });
      } else {
        toast({
          title: "Uitnodigingen deels verstuurd",
          description: `${successful} succesvol, ${failed} mislukt.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error bulk inviting partners:", error);
      toast({
        title: "Fout",
        description: "Kon uitnodigingen niet versturen",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleClose = () => {
    if (results) {
      onComplete();
    }
    setResults(null);
    setProgress(0);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {results ? "Uitnodigingen verstuurd" : `${partners.length} partners uitnodigen?`}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {!results && !isInviting && (
                <>
                  <p>
                    De volgende partners ontvangen een uitnodigingsmail met een link om hun wachtwoord in te stellen:
                  </p>
                  <div className="max-h-48 overflow-y-auto rounded-md border p-3 space-y-2">
                    {partners.map((partner) => (
                      <div key={partner.id} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{partner.name}</span>
                        <span className="text-slate-500">{partner.email}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-amber-600">
                    Let op: In de preview-omgeving worden alle e-mails naar erwin@bureauvlieland.nl gestuurd.
                  </p>
                </>
              )}

              {isInviting && (
                <div className="py-4 space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Uitnodigingen versturen...</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {results && (
                <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
                  {results.map((result) => (
                    <div
                      key={result.partnerId}
                      className={`flex items-center justify-between p-3 text-sm ${
                        result.success ? "bg-green-50" : "bg-red-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium">{result.partnerName}</span>
                      </div>
                      {result.success ? (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                          Verstuurd
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          {result.error || "Mislukt"}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {!results && (
            <>
              <AlertDialogCancel disabled={isInviting}>Annuleren</AlertDialogCancel>
              <AlertDialogAction onClick={handleInvite} disabled={isInviting}>
                {isInviting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Versturen...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Uitnodigingen versturen
                  </>
                )}
              </AlertDialogAction>
            </>
          )}
          {results && (
            <AlertDialogAction onClick={handleClose}>Sluiten</AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
