import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, Save, KeyRound, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PartnerTermsUpload } from "./PartnerTermsUpload";

interface PartnerDetails {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  kvk_number: string | null;
  address_street: string | null;
  address_postal: string | null;
  address_city: string | null;
  commission_percentage: number;
  terms_pdf_path: string | null;
  terms_uploaded_at: string | null;
}

export const PartnerSettingsForm = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [partner, setPartner] = useState<PartnerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    kvk_number: "",
    address_street: "",
    address_postal: "",
    address_city: "",
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const fetchPartner = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Check if admin is impersonating
    const impersonatePartnerId = searchParams.get("impersonate");
    
    if (impersonatePartnerId) {
      const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: session.user.id });
      
      if (isAdmin) {
        const { data, error } = await supabase
          .from("partners")
          .select("*")
          .eq("id", impersonatePartnerId)
          .single();

        if (data && !error) {
          setPartner(data);
          setFormData({
            name: data.name || "",
            phone: data.phone || "",
            kvk_number: data.kvk_number || "",
            address_street: data.address_street || "",
            address_postal: data.address_postal || "",
            address_city: data.address_city || "",
          });
          setIsImpersonating(true);
        }
        setIsLoading(false);
        return;
      }
    }

    // Regular partner flow
    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .eq("auth_user_id", session.user.id)
      .eq("is_active", true)
      .single();

    if (data && !error) {
      setPartner(data);
      setFormData({
        name: data.name || "",
        phone: data.phone || "",
        kvk_number: data.kvk_number || "",
        address_street: data.address_street || "",
        address_postal: data.address_postal || "",
        address_city: data.address_city || "",
      });
    }
    setIsLoading(false);
  }, [searchParams]);

  useEffect(() => {
    fetchPartner();
  }, [fetchPartner]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    setPasswordErrors(prev => ({ ...prev, [field]: "" }));
  };

  const handleSaveDetails = async () => {
    if (!partner) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("partners")
        .update({
          name: formData.name,
          phone: formData.phone || null,
          kvk_number: formData.kvk_number || null,
          address_street: formData.address_street || null,
          address_postal: formData.address_postal || null,
          address_city: formData.address_city || null,
        })
        .eq("id", partner.id);

      if (error) throw error;

      toast({
        title: "Gegevens opgeslagen",
        description: "Je bedrijfsgegevens zijn bijgewerkt.",
      });
    } catch (err) {
      console.error("Error saving partner details:", err);
      toast({
        title: "Fout",
        description: "Kon gegevens niet opslaan. Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    // Validate
    const errors: Record<string, string> = {};
    if (passwordData.newPassword.length < 6) {
      errors.newPassword = "Wachtwoord moet minimaal 6 tekens zijn";
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Wachtwoorden komen niet overeen";
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      setPasswordData({ newPassword: "", confirmPassword: "" });
      toast({
        title: "Wachtwoord gewijzigd",
        description: "Je wachtwoord is succesvol bijgewerkt.",
      });
    } catch (err: any) {
      console.error("Error changing password:", err);
      toast({
        title: "Fout",
        description: err.message || "Kon wachtwoord niet wijzigen.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!partner) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Admin impersonation notice */}
      {isImpersonating && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-800">
            <ShieldCheck className="h-5 w-5" />
            <span className="font-medium">Je bekijkt dit als admin</span>
          </div>
          <p className="text-sm text-amber-700 mt-1">
            Wijzigingen die je maakt worden direct opgeslagen voor deze partner.
          </p>
        </div>
      )}

      {/* Company details */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Bedrijfsgegevens</CardTitle>
          </div>
          <CardDescription>
            Deze gegevens worden gebruikt voor communicatie en facturatie.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Bedrijfsnaam *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Naam van je bedrijf"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres</Label>
              <Input
                id="email"
                value={partner.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                E-mailadres kan niet worden gewijzigd.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefoonnummer</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="06-12345678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kvk_number">KvK-nummer</Label>
              <Input
                id="kvk_number"
                value={formData.kvk_number}
                onChange={(e) => handleChange("kvk_number", e.target.value)}
                placeholder="12345678"
                maxLength={8}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address_street">Straat en huisnummer</Label>
            <Input
              id="address_street"
              value={formData.address_street}
              onChange={(e) => handleChange("address_street", e.target.value)}
              placeholder="Voorbeeldstraat 123"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address_postal">Postcode</Label>
              <Input
                id="address_postal"
                value={formData.address_postal}
                onChange={(e) => handleChange("address_postal", e.target.value)}
                placeholder="1234 AB"
                maxLength={7}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_city">Plaats</Label>
              <Input
                id="address_city"
                value={formData.address_city}
                onChange={(e) => handleChange("address_city", e.target.value)}
                placeholder="Amsterdam"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={handleSaveDetails} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Opslaan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Commission info */}
      <Card>
        <CardHeader>
          <CardTitle>Commissie</CardTitle>
          <CardDescription>
            Overzicht van je commissiepercentage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Huidig commissiepercentage</p>
            <p className="text-2xl font-bold">{partner.commission_percentage}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              Neem contact op met Bureau Vlieland om dit percentage aan te passen.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Partner Terms PDF Upload */}
      <PartnerTermsUpload
        partnerId={partner.id}
        termsPdfPath={partner.terms_pdf_path}
        termsUploadedAt={partner.terms_uploaded_at}
        onUpdate={fetchPartner}
      />

      {/* Password change - only show for non-impersonating */}
      {!isImpersonating && (
        <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <CardTitle>Wachtwoord wijzigen</CardTitle>
          </div>
          <CardDescription>
            Kies een nieuw wachtwoord voor je account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nieuw wachtwoord</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                placeholder="Minimaal 6 tekens"
              />
              {passwordErrors.newPassword && (
                <p className="text-xs text-destructive">{passwordErrors.newPassword}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Bevestig wachtwoord</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                placeholder="Herhaal wachtwoord"
              />
              {passwordErrors.confirmPassword && (
                <p className="text-xs text-destructive">{passwordErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Button 
              onClick={handleChangePassword} 
              disabled={isChangingPassword || !passwordData.newPassword}
              variant="outline"
            >
              {isChangingPassword ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4 mr-2" />
              )}
              Wachtwoord wijzigen
            </Button>
          </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
