import { useState } from "react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeleteWeddingFeeSchedule, useSaveWeddingFeeSchedule, type FeeScheduleRow } from "@/hooks/useWeddingReferrals";
import { DEFAULT_FEE_TIERS, describeTier, normalizeTiers, validateTiers, type FeeTier } from "@/lib/weddingReferralFee";
import { formatEuro, toIsoDate } from "@/lib/weddingReferrals";

/**
 * Beheer van de staffel voor de doorverwijsvergoeding. Een staffel is na het
 * opslaan niet meer te wijzigen: een tariefwijziging is een nieuwe staffel
 * met een latere ingangsdatum, zodat eerdere doorverwijzingen hun bedrag
 * houden. Verwijderen kan alleen zolang er geen doorverwijzing aan hangt.
 */
interface Props {
  schedules: FeeScheduleRow[];
  /** Ids van staffels waar al een doorverwijzing aan hangt. */
  inUse: Set<string>;
}

interface NieuweStaffel {
  effective_from: string;
  tiers: { max_guests: string; fee: string }[];
  multi_day_surcharge: string;
  note: string;
}

const vanTiers = (tiers: FeeTier[]) => tiers.map((t) => ({ max_guests: t.max_guests === null ? "" : String(t.max_guests), fee: String(t.fee) }));

export function WeddingReferralFeeSchedulesCard({ schedules, inUse }: Props) {
  const save = useSaveWeddingFeeSchedule();
  const verwijder = useDeleteWeddingFeeSchedule();
  const [open, setOpen] = useState(false);
  const laatste = schedules[0];
  const [nieuw, setNieuw] = useState<NieuweStaffel>(() => ({
    effective_from: toIsoDate(new Date()),
    tiers: vanTiers(laatste ? normalizeTiers(laatste.tiers) : DEFAULT_FEE_TIERS),
    multi_day_surcharge: laatste ? String(laatste.multi_day_surcharge) : "250",
    note: "",
  }));

  const start = () => {
    setNieuw({
      effective_from: toIsoDate(new Date()),
      tiers: vanTiers(laatste ? normalizeTiers(laatste.tiers) : DEFAULT_FEE_TIERS),
      multi_day_surcharge: laatste ? String(laatste.multi_day_surcharge) : "250",
      note: "",
    });
    setOpen(true);
  };

  const zetTrede = (i: number, patch: Partial<{ max_guests: string; fee: string }>) =>
    setNieuw((n) => ({ ...n, tiers: n.tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) }));

  const opslaan = () => {
    const tiers = normalizeTiers(
      nieuw.tiers.map((t) => ({ max_guests: t.max_guests.trim() === "" ? null : Number(t.max_guests), fee: Number(t.fee.replace(",", ".")) })),
    );
    const problemen = validateTiers(tiers);
    if (nieuw.tiers.some((t) => t.fee.trim() === "" || !Number.isFinite(Number(t.fee.replace(",", "."))))) problemen.unshift("Elke trede heeft een bedrag nodig.");
    if (!nieuw.effective_from) problemen.unshift("Kies een ingangsdatum.");
    if (schedules.some((s) => s.effective_from === nieuw.effective_from)) problemen.unshift("Er is al een staffel met deze ingangsdatum.");
    const toeslag = Number(nieuw.multi_day_surcharge.replace(",", "."));
    if (!Number.isFinite(toeslag) || toeslag < 0) problemen.push("De toeslag voor meerdaags moet een bedrag zijn (0 mag).");
    if (problemen.length) {
      toast.error(problemen[0]);
      return;
    }
    save.mutate(
      { effective_from: nieuw.effective_from, tiers: tiers as unknown as FeeScheduleRow["tiers"], multi_day_surcharge: toeslag, note: nieuw.note.trim() },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base">Staffel doorverwijsvergoeding</CardTitle>
          <CardDescription>
            Bedragen excl. btw, op aantal daggasten, plus een toeslag voor een meerdaagse bruiloft. Welke staffel geldt, bepaalt de datum doorverwezen. Een
            wijziging is een nieuwe staffel met een latere ingangsdatum; eerder vastgelegde vergoedingen veranderen niet.
          </CardDescription>
        </div>
        {!open && (
          <Button size="sm" variant="outline" onClick={start}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Nieuwe staffel
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {open && (
          <div className="space-y-4 rounded-md border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="staffel-ingang">Ingangsdatum</Label>
                <Input id="staffel-ingang" type="date" value={nieuw.effective_from} onChange={(e) => setNieuw((n) => ({ ...n, effective_from: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staffel-toeslag">Toeslag meerdaags (excl. btw)</Label>
                <Input id="staffel-toeslag" type="number" step="0.01" min={0} value={nieuw.multi_day_surcharge} onChange={(e) => setNieuw((n) => ({ ...n, multi_day_surcharge: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Treden</Label>
              <div className="rounded-md border">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
                  <span>Tot en met … daggasten (leeg = alles daarboven)</span>
                  <span>Bedrag excl. btw</span>
                  <span />
                </div>
                {nieuw.tiers.map((t, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 border-t px-3 py-2">
                    <Input type="number" min={0} value={t.max_guests} placeholder="open" onChange={(e) => zetTrede(i, { max_guests: e.target.value })} aria-label={`Bovengrens trede ${i + 1}`} />
                    <Input type="number" step="0.01" min={0} value={t.fee} onChange={(e) => zetTrede(i, { fee: e.target.value })} aria-label={`Bedrag trede ${i + 1}`} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setNieuw((n) => ({ ...n, tiers: n.tiers.filter((_, idx) => idx !== i) }))} aria-label="Trede verwijderen">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setNieuw((n) => ({ ...n, tiers: [...n.tiers, { max_guests: "", fee: "" }] }))}>
                <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                Trede toevoegen
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffel-toelichting">Toelichting</Label>
              <Input id="staffel-toelichting" value={nieuw.note} onChange={(e) => setNieuw((n) => ({ ...n, note: e.target.value }))} placeholder="Bijv. afspraak met partners najaar 2027" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={save.isPending}>
                Annuleren
              </Button>
              <Button onClick={opslaan} disabled={save.isPending}>
                Staffel opslaan
              </Button>
            </div>
          </div>
        )}

        {schedules.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nog geen staffel. Zonder staffel kan een doorverwijzing niet op "geboekt".</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingangsdatum</TableHead>
                <TableHead>Treden</TableHead>
                <TableHead className="text-right">Toeslag meerdaags</TableHead>
                <TableHead>Toelichting</TableHead>
                <TableHead className="text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((s, idx) => {
                const tiers = normalizeTiers(s.tiers);
                const geldtNu = idx === 0 || false;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(parseISO(s.effective_from), "d MMM yyyy", { locale: nl })}
                      {geldtNu && s.effective_from <= toIsoDate(new Date()) && <span className="ml-2 text-xs text-muted-foreground">(huidig)</span>}
                      {s.effective_from > toIsoDate(new Date()) && <span className="ml-2 text-xs text-muted-foreground">(toekomstig)</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {tiers.map((t, i) => (
                        <div key={i} className="whitespace-nowrap">
                          {describeTier(tiers, i)} gasten: {formatEuro(t.fee)}
                        </div>
                      ))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatEuro(Number(s.multi_day_surcharge))}</TableCell>
                    <TableCell className="max-w-[280px] text-sm text-muted-foreground">{s.note}</TableCell>
                    <TableCell className="text-right">
                      {inUse.has(s.id) ? (
                        <span className="text-xs text-muted-foreground">In gebruik</span>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => verwijder.mutate(s.id)} disabled={verwijder.isPending}>
                          Verwijderen
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
