import { useState, useEffect, ReactNode } from "react";
import { useNavigate, Link, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Building2,
  Menu,
  ShieldCheck,
  Receipt,
  Package,
  BookOpen,
  BedDouble,
  UtensilsCrossed,
  DoorOpen,
  CalendarDays,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@/assets/logo.png";
import { ChatWidget } from "@/components/chat/ChatWidget";

interface PartnerLayoutProps {
  children: ReactNode;
}

interface PartnerInfo {
  id: string;
  name: string;
  email: string;
  partner_token: string;
  commission_percentage: number;
  partner_type: string | null;
}

const PartnerSidebar = ({ partner, onLogout, isImpersonating }: { partner: PartnerInfo; onLogout: () => void; isImpersonating?: boolean }) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  // Preserve impersonate param in URLs
  const impersonateParam = searchParams.get("impersonate");
  const urlSuffix = impersonateParam ? `?impersonate=${impersonateParam}` : "";

  // Check if partner handles activities or accommodation
  const isActivityPartner = partner.partner_type === "activity_provider" || partner.partner_type === "both" || !partner.partner_type;
  const isAccommodationPartner = partner.partner_type === "accommodation" || partner.partner_type === "both";

  const menuItems = [
    { title: "Overzicht", url: `/partner/dashboard${urlSuffix}`, icon: LayoutDashboard },
    // Alleen tonen als partner activiteiten levert
    ...(isActivityPartner ? [{ title: "Mijn Aanbod", url: `/partner/aanbod${urlSuffix}`, icon: Package }] : []),
    // Alleen tonen als partner logies levert
    ...(isAccommodationPartner ? [
      { title: "Logies", url: `/partner/logies${urlSuffix}`, icon: BedDouble },
      { title: "Kamersoorten", url: `/partner/kamersoorten${urlSuffix}`, icon: DoorOpen },
      { title: "Extra's", url: `/partner/extras${urlSuffix}`, icon: UtensilsCrossed },
    ] : []),
    { title: "Facturatie", url: `/partner/facturatie${urlSuffix}`, icon: Receipt },
    { title: "Handleidingen", url: `/partner/handleidingen${urlSuffix}`, icon: BookOpen },
    { title: "Instellingen", url: `/partner/instellingen${urlSuffix}`, icon: Settings },
  ];

  const isActive = (path: string) => {
    const currentPath = location.pathname + location.search;
    return currentPath === path || location.pathname === path.split("?")[0];
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <div className="p-4 border-b">
        <Link to={`/partner/dashboard${urlSuffix}`} className="flex items-center gap-2">
          {!collapsed && <img src={logoImage} alt="Bureau Vlieland" className="h-8" />}
          {collapsed && (
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
          )}
        </Link>
      </div>

      <SidebarContent className="flex flex-col h-[calc(100vh-65px)]">
        {/* Admin impersonation banner */}
        {isImpersonating && !collapsed && (
          <div className="p-3 bg-amber-50 border-b border-amber-200">
            <div className="flex items-center gap-2 text-amber-800">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs font-medium">Admin weergave</span>
            </div>
          </div>
        )}

        {/* Partner info */}
        {!collapsed && (
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{partner.name}</p>
                <p className="text-xs text-muted-foreground truncate">{partner.email}</p>
              </div>
            </div>
          </div>
        )}

        <SidebarGroup className="flex-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout/Back button at bottom */}
        <div className="p-4 border-t mt-auto">
          <Button 
            onClick={onLogout} 
            variant="ghost" 
            className={collapsed ? "w-full p-2" : "w-full justify-start"}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">{isImpersonating ? "Terug naar admin" : "Uitloggen"}</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export const PartnerLayout = ({ children }: PartnerLayoutProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/partner/login");
        return;
      }

      // Check if admin is impersonating a partner
      const impersonatePartnerId = searchParams.get("impersonate");
      
      if (impersonatePartnerId) {
        // Verify user is an admin
        const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: session.user.id });
        
        if (isAdmin) {
          // Fetch the impersonated partner
          const { data: partnerData, error } = await supabase
            .from("partners")
            .select("id, name, email, partner_token, commission_percentage, partner_type")
            .eq("id", impersonatePartnerId)
            .single();

          if (error || !partnerData) {
            toast({
              title: "Partner niet gevonden",
              description: "Deze partner bestaat niet of is niet toegankelijk.",
              variant: "destructive",
            });
            navigate("/admin/partners");
            return;
          }

          setPartner(partnerData);
          setIsImpersonating(true);
          setIsLoading(false);
          return;
        }
      }

      // Regular partner login flow
      const { data: partnerData, error } = await supabase
        .from("partners")
        .select("id, name, email, partner_token, commission_percentage, partner_type")
        .eq("auth_user_id", session.user.id)
        .eq("is_active", true)
        .single();

      if (error || !partnerData) {
        navigate("/partner/login");
        return;
      }

      setPartner(partnerData);
      setIsLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        navigate("/partner/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams, toast]);

  const handleLogout = async () => {
    if (isImpersonating) {
      // Admin impersonating - just go back to admin
      navigate("/admin/partners");
      return;
    }
    
    await supabase.auth.signOut();
    toast({
      title: "Uitgelogd",
      description: "U bent succesvol uitgelogd.",
    });
    navigate("/partner/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!partner) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <PartnerSidebar partner={partner} onLogout={handleLogout} isImpersonating={isImpersonating} />
        
        <div className="flex-1 flex flex-col">
          {/* Mobile header */}
          <header className="h-14 border-b flex items-center px-4 lg:hidden">
            {isImpersonating && (
              <Badge variant="outline" className="mr-2 bg-amber-50 text-amber-800 border-amber-200">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}
            <SidebarTrigger>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SidebarTrigger>
            <Link to="/partner/dashboard" className="ml-2">
              <img src={logoImage} alt="Bureau Vlieland" className="h-6" />
            </Link>
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>

        {/* Chat Widget */}
        <ChatWidget
          source="partner_portal"
          sourcePartnerId={partner.id}
          visitorName={partner.name}
          visitorEmail={partner.email}
        />
      </div>
    </SidebarProvider>
  );
};

export { type PartnerInfo };