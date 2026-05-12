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
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {entity?.name ?? "Locatie bewerken"}
          </DialogTitle>
          {entity?.subtitle && (
            <DialogDescription className="text-sm">{entity.subtitle}</DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          {entity && (
            <LocationPicker
              key={entity.id}
              lat={lat}
              lng={lng}
              address={address}
              onChange={handleChange}
              mapHeightClass="h-[48vh] min-h-[320px]"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 border-t bg-muted/30 shrink-0">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onPrev} disabled={!hasPrev || saving}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Vorige
            </Button>
            <Button variant="outline" size="sm" onClick={onNext} disabled={!hasNext || saving}>
              Volgende <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleClose} disabled={saving}>
              <X className="h-4 w-4 mr-1" /> Annuleer
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Opslaan…" : "Opslaan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
