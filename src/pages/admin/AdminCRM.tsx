import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Pencil,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { AdminPartnersContent } from "@/pages/admin/AdminPartners";
import { EditCustomerDialog, type EditableCustomer } from "@/components/admin/EditCustomerDialog";

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

const AdminCRMContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editing, setEditing] = useState<EditableCustomer | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const activeTab = searchParams.get("tab") || "customers";
  const setActiveTab = (tab: string) => {
    setSearchParams(tab === "customers" ? {} : { tab });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: requests, error: reqError } = await supabase
          .from("program_requests")
          .select("*")
          .order("created_at", { ascending: false });

        if (reqError) throw reqError;

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
  }, [toast, refreshKey]);

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

  const handleImpersonateCustomer = (token: string) => {
    window.open(`/mijn-programma/${token}`, "_blank");
  };

  if (isLoading && activeTab === "customers") {
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
        <h1 className="text-2xl font-bold text-foreground">CRM</h1>
        <p className="text-muted-foreground">Beheer klanten en partners</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="customers" className="gap-2">
            <Users className="h-4 w-4" />
            Klanten
            {activeTab === "customers" && (
              <Badge variant="secondary" className="ml-1">
                {filteredCustomers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="partners" className="gap-2">
            <Building2 className="h-4 w-4" />
            Partners
          </TabsTrigger>
        </TabsList>

        {/* Customers tab */}
        <TabsContent value="customers" className="mt-4 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam, email of bedrijf..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
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
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <a
                                href={`mailto:${customer.customer_email}`}
                                className="text-primary hover:underline"
                              >
                                {customer.customer_email}
                              </a>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
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
                              <DropdownMenuItem
                                onClick={() =>
                                  setEditing({
                                    customer_name: customer.customer_name,
                                    customer_email: customer.customer_email,
                                    customer_phone: customer.customer_phone,
                                    customer_company: customer.customer_company,
                                  })
                                }
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Gegevens bewerken
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

        {/* Partners tab — full content from AdminPartners */}
        <TabsContent value="partners" className="mt-4">
          <AdminPartnersContent />
        </TabsContent>
      </Tabs>
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
