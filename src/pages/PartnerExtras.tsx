import { useState } from "react";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerPage } from "@/components/partner-portal/PartnerPage";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState, Pill } from "@/components/system";
import { Pencil, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePartnerPortal } from "@/hooks/usePartnerPortal";
import { usePartnerExtraPresets, useDeletePartnerExtraPreset } from "@/hooks/usePartnerExtraPresets";
import { PartnerExtraPresetSheet } from "@/components/partner-portal/PartnerExtraPresetSheet";
import { EXTRA_CATEGORY_LABELS, type ExtraCategory, type PartnerExtraPreset } from "@/types/accommodationExtras";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatEuro } from "@/lib/formatEuro";

/**
 * Logies-extra's (partnerportaal fase 4): de vaste extra's voor een
 * logiesofferte, per categorie onder een kop met een `Pill`-teller.
 */
const PartnerExtrasContent = () => {
  const { toast } = useToast();
  const { partner, isDemo } = usePartnerPortal();
  const partnerId = partner.id;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PartnerExtraPreset | null>(null);
  const [presetToDelete, setPresetToDelete] = useState<PartnerExtraPreset | null>(null);

  const { data: presets = [], isLoading } = usePartnerExtraPresets(isDemo ? undefined : partnerId);
  const deletePreset = useDeletePartnerExtraPreset();

  const openSheet = (preset: PartnerExtraPreset | null) => {
    setEditingPreset(preset);
    setSheetOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!presetToDelete) return;
    try {
      await deletePreset.mutateAsync(presetToDelete.id);
      toast({ title: "Extra verwijderd", description: `${presetToDelete.name} is verwijderd.` });
    } catch {
      toast({ title: "Extra niet verwijderd", description: "Kon de extra niet verwijderen.", variant: "destructive" });
    } finally {
      setPresetToDelete(null);
    }
  };

  const grouped = (Object.keys(EXTRA_CATEGORY_LABELS) as ExtraCategory[])
    .map((category) => ({ category, label: EXTRA_CATEGORY_LABELS[category], presets: presets.filter((p) => (p.category || "other") === category) }))
    .filter((g) => g.presets.length > 0);

  return (
    <PartnerPage
      title="Logies-extra's"
      icon={<UtensilsCrossed />}
      size="content"
      description="Uw vaste extra's voor logiesoffertes, zoals ontbijt, fietsen of een borrel bij aankomst."
      actions={
        <Button onClick={() => openSheet(null)} disabled={isDemo}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Nieuwe extra
        </Button>
      }
    >
      {isLoading && !isDemo ? (
        <LoadingState label="Extra's laden" />
      ) : presets.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed />}
          title="Nog geen extra's"
          description="Leg de diensten vast die u vaak bij een logiesofferte aanbiedt, zoals lunch, diner of parkeren."
          action={
            <Button onClick={() => openSheet(null)} disabled={isDemo}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Eerste extra toevoegen
            </Button>
          }
        />
      ) : (
        grouped.map((group) => (
          <section key={group.category} aria-labelledby={`extras-${group.category}`} className="space-y-3">
            <h2 id={`extras-${group.category}`} className="flex items-center gap-2 font-display text-xl font-medium">
              {group.label}
              <Pill tone="neutral">{group.presets.length}</Pill>
            </h2>
            <ul className="space-y-2">
              {group.presets.map((preset) => (
                <li key={preset.id} className="flex items-start gap-4 rounded-lg border bg-card p-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium">{preset.name}</h3>
                    {preset.description && <p className="text-sm text-muted-foreground">{preset.description}</p>}
                    <p className="mt-1 text-sm">
                      <span className="font-semibold">{formatEuro(preset.unit_price)}</span>
                      <span className="ml-1 text-xs text-muted-foreground">
                        {preset.pricing_type === "per_person" ? "per persoon" : "vast bedrag"}, {preset.price_includes_vat ? "incl." : "excl."} {preset.vat_rate}% btw
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openSheet(preset)} aria-label={`${preset.name} bewerken`}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setPresetToDelete(preset)} aria-label={`${preset.name} verwijderen`} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <PartnerExtraPresetSheet open={sheetOpen} onOpenChange={setSheetOpen} preset={editingPreset} partnerId={partnerId} />

      <AlertDialog open={!!presetToDelete} onOpenChange={(open) => !open && setPresetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Extra verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>Weet u zeker dat u "{presetToDelete?.name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteConfirm()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PartnerPage>
  );
};

const PartnerExtras = () => (
  <PartnerLayout>
    <PartnerExtrasContent />
  </PartnerLayout>
);

export { PartnerExtrasContent };

export default PartnerExtras;
