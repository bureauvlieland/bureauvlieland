import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Globe, MapPin, Sparkles, X, Plus, FileText, Image as ImageIcon, Search, ListChecks } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { FACILITIES } from "@/types/accommodation";
import { PartnerLocationMap } from "./PartnerLocationMap";
import { validCoordinates } from "@/lib/accommodationQuotePresentation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PartnerImageUpload } from "./PartnerImageUpload";
import { reportError } from "@/lib/errorReporting";

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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const impersonatePartnerId = searchParams.get("impersonate");
    let query = supabase.from("partners").select("id, partner_type, about_text, website_url, location_description, location_lat, location_lng, gallery_images, highlight_features, facilities, check_in_time, check_out_time, address_street, address_postal, address_city");

    if (impersonatePartnerId) {
      const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: session.user.id });
      if (isAdmin) {
        query = query.eq("id", impersonatePartnerId);
      } else {
        query = query.eq("auth_user_id", session.user.id).eq("is_active", true);
      }
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
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
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
      toast({ title: "Profiel opgeslagen", description: "Uw bedrijfsprofiel is bijgewerkt." });
    } catch (err) {
      reportError(err, { where: "PartnerProfileForm: Error saving profile" });
      toast({ title: "Fout", description: "Kon profiel niet opslaan.", variant: "destructive" });
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

  const removeFeature = (index: number) => {
    setHighlightFeatures(highlightFeatures.filter((_, i) => i !== index));
  };

  const toggleFacility = (value: string) => {
    setFacilities((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  // Coördinaten opzoeken op het adres uit de instellingen, zodat niemand ze
  // hoeft over te tikken (en er geen "532964885" meer ontstaat).
  const handleGeocode = async () => {
    if (!address) return;
    setIsGeocoding(true);
    try {
      const { data, error } = await supabase.functions.invoke("geocode-address", { body: { address } });
      const hit = !error && data && typeof data.lat === "number" ? validCoordinates(data.lat, data.lng) : null;
      if (!hit) {
        toast({ title: "Adres niet gevonden", description: "Vul de coördinaten handmatig in of pas het adres aan bij Instellingen.", variant: "destructive" });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!partnerId) return null;

  return (
    <div className="space-y-6">
      {/* About text */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Over uw bedrijf</CardTitle>
          </div>
          <CardDescription>
            Vertel klanten over uw bedrijf. Deze tekst verschijnt bij programma's en offertes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="about_text">Bedrijfsbeschrijving</Label>
            <Textarea
              id="about_text"
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              placeholder="Beschrijf uw bedrijf, wat u uniek maakt, uw geschiedenis en visie..."
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website_url">Website</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="website_url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://www.uwbedrijf.nl"
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Highlights / USPs */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Kenmerken & USP's</CardTitle>
          </div>
          <CardDescription>
            Voeg kernwoorden toe die uw bedrijf kenmerken (bijv. "Zeezicht", "Duurzaam", "Groepskortingen").
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {highlightFeatures.map((feature, i) => (
              <Badge key={i} variant="secondary" className="gap-1 pl-3 pr-1 py-1">
                {feature}
                <button type="button" onClick={() => removeFeature(i)} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              placeholder="Nieuw kenmerk toevoegen..."
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
            />
            <Button type="button" variant="outline" size="icon" onClick={addFeature} disabled={!newFeature.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle>Locatie</CardTitle>
          </div>
          <CardDescription>
            Beschrijf waar uw bedrijf zich bevindt. Coördinaten worden gebruikt voor kaartweergave.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location_description">Locatiebeschrijving</Label>
            <Textarea
              id="location_description"
              value={locationDescription}
              onChange={(e) => setLocationDescription(e.target.value)}
              placeholder="Bijv. 'Direct aan het strand, 5 minuten lopen vanaf de veerboot...'"
              rows={2}
            />
          </div>
          {address && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border bg-muted/30 p-3">
              <p className="text-sm flex-1"><span className="text-muted-foreground">Adres uit uw instellingen:</span> {address}</p>
              <Button type="button" variant="outline" size="sm" onClick={handleGeocode} disabled={isGeocoding}>
                {isGeocoding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Zet op de kaart
              </Button>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location_lat">Breedtegraad</Label>
              <Input
                id="location_lat"
                type="number"
                step="any"
                value={locationLat}
                onChange={(e) => setLocationLat(e.target.value)}
                placeholder="53.2956"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location_lng">Lengtegraad</Label>
              <Input
                id="location_lng"
                type="number"
                step="any"
                value={locationLng}
                onChange={(e) => setLocationLng(e.target.value)}
                placeholder="5.0666"
              />
            </div>
          </div>
          {(locationLat || locationLng) && !previewCoords && (
            <p className="text-sm text-destructive">Deze coördinaten kloppen niet (breedtegraad tussen -90 en 90, lengtegraad tussen -180 en 180). Gebruik "Zet op de kaart".</p>
          )}
          {previewCoords && (
            <PartnerLocationMap lat={previewCoords.lat} lng={previewCoords.lng} label="Uw locatie" address={address || null} isVisible />
          )}
        </CardContent>
      </Card>

      {isAccommodation && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              <CardTitle>Faciliteiten en tijden</CardTitle>
            </div>
            <CardDescription>
              Klanten geven bij hun aanvraag aan welke faciliteiten ze belangrijk vinden. Wat u hier aanvinkt,
              wordt bij uw offerte vergeleken met die wensen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {FACILITIES.map((facility) => (
                <div key={facility.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`facility-${facility.value}`}
                    checked={facilities.includes(facility.value)}
                    onCheckedChange={() => toggleFacility(facility.value)}
                  />
                  <Label htmlFor={`facility-${facility.value}`} className="text-sm font-normal cursor-pointer">
                    {facility.label}
                  </Label>
                </div>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="check_in_time">Inchecken vanaf</Label>
                <Input id="check_in_time" type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="check_out_time">Uitchecken tot</Label>
                <Input id="check_out_time" type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo gallery */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            <CardTitle>Fotogalerij</CardTitle>
          </div>
          <CardDescription>
            Upload foto's van uw bedrijf. De eerste foto wordt als hoofdafbeelding gebruikt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PartnerImageUpload
            partnerId={partnerId}
            images={galleryImages}
            onImagesChange={setGalleryImages}
            storagePath="gallery"
            maxImages={8}
            label=""
          />
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Profiel opslaan
        </Button>
      </div>
    </div>
  );
};
