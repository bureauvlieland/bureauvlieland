import { useState, useEffect, ReactNode } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
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
import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Building2,
  Menu
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@/assets/logo.png";

interface PartnerLayoutProps {
  children: ReactNode;
}

interface PartnerInfo {
  id: string;
  name: string;
  email: string;
  partner_token: string;
  commission_percentage: number;
}

const PartnerSidebar = ({ partner, onLogout }: { partner: PartnerInfo; onLogout: () => void }) => {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const menuItems = [
    { title: "Dashboard", url: "/partner/dashboard", icon: LayoutDashboard },
    { title: "Instellingen", url: "/partner/instellingen", icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r">
      <div className="p-4 border-b">
        <Link to="/partner/dashboard" className="flex items-center gap-2">
          {!collapsed && <img src={logoImage} alt="Bureau Vlieland" className="h-8" />}
          {collapsed && (
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
          )}
        </Link>
      </div>

      <SidebarContent className="flex flex-col h-[calc(100vh-65px)]">
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

        {/* Logout button at bottom */}
        <div className="p-4 border-t mt-auto">
          <Button 
            onClick={onLogout} 
            variant="ghost" 
            className={collapsed ? "w-full p-2" : "w-full justify-start"}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Uitloggen</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export const PartnerLayout = ({ children }: PartnerLayoutProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/partner/login");
        return;
      }

      const { data: partnerData, error } = await supabase
        .from("partners")
        .select("id, name, email, partner_token, commission_percentage")
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
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Uitgelogd",
      description: "Je bent succesvol uitgelogd.",
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
        <PartnerSidebar partner={partner} onLogout={handleLogout} />
        
        <div className="flex-1 flex flex-col">
          {/* Mobile header */}
          <header className="h-14 border-b flex items-center px-4 lg:hidden">
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
      </div>
    </SidebarProvider>
  );
};

export { type PartnerInfo };
