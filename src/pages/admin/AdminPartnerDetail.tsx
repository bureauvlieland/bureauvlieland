import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Calendar,
  Users,
  ExternalLink,
} from "lucide-react";
import { logAdminActivity, AdminActions, EntityTypes } from "@/lib/adminLogger";
import { AdminPartnerUnavailability } from "@/components/admin/AdminPartnerUnavailability";

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
  partner_type: string | null;
  accommodation_commission_percentage: number | null;
}

interface RelatedRequest {
  id: string;
  customer_name: string;
  customer_company: string | null;
  number_of_people: number;
  selected_dates: string[];
  status: string;
  created_at: string;
  item_count: number;
}

const PARTNER_TYPE_OPTIONS = [
  { value: "activity_provider", label: "Activiteiten partner" },
  { value: "accommodation", label: "Logies partner" },
  { value: "both", label: "Activiteiten én logies" },
];

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
    partner_type: "activity_provider",
    accommodation_commission_percentage: 10,
  });
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [relatedRequests, setRelatedRequests] = useState<RelatedRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      fetchPartner();
      fetchRelatedRequests();
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
        partner_type: data.partner_type || "activity_provider",
        accommodation_commission_percentage: data.accommodation_commission_percentage ?? 10,
      });
    } catch (error) {
      console.error("Error fetching partner:", error);
      toast.error("Fout bij ophalen partner");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRelatedRequests = async () => {
    if (!id) return;
    setIsLoadingRequests(true);
    try {
      // Get all items for this partner
      const { data: items, error: itemsError } = await supabase
        .from("program_request_items")
        .select("request_id")
        .eq("provider_id", id);

      if (itemsError) throw itemsError;

      if (!items || items.length === 0) {
        setRelatedRequests([]);
        return;
      }

      // Get unique request IDs and count items per request
      const requestCounts = items.reduce((acc, item) => {
        acc[item.request_id] = (acc[item.request_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const requestIds = Object.keys(requestCounts);

      // Fetch the requests
      const { data: requests, error: requestsError } = await supabase
        .from("program_requests")
        .select("id, customer_name, customer_company, number_of_people, selected_dates, status, created_at")
        .in("id", requestIds)
        .order("created_at", { ascending: false })
        .limit(10);

      if (requestsError) throw requestsError;

      const mappedRequests: RelatedRequest[] = (requests || []).map((req) => ({
        id: req.id,
        customer_name: req.customer_name,
        customer_company: req.customer_company,
        number_of_people: req.number_of_people,
        selected_dates: Array.isArray(req.selected_dates) ? req.selected_dates.map(String) : [],
        status: req.status,
        created_at: req.created_at,
        item_count: requestCounts[req.id] || 0,
      }));

      setRelatedRequests(mappedRequests);
    } catch (error) {
      console.error("Error fetching related requests:", error);
    } finally {
      setIsLoadingRequests(false);
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
          partner_type: formData.partner_type,
          accommodation_commission_percentage:
            formData.partner_type === "accommodation" || formData.partner_type === "both"
              ? formData.accommodation_commission_percentage
              : null,
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
            partner_type: formData.partner_type,
            accommodation_commission_percentage:
              formData.partner_type === "accommodation" || formData.partner_type === "both"
                ? formData.accommodation_commission_percentage
                : null,
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
      const { data, error } = await supabase.functions.invoke("invite-partner", {
        body: { partnerId: partner.id },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      await logAdminActivity({
        action: AdminActions.PARTNER_INVITED,
        entityType: EntityTypes.PARTNER,
        entityId: partner.id,
        details: { email: partner.email },
      });

      toast.success("Uitnodiging verstuurd!", {
        description: `Er is een uitnodigingsmail verzonden naar ${partner.email}`,
      });
      fetchPartner();
    } catch (error) {
      console.error("Error inviting partner:", error);
      const message = error instanceof Error ? error.message : "Fout bij versturen uitnodiging";
      toast.error("Uitnodiging mislukt", { description: message });
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
                  {/* Partner type */}
                  <div className="space-y-2">
                    <Label htmlFor="partner_type">Partner type</Label>
                    <Select
                      value={formData.partner_type}
                      onValueChange={(value) => handleChange("partner_type", value)}
                    >
                      <SelectTrigger id="partner_type">
                        <SelectValue placeholder="Selecteer type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PARTNER_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      Bepaalt welke portaalfuncties zichtbaar zijn voor deze partner
                    </p>
                  </div>

                  <Separator />

                  {/* Activity commission */}
                  <div className="space-y-2">
                    <Label htmlFor="commission">Commissie activiteiten</Label>
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
                      Dit percentage wordt in rekening gebracht over gefactureerde activiteiten
                    </p>
                  </div>

                  {/* Accommodation commission - conditional */}
                  {(formData.partner_type === "accommodation" || formData.partner_type === "both") && (
                    <div className="space-y-2">
                      <Label htmlFor="accommodation_commission">Commissie logies</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="accommodation_commission"
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={formData.accommodation_commission_percentage}
                          onChange={(e) =>
                            handleChange("accommodation_commission_percentage", parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                        />
                        <span className="text-slate-500">%</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Dit percentage over geaccepteerde logiesboekingen
                      </p>
                    </div>
                  )}

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

          {/* Unavailability and Related Requests */}
          {!isNew && id && (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Unavailability - takes 1/3 */}
              <div>
                <AdminPartnerUnavailability partnerId={id} />
              </div>

              {/* Related Requests - takes 2/3 */}
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Gerelateerde aanvragen
                    </CardTitle>
                    <CardDescription>
                      Programma aanvragen met activiteiten van deze partner
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isLoadingRequests ? (
                      <div className="p-6">
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : relatedRequests.length === 0 ? (
                      <div className="p-6 text-center text-slate-500">
                        Geen gerelateerde aanvragen gevonden
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Klant</TableHead>
                              <TableHead>Datum(s)</TableHead>
                              <TableHead>Personen</TableHead>
                              <TableHead>Items</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="w-12"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {relatedRequests.map((req) => (
                              <TableRow key={req.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{req.customer_name}</p>
                                    {req.customer_company && (
                                      <p className="text-sm text-slate-500">{req.customer_company}</p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm">
                                      {req.selected_dates.length > 0
                                        ? format(new Date(req.selected_dates[0]), "d MMM yyyy", { locale: nl })
                                        : "-"}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Users className="h-4 w-4 text-slate-400" />
                                    {req.number_of_people}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">
                                    {req.item_count} {req.item_count === 1 ? "item" : "items"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      req.status === "active"
                                        ? "default"
                                        : req.status === "cancelled"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                  >
                                    {req.status === "active"
                                      ? "Actief"
                                      : req.status === "cancelled"
                                      ? "Geannuleerd"
                                      : req.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" asChild>
                                    <Link to={`/admin/aanvragen/${req.id}`}>
                                      <ExternalLink className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
};

export default AdminPartnerDetail;
