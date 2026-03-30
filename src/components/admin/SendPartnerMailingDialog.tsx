import { useState } from "react";
import DOMPurify from "dompurify";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Code, Eye, Send, Loader2, CheckCircle, XCircle, Variable } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MailingResult {
  partnerId: string;
  partnerName: string;
  success: boolean;
  error?: string;
}

interface SendPartnerMailingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPartnerIds?: string[];
  totalActivePartners: number;
}

const DEFAULT_BODY = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: 0 auto; background: #f4f7fa;">
  <div style="background: #1e3a5f; padding: 35px 30px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 26px;">Bureau Vlieland</h1>
  </div>
  <div style="background: white; padding: 35px 30px;">
    <h2 style="color: #1e3a5f;">Beste {{partner_name}},</h2>
    <p>Schrijf hier uw bericht...</p>
    <p style="margin-top: 30px;">Met vriendelijke groet,<br><strong>Erwin Soolsma</strong><br>Bureau Vlieland</p>
  </div>
  <div style="background: #e8f0f8; padding: 20px 30px; text-align: center;">
    <p style="color: #374151; font-size: 13px; margin: 0;">
      Vragen? <a href="mailto:erwin@bureauvlieland.nl" style="color: #1e3a5f;">erwin@bureauvlieland.nl</a> of 0562-452090
    </p>
  </div>
</body>
</html>`;

export function SendPartnerMailingDialog({
  open,
  onOpenChange,
  selectedPartnerIds,
  totalActivePartners,
}: SendPartnerMailingDialogProps) {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState(DEFAULT_BODY);
  const [isSending, setIsSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<MailingResult[] | null>(null);

  const recipientCount = selectedPartnerIds && selectedPartnerIds.length > 0
    ? selectedPartnerIds.length
    : totalActivePartners;

  const isTargeted = selectedPartnerIds && selectedPartnerIds.length > 0;

  const generatePreview = () => {
    return htmlBody.replace(/\{\{partner_name\}\}/g, "Jan de Vries");
  };

  const handleSend = async () => {
    setConfirmOpen(false);
    setIsSending(true);
    setResults(null);
    setProgress(10);

    try {
      setProgress(30);

      const body: Record<string, unknown> = { subject, htmlBody };
      if (isTargeted) {
        body.partnerIds = selectedPartnerIds;
      }

      const response = await supabase.functions.invoke("send-partner-mailing", { body });

      setProgress(100);

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data as { results: MailingResult[] };
      setResults(data.results);

      const successful = data.results.filter(r => r.success).length;
      const failed = data.results.filter(r => !r.success).length;

      toast({
        title: failed === 0 ? "Mailing verstuurd" : "Mailing deels verstuurd",
        description: `${successful} verstuurd${failed > 0 ? `, ${failed} mislukt` : ""}`,
        variant: failed > 0 ? "destructive" : "default",
      });
    } catch (error) {
      console.error("Error sending mailing:", error);
      toast({
        title: "Fout",
        description: "Kon mailing niet versturen",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      setResults(null);
      setProgress(0);
      onOpenChange(false);
    }
  };

  const handleReset = () => {
    setResults(null);
    setProgress(0);
    setSubject("");
    setHtmlBody(DEFAULT_BODY);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Partnermailing versturen</SheetTitle>
            <SheetDescription>
              Stuur een e-mail naar {isTargeted ? `${recipientCount} geselecteerde` : "alle actieve"} partners.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Recipient info */}
            <div className="flex items-center gap-2">
              <Badge variant={isTargeted ? "default" : "secondary"}>
                {recipientCount} ontvanger{recipientCount === 1 ? "" : "s"}
              </Badge>
              {isTargeted && (
                <span className="text-sm text-muted-foreground">Geselecteerde partners</span>
              )}
              {!isTargeted && (
                <span className="text-sm text-muted-foreground">Alle actieve partners met account</span>
              )}
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="mailing-subject">Onderwerp</Label>
              <Input
                id="mailing-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Onderwerp van de mailing..."
                disabled={isSending || !!results}
              />
            </div>

            {/* Variables */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Variable className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm text-muted-foreground">Beschikbare variabelen</Label>
              </div>
              <Badge
                variant="outline"
                className="text-xs font-mono cursor-pointer hover:bg-muted"
                onClick={() => navigator.clipboard.writeText("{{partner_name}}")}
                title="Klik om te kopiëren"
              >
                {"{{partner_name}}"}
              </Badge>
            </div>

            {/* Body */}
            <Tabs defaultValue="code" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="code" className="flex items-center gap-2">
                  <Code className="h-4 w-4" /> HTML
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" /> Voorbeeld
                </TabsTrigger>
              </TabsList>
              <TabsContent value="code" className="mt-4">
                <Textarea
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  placeholder="<h1>Email content...</h1>"
                  className="font-mono text-sm min-h-[350px]"
                  disabled={isSending || !!results}
                />
              </TabsContent>
              <TabsContent value="preview" className="mt-4">
                <div
                  className="border rounded-lg p-4 min-h-[350px] bg-white prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(generatePreview(), {
                      ALLOWED_TAGS: ["p", "br", "strong", "em", "h1", "h2", "h3", "h4", "ul", "ol", "li", "a", "table", "tr", "td", "th", "span", "div", "img", "hr"],
                      ALLOWED_ATTR: ["href", "style", "class", "src", "alt"],
                    }),
                  }}
                />
              </TabsContent>
            </Tabs>

            {/* Progress */}
            {isSending && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Mailing versturen...</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Results */}
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

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              {!results ? (
                <>
                  <Button variant="outline" onClick={handleClose} disabled={isSending}>
                    Annuleren
                  </Button>
                  <Button
                    onClick={() => setConfirmOpen(true)}
                    disabled={isSending || !subject.trim() || !htmlBody.trim()}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Versturen
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handleReset}>
                    Nieuwe mailing
                  </Button>
                  <Button onClick={handleClose}>Sluiten</Button>
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mailing versturen?</AlertDialogTitle>
            <AlertDialogDescription>
              Je staat op het punt een e-mail te versturen naar{" "}
              <strong>{recipientCount} partner{recipientCount === 1 ? "" : "s"}</strong> met onderwerp:{" "}
              <strong>"{subject}"</strong>.
              <br /><br />
              <span className="text-amber-600">
                Let op: in de preview-omgeving worden alle e-mails naar erwin@bureauvlieland.nl gestuurd.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend}>
              <Send className="h-4 w-4 mr-2" />
              Versturen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
