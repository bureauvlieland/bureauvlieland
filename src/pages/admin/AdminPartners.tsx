import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertTriangle,
  CalendarOff,
  RotateCcw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity } from "@/lib/adminLogger";
import { usePartnerUnavailability } from "@/hooks/usePartnerUnavailability";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { PartnerOnboardingStats } from "@/components/admin/PartnerOnboardingStats";
import { BulkInviteDialog } from "@/components/admin/BulkInviteDialog";
import { ResetPartnerConnectionsDialog } from "@/components/admin/ResetPartnerConnectionsDialog";

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
  invited_at: string | null;
  password_set_at: string | null;
  last_login_at: string | null;
}

type OnboardingFilter = "all" | "not_invited" | "pending" | "active";

const PARTNER_TYPE_LABELS: Record<string, string> = {
  activity_provider: "Activiteiten",
  accommodation: "Logies",
  both: "Activiteiten & Logies",
};

function getOnboardingStatus(partner: Partner): "not_invited" | "pending" | "active" {
  if (!partner.auth_user_id) return "not_invited";
  if (!partner.password_set_at) return "pending";
  return "active";
}

function OnboardingBadge({ status }: { status: "not_invited" | "pending" | "active" }) {
  switch (status) {
    case "not_invited":
      return <Badge variant="secondary">Niet uitgenodigd</Badge>;
    case "pending":
      return <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">Wacht op activatie</Badge>;
    case "active":
      return <Badge variant="default" className="bg-green-600">Actief</Badge>;
  }
}

const AdminPartnersContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [onboardingFilter, setOnboardingFilter] = useState<OnboardingFilter>("all");
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);
  const [resetConnectionsOpen, setResetConnectionsOpen] = useState(false);
  
  // Get unavailability data for all partners
  const partnerIds = useMemo(() => partners.map(p => p.id), [partners]);
  const { unavailabilityMap } = usePartnerUnavailability(partnerIds);

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

      // Check if partner has accommodation quotes
      const { data: quotes } = await supabase
        .from("accommodation_quotes")
        .select("id")
        .eq("partner_id", partnerToDelete.id)
        .limit(1);
      
      if (quotes && quotes.length > 0) {
        toast({
          title: "Kan partner niet verwijderen",
          description: "Deze partner heeft nog gekoppelde logies offertes. Verwijder eerst de offertes.",
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

  // Calculate stats
  const stats = useMemo(() => {
    const total = partners.length;
    const notInvited = partners.filter(p => !p.auth_user_id).length;
    const pendingActivation = partners.filter(p => p.auth_user_id && !p.password_set_at).length;
    const active = partners.filter(p => p.password_set_at).length;
    const connectedCount = partners.filter(p => p.auth_user_id).length;
    return { total, notInvited, pendingActivation, active, connectedCount };
  }, [partners]);

  // Filter partners
  const filteredPartners = useMemo(() => {
    let result = partners;
    
    // Apply onboarding filter
    if (onboardingFilter !== "all") {
      result = result.filter(p => getOnboardingStatus(p) === onboardingFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        (p.address_city?.toLowerCase().includes(query) ?? false)
      );
    }
    
    return result;
  }, [partners, searchQuery, onboardingFilter]);

  // Selectable partners (only not invited)
  const selectablePartners = useMemo(() => 
    filteredPartners.filter(p => !p.auth_user_id),
    [filteredPartners]
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(selectablePartners.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (partnerId: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(partnerId);
    } else {
      newSet.delete(partnerId);
    }
    setSelectedIds(newSet);
  };

  const selectedPartners = useMemo(() => 
    partners.filter(p => selectedIds.has(p.id)),
    [partners, selectedIds]
  );

  const handleBulkInviteComplete = () => {
    setSelectedIds(new Set());
    fetchPartners();
  };

  const handleResetComplete = () => {
    fetchPartners();
  };

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
        <div className="flex items-center gap-2">
          {stats.connectedCount > 0 && (
            <Button
              variant="outline"
              onClick={() => setResetConnectionsOpen(true)}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset koppelingen
            </Button>
          )}
          <Button onClick={() => navigate("/admin/partners/nieuw")}>
            <Plus className="h-4 w-4 mr-2" />
            Partner toevoegen
          </Button>
        </div>
      </div>

      {/* Onboarding stats */}
      <PartnerOnboardingStats
        total={stats.total}
        notInvited={stats.notInvited}
        pendingActivation={stats.pendingActivation}
        active={stats.active}
      />

      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Zoek op naam, email of plaats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={onboardingFilter} onValueChange={(v) => setOnboardingFilter(v as OnboardingFilter)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter op status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle partners</SelectItem>
            <SelectItem value="not_invited">Niet uitgenodigd</SelectItem>
            <SelectItem value="pending">Wacht op activatie</SelectItem>
            <SelectItem value="active">Actief</SelectItem>
          </SelectContent>
        </Select>
        {selectedIds.size > 0 && (
          <Button onClick={() => setBulkInviteOpen(true)}>
            <Mail className="h-4 w-4 mr-2" />
            {selectedIds.size} partner{selectedIds.size === 1 ? "" : "s"} uitnodigen
          </Button>
        )}
      </div>

      {/* Partners table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectablePartners.length > 0 && selectedIds.size === selectablePartners.length}
                    onCheckedChange={handleSelectAll}
                    disabled={selectablePartners.length === 0}
                  />
                </TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Adres</TableHead>
                <TableHead>Commissie</TableHead>
                <TableHead>Voorwaarden</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actief</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                    Geen partners gevonden
                  </TableCell>
                </TableRow>
              ) : (
                filteredPartners.map((partner) => {
                  const unavailability = unavailabilityMap[partner.id];
                  const isCurrentlyUnavailable = unavailability?.isCurrentlyUnavailable || false;
                  const hasUpcoming = unavailability?.hasUpcoming || false;
                  const currentPeriod = unavailability?.periods?.find(p => {
                    const today = new Date();
                    const start = new Date(p.start_date);
                    const end = new Date(p.end_date);
                    return today >= start && today <= end;
                  });
                  const onboardingStatus = getOnboardingStatus(partner);
                  const isSelectable = !partner.auth_user_id;
                  
                  return (
                  <TableRow key={partner.id} className={isCurrentlyUnavailable ? "bg-amber-50/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(partner.id)}
                        onCheckedChange={(checked) => handleSelectOne(partner.id, !!checked)}
                        disabled={!isSelectable}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          isCurrentlyUnavailable ? "bg-amber-100" : "bg-slate-100"
                        }`}>
                          {isCurrentlyUnavailable ? (
                            <CalendarOff className="h-5 w-5 text-amber-600" />
                          ) : (
                            <Building2 className="h-5 w-5 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{partner.name}</p>
                            {isCurrentlyUnavailable && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Niet beschikbaar
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-sm">
                                      <p className="font-medium">Geblokkeerd tot {currentPeriod && format(new Date(currentPeriod.end_date), "d MMM yyyy", { locale: nl })}</p>
                                      {currentPeriod?.reason && (
                                        <p className="text-slate-400">{currentPeriod.reason}</p>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {!isCurrentlyUnavailable && hasUpcoming && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 text-amber-700 border-amber-300 bg-amber-50">
                                      <CalendarOff className="h-3 w-3 mr-1" />
                                      Binnenkort
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-sm">Heeft geplande onbeschikbaarheid</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
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
                      <OnboardingBadge status={onboardingStatus} />
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
                              onClick={() => {
                                setSelectedIds(new Set([partner.id]));
                                setBulkInviteOpen(true);
                              }}
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
                  );
                })
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

      {/* Bulk invite dialog */}
      <BulkInviteDialog
        open={bulkInviteOpen}
        onOpenChange={setBulkInviteOpen}
        partners={selectedPartners}
        onComplete={handleBulkInviteComplete}
      />

      {/* Reset connections dialog */}
      <ResetPartnerConnectionsDialog
        open={resetConnectionsOpen}
        onOpenChange={setResetConnectionsOpen}
        connectedCount={stats.connectedCount}
        onComplete={handleResetComplete}
      />
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
