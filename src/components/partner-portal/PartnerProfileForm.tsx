import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Globe, MapPin, Sparkles, X, Plus, FileText, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PartnerImageUpload } from "./PartnerImageUpload";

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

  const fetchProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const impersonatePartnerId = searchParams.get("impersonate");
    let query = supabase.from("partners").select("id, about_text, website_url, location_description, location_lat, location_lng, gallery_images, highlight_features");

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
      setAboutText((data as any).about_text || "");
      setWebsiteUrl((data as any).website_url || "");
      setLocationDescription((data as any).location_description || "");
      setLocationLat((data as any).location_lat?.toString() || "");
      setLocationLng((data as any).location_lng?.toString() || "");
      setGalleryImages((data as any).gallery_images || []);
      setHighlightFeatures((data as any).highlight_features || []);
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
        } as any)
        .eq("id", partnerId);

      if (error) throw error;
      toast({ title: "Profiel opgeslagen", description: "Uw bedrijfsprofiel is bijgewerkt." });
    } catch (err) {
      console.error("Error saving profile:", err);
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
        </CardContent>
      </Card>

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
