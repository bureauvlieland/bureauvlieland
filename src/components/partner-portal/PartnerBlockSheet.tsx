import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMapActivityTypes } from "@/hooks/useMapActivities";
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { FormField, Notice, Pill, ResponsiveSheetContent } from "@/components/system";
import { useToast } from "@/hooks/use-toast";
import { Euro, ImageIcon, Loader2 } from "lucide-react";
import type { PartnerBuildingBlock } from "@/types/partner";
import { LocationPicker } from "@/components/admin/LocationPicker";
import { TierEditor } from "@/components/admin/TierEditor";
import { getTieredConfig, validateTiers, type PriceTier, type TiersAboveMax } from "@/lib/tieredPricing";
import type { Json } from "@/integrations/supabase/types";
import { partnerBlockStatus } from "@/lib/partnerBlockStatus";
import { reportError } from "@/lib/errorReporting";
import { SheetSection, selectClass } from "./SheetSection";

/**
 * De sheet van één stuk aanbod (partnerportaal fase 4): kop met de status
 * als `Pill`, de velden in secties (Algemeen, Prijs, Locatie, Foto) op
 * `FormField` in plaats van vier tabs, wat er speelt als `Notice`, en een
 * vaste voet met één primaire knop. Op een telefoon van onderen.
 */
const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);

type BlockCategory = "outdoor" | "excursies" | "entertainment" | "locaties" | "catering" | "vervoer" | "services" | "overig" | "activiteiten";

const CATEGORY_OPTIONS: { value: BlockCategory; label: string }[] = [
  { value: "outdoor", label: "Outdoor en sport" },
  { value: "excursies", label: "Excursies" },
  { value: "entertainment", label: "Entertainment" },
  { value: "locaties", label: "Locaties" },
  { value: "catering", label: "Catering" },
  { value: "vervoer", label: "Vervoer" },
  { value: "services", label: "Services" },
  { value: "overig", label: "Overig" },
  { value: "activiteiten", label: "Activiteiten" },
];

const PRICE_TYPES = [
  { value: "per_person", label: "Per persoon" },
  { value: "per_person_per_day", label: "Per persoon per dag" },
  { value: "total", label: "Totaalprijs" },
  { value: "tiered_total", label: "Staffel op groepsgrootte" },
  { value: "on_request", label: "Op aanvraag" },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;

interface ImageValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

export interface PrefillFromMap {
  map_activity_type_id: number;
  name: string;
  description: string | null;
  duration_hours: number | null;
  price_per_person: number | null;
  max_persons: number | null;
  external_url: string | null;
  image_ref: string | null;
}

interface PartnerBlockSheetProps {
  isOpen: boolean;
  onClose: () => void;
  block: PartnerBuildingBlock | null;
  isNew: boolean;
  partnerId: string;
  onSaved: () => void;
  prefillFromMap?: PrefillFromMap | null;
  /** MAP-omgeving van de partner; met slug kan de partner een MAP-activiteit aan dit aanbod koppelen. */
  mapTenantSlug?: string | null;
}

const validateImageFile = (file: File): Promise<ImageValidationResult> =>
  new Promise((resolve) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      resolve({ valid: false, error: "Ongeldig bestandstype. Gebruik jpg, png of webp." });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      resolve({ valid: false, error: `Het bestand is te groot (maximaal ${MAX_FILE_SIZE / 1024 / 1024} MB).` });
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) {
        resolve({ valid: false, error: `De foto is te klein. Minimaal ${MIN_WIDTH} bij ${MIN_HEIGHT} pixels.` });
        return;
      }
      if (img.height > img.width) {
        resolve({ valid: true, warning: "Een liggende foto werkt beter op de site." });
        return;
      }
      resolve({ valid: true });
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve({ valid: false, error: "Kon de foto niet laden. Probeer een ander bestand." });
    };
    img.src = URL.createObjectURL(file);
  });

interface FormData {
  name: string;
  short_description: string;
  description: string;
  category: BlockCategory;
  duration: string;
  price_adult: string;
  price_adult_note: string;
  price_type: string;
  price_child: string;
  price_child_note: string;
  price_child_min_age: string;
  price_child_max_age: string;
  price_pet: string;
  price_pet_note: string;
  is_from_price: boolean;
  price_includes_vat: boolean;
  vat_rate: string;
  min_people: string;
  max_people: string;
  seasonal_notes: string;
  tags: string;
  image_url: string;
  location_lat: string;
  location_lng: string;
  location_address: string;
  external_url: string;
  price_display_override: string;
  sort_order: string;
  /** MAP ActivityTypeId als tekst; "" = niet gekoppeld */
  map_activity_type_id: string;
}

