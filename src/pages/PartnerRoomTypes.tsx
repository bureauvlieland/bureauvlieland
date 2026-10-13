import { useState } from "react";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerPage } from "@/components/partner-portal/PartnerPage";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/system";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BedDouble, DoorOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { usePartnerRoomTypes, useDeletePartnerRoomType } from "@/hooks/usePartnerRoomTypes";
import { PartnerRoomTypeSheet } from "@/components/partner-portal/PartnerRoomTypeSheet";
import { usePartnerPortal } from "@/hooks/usePartnerPortal";
import type { PartnerRoomType } from "@/types/partnerRoomTypes";
import { getBedConfigLabel, getFacilityLabel } from "@/types/partnerRoomTypes";
import { formatEuro } from "@/lib/formatEuro";

/**
 * Kamersoorten (partnerportaal fase 4): de sjablonen waarmee een partner
 * een logiesofferte in een paar klikken opbouwt. Eén lijst, `EmptyState`,
 * de sheet op `ResponsiveSheetContent`.
 */
const PartnerRoomTypesContent = () => {
  const { partner, isDemo } = usePartnerPortal();
  const partnerId = partner.id;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedRoomType, setSelectedRoomType] = useState<PartnerRoomType | null>(null);
  const [roomTypeToDelete, setRoomTypeToDelete] = useState<PartnerRoomType | null>(null);

  const { data: roomTypes = [], isLoading } = usePartnerRoomTypes(isDemo ? "" : partnerId);
  const deleteMutation = useDeletePartnerRoomType();

  const openSheet = (roomType: PartnerRoomType | null) => {
    setSelectedRoomType(roomType);
    setSheetOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (roomTypeToDelete) deleteMutation.mutate({ id: roomTypeToDelete.id, partnerId });
    setRoomTypeToDelete(null);
  };

  return (
    <PartnerPage
      title="Kamersoorten"
      icon={<DoorOpen />}
      size="content"
      description="Uw kamersoorten met prijs en bezetting; een offerte bouwt u hiermee in een paar klikken op."
      actions={
        <Button onClick={() => openSheet(null)} disabled={isDemo}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Nieuwe kamersoort
        </Button>
      }
    >
      {isLoading && !isDemo ? (
        <LoadingState label="Kamersoorten laden" />
      ) : roomTypes.length === 0 ? (
        <EmptyState
          icon={<DoorOpen />}
          title="Nog geen kamersoorten"
          description="Leg uw kamersoorten één keer vast; bij een offerte kiest u ze dan met één klik, met foto's en faciliteiten."
          action={
            <Button onClick={() => openSheet(null)} disabled={isDemo}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Eerste kamersoort toevoegen
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {roomTypes.map((roomType) => {
            const specs = [roomType.size_sqm ? `${roomType.size_sqm} m²` : null, roomType.bed_configuration ? getBedConfigLabel(roomType.bed_configuration) : null, `maximaal ${roomType.max_occupancy} personen`].filter(Boolean);
            return (
              <li key={roomType.id} className="flex items-start gap-4 rounded-lg border bg-card p-4">
                {roomType.images?.[0]?.url ? (
                  <img src={roomType.images[0].url} alt="" className="h-14 w-20 shrink-0 rounded-md bg-muted object-cover" />
                ) : (
                  <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <BedDouble className="h-6 w-6" aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium">{roomType.name}</h3>
                  <p className="text-sm text-muted-foreground">{specs.join(" · ")}</p>
                  {roomType.price_per_night ? (
                    <p className="mt-1 text-sm">
                      <span className="font-semibold">{formatEuro(roomType.price_per_night)}</span>
                      <span className="ml-1 text-xs text-muted-foreground">per nacht, {roomType.price_includes_vat ? "incl." : "excl."} btw</span>
                    </p>
                  ) : null}
                  {roomType.facilities.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{roomType.facilities.map((f) => getFacilityLabel(f)).join(", ")}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openSheet(roomType)} aria-label={`${roomType.name} bewerken`}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setRoomTypeToDelete(roomType)} aria-label={`${roomType.name} verwijderen`} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <PartnerRoomTypeSheet open={sheetOpen} onOpenChange={setSheetOpen} partnerId={partnerId} roomType={selectedRoomType} />

      <AlertDialog open={!!roomTypeToDelete} onOpenChange={(open) => !open && setRoomTypeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kamersoort verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>Weet u zeker dat u "{roomTypeToDelete?.name}" wilt verwijderen? Deze kamersoort is daarna niet meer te kiezen in nieuwe offertes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PartnerPage>
  );
};

const PartnerRoomTypes = () => (
  <PartnerLayout>
    <PartnerRoomTypesContent />
  </PartnerLayout>
);

export { PartnerRoomTypesContent };

export default PartnerRoomTypes;
