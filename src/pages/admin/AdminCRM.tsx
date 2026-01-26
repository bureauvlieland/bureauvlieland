import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Users,
  Building2,
  MoreVertical,
  LogIn,
  Mail,
  Phone,
  FileText,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity } from "@/lib/adminLogger";

interface Customer {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_company: string | null;
  customer_token: string;
  status: string;
  created_at: string;
  request_count: number;
}

interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  commission_percentage: number;
  auth_user_id: string | null;
  partner_token: string;
  created_at: string;
  item_count: number;
}

const AdminCRMContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("customers");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch unique customers from program_requests
        const { data: requests, error: reqError } = await supabase
          .from("program_requests")
          .select("*")
          .order("created_at", { ascending: false });

        if (reqError) throw reqError;

        // Group by email to get unique customers
        const customerMap = new Map<string, Customer>();
        (requests || []).forEach((req) => {
          const existing = customerMap.get(req.customer_email);
          if (existing) {
            existing.request_count++;
          } else {
            customerMap.set(req.customer_email, {
              id: req.id,
              customer_name: req.customer_name,
              customer_email: req.customer_email,
              customer_phone: req.customer_phone,
              customer_company: req.customer_company,
              customer_token: req.customer_token,
              status: req.status,
              created_at: req.created_at,
              request_count: 1,
            });
          }
        });
        setCustomers(Array.from(customerMap.values()));

        // Fetch partners with item counts
        const { data: partnersData, error: partnerError } = await supabase
          .from("partners")
          .select("*")
          .order("name", { ascending: true });

        if (partnerError) throw partnerError;

        // Get item counts per partner
        const { data: items, error: itemError } = await supabase
          .from("program_request_items")
          .select("provider_id");

        if (itemError) throw itemError;

        const itemCounts = new Map<string, number>();
        (items || []).forEach((item) => {
          itemCounts.set(item.provider_id, (itemCounts.get(item.provider_id) || 0) + 1);
        });

        setPartners(
          (partnersData || []).map((p) => ({
            ...p,
            item_count: itemCounts.get(p.id) || 0,
          }))
        );
      } catch (error) {
        console.error("Error fetching CRM data:", error);
        toast({
          title: "Fout",
          description: "Kon gegevens niet laden",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  // Filter and sort
  const filteredCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        const query = searchQuery.toLowerCase();
        return (
          c.customer_name.toLowerCase().includes(query) ||
          c.customer_email.toLowerCase().includes(query) ||
          (c.customer_company?.toLowerCase().includes(query) ?? false)
        );
      })
      .sort((a, b) => a.customer_name.localeCompare(b.customer_name));
  }, [customers, searchQuery]);

  const filteredPartners = useMemo(() => {
    return partners
      .filter((p) => {
        const query = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.email.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [partners, searchQuery]);

  const handleImpersonateCustomer = (token: string) => {
    window.open(`/mijn-programma/${token}`, "_blank");
  };

  const handleImpersonatePartner = (token: string) => {
    // Since we removed token access, navigate to partner dashboard
    // For now, open the legacy token URL which redirects to login
    window.open(`/partner/${token}`, "_blank");
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

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 w-full max-w-md" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">CRM</h1>
        <p className="text-slate-600">Beheer klanten en partners</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Zoek op naam, email of bedrijf..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="customers" className="gap-2">
            <Users className="h-4 w-4" />
            Klanten
            <Badge variant="secondary" className="ml-1">
              {filteredCustomers.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="partners" className="gap-2">
            <Building2 className="h-4 w-4" />
            Partners
            <Badge variant="secondary" className="ml-1">
              {filteredPartners.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Customers tab */}
        <TabsContent value="customers" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead>Bedrijf</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Aanvragen</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        Geen klanten gevonden
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.customer_name}</TableCell>
                        <TableCell>{customer.customer_company || "-"}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-slate-400" />
                              <a
                                href={`mailto:${customer.customer_email}`}
                                className="text-blue-600 hover:underline"
                              >
                                {customer.customer_email}
                              </a>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-slate-500">
                              <Phone className="h-3 w-3 text-slate-400" />
                              {customer.customer_phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <FileText className="h-3 w-3 mr-1" />
                            {customer.request_count}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={customer.status === "active" ? "default" : "secondary"}
                          >
                            {customer.status === "active" ? "Actief" : customer.status}
                          </Badge>
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
                                onClick={() => navigate(`/admin/aanvragen?customer=${customer.customer_email}`)}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Bekijk aanvragen
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleImpersonateCustomer(customer.customer_token)}
                              >
                                <LogIn className="h-4 w-4 mr-2" />
                                Inloggen als klant
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
        </TabsContent>

        {/* Partners tab */}
        <TabsContent value="partners" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Partners</CardTitle>
              <Button onClick={() => navigate("/admin/partners/nieuw")}>
                Partner toevoegen
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Commissie</TableHead>
                    <TableHead>Activiteiten</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPartners.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        Geen partners gevonden
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPartners.map((partner) => (
                      <TableRow key={partner.id}>
                        <TableCell className="font-medium">{partner.name}</TableCell>
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
                        <TableCell>{partner.commission_percentage}%</TableCell>
                        <TableCell>
                          <Badge variant="outline">{partner.item_count}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={partner.is_active ? "default" : "secondary"}>
                            {partner.is_active ? "Actief" : "Inactief"}
                          </Badge>
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
                                <Building2 className="h-4 w-4 mr-2" />
                                Bewerken
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleImpersonatePartner(partner.partner_token)}
                              >
                                <LogIn className="h-4 w-4 mr-2" />
                                Bekijk portal
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
        </TabsContent>
      </Tabs>

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

const AdminCRM = () => {
  return (
    <>
      <Helmet>
        <title>CRM | Admin Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AdminLayout>
        <AdminCRMContent />
      </AdminLayout>
    </>
  );
};

export default AdminCRM;