const getInitialFormData = (block: PartnerBuildingBlock | null): FormData => ({
  name: block?.name || "",
  short_description: block?.short_description || "",
  description: block?.description || "",
  category: (block?.category as BlockCategory) || "outdoor",
  duration: block?.duration || "",
  price_adult: block?.price_adult?.toString() || "",
  price_adult_note: block?.price_adult_note || "",
  price_type: block?.price_type || "per_person",
  price_child: block?.price_child?.toString() || "",
  price_child_note: block?.price_child_note || "",
  price_child_min_age: block?.price_child_min_age?.toString() || "4",
  price_child_max_age: block?.price_child_max_age?.toString() || "12",
  price_pet: block?.price_pet?.toString() || "",
  price_pet_note: block?.price_pet_note || "",
  is_from_price: block?.is_from_price ?? false,
  price_includes_vat: block?.price_includes_vat ?? true,
  vat_rate: block?.vat_rate?.toString() || "21",
  min_people: block?.min_people?.toString() || "",
  max_people: block?.max_people?.toString() || "",
  seasonal_notes: block?.seasonal_notes || "",
  tags: block?.tags?.join(", ") || "",
  image_url: block?.image_url || "",
  location_lat: block?.location_lat?.toString() || "",
  location_lng: block?.location_lng?.toString() || "",
  location_address: block?.location_address || "",
  external_url: block?.external_url || "",
  price_display_override: block?.price_display_override || "",
  sort_order: block?.sort_order?.toString() || "0",
  map_activity_type_id: block?.map_activity_type_id != null ? String(block.map_activity_type_id) : "",
});

