import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownText } from "@/components/shared/MarkdownText";
import { supabase } from "@/integrations/supabase/client";
import { useSavePartnerAgreement, type PartnerAgreementInsert, type PartnerAgreementRow } from "@/hooks/usePartnerAgreements";
import { APPLIES_TO_LABEL, nextVersion, type AgreementAppliesTo } from "@/lib/partnerAgreements";
import { toIsoDate } from "@/lib/weddingReferrals";

/**
 * Een afspraak schrijven of een nieuwe versie maken. Een gepubliceerde versie
 * is niet meer te bewerken: partners hebben er misschien al akkoord op
 * gegeven. Een wijziging is een nieuwe versie (concept), die je daarna
 * publiceert.
 */
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Bewerken (concept) of als basis voor een nieuwe versie. */
  agreement: PartnerAgreementRow | null;
  /** true = nieuwe versie van `agreement` maken in plaats van het concept bewerken. */
  asNewVersion?: boolean;
  allAgreements: PartnerAgreementRow[];
}

const sleutelNet = (s: string) => s.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);

export function PartnerAgreementSheet({ open, onOpenChange, agreement, asNewVersion = false, allAgreements }: Props) {
  const save = useSavePartnerAgreement();
  const [key, setKey] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [appliesTo, setAppliesTo] = useState<AgreementAppliesTo>("all");

  const bewerktConcept = Boolean(agreement) && !asNewVersion;
  const bestaandeSleutels = useMemo(() => [...new Set(allAgreements.map((a) => a.key))].sort(), [allAgreements]);

  useEffect(() => {
    if (!open) return;
    setKey(agreement?.key ?? "");
    setTitle(agreement?.title ?? "");
    setSummary(asNewVersion ? "" : agreement?.summary ?? "");
    setBody(agreement?.body_markdown ?? "");
    setEffectiveFrom(asNewVersion || !agreement ? toIsoDate(new Date()) : agreement.effective_from);
    setAppliesTo((agreement?.applies_to as AgreementAppliesTo) ?? "all");
  }, [open, agreement, asNewVersion]);

  const versie = bewerktConcept && agreement ? agreement.version : nextVersion(allAgreements, sleutelNet(key));

  const opslaan = async () => {
    const k = sleutelNet(key);
    if (!k) return toast.error("Geef de afspraak een sleutel, bijvoorbeeld 'samenwerking'.");
    if (!title.trim()) return toast.error("Vul een titel in.");
    if (!body.trim()) return toast.error("De tekst van de afspraak is leeg.");
    if (!effectiveFrom) return toast.error("Kies een ingangsdatum.");
    const { data: sessie } = await supabase.auth.getSession();
    const values: PartnerAgreementInsert = {
      key: k,
      version: versie,
      title: title.trim(),
      summary: summary.trim(),
      body_markdown: body,
      effective_from: effectiveFrom,
      applies_to: appliesTo,
      status: "draft",
      created_by: sessie.session?.user.id ?? null,
    };
    save.mutate(
      { id: bewerktConcept && agreement ? agreement.id : null, values },
      {
        onSuccess: () => {
          toast.success(bewerktConcept ? "Concept opgeslagen" : `Versie ${versie} opgeslagen als concept`);
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{bewerktConcept ? "Concept bewerken" : asNewVersion ? `Nieuwe versie van "${agreement?.title}"` : "Nieuwe afspraak"}</SheetTitle>
          <SheetDescription>
            Wordt opgeslagen als concept; partners zien hem pas na publiceren. Een gepubliceerde versie wijzig je niet meer, maar vervang je door een nieuwe
            versie, zodat eerdere akkoorden blijven kloppen.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="pa-sleutel">Sleutel</Label>
              {bestaandeSleutels.length > 0 && !agreement ? (
                <div className="flex gap-2">
                  <Select value={bestaandeSleutels.includes(sleutelNet(key)) ? sleutelNet(key) : "__nieuw"} onValueChange={(v) => setKey(v === "__nieuw" ? "" : v)}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__nieuw">Nieuwe sleutel…</SelectItem>
                      {bestaandeSleutels.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!bestaandeSleutels.includes(sleutelNet(key)) && <Input id="pa-sleutel" value={key} onChange={(e) => setKey(e.target.value)} placeholder="bijv. samenwerking" />}
                </div>
              ) : (
                <Input id="pa-sleutel" value={key} onChange={(e) => setKey(e.target.value)} disabled={Boolean(agreement)} />
              )}
              <p className="text-xs text-muted-foreground">Vaste naam waaronder alle versies van deze afspraak samenhangen. `wedding_referral` is de doorverwijsregeling bruiloften.</p>
            </div>
            <div className="space-y-2">
              <Label>Versie</Label>
              <Input value={String(versie)} disabled className="w-20" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pa-titel">Titel</Label>
            <Input id="pa-titel" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Doorverwijsregeling bruiloften" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pa-ingang">Ingangsdatum</Label>
              <Input id="pa-ingang" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Geldt voor</Label>
              <Select value={appliesTo} onValueChange={(v) => setAppliesTo(v as AgreementAppliesTo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(APPLIES_TO_LABEL) as AgreementAppliesTo[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {APPLIES_TO_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pa-samenvatting">Wat is er veranderd (voor de partner)</Label>
            <Input id="pa-samenvatting" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Bijv. 'Staffel aangepast per 1 januari 2028'" />
          </div>

          <Tabs defaultValue="bewerken">
            <div className="flex items-center justify-between">
              <Label>Tekst van de afspraak</Label>
              <TabsList>
                <TabsTrigger value="bewerken">Bewerken</TabsTrigger>
                <TabsTrigger value="voorbeeld">Voorbeeld</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="bewerken" className="mt-2">
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={22} className="font-mono text-xs" />
              <p className="mt-1 text-xs text-muted-foreground">Markdown: `## Kop`, `**vet**`, lijsten met `-`, tabellen met `|`.</p>
            </TabsContent>
            <TabsContent value="voorbeeld" className="mt-2 rounded-md border p-4">
              {body.trim() ? <MarkdownText>{body}</MarkdownText> : <p className="text-sm text-muted-foreground">Nog geen tekst.</p>}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
              Annuleren
            </Button>
            <Button onClick={opslaan} disabled={save.isPending}>
              Opslaan als concept
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
