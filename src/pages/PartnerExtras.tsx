import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerExtraPresets, useDeletePartnerExtraPreset } from "@/hooks/usePartnerExtraPresets";
import { PartnerExtraPresetSheet } from "@/components/partner-portal/PartnerExtraPresetSheet";
import { EXTRA_CATEGORY_LABELS, EXTRA_CATEGORY_ICONS, type PartnerExtraPreset, type ExtraCategory } from "@/types/accommodationExtras";
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

const PartnerExtras = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PartnerExtraPreset | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<PartnerExtraPreset | null>(null);

  const { data: presets, isLoading: presetsLoading } = usePartnerExtraPresets(partnerId ?? undefined);
  const deletePreset = useDeletePartnerExtraPreset();

  useEffect(() => {
    const fetchPartnerId = async () => {
      const impersonateId = searchParams.get("impersonate");
      
      if (impersonateId) {
        setPartnerId(impersonateId);
        setIsLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: partner } = await supabase
          .from("partners")
          .select("id")
          .eq("auth_user_id", session.user.id)
          .single();
        
        if (partner) {
          setPartnerId(partner.id);
        }
      }
      setIsLoading(false);
    };

    fetchPartnerId();
  }, [searchParams]);

  const handleAddNew = () => {
    setEditingPreset(null);
    setSheetOpen(true);
  };

  const handleEdit = (preset: PartnerExtraPreset) => {
    setEditingPreset(preset);
    setSheetOpen(true);
  };

  const handleDeleteClick = (preset: PartnerExtraPreset) => {
    setPresetToDelete(preset);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!presetToDelete) return;

    try {
      await deletePreset.mutateAsync(presetToDelete.id);
      toast({
        title: "Extra verwijderd",
        description: `${presetToDelete.name} is verwijderd.`,
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon de extra niet verwijderen.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setPresetToDelete(null);
    }
  };

  // Group presets by category
  const groupedPresets = presets?.reduce((acc, preset) => {
    const category = preset.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(preset);
    return acc;
  }, {} as Record<string, PartnerExtraPreset[]>) || {};

  const formatPrice = (price: number, pricingType: string) => {
    const formatted = new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
    return `${formatted} ${pricingType === 'per_person' ? 'per persoon' : 'vast bedrag'}`;
  };

  if (isLoading) {
    return (
      <PartnerLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PartnerLayout>
    );
  }

  return (
    <PartnerLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Extra's</h1>
            <p className="text-muted-foreground">
              Beheer uw standaard extra diensten voor logiesoffertes
            </p>
          </div>
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Extra
          </Button>
        </div>

        {/* Content */}
        {presetsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : presets && presets.length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedPresets).map(([category, categoryPresets]) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>{EXTRA_CATEGORY_ICONS[category as ExtraCategory] || '📦'}</span>
                    <span>{EXTRA_CATEGORY_LABELS[category as ExtraCategory] || 'Overig'}</span>
                    <Badge variant="secondary" className="ml-2">
                      {categoryPresets.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {categoryPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{preset.name}</p>
                        {preset.description && (
                          <p className="text-sm text-muted-foreground break-words whitespace-normal">
                            {preset.description}
                          </p>
                        )}
                        <p className="text-sm text-primary font-medium mt-1">
                          {formatPrice(preset.unit_price, preset.pricing_type)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(preset)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(preset)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Empty state */
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nog geen extra's opgeslagen</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Maak sjablonen aan voor diensten die u vaak toevoegt aan uw logiesoffertes, 
                zoals lunch, diner of parkeren.
              </p>
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Eerste extra aanmaken
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit/Add Sheet */}
      <PartnerExtraPresetSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        preset={editingPreset}
        partnerId={partnerId ?? ""}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Extra verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u "{presetToDelete?.name}" wilt verwijderen? 
              Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PartnerLayout>
  );
};

export default PartnerExtras;
