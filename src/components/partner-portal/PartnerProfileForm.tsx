import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, LoadingState, Notice, OptionCard, OptionGroup, Pill } from "@/components/system";
import { Globe, Loader2, Plus, Save, Search, X } from "lucide-react";
import { FACILITIES } from "@/types/accommodation";
import { PartnerLocationMap } from "./PartnerLocationMap";
import { validCoordinates } from "@/lib/accommodationQuotePresentation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PartnerImageUpload } from "./PartnerImageUpload";
import { reportError } from "@/lib/errorReporting";
import { SheetSection } from "./SheetSection";

/**
 * Mijn profiel (partnerportaal fase 4, besluit 7): één formulier in secties
 * op `FormField`, met één opslaanknop in een vaste voet. Wat de klant ziet
 * in programma's en offertes: tekst, kenmerken, locatie, faciliteiten en
 * foto's.
 */
export const PartnerProfileForm = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [aboutText, setAboutText] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [locationLat, setLocationLat] = useState("");
  const [locationLng, setLocationLng] = useState("");
  const [galleryImages, setGalleryImages] = useState<{ url: string; alt?: string }[]>([]);
  const [highlightFeatures, setHighlightFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState("");
  const [facilities, setFacilities] = useState<string[]>([]);
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [isAccommodation, setIsAccommodation] = useState(false);
  const [address, setAddress] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);

  const fetchProfile = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const impersonatePartnerId = searchParams.get("impersonate");
    let query = supabase
      .from("partners")
      .select("id, partner_type, about_text, website_url, location_description, location_lat, location_lng, gallery_images, highlight_features, facilities, check_in_time, check_out_time, address_street, address_postal, address_city");
    if (impersonatePartnerId) {
      const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: session.user.id });
      query = isAdmin ? query.eq("id", impersonatePartnerId) : query.eq("auth_user_id", session.user.id).eq("is_active", true);
    } else {
      query = query.eq("auth_user_id", session.user.id).eq("is_active", true);
    }

    const { data, error } = await query.single();
    if (data && !error) {
      setPartnerId(data.id);
      setAboutText(data.about_text || "");
      setWebsiteUrl(data.website_url || "");
      setLocationDescription(data.location_description || "");
      setLocationLat(data.location_lat?.toString() || "");
      setLocationLng(data.location_lng?.toString() || "");
      setGalleryImages((data.gallery_images as { url: string; alt?: string }[] | null) || []);
      setHighlightFeatures((data.highlight_features as string[] | null) || []);
      setFacilities(Array.isArray(data.facilities) ? data.facilities : []);
      setCheckInTime(data.check_in_time || "");
      setCheckOutTime(data.check_out_time || "");
      setIsAccommodation(data.partner_type === "accommodation" || data.partner_type === "both");
      setAddress([data.address_street, data.address_postal, data.address_city].filter(Boolean).join(", "));
    }
    setIsLoading(false);
  }, [searchParams]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("partners")
        .update({
          about_text: aboutText || null,
          website_url: websiteUrl || null,
          location_description: locationDescription || null,
          location_lat: locationLat ? parseFloat(locationLat) : null,
          location_lng: locationLng ? parseFloat(locationLng) : null,
          gallery_images: galleryImages,
          highlight_features: highlightFeatures,
          facilities,
          check_in_time: checkInTime || null,
          check_out_time: checkOutTime || null,
        })
        .eq("id", partnerId);
      if (error) throw error;
      toast({ title: "Profiel opgeslagen" });
    } catch (err) {
      reportError(err, { where: "PartnerProfileForm: Error saving profile" });
      toast({ title: "Profiel niet opgeslagen", description: "Kon het profiel niet opslaan. Probeer het opnieuw.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const addFeature = () => {
    const trimmed = newFeature.trim();
    if (trimmed && !highlightFeatures.includes(trimmed)) {
      setHighlightFeatures([...highlightFeatures, trimmed]);
      setNewFeature("");
    }
  };
  const removeFeature = (index: number) => setHighlightFeatures(highlightFeatures.filter((_, i) => i !== index));
  const toggleFacility = (value: string) => setFacilities((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  // Coördinaten opzoeken op het adres uit de instellingen, zodat niemand ze hoeft over te tikken.
  const handleGeocode = async () => {
    if (!address) return;
    setIsGeocoding(true);
    try {
      const { data, error } = await supabase.functions.invoke("geocode-address", { body: { address } });
      const hit = !error && data && typeof data.lat === "number" ? validCoordinates(data.lat, data.lng) : null;
      if (!hit) {
        toast({ title: "Adres niet gevonden", description: "Vul de coördinaten zelf in of pas het adres aan bij Instellingen.", variant: "destructive" });
        return;
      }
      setLocationLat(hit.lat.toFixed(7));
      setLocationLng(hit.lng.toFixed(7));
      toast({ title: "Locatie gevonden", description: "Controleer de speld op de kaart en sla het profiel op." });
    } catch (err) {
      reportError(err, { where: "PartnerProfileForm: geocode" });
      toast({ title: "Opzoeken mislukt", description: "Probeer het later opnieuw.", variant: "destructive" });
    } finally {
      setIsGeocoding(false);
    }
  };

  const previewCoords = validCoordinates(locationLat, locationLng);
  const coordsInvalid = (locationLat || locationLng) && !previewCoords;

  if (isLoading) return <LoadingState label="Profiel laden" />;
  if (!partnerId) return null;

  return (
    <form onSubmit={(e) => void handleSave(e)} className="space-y-8">
      <SheetSection title="Over uw bedrijf" help="Deze tekst staat bij uw aanbod in programma's en offertes.">
        <FormField label="Bedrijfsbeschrijving" htmlFor="profiel-over">
          <Textarea value={aboutText} onChange={(e) => setAboutText(e.target.value)} placeholder="Wat u doet, wat u bijzonder maakt, uw geschiedenis." rows={5} />
        </FormField>
        <FormField label="Website" htmlFor="profiel-website" leading={<Globe />}>
          <Input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://www.uwbedrijf.nl" />
        </FormField>
      </SheetSection>

      <SheetSection title="Kenmerken" help="Korte kernwoorden die uw bedrijf typeren, zoals zeezicht, duurzaam of groepskorting.">
        {highlightFeatures.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {highlightFeatures.map((feature, i) => (
              <li key={`${feature}-${i}`}>
                <Pill tone="neutral" className="gap-1 pr-1">
                  {feature}
                  <button type="button" onClick={() => removeFeature(i)} className="rounded-full p-0.5 hover:text-destructive" aria-label={`${feature} verwijderen`}>
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </Pill>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <FormField label="Nieuw kenmerk" htmlFor="profiel-kenmerk" className="flex-1">
            <Input
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              placeholder="Bijvoorbeeld zeezicht"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addFeature();
                }
              }}
            />
          </FormField>
          <Button type="button" variant="outline" size="icon" onClick={addFeature} disabled={!newFeature.trim()} aria-label="Kenmerk toevoegen" className="mt-6">
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </SheetSection>

      <SheetSection title="Locatie" help="De coördinaten zetten uw bedrijf op de kaart bij een programma.">
        <FormField label="Waar u zit" htmlFor="profiel-locatie">
          <Textarea value={locationDescription} onChange={(e) => setLocationDescription(e.target.value)} placeholder="Bijvoorbeeld: direct aan het strand, vijf minuten lopen van de veerboot." rows={2} />
        </FormField>
        {address && (
          <Notice tone="info" title="Adres uit uw instellingen">
            <p>{address}</p>
            <div className="mt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void handleGeocode()} disabled={isGeocoding}>
                {isGeocoding ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="mr-1.5 h-4 w-4" aria-hidden="true" />}
                Zet op de kaart
              </Button>
            </div>
          </Notice>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Breedtegraad" htmlFor="profiel-lat" error={coordsInvalid ? "Tussen -90 en 90." : undefined}>
            <Input type="number" step="any" value={locationLat} onChange={(e) => setLocationLat(e.target.value)} placeholder="53.2956" />
          </FormField>
          <FormField label="Lengtegraad" htmlFor="profiel-lng" error={coordsInvalid ? "Tussen -180 en 180." : undefined}>
            <Input type="number" step="any" value={locationLng} onChange={(e) => setLocationLng(e.target.value)} placeholder="5.0666" />
          </FormField>
        </div>
        {previewCoords && <PartnerLocationMap lat={previewCoords.lat} lng={previewCoords.lng} label="Uw locatie" address={address || null} isVisible />}
      </SheetSection>

      {isAccommodation && (
        <SheetSection title="Faciliteiten en tijden" help="Klanten geven bij hun aanvraag aan wat ze belangrijk vinden; dit wordt bij uw offerte met hun wensen vergeleken.">
          <OptionGroup name="Faciliteiten" selection="multiple" columns={3}>
            {FACILITIES.map((facility) => (
              <OptionCard key={facility.value} selection="multiple" selected={facilities.includes(facility.value)} onSelect={() => toggleFacility(facility.value)} title={facility.label} />
            ))}
          </OptionGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Inchecken vanaf" htmlFor="profiel-incheck">
              <Input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} />
            </FormField>
            <FormField label="Uitchecken tot" htmlFor="profiel-uitcheck">
              <Input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} />
            </FormField>
          </div>
        </SheetSection>
      )}

      <SheetSection title="Foto's" help="De eerste foto is de hoofdfoto; maximaal acht.">
        <PartnerImageUpload partnerId={partnerId} images={galleryImages} onImagesChange={setGalleryImages} storagePath="gallery" maxImages={8} label="" />
      </SheetSection>

      <div className="sticky bottom-0 flex justify-end border-t bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="mr-1.5 h-4 w-4" aria-hidden="true" />}
          Profiel opslaan
        </Button>
      </div>
    </form>
  );
};
