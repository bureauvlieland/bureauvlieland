import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Mail,
  Phone,
  Building2,
  UserPlus,
  ExternalLink,
  Trash2,
  FileCheck2,
  FileX,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity } from "@/lib/adminLogger";

interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  kvk_number: string | null;
  address_street: string | null;
  address_postal: string | null;
  address_city: string | null;
  is_active: boolean;
  commission_percentage: number;
  auth_user_id: string | null;
  partner_token: string;
  created_at: string;
  partner_type: string | null;
  terms_pdf_path: string | null;
}

const PARTNER_TYPE_LABELS: Record<string, string> = {
  activity_provider: "Activiteiten",
  accommodation: "Logies",
  both: "Activiteiten & Logies",
};

const AdminPartnersContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setPartners(data || []);
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast({
        title: "Fout",
        description: "Kon partners niet laden",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const handleToggleActive = async (partnerId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("partners")
        .update({ is_active: !currentActive })
        .eq("id", partnerId);

      if (error) throw error;

      setPartners((prev) =>
        prev.map((p) =>
          p.id === partnerId ? { ...p, is_active: !currentActive } : p
        )
      );

      toast({
        title: "Partner bijgewerkt",
        description: `Partner is nu ${!currentActive ? "actief" : "inactief"}`,
      });
    } catch (error) {
      console.error("Error updating partner:", error);
      toast({
        title: "Fout",
        description: "Kon partner niet bijwerken",
        variant: "destructive",
      });
    }
  };

  const handleDeletePartner = async () => {
    if (!partnerToDelete) return;
    
    setIsDeleting(true);
    try {
      // Check if partner has linked building blocks
      const { data: blocks } = await supabase
        .from("building_blocks")
        .select("id")
        .eq("provider_id", partnerToDelete.id)
        .limit(1);
      
      if (blocks && blocks.length > 0) {
        toast({
          title: "Kan partner niet verwijderen",
          description: "Deze partner heeft nog gekoppelde bouwstenen. Verwijder eerst de bouwstenen of wijs ze toe aan een andere partner.",
          variant: "destructive",
        });
        return;
      }

      // Check if partner has program request items
      const { data: items } = await supabase
        .from("program_request_items")
        .select("id")
        .eq("provider_id", partnerToDelete.id)
        .limit(1);
      
      if (items && items.length > 0) {
        toast({
          title: "Kan partner niet verwijderen",
          description: "Deze partner heeft nog gekoppelde aanvragen. Verwijder eerst de aanvraag-items of wijs ze toe aan een andere partner.",
          variant: "destructive",
        });
        return;
      }

      // Delete the partner
      const { error } = await supabase
        .from("partners")
        .delete()
        .eq("id", partnerToDelete.id);

      if (error) throw error;

      // Log the activity
      await logAdminActivity({
        action: "delete",
        entityType: "partner",
        entityId: partnerToDelete.id,
        details: { partner_name: partnerToDelete.name },
      });

      // Update local state
      setPartners((prev) => prev.filter((p) => p.id !== partnerToDelete.id));

      toast({
        title: "Partner verwijderd",
        description: `${partnerToDelete.name} is succesvol verwijderd.`,
      });
    } catch (error) {
      console.error("Error deleting partner:", error);
      toast({
        title: "Fout",
        description: "Kon partner niet verwijderen",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setPartnerToDelete(null);
    }
  };

  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      const query = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        (p.address_city?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [partners, searchQuery]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Partners</h1>
          <p className="text-slate-600">Beheer partners en hun gegevens</p>
        </div>
        <Button onClick={() => navigate("/admin/partners/nieuw")}>
          <Plus className="h-4 w-4 mr-2" />
          Partner toevoegen
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Zoek op naam, email of plaats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Partners table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Adres</TableHead>
                <TableHead>Commissie</TableHead>
                <TableHead>Voorwaarden</TableHead>
                <TableHead>Login</TableHead>
                <TableHead>Actief</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Geen partners gevonden
                  </TableCell>
                </TableRow>
              ) : (
                filteredPartners.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-medium">{partner.name}</p>
                          {partner.kvk_number && (
                            <p className="text-xs text-slate-500">KvK: {partner.kvk_number}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {PARTNER_TYPE_LABELS[partner.partner_type || "activity_provider"] || "Activiteiten"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <a
                            href={`mailto:${partner.email}`}
                            className="text-blue-600 hover:underline"
                          >
                            {partner.email}
                          </a>
                        </div>
                        {partner.phone && (
                          <div className="flex items-center gap-1 text-sm text-slate-500">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {partner.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {partner.address_city || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{partner.commission_percentage}%</Badge>
                    </TableCell>
                    <TableCell>
                      {partner.terms_pdf_path ? (
                        <FileCheck2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <FileX className="h-5 w-5 text-muted-foreground/50" />
                      )}
                    </TableCell>
                    <TableCell>
                      {partner.auth_user_id ? (
                        <Badge variant="default" className="bg-green-600">
                          Gekoppeld
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Niet gekoppeld</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={partner.is_active}
                        onCheckedChange={() => handleToggleActive(partner.id, partner.is_active)}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate(`/admin/partners/${partner.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Bewerken
                          </DropdownMenuItem>
                          {!partner.auth_user_id && (
                            <DropdownMenuItem
                              onClick={() => navigate(`/admin/partners/${partner.id}/uitnodigen`)}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Uitnodigen
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => navigate(`/partner/dashboard?impersonate=${partner.id}`)}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Bekijk als partner
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setPartnerToDelete(partner);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Verwijderen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Partner verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je <strong>{partnerToDelete?.name}</strong> wilt verwijderen? 
              Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePartner}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Verwijderen..." : "Verwijderen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const AdminPartners = () => {
  return (
    <>
      <Helmet>
        <title>Partners | Admin Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AdminLayout>
        <AdminPartnersContent />
      </AdminLayout>
    </>
  );
};

export default AdminPartners;
