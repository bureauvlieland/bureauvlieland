import { useState, useEffect, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  ChevronDown,
  Loader2,
  Send,
  Sparkles,
  Users,
  Wand2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  EMAIL_INTENTS,
  type DossierSummary,
  type EmailIntentId,
} from "@/lib/emailComposerIntents";

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
  /** Pre-select these emails (used by "Beantwoorden") */
  defaultSelectedEmails?: string[];
}

const REFINE_PRESETS = [
  "Korter",
  "Warmer / persoonlijker",
  "Zakelijker",
  "Concreter, met duidelijke vervolgstap",
  "Minder aandringen",
];

export function SendProjectEmailSheet({
  open,
  onOpenChange,
  requestId,
  accommodationId,
  recipients,
  onEmailSent,
  defaultSubject,
  defaultBody,
  defaultSelectedEmails,
}: SendProjectEmailSheetProps) {
  const [isSending, setIsSending] = useState(false);
  const [isComposingAi, setIsComposingAi] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [showAiInstruction, setShowAiInstruction] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState("");

  const [intent, setIntent] = useState<EmailIntentId | null>(null);
  const [suggestedIntent, setSuggestedIntent] = useState<EmailIntentId | null>(null);
  const [summary, setSummary] = useState<DossierSummary | null>(null);
  const [contextOpen, setContextOpen] = useState(false);

  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const [subject, setSubject] = useState(defaultSubject || "");
  const [body, setBody] = useState(defaultBody || "");

  const hasProject = !!(requestId || accommodationId);

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
    setAiInstruction("");
    setShowAiInstruction(false);
    setRefineInstruction("");
    setIntent(null);
    setSuggestedIntent(null);
    setSummary(null);
    setContextOpen(false);
  }, [open, defaultSubject, defaultBody]);

  // Laad de dossier-samenvatting + aanbevolen intentie zodra de sheet opent.
  useEffect(() => {
    if (!open || !hasProject) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("compose-followup-email", {
          body: { requestId, accommodationId, previewOnly: true },
        });
        if (error || cancelled) return;
        if (data?.summary) setSummary(data.summary as DossierSummary);
        if (data?.suggestedIntent) {
          setSuggestedIntent(data.suggestedIntent as EmailIntentId);
          setIntent((prev) => prev ?? (data.suggestedIntent as EmailIntentId));
        }
      } catch {
        /* context is nice-to-have; stilzwijgend negeren */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, hasProject, requestId, accommodationId]);

  const firstRecipient = useMemo(
    () =>
      recipients.find((r) => selectedEmails.has(r.email.toLowerCase())) ||
      recipients.find((r) => r.type === "customer") ||
      recipients[0],
    [recipients, selectedEmails],
  );

  const callCompose = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("compose-followup-email", {
      body: {
        requestId,
        accommodationId,
        recipientEmail: firstRecipient?.email,
        recipientName: firstRecipient?.name,
        recipientType: firstRecipient?.type,
        intent: intent ?? suggestedIntent ?? undefined,
        ...payload,
      },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    if (data?.subject) setSubject(data.subject);
    if (data?.body) setBody(data.body);
    if (data?.summary) setSummary(data.summary as DossierSummary);
    return data;
  };

  const handleAiCompose = async () => {
    if (!hasProject) {
      toast.error("Geen project gekoppeld");
      return;
    }
    setIsComposingAi(true);
    try {
      await callCompose({ instruction: aiInstruction.trim() || undefined });
      toast.success("Concept ingeladen — controleer voor verzending");
    } catch (err: any) {
      console.error("AI compose error", err);
      toast.error(err?.message || "AI-suggestie mislukt");
    } finally {
      setIsComposingAi(false);
    }
  };

  const handleRefine = async (instructionOverride?: string) => {
    const instr = (instructionOverride ?? refineInstruction).trim();
    if (!instr) {
      toast.error("Geef aan hoe de mail aangepast moet worden");
      return;
    }
    if (!body.trim()) {
      toast.error("Er is nog geen concept om te herschrijven");
      return;
    }
    setIsRefining(true);
    try {
      await callCompose({ currentBody: body, refineInstruction: instr });
      setRefineInstruction("");
      toast.success("Concept herschreven");
    } catch (err: any) {
      console.error("AI refine error", err);
      toast.error(err?.message || "Herschrijven mislukt");
    } finally {
      setIsRefining(false);
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

    // Per ontvanger een aparte mail, zodat antwoorden per persoon terugkomen.
    for (const r of finalRecipients) {
      try {
        const { error } = await supabase.functions.invoke("send-project-email", {
          body: {
            recipientEmail: r.email,
            recipientName: r.name || undefined,
            subject,
            body,
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
          : `${okCount} e-mails verstuurd`,
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
  const activeIntent = EMAIL_INTENTS.find((i) => i.id === (intent ?? suggestedIntent));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            E-mail versturen
          </SheetTitle>
          <SheetDescription>
            Kies waarom u mailt; de AI schrijft een persoonlijk concept op basis van het volledige
            projectdossier. Bij meerdere ontvangers gaat per ontvanger een aparte mail uit.
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

          {/* Intent + AI concept */}
          {hasProject && (
            <div className="space-y-3 rounded-md border border-dashed bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Waarom mailt u?
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

              <div className="flex flex-wrap gap-1.5">
                {EMAIL_INTENTS.map((i) => {
                  const active = (intent ?? suggestedIntent) === i.id;
                  return (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => setIntent(i.id)}
                      title={i.hint}
                      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-muted"
                      }`}
                    >
                      {i.label}
                      {suggestedIntent === i.id && !active ? " ·" : ""}
                    </button>
                  );
                })}
              </div>
              {activeIntent && (
                <p className="text-xs text-muted-foreground">{activeIntent.hint}</p>
              )}

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
                {body.trim() ? "Nieuw concept genereren" : "Concept genereren"}
              </Button>

              {summary && (
                <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground"
                    >
                      <span>
                        Dossier: {summary.totalEntries} item(s) ·{" "}
                        {summary.daysSinceCustomerContact === null
                          ? "klant heeft nog niet gereageerd"
                          : `laatste klantreactie ${summary.daysSinceCustomerContact} dag(en) geleden`}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${contextOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div>Uitgaande berichten van ons: {summary.outgoingCount}</div>
                    <div>Berichten van de klant: {summary.incomingCount}</div>
                    <div>Automatische systeemmails: {summary.systemEmailCount}</div>
                    {summary.lastIncomingExcerpt && (
                      <div className="rounded bg-background/60 p-2 italic">
                        “{summary.lastIncomingExcerpt}”
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )}
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
              placeholder="Typ uw bericht of laat de AI een concept maken..."
              className="min-h-[220px] text-sm"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          {/* Refine bar */}
          {hasProject && body.trim() && (
            <div className="space-y-2 rounded-md border bg-muted/20 p-3">
              <Label className="flex items-center gap-1.5 text-xs">
                <Wand2 className="h-3.5 w-3.5 text-primary" />
                Verfijnen met AI
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {REFINE_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={isRefining}
                    onClick={() => handleRefine(p)}
                    className="rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-50"
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Eigen aanwijzing, bijv. 'verwijs naar het gesprek van vrijdag'"
                  value={refineInstruction}
                  onChange={(e) => setRefineInstruction(e.target.value)}
                  className="text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isRefining}
                  onClick={() => handleRefine()}
                >
                  {isRefining ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Verzonden vanuit hallo@bureauvlieland.nl met Bureau Vlieland-opmaak. Antwoorden komen
            automatisch terug in het projectdossier. Controleer het concept altijd voor verzending.
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
            <Button type="submit" disabled={isSending} className="flex-1">
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
