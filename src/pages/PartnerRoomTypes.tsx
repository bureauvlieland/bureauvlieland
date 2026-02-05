import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, Pencil, Trash2, BedDouble, Package } from "lucide-react";
import { usePartnerRoomTypes, useDeletePartnerRoomType } from "@/hooks/usePartnerRoomTypes";
import { PartnerRoomTypeSheet } from "@/components/partner-portal/PartnerRoomTypeSheet";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { PartnerRoomType } from "@/types/partnerRoomTypes";
import { getFacilityLabel, getBedConfigLabel } from "@/types/partnerRoomTypes";

export default function PartnerRoomTypes() {
  const [searchParams] = useSearchParams();
  const impersonateId = searchParams.get("impersonate");
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedRoomType, setSelectedRoomType] = useState<PartnerRoomType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roomTypeToDelete, setRoomTypeToDelete] = useState<PartnerRoomType | null>(null);

  // Fetch partner ID
  const { data: partner, isLoading: partnerLoading } = useQuery({
    queryKey: ['current-partner', impersonateId],
    queryFn: async () => {
      if (impersonateId) {
        const { data } = await supabase
          .from('partners')
          .select('id, name, partner_type')
          .eq('id', impersonateId)
          .single();
        return data;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      
      const { data } = await supabase
        .from('partners')
        .select('id, name, partner_type')
        .eq('auth_user_id', session.user.id)
        .eq('is_active', true)
        .single();
      return data;
    },
  });

  const { data: roomTypes, isLoading: roomTypesLoading } = usePartnerRoomTypes(partner?.id);
  const deleteMutation = useDeletePartnerRoomType();

  const handleAdd = () => {
    setSelectedRoomType(null);
    setSheetOpen(true);
  };

  const handleEdit = (roomType: PartnerRoomType) => {
    setSelectedRoomType(roomType);
    setSheetOpen(true);
  };

  const handleDeleteClick = (roomType: PartnerRoomType) => {
    setRoomTypeToDelete(roomType);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (roomTypeToDelete && partner?.id) {
      deleteMutation.mutate({ id: roomTypeToDelete.id, partnerId: partner.id });
    }
    setDeleteDialogOpen(false);
    setRoomTypeToDelete(null);
  };

  const formatPrice = (price: number | null) => {
    if (!price) return null;
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const isLoading = partnerLoading || roomTypesLoading;

  return (
    <PartnerLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Kamersoorten</h1>
            <p className="text-muted-foreground">
              Beheer uw standaard kamersoorten voor logiesoffertes
            </p>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuw kamertype
          </Button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!roomTypes || roomTypes.length === 0) && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Nog geen kamersoorten opgeslagen
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Maak sjablonen aan voor uw kamersoorten. Deze kunt u hergebruiken
                bij het invullen van logiesoffertes.
              </p>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Eerste kamertype aanmaken
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Room types list */}
        {!isLoading && roomTypes && roomTypes.length > 0 && (
          <div className="space-y-4">
            {roomTypes.map((roomType) => (
              <Card key={roomType.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <BedDouble className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{roomType.name}</h3>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>
                            {[
                              roomType.size_sqm && `${roomType.size_sqm}m²`,
                              roomType.bed_configuration && getBedConfigLabel(roomType.bed_configuration),
                              `Max ${roomType.max_occupancy} personen`,
                            ].filter(Boolean).join(' • ')}
                          </p>
                          {roomType.price_per_night && (
                            <p className="font-medium text-foreground">
                              {formatPrice(roomType.price_per_night)} per nacht
                            </p>
                          )}
                          {roomType.facilities.length > 0 && (
                            <p className="text-xs">
                              {roomType.facilities.map(f => getFacilityLabel(f)).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(roomType)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(roomType)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Sheet for add/edit */}
        {partner?.id && (
          <PartnerRoomTypeSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            partnerId={partner.id}
            roomType={selectedRoomType}
          />
        )}

        {/* Delete confirmation dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kamertype verwijderen?</AlertDialogTitle>
              <AlertDialogDescription>
                Weet u zeker dat u "{roomTypeToDelete?.name}" wilt verwijderen?
                Dit kamertype is daarna niet meer beschikbaar voor nieuwe offertes.
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
      </div>
    </PartnerLayout>
  );
}
