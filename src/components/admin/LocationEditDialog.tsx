import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LocationPicker } from "@/components/admin/LocationPicker";
import { ChevronLeft, ChevronRight, Save, X } from "lucide-react";

export interface LocationEntity {
  id: string;
  name: string;
  subtitle?: string | null;
  lat: number | null;
  lng: number | null;
  address: string;
}

interface Props {
  open: boolean;
  entity: LocationEntity | null;
  onClose: () => void;
  onSave: (entity: LocationEntity) => Promise<void> | void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export const LocationEditDialog = ({ open, entity, onClose, onSave, onPrev, onNext, hasPrev, hasNext }: Props) => {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (entity) {
      setLat(entity.lat);
      setLng(entity.lng);
      setAddress(entity.address || "");
      setDirty(false);
    }
  }, [entity?.id]);

  const handleChange = (newLat: number | null, newLng: number | null, newAddress: string) => {
    setLat(newLat);
    setLng(newLng);
    setAddress(newAddress);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!entity) return;
    setSaving(true);
    try {
      await onSave({ ...entity, lat, lng, address });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (dirty && !confirm("Niet-opgeslagen wijzigingen — sluiten zonder opslaan?")) return;
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="text-lg">{entity?.name ?? "Locatie bewerken"}</DialogTitle>
          {entity?.subtitle && (
            <DialogDescription>{entity.subtitle}</DialogDescription>
          )}
        </DialogHeader>

        <div className="px-6 py-5">
          {entity && (
            <LocationPicker
              key={entity.id}
              lat={lat}
              lng={lng}
              address={address}
              onChange={handleChange}
              mapHeightClass="h-[60vh] min-h-[420px]"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-t bg-muted/30">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onPrev} disabled={!hasPrev || saving}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Vorige
            </Button>
            <Button variant="outline" size="sm" onClick={onNext} disabled={!hasNext || saving}>
              Volgende <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleClose} disabled={saving}>
              <X className="h-4 w-4 mr-1" /> Annuleer
            </Button>
            <Button onClick={handleSave} disabled={saving || !dirty}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Opslaan…" : "Opslaan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