export const PartnerBlockSheet = ({ isOpen, onClose, block, isNew, partnerId, onSaved, prefillFromMap, mapTenantSlug }: PartnerBlockSheetProps) => {
  const { data: mapTypes = [], isLoading: isLoadingMapTypes } = useMapActivityTypes(mapTenantSlug ?? null, !!mapTenantSlug && isOpen);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageValidation, setImageValidation] = useState<ImageValidationResult | null>(null);
  const [errors, setErrors] = useState<{ name?: string; tiers?: string }>({});
  const [formData, setFormData] = useState<FormData>(getInitialFormData(null));
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [tiersAboveMax, setTiersAboveMax] = useState<TiersAboveMax>("highest");

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => setFormData((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!isOpen) return;
    const initial = getInitialFormData(block);
    const cfg = getTieredConfig(block ?? { price_extras: null });
    setTiers(cfg.tiers);
    setTiersAboveMax(cfg.tiers_above_max ?? "highest");
    if (isNew && prefillFromMap) {
      initial.name = prefillFromMap.name || "";
      initial.description = prefillFromMap.description || "";
      initial.short_description = prefillFromMap.description?.slice(0, 200) || "";
      if (prefillFromMap.duration_hours != null) initial.duration = `${prefillFromMap.duration_hours} uur`;
      if (prefillFromMap.price_per_person != null) {
        initial.price_adult = prefillFromMap.price_per_person.toString();
        initial.price_type = "per_person";
      }
      if (prefillFromMap.max_persons != null && prefillFromMap.max_persons > 0) initial.max_people = prefillFromMap.max_persons.toString();
      if (prefillFromMap.external_url) initial.external_url = prefillFromMap.external_url;
      initial.category = "activiteiten";
      initial.vat_rate = "21";
    }
    setFormData(initial);
    setImagePreview(block?.image_url || null);
    setImageValidation(null);
    setErrors({});
  }, [block, isOpen, isNew, prefillFromMap]);

  const handleImageUpload = async (file: File) => {
    const blockId = block?.id;
    if (!blockId) return;
    setIsUploading(true);
    setUploadProgress(10);
    const validation = await validateImageFile(file);
    setImageValidation(validation);
    if (!validation.valid) {
      setIsUploading(false);
      setUploadProgress(0);
      return;
    }
    setUploadProgress(30);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${blockId}.${fileExt}`;
      setUploadProgress(50);
      const { error: uploadError } = await supabase.storage.from("building-block-images").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      setUploadProgress(80);
      const { data: urlData } = supabase.storage.from("building-block-images").getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      const { error: updateError } = await supabase.from("building_blocks").update({ image_url: publicUrl }).eq("id", blockId);
      if (updateError) throw updateError;
      setUploadProgress(100);
      set("image_url", publicUrl);
      setImagePreview(publicUrl);
      toast({ title: "Foto opgeslagen", description: validation.warning });
    } catch (error) {
      reportError(error, { where: "PartnerBlockSheet: Error uploading image" });
      setImageValidation({ valid: false, error: "De upload is mislukt. Probeer het opnieuw." });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: { name?: string; tiers?: string } = {};
    if (!formData.name.trim()) next.name = "Geef de activiteit een naam.";

    // Staffels valideren vóórdat we opslaan.
    let priceExtras: Record<string, unknown> | undefined;
    if (formData.price_type === "tiered_total") {
      const err = validateTiers(tiers);
      if (err) next.tiers = err;
      const base = (block?.price_extras ?? {}) as Record<string, unknown>;
      priceExtras = { ...base, tiers, tiers_above_max: tiersAboveMax };
    } else if (block?.price_extras) {
      // Staffelgegevens weghalen bij het wisselen naar een ander prijstype.
      const { tiers: _t, tiers_above_max: _a, ...rest } = block.price_extras as Record<string, unknown>;
      priceExtras = rest;
    }
    setErrors(next);
    if (next.name || next.tiers) return;

    setIsSubmitting(true);
    const tagsArray = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      const blockData = {
        name: formData.name.trim(),
        short_description: formData.short_description.trim() || null,
        description: formData.description.trim() || null,
        category: formData.category,
        duration: formData.duration.trim() || null,
        price_adult: formData.price_adult ? parseFloat(formData.price_adult) : null,
        price_adult_note: formData.price_adult_note.trim() || null,
        price_type: formData.price_type as "per_person" | "per_person_per_day" | "total" | "on_request" | "tiered_total",
        ...(priceExtras !== undefined ? { price_extras: priceExtras as Json } : {}),
        price_child: formData.price_child ? parseFloat(formData.price_child) : null,
        price_child_note: formData.price_child_note.trim() || null,
        price_child_min_age: formData.price_child_min_age ? parseInt(formData.price_child_min_age, 10) : 4,
        price_child_max_age: formData.price_child_max_age ? parseInt(formData.price_child_max_age, 10) : 12,
        price_pet: formData.price_pet ? parseFloat(formData.price_pet) : null,
        price_pet_note: formData.price_pet_note.trim() || null,
        is_from_price: formData.is_from_price,
        price_includes_vat: formData.price_includes_vat,
        price_display_override: formData.price_display_override.trim() || null,
        vat_rate: formData.vat_rate ? parseFloat(formData.vat_rate) : 21,
        min_people: formData.min_people ? parseInt(formData.min_people, 10) : null,
        max_people: formData.max_people ? parseInt(formData.max_people, 10) : null,
        seasonal_notes: formData.seasonal_notes.trim() || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        location_lat: formData.location_lat ? parseFloat(formData.location_lat) : null,
        location_lng: formData.location_lng ? parseFloat(formData.location_lng) : null,
        location_address: formData.location_address.trim() || null,
        external_url: formData.external_url.trim() || null,
        sort_order: formData.sort_order ? parseInt(formData.sort_order, 10) : 0,
        // Koppeling met MijnActiviteitenplanner: direct boekbaar en 's nachts gesynchroniseerd (foto, tekst, duur).
        map_activity_type_id: formData.map_activity_type_id ? Number(formData.map_activity_type_id) : null,
        provider_id: partnerId,
        block_type: "partner" as const,
        is_published: false, // Nieuw aanbod wacht altijd op goedkeuring van het bureau.
        is_active: true,
      };

      if (isNew) {
        const blockId = slugify(formData.name) || `partner-${Date.now()}`;
        const { error } = await supabase.from("building_blocks").insert({
          id: blockId,
          ...blockData,
          ...(prefillFromMap && !blockData.map_activity_type_id ? { map_activity_type_id: prefillFromMap.map_activity_type_id } : {}),
        });
        if (error) throw error;
        if (prefillFromMap?.image_ref) {
          try {
            await supabase.functions.invoke("import-map-image", { body: { blockId, mapImageRef: prefillFromMap.image_ref } });
          } catch (imgErr) {
            reportError(imgErr, { where: "PartnerBlockSheet: MAP image import failed" });
          }
        }
        toast({ title: "Voorstel ingediend", description: "Bureau Vlieland beoordeelt uw activiteit en laat het u weten." });
      } else if (block) {
        // Bestaand aanbod: alles behalve de publicatiestatus is van de partner.
        const { provider_id: _pid, block_type: _bt, is_published: _ip, is_active: _ia, ...updateData } = blockData;
        const { error } = await supabase.from("building_blocks").update(updateData).eq("id", block.id);
        if (error) throw error;
        toast({ title: "Wijzigingen opgeslagen" });
      }
      onSaved();
    } catch (error) {
      reportError(error, { where: "PartnerBlockSheet: Error saving block" });
      toast({ title: "Wijzigingen niet opgeslagen", description: "Kon de wijzigingen niet opslaan. Probeer het opnieuw.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const status = block ? partnerBlockStatus(block.status) : null;
  const showsPrice = formData.price_type !== "on_request" && formData.price_type !== "tiered_total";
  const perPerson = formData.price_type === "per_person";

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <ResponsiveSheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="space-y-1 border-b px-6 py-4 text-left">
          <SheetTitle className="font-display text-display-md font-medium leading-tight">{isNew ? "Nieuwe activiteit" : block?.name}</SheetTitle>
          {status && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Pill tone={status.tone} title={status.hint}>
                {status.label}
              </Pill>
            </div>
          )}
          <SheetDescription>{isNew ? "Bureau Vlieland beoordeelt uw voorstel en zet het daarna in de programma's." : "Pas de gegevens van deze activiteit aan."}</SheetDescription>
        </SheetHeader>

        <form id="aanbod-formulier" onSubmit={(e) => void handleSubmit(e)} className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
          {block?.is_published && (
            <Notice tone="warning" title="Deze activiteit staat op de site">
              <p>Wijzigingen zijn direct zichtbaar voor klanten.</p>
            </Notice>
          )}

          <SheetSection title="Algemeen">
            <FormField label="Naam" htmlFor="aanbod-naam" required error={errors.name} help={isNew && formData.name.trim() ? `Kenmerk: ${slugify(formData.name)}` : undefined}>
              <Input
                value={formData.name}
                onChange={(e) => {
                  set("name", e.target.value);
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="Bijvoorbeeld Zeehondentocht"
              />
            </FormField>
            <FormField label="Categorie" htmlFor="aanbod-categorie" required>
              <select className={selectClass} value={formData.category} onChange={(e) => set("category", e.target.value as BlockCategory)}>
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Korte beschrijving" htmlFor="aanbod-kort" help={`${formData.short_description.length} van 150 tekens; voor overzichten.`}>
              <Input value={formData.short_description} onChange={(e) => set("short_description", e.target.value)} maxLength={150} />
            </FormField>
            <FormField label="Beschrijving" htmlFor="aanbod-beschrijving">
              <Textarea value={formData.description} onChange={(e) => set("description", e.target.value)} placeholder="Wat doet de groep, wat maakt het bijzonder?" rows={4} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Duur" htmlFor="aanbod-duur">
                <Input value={formData.duration} onChange={(e) => set("duration", e.target.value)} placeholder="2 tot 3 uur" />
              </FormField>
              <FormField label="Minimaal personen" htmlFor="aanbod-min">
                <Input type="number" min="1" value={formData.min_people} onChange={(e) => set("min_people", e.target.value)} placeholder="10" />
              </FormField>
              <FormField label="Maximaal personen" htmlFor="aanbod-max">
                <Input type="number" min="1" value={formData.max_people} onChange={(e) => set("max_people", e.target.value)} placeholder="40" />
              </FormField>
            </div>
            <FormField label="Seizoen" htmlFor="aanbod-seizoen">
              <Textarea value={formData.seasonal_notes} onChange={(e) => set("seasonal_notes", e.target.value)} placeholder="Bijvoorbeeld: alleen van april tot en met oktober." rows={2} />
            </FormField>
            <FormField label="Trefwoorden" htmlFor="aanbod-tags" help="Gescheiden door komma's.">
              <Input value={formData.tags} onChange={(e) => set("tags", e.target.value)} placeholder="actief, buiten, groep" />
            </FormField>
          </SheetSection>

          <SheetSection title="Prijs">
            <FormField label="Prijssoort" htmlFor="aanbod-prijssoort">
              <select className={selectClass} value={formData.price_type} onChange={(e) => set("price_type", e.target.value)}>
                {PRICE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </FormField>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex h-10 items-center gap-2">
                <Switch id="aanbod-vanaf" checked={formData.is_from_price} onCheckedChange={(v) => set("is_from_price", v)} />
                <Label htmlFor="aanbod-vanaf">Vanafprijs</Label>
              </div>
              <div className="flex h-10 items-center gap-2">
                <Switch id="aanbod-inclbtw" checked={formData.price_includes_vat} onCheckedChange={(v) => set("price_includes_vat", v)} />
                <Label htmlFor="aanbod-inclbtw">Inclusief btw</Label>
              </div>
              <FormField label="Btw-tarief" htmlFor="aanbod-btw" className="w-36">
                <select className={selectClass} value={formData.vat_rate} onChange={(e) => set("vat_rate", e.target.value)}>
                  <option value="21">21% (standaard)</option>
                  <option value="9">9% (verlaagd)</option>
                  <option value="0">0% (vrijgesteld)</option>
                </select>
              </FormField>
            </div>

            {formData.price_type === "tiered_total" && (
              <div className="space-y-2 rounded-lg border p-4">
                <h4 className="font-medium">Staffels op groepsgrootte</h4>
                <p className="text-sm text-muted-foreground">Voor aanbod waarbij de totaalprijs van de groep per personenaantal verandert, zoals een boottocht met vaste tarieven.</p>
                <TierEditor tiers={tiers} onChange={setTiers} tiersAboveMax={tiersAboveMax} onTiersAboveMaxChange={setTiersAboveMax} />
                {errors.tiers && <p className="text-sm font-medium text-destructive">{errors.tiers}</p>}
              </div>
            )}

            {showsPrice && (
              <div className="space-y-3 rounded-lg border p-4">
                <h4 className="font-medium">{perPerson ? "Volwassenen" : "Prijs"}</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Prijs" htmlFor="aanbod-prijs" leading={<Euro />}>
                    <Input type="number" step="0.01" min="0" value={formData.price_adult} onChange={(e) => set("price_adult", e.target.value)} placeholder="0,00" />
                  </FormField>
                  <FormField label="Toelichting" htmlFor="aanbod-prijs-noot">
                    <Input value={formData.price_adult_note} onChange={(e) => set("price_adult_note", e.target.value)} placeholder={perPerson ? "Bijvoorbeeld: inclusief materiaal" : ""} />
                  </FormField>
                </div>
              </div>
            )}

            {perPerson && (
              <div className="space-y-3 rounded-lg border p-4">
                <h4 className="font-medium">Kinderen</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Prijs" htmlFor="aanbod-kind-prijs" leading={<Euro />}>
                    <Input type="number" step="0.01" min="0" value={formData.price_child} onChange={(e) => set("price_child", e.target.value)} placeholder="0,00" />
                  </FormField>
                  <FormField label="Toelichting" htmlFor="aanbod-kind-noot">
                    <Input value={formData.price_child_note} onChange={(e) => set("price_child_note", e.target.value)} placeholder="Bijvoorbeeld: onder begeleiding" />
                  </FormField>
                  <FormField label="Leeftijd vanaf" htmlFor="aanbod-kind-min">
                    <Input type="number" min="0" max="18" value={formData.price_child_min_age} onChange={(e) => set("price_child_min_age", e.target.value)} />
                  </FormField>
                  <FormField label="Leeftijd tot en met" htmlFor="aanbod-kind-max">
                    <Input type="number" min="0" max="18" value={formData.price_child_max_age} onChange={(e) => set("price_child_max_age", e.target.value)} />
                  </FormField>
                </div>
              </div>
            )}

            {perPerson && (
              <div className="space-y-3 rounded-lg border p-4">
                <h4 className="font-medium">Huisdieren</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Prijs" htmlFor="aanbod-dier-prijs" leading={<Euro />}>
                    <Input type="number" step="0.01" min="0" value={formData.price_pet} onChange={(e) => set("price_pet", e.target.value)} placeholder="0,00" />
                  </FormField>
                  <FormField label="Toelichting" htmlFor="aanbod-dier-noot">
                    <Input value={formData.price_pet_note} onChange={(e) => set("price_pet_note", e.target.value)} placeholder="Bijvoorbeeld: honden welkom" />
                  </FormField>
                </div>
              </div>
            )}

            <FormField label="Prijsweergave" htmlFor="aanbod-prijsweergave" help="Vervangt de automatische prijsregel op de site.">
              <Input value={formData.price_display_override} onChange={(e) => set("price_display_override", e.target.value)} placeholder="Bijvoorbeeld: vanaf € 25 p.p." />
            </FormField>
          </SheetSection>

          <SheetSection title="Locatie en koppelingen">
            <LocationPicker
              lat={formData.location_lat ? parseFloat(formData.location_lat) : null}
              lng={formData.location_lng ? parseFloat(formData.location_lng) : null}
              address={formData.location_address}
              onChange={(lat, lng, address) => setFormData((prev) => ({ ...prev, location_lat: lat?.toString() || "", location_lng: lng?.toString() || "", location_address: address }))}
            />
            {mapTenantSlug && (
              <FormField
                label="Activiteit in MijnActiviteitenplanner"
                htmlFor="aanbod-map"
                help={
                  formData.map_activity_type_id
                    ? "Gekoppeld: klanten kunnen deze activiteit aanvragen en direct boeken in uw MAP-agenda. Foto, beschrijving en duur volgen elke nacht MAP; de prijs hier blijft van u."
                    : "Kies de activiteit in MijnActiviteitenplanner die hierbij hoort. Dan is dit aanbod direct boekbaar en blijft het automatisch actueel."
                }
              >
                <select className={selectClass} value={formData.map_activity_type_id} onChange={(e) => set("map_activity_type_id", e.target.value)}>
                  <option value="">{isLoadingMapTypes ? "MAP-activiteiten laden" : "Niet gekoppeld"}</option>
                  {mapTypes.map((t) => (
                    <option key={t.Id} value={String(t.Id)}>
                      {t.Name}
                    </option>
                  ))}
                </select>
              </FormField>
            )}
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <FormField label="Link naar meer informatie" htmlFor="aanbod-link">
                <Input type="url" value={formData.external_url} onChange={(e) => set("external_url", e.target.value)} placeholder="https://" />
              </FormField>
              <FormField label="Volgorde" htmlFor="aanbod-volgorde">
                <Input type="number" value={formData.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
              </FormField>
            </div>
          </SheetSection>

          <SheetSection title="Foto" help="Minimaal 800 bij 600 pixels, liggend, jpg, png of webp, maximaal 5 MB, zonder tekst of logo.">
            {isNew ? (
              <Notice tone="info" title="Eerst opslaan">
                <p>Na het opslaan kunt u een foto toevoegen.</p>
              </Notice>
            ) : (
              <>
                <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
                  {imagePreview ? (
                    <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
                      <ImageIcon className="mb-2 h-10 w-10" aria-hidden="true" />
                      <span className="text-sm">Nog geen foto</span>
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
                      <Loader2 className="mb-2 h-8 w-8 animate-spin" aria-hidden="true" />
                      <Progress value={uploadProgress} className="w-32" />
                      <span className="mt-2 text-sm">Uploaden</span>
                    </div>
                  )}
                </div>
                <FormField label={imagePreview ? "Foto vervangen" : "Foto uploaden"} htmlFor="aanbod-foto">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleImageUpload(file);
                      e.target.value = "";
                    }}
                  />
                </FormField>
                {imageValidation && (
                  <Notice tone={imageValidation.error ? "danger" : imageValidation.warning ? "warning" : "success"}>
                    <p>{imageValidation.error || imageValidation.warning || "De foto voldoet aan alle eisen."}</p>
                  </Notice>
                )}
              </>
            )}
          </SheetSection>
        </form>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-background px-6 py-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button type="submit" form="aanbod-formulier" disabled={isSubmitting || isUploading}>
            {isSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
            {isNew ? "Voorstel indienen" : "Opslaan"}
          </Button>
        </div>
      </ResponsiveSheetContent>
    </Sheet>
  );
};
