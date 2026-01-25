import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Percent,
  Save,
  UserPlus,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { logAdminActivity, AdminActions, EntityTypes } from "@/lib/adminLogger";

interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  kvk_number: string | null;
  address_street: string | null;
  address_postal: string | null;
  address_city: string | null;
  commission_percentage: number;
  is_active: boolean;
  auth_user_id: string | null;
  partner_token: string;
  created_at: string;
}

const generatePartnerId = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 30);
};

const AdminPartnerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "nieuw";

  const [partner, setPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    kvk_number: "",
    address_street: "",
    address_postal: "",
    address_city: "",
    commission_percentage: 15,
    is_active: true,
  });
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      fetchPartner();
    }
  }, [id, isNew]);

  const fetchPartner = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("Partner niet gevonden");
        navigate("/admin/partners");
        return;
      }

      setPartner(data);
      setFormData({
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone || "",
        kvk_number: data.kvk_number || "",
        address_street: data.address_street || "",
        address_postal: data.address_postal || "",
        address_city: data.address_city || "",
        commission_percentage: data.commission_percentage,
        is_active: data.is_active,
      });
    } catch (error) {
      console.error("Error fetching partner:", error);
      toast.error("Fout bij ophalen partner");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      // Auto-generate ID from name for new partners
      if (isNew && field === "name" && typeof value === "string") {
        newData.id = generatePartnerId(value);
      }
      return newData;
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Naam is verplicht");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Email is verplicht");
      return;
    }
    if (!formData.id.trim()) {
      toast.error("ID is verplicht");
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        // Check if ID already exists
        const { data: existing } = await supabase
          .from("partners")
          .select("id")
          .eq("id", formData.id)
          .maybeSingle();

        if (existing) {
          toast.error("Partner ID bestaat al");
          setIsSaving(false);
          return;
        }

        const { error } = await supabase.from("partners").insert({
          id: formData.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          kvk_number: formData.kvk_number || null,
          address_street: formData.address_street || null,
          address_postal: formData.address_postal || null,
          address_city: formData.address_city || null,
          commission_percentage: formData.commission_percentage,
          is_active: formData.is_active,
        });

        if (error) throw error;

        await logAdminActivity({
          action: AdminActions.PARTNER_CREATED,
          entityType: EntityTypes.PARTNER,
          entityId: formData.id,
          details: { name: formData.name, email: formData.email },
        });

        toast.success("Partner aangemaakt");
        navigate(`/admin/partners/${formData.id}`);
      } else {
        const { error } = await supabase
          .from("partners")
          .update({
            name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            kvk_number: formData.kvk_number || null,
            address_street: formData.address_street || null,
            address_postal: formData.address_postal || null,
            address_city: formData.address_city || null,
            commission_percentage: formData.commission_percentage,
            is_active: formData.is_active,
          })
          .eq("id", id);

        if (error) throw error;

        await logAdminActivity({
          action: AdminActions.PARTNER_UPDATED,
          entityType: EntityTypes.PARTNER,
          entityId: id,
          details: { name: formData.name },
        });

        toast.success("Partner opgeslagen");
        fetchPartner();
      }
    } catch (error) {
      console.error("Error saving partner:", error);
      toast.error("Fout bij opslaan partner");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInvitePartner = async () => {
    if (!partner) return;

    setIsInviting(true);
    try {
      // Use the edge function to create the partner user
      const { error } = await supabase.functions.invoke("create-test-partner-user", {
        body: { partnerId: partner.id },
      });

      if (error) throw error;

      await logAdminActivity({
        action: AdminActions.PARTNER_INVITED,
        entityType: EntityTypes.PARTNER,
        entityId: partner.id,
        details: { email: partner.email },
      });

      toast.success("Partner uitnodiging verstuurd");
      fetchPartner();
    } catch (error) {
      console.error("Error inviting partner:", error);
      toast.error("Fout bij versturen uitnodiging");
    } finally {
      setIsInviting(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>Partner laden... | Admin | Bureau Vlieland</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <AdminLayout>
          <div className="p-6 space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-96" />
              <Skeleton className="h-96" />
            </div>
          </div>
        </AdminLayout>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>
          {isNew ? "Nieuwe partner" : formData.name || "Partner"} | Admin | Bureau Vlieland
        </title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AdminLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin/partners")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {isNew ? "Nieuwe partner" : formData.name}
                </h1>
                {!isNew && partner && (
                  <p className="text-slate-500">Partner ID: {partner.id}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isNew && partner && !partner.auth_user_id && (
                <Button variant="outline" onClick={handleInvitePartner} disabled={isInviting}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {isInviting ? "Uitnodigen..." : "Partner uitnodigen"}
                </Button>
              )}
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Opslaan..." : "Opslaan"}
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Basic info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Bedrijfsgegevens
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isNew && (
                  <div className="space-y-2">
                    <Label htmlFor="id">Partner ID</Label>
                    <Input
                      id="id"
                      value={formData.id}
                      onChange={(e) => handleChange("id", e.target.value)}
                      placeholder="uniek-partner-id"
                    />
                    <p className="text-xs text-slate-500">
                      Wordt automatisch gegenereerd van de naam
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Bedrijfsnaam *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Naam van het bedrijf"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="email@bedrijf.nl"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefoon</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="06 12345678"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kvk">KvK-nummer</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="kvk"
                      value={formData.kvk_number}
                      onChange={(e) => handleChange("kvk_number", e.target.value)}
                      placeholder="12345678"
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address and settings */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Adres
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="street">Straat en huisnummer</Label>
                    <Input
                      id="street"
                      value={formData.address_street}
                      onChange={(e) => handleChange("address_street", e.target.value)}
                      placeholder="Dorpsstraat 1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postal">Postcode</Label>
                      <Input
                        id="postal"
                        value={formData.address_postal}
                        onChange={(e) => handleChange("address_postal", e.target.value)}
                        placeholder="1234 AB"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Plaats</Label>
                      <Input
                        id="city"
                        value={formData.address_city}
                        onChange={(e) => handleChange("address_city", e.target.value)}
                        placeholder="Vlieland"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="h-5 w-5" />
                    Instellingen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="commission">Commissie percentage</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="commission"
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={formData.commission_percentage}
                        onChange={(e) =>
                          handleChange("commission_percentage", parseFloat(e.target.value) || 0)
                        }
                        className="w-24"
                      />
                      <span className="text-slate-500">%</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Dit percentage wordt in rekening gebracht over gefactureerde bedragen
                    </p>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Partner actief</Label>
                      <p className="text-xs text-slate-500">
                        Inactieve partners zijn niet zichtbaar in de configurator
                      </p>
                    </div>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => handleChange("is_active", checked)}
                    />
                  </div>

                  {!isNew && partner && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <Label>Account status</Label>
                        <div className="flex items-center gap-2">
                          {partner.auth_user_id ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-green-600">
                                Heeft login account
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-slate-400" />
                              <span className="text-sm text-slate-500">
                                Nog niet uitgenodigd
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
};

export default AdminPartnerDetail;
