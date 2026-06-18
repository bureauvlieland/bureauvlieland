import { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Send, Sparkles, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Recipient {
  label: string;
  email: string;
  name: string;
  type: "customer" | "partner";
  partnerId?: string;
}

interface SendProjectEmailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId?: string;
  accommodationId?: string;
  recipients: Recipient[];
  onEmailSent?: () => void;
  defaultSubject?: string;
  defaultBody?: string;
  /** Optional: only show templates whose id starts with one of these prefixes (e.g. ["presales_"]) */
  templateFilter?: string[];
  /** Pre-select these emails (used by "Beantwoorden") */
  defaultSelectedEmails?: string[];
}

interface TemplateRow {
  id: string;
  name: string;
  subject: string;
  description: string | null;
}

export function SendProjectEmailSheet({
  open,
  onOpenChange,
  requestId,
  accommodationId,
  recipients,
  onEmailSent,
  defaultSubject,
  defaultBody,
  templateFilter,
  defaultSelectedEmails,
}: SendProjectEmailSheetProps) {
  const [isSending, setIsSending] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isComposingAi, setIsComposingAi] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [showAiInstruction, setShowAiInstruction] = useState(false);

  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const [subject, setSubject] = useState(defaultSubject || "");
  const [body, setBody] = useState(defaultBody || "");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  // Houd de originele template-HTML + bijbehorende platte tekst bij.
  // Als de admin de body niet wijzigt versturen we de rijke HTML rechtstreeks,
  // anders gaat het bewerkte bericht als platte tekst de wrapper in.
  const templateHtmlRef = useRef<string | null>(null);
  const templatePlainRef = useRef<string | null>(null);

  // Fetch active templates
  const { data: templates = [] } = useQuery<TemplateRow[]>({
    queryKey: ["email-templates-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("id, name, subject, description")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as TemplateRow[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  const filteredTemplates = templateFilter && templateFilter.length > 0
    ? templates.filter((t) => templateFilter.some((p) => t.id.startsWith(p)))
    : templates;

  // Reset state when sheet opens
  useEffect(() => {
    if (!open) return;
    const initial = new Set<string>();
    if (defaultSelectedEmails && defaultSelectedEmails.length > 0) {
      defaultSelectedEmails.forEach((e) => {
        if (recipients.some((r) => r.email.toLowerCase() === e.toLowerCase())) {
          initial.add(e.toLowerCase());
        }
      });
    } else if (recipients.length === 1) {
      initial.add(recipients[0].email.toLowerCase());
    }
    setSelectedEmails(initial);
    setCustomEmail("");
    setCustomName("");
    setShowCustom(initial.size === 0 && recipients.length === 0);
    setSubject(defaultSubject || "");
    setBody(defaultBody || "");
    setSelectedTemplate("");
    templateHtmlRef.current = null;
    templatePlainRef.current = null;
    setAiInstruction("");
    setShowAiInstruction(false);
  }, [open, defaultSubject, defaultBody]);

  const handleAiCompose = async () => {
    if (!requestId && !accommodationId) {
      toast.error("Geen project gekoppeld");
      return;
    }
    const firstRecipient =
      recipients.find((r) => selectedEmails.has(r.email.toLowerCase())) ||
      recipients.find((r) => r.type === "customer") ||
      recipients[0];

    setIsComposingAi(true);
    try {
      const { data, error } = await supabase.functions.invoke("compose-followup-email", {
        body: {
          requestId,
          accommodationId,
          recipientEmail: firstRecipient?.email,
          recipientName: firstRecipient?.name,
          instruction: aiInstruction.trim() || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.subject) setSubject(data.subject);
      if (data?.body) setBody(data.body);
      toast.success("AI-suggestie ingeladen — controleer voor verzending");
    } catch (err: any) {
      console.error("AI compose error", err);
      toast.error(err?.message || "AI-suggestie mislukt");
    } finally {
      setIsComposingAi(false);
    }
  };

  const toggleRecipient = (email: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      const key = email.toLowerCase();
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleTemplateChange = async (templateId: string) => {
    setSelectedTemplate(templateId);
    if (!templateId || templateId === "__none__") return;
    setIsLoadingTemplate(true);
    try {
      // Pick partnerId from first selected partner recipient (for partner-targeted templates)
      const firstSelected = recipients.find(
        (r) => selectedEmails.has(r.email.toLowerCase()) && r.type === "partner"
      );
      const { data, error } = await supabase.functions.invoke("render-email-template", {
        body: {
          templateId,
          requestId,
          accommodationId,
          partnerId: firstSelected?.partnerId,
        },
      });
      if (error) throw error;
      if (data?.subject) setSubject(data.subject);
      if (data?.body) setBody(data.body);
      templateHtmlRef.current = typeof data?.html === "string" ? data.html : null;
      templatePlainRef.current = typeof data?.body === "string" ? data.body : null;
    } catch (err) {
      console.error("Template render error:", err);
      toast.error("Kon template niet laden");
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  const buildFinalRecipients = (): Recipient[] => {
    const list: Recipient[] = [];
    selectedEmails.forEach((emailLower) => {
      const r = recipients.find((rr) => rr.email.toLowerCase() === emailLower);
      if (r) list.push(r);
    });
    if (showCustom && customEmail.trim()) {
      list.push({
        label: customName || customEmail,
        email: customEmail.trim(),
        name: customName.trim(),
        type: "customer",
      });
    }
    return list;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalRecipients = buildFinalRecipients();

    if (finalRecipients.length === 0) {
      toast.error("Kies minimaal één ontvanger");
      return;
    }
    if (!subject.trim()) {
      toast.error("Onderwerp is verplicht");
      return;
    }
    if (!body.trim()) {
      toast.error("Bericht is verplicht");
      return;
    }
    // Basic email check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const r of finalRecipients) {
      if (!emailRegex.test(r.email)) {
        toast.error(`Ongeldig e-mailadres: ${r.email}`);
        return;
      }
    }

    setIsSending(true);
    let okCount = 0;
    const errors: string[] = [];

    // Send a separate email per recipient so each ontvanger keeps an isolated thread
    // (Reply-To is the same per project but each mail sequence is its own conversation)
    // Als de admin de body niet wijzigde sinds het laden van de template,
    // sturen we de originele rijke HTML door zodat tabellen/knoppen/kleuren behouden blijven.
    const useTemplateHtml =
      !!templateHtmlRef.current &&
      templatePlainRef.current !== null &&
      body === templatePlainRef.current;

    for (const r of finalRecipients) {
      try {
        const { error } = await supabase.functions.invoke("send-project-email", {
          body: {
            recipientEmail: r.email,
            recipientName: r.name || undefined,
            subject,
            body,
            bodyHtml: useTemplateHtml ? templateHtmlRef.current : undefined,
            requestId: requestId || undefined,
            accommodationId: accommodationId || undefined,
            partnerId: r.partnerId || undefined,
          },
        });
        if (error) throw error;
        okCount++;
      } catch (err) {
        console.error("send-project-email failed for", r.email, err);
        errors.push(r.email);
      }
    }

    setIsSending(false);

    if (okCount > 0 && errors.length === 0) {
      toast.success(
        okCount === 1
          ? `E-mail verstuurd naar ${finalRecipients[0].email}`
          : `${okCount} e-mails verstuurd`
      );
      onOpenChange(false);
      onEmailSent?.();
    } else if (okCount > 0) {
      toast.warning(`${okCount} verstuurd, ${errors.length} mislukt: ${errors.join(", ")}`);
      onEmailSent?.();
    } else {
      toast.error("Versturen mislukt");
    }
  };

  const totalSelected = selectedEmails.size + (showCustom && customEmail.trim() ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            E-mail versturen
          </SheetTitle>
          <SheetDescription>
            Verstuur een e-mail vanuit Bureau Vlieland. Bij meerdere ontvangers gaat per ontvanger een aparte mail uit, zodat antwoorden netjes per persoon teruglopen.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-6">
          {/* Recipients */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Ontvangers
              </Label>
              {totalSelected > 0 && (
                <Badge variant="secondary">{totalSelected} geselecteerd</Badge>
              )}
            </div>

            <div className="border rounded-md divide-y bg-card">
              {recipients.length === 0 && !showCustom && (
                <p className="text-sm text-muted-foreground p-3">
                  Geen ontvangers bekend voor dit project.
                </p>
              )}
              {recipients.map((r) => {
                const key = r.email.toLowerCase();
                const checked = selectedEmails.has(key);
                return (
                  <label
                    key={r.email}
                    className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleRecipient(r.email)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        r.type === "customer"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }
                    >
                      {r.type === "customer" ? "Klant" : "Partner"}
                    </Badge>
                  </label>
                );
              })}

              {showCustom ? (
                <div className="p-3 space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Ander e-mailadres
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setShowCustom(false);
                        setCustomEmail("");
                        setCustomName("");
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Naam"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                  <Input
                    type="email"
                    placeholder="email@voorbeeld.nl"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full text-left p-2.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                  onClick={() => setShowCustom(true)}
                >
                  + Ander e-mailadres toevoegen
                </button>
              )}
            </div>
          </div>

          {/* Template */}
          {filteredTemplates.length > 0 && (
            <div className="space-y-2">
              <Label>Template (optioneel)</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingTemplate ? "Bezig met laden..." : "Kies een template"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Geen template — leeg starten</SelectItem>
                  {filteredTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Variabelen zoals naam en referentienummer worden automatisch ingevuld. Je kunt het bericht daarna nog aanpassen.
              </p>
            </div>
          )}

          {/* AI follow-up suggestion */}
          {(requestId || accommodationId) && (
            <div className="space-y-2 rounded-md border border-dashed bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI-suggestie voor opvolging
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setShowAiInstruction((v) => !v)}
                >
                  {showAiInstruction ? "Verberg instructie" : "+ Extra instructie"}
                </Button>
              </div>
              {showAiInstruction && (
                <Textarea
                  placeholder="Optioneel: stuur de AI bij, bijv. 'noem dat we morgen telefonisch contact opnemen'"
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  className="min-h-[60px] text-sm"
                />
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAiCompose}
                disabled={isComposingAi}
                className="w-full"
              >
                {isComposingAi ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                AI-suggestie genereren
              </Button>
              <p className="text-xs text-muted-foreground">
                Op basis van projectstatus en reeds verstuurde mails. Onderwerp en bericht worden ingevuld; controleer altijd voor verzending.
              </p>
            </div>
          )}



          {/* Subject */}
          <div className="space-y-2">
            <Label>Onderwerp</Label>
            <Input
              placeholder="Onderwerp van de e-mail"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label>Bericht</Label>
            <Textarea
              placeholder="Typ uw bericht..."
              className="min-h-[220px] font-mono text-sm"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            {templateHtmlRef.current && templatePlainRef.current !== null && (
              <p className="text-xs text-muted-foreground">
                {body === templatePlainRef.current
                  ? "✓ Template-opmaak (tabellen, knoppen, kleuren) blijft behouden. Zodra je iets aanpast wordt de mail als platte tekst verstuurd."
                  : "✏️ Je hebt de template aangepast — deze mail wordt als platte tekst verstuurd binnen de Bureau Vlieland-huisstijl."}
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Verzonden vanuit hallo@bureauvlieland.nl met Bureau Vlieland-opmaak. Antwoorden komen automatisch terug in het projectdossier.
          </p>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={isSending || isLoadingTemplate} className="flex-1">
              {isSending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {totalSelected > 1 ? `Versturen (${totalSelected})` : "Versturen"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
