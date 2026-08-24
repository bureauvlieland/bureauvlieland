import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Euro, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePricingStructures } from "@/hooks/usePricing";
import { computeProjectFees } from "@/lib/feeEngine";
import {
  PRICING_STRUCTURE_DESCRIPTIONS,
  type CoordinationTier,
  type FeeStructureSet,
} from "@/types/pricing";

const euro = (n: number) =>
  n.toLocaleString("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Beheer van de actieve prijsstructuur (organisatiefee 2.0). Een wijziging wordt
 * opgeslagen met een ingangsdatum; bestaande projecten houden hun snapshot en
 * veranderen dus niet van bedrag.
 */
export const PricingStructurePanel = () => {
  const queryClient = useQueryClient();
  const { activeStructure, isLoading } = usePricingStructures();

  const [draft, setDraft] = useState<FeeStructureSet | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState(todayISO());
  const [previewPeople, setPreviewPeople] = useState(45);
  const [previewDays, setPreviewDays] = useState(2);
  const [previewPartnerCosts, setPreviewPartnerCosts] = useState(5000);

  const structure = draft ?? activeStructure;
  const tiers: CoordinationTier[] = useMemo(
    () => structure.coordination_fee.tiers ?? [],
    [structure],
  );

  const edit = (patch: (s: FeeStructureSet) => FeeStructureSet) =>
    setDraft(patch(structure));

  const setTiers = (next: CoordinationTier[]) =>
    edit((s) => ({ ...s, coordination_fee: { ...s.coordination_fee, tiers: next } }));

  const preview = computeProjectFees({
    structure,
    numberOfPeople: previewPeople,
    numberOfDays: previewDays,
    isBureauCentral: true,
    partnerCostsTotal: previewPartnerCosts,
    revisionFeesTotal: 0,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      const rows = [
        { key: "coordination_fee", label: "Organisatiefee staffels", value: draft.coordination_fee },
        { key: "revision_fee", label: "Wijzigingsfee per ronde", value: draft.revision_fee },
        { key: "rush_surcharge", label: "Spoedtoeslag", value: draft.rush_surcharge },
        {
          key: "central_invoicing_surcharge",
          label: "Opslag centrale facturatie",
          value: draft.central_invoicing_surcharge,
        },
      ];
      for (const row of rows) {
        const { error } = await supabase
          .from("pricing_structures")
          .upsert(
            {
              key: row.key,
              label: row.label,
              value: row.value as never,
              effective_from: effectiveFrom,
            } as never,
            { onConflict: "key,effective_from" },
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-structures"] });
      setDraft(null);
      toast.success("Prijsstructuur opgeslagen — geldt voor nieuwe projecten");
    },
    onError: (e) => {
      console.error(e);
      toast.error("Kon prijsstructuur niet opslaan");
    },
  });

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Euro className="h-5 w-5" />
          Organisatiefee &amp; toeslagen
          {draft && <Badge variant="secondary">Niet opgeslagen wijzigingen</Badge>}
        </CardTitle>
        <CardDescription>
          Deze structuur geldt alleen voor <strong>nieuwe</strong> projecten vanaf de ingangsdatum.
          Lopende offertes en facturen houden de structuur die bij aanmaak is vastgelegd.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Staffels */}
        <div className="space-y-3">
          <div>
            <Label className="text-base font-medium">Organisatiefee per groepsgrootte</Label>
            <p className="text-sm text-muted-foreground">
              {PRICING_STRUCTURE_DESCRIPTIONS.coordination_fee}
            </p>
          </div>
          <div className="rounded-lg border">
            <div className="grid grid-cols-[1fr_1fr_1.5fr_auto] gap-2 px-3 py-2 bg-muted/50 text-xs font-medium">
              <span>Vanaf (pers.)</span>
              <span>T/m (pers.)</span>
              <span>Basisbedrag dag 1 (€, incl. BTW)</span>
              <span className="w-8" />
            </div>
            {tiers.map((tier, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_1.5fr_auto] gap-2 px-3 py-2 border-t items-center">
                <Input
                  type="number"
                  min={0}
                  value={tier.min_people}
                  onChange={(e) =>
                    setTiers(tiers.map((t, i) => (i === idx ? { ...t, min_people: Number(e.target.value) || 0 } : t)))
                  }
                />
                <Input
                  type="number"
                  min={0}
                  value={tier.max_people}
                  onChange={(e) =>
                    setTiers(tiers.map((t, i) => (i === idx ? { ...t, max_people: Number(e.target.value) || 0 } : t)))
                  }
                />
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={tier.base}
                  onChange={(e) =>
                    setTiers(tiers.map((t, i) => (i === idx ? { ...t, base: Number(e.target.value) || 0 } : t)))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setTiers(tiers.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const last = tiers[tiers.length - 1];
              const nextMin = last ? last.max_people + 1 : 1;
              setTiers([...tiers, { min_people: nextMin, max_people: nextMin + 9, base: 0 }]);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Staffel toevoegen
          </Button>

          <div className="max-w-xs space-y-1">
            <Label className="text-xs">Extra programmadag (% van basisbedrag)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={structure.coordination_fee.extra_day_pct}
              onChange={(e) =>
                edit((s) => ({
                  ...s,
                  coordination_fee: { ...s.coordination_fee, extra_day_pct: Number(e.target.value) || 0 },
                }))
              }
            />
          </div>
        </div>

        <Separator />

        {/* Overige fees */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Wijzigingsfee per ronde (€)</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={structure.revision_fee.amount}
              onChange={(e) =>
                edit((s) => ({ ...s, revision_fee: { amount: Number(e.target.value) || 0 } }))
              }
            />
            <p className="text-xs text-muted-foreground">{PRICING_STRUCTURE_DESCRIPTIONS.revision_fee}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Spoedtoeslag (%)</Label>
              <Input
                type="number"
                min={0}
                value={structure.rush_surcharge.pct}
                onChange={(e) =>
                  edit((s) => ({
                    ...s,
                    rush_surcharge: { ...s.rush_surcharge, pct: Number(e.target.value) || 0 },
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Binnen (weken)</Label>
              <Input
                type="number"
                min={0}
                value={structure.rush_surcharge.weeks}
                onChange={(e) =>
                  edit((s) => ({
                    ...s,
                    rush_surcharge: { ...s.rush_surcharge, weeks: Number(e.target.value) || 0 },
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Opslag centrale facturatie (% partnerkosten)</Label>
            <Input
              type="number"
              step="0.1"
              min={0}
              value={structure.central_invoicing_surcharge.pct ?? 0}
              onChange={(e) =>
                edit((s) => ({
                  ...s,
                  central_invoicing_surcharge: {
                    ...s.central_invoicing_surcharge,
                    mode: "percentage",
                    pct: Number(e.target.value) || 0,
                  },
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              {PRICING_STRUCTURE_DESCRIPTIONS.central_invoicing_surcharge}
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Minimum opslag per project (€)</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={structure.central_invoicing_surcharge.minimum ?? 0}
              onChange={(e) =>
                edit((s) => ({
                  ...s,
                  central_invoicing_surcharge: {
                    ...s.central_invoicing_surcharge,
                    mode: "percentage",
                    minimum: Number(e.target.value) || 0,
                  },
                }))
              }
            />
          </div>
        </div>

        <Separator />

        {/* Live preview */}
        <div className="rounded-md border p-3 bg-muted/30 space-y-3">
          <Label className="text-xs">Rekenvoorbeeld</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Personen</Label>
              <Input type="number" min={1} value={previewPeople} onChange={(e) => setPreviewPeople(Number(e.target.value) || 1)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Programmadagen</Label>
              <Input type="number" min={1} value={previewDays} onChange={(e) => setPreviewDays(Number(e.target.value) || 1)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Partnerkosten (€)</Label>
              <Input type="number" min={0} value={previewPartnerCosts} onChange={(e) => setPreviewPartnerCosts(Number(e.target.value) || 0)} />
            </div>
          </div>
          <ul className="space-y-1 text-sm">
            {preview.explanations.map((line, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {line.label} <span className="text-xs">({line.formula})</span>
                </span>
                <span className="font-medium tabular-nums">{euro(line.amount)}</span>
              </li>
            ))}
            <li className="flex justify-between gap-4 border-t pt-1 font-semibold">
              <span>Totaal bureaukosten (incl. BTW)</span>
              <span className="tabular-nums">{euro(preview.standardVatFeeTotal)}</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Ingangsdatum</Label>
            <Input
              type="date"
              className="w-44"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </div>
          <Button onClick={() => save.mutate()} disabled={!draft || save.isPending}>
            <Save className="h-4 w-4 mr-1" /> Opslaan
          </Button>
          {draft && (
            <Button variant="outline" onClick={() => setDraft(null)}>
              Annuleren
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
