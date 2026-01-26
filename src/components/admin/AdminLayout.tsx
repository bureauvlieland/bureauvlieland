import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Users,
  FileText,
  Building2,
  ClipboardList,
  LogOut,
  Menu,
  Shield,
  Activity,
  Euro,
  Blocks,
} from "lucide-react";
import logo from "@/assets/logo.png";

interface AdminLayoutProps {
  children: ReactNode;
}

interface AdminInfo {
  id: string;
  email: string;
}

const menuItems = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "CRM", url: "/admin/crm", icon: Users },
  { title: "Aanvragen", url: "/admin/aanvragen", icon: FileText },
  { title: "Partners", url: "/admin/partners", icon: Building2 },
  { title: "Bouwstenen", url: "/admin/bouwstenen", icon: Blocks },
  { title: "Facturatie", url: "/admin/facturatie", icon: Euro },
  { title: "Commissies", url: "/admin/commissies", icon: Euro },
  { title: "Todo's", url: "/admin/todos", icon: ClipboardList },
  { title: "Activiteitenlog", url: "/admin/logs", icon: Activity },
];

const AdminSidebar = ({ admin, onLogout }: { admin: AdminInfo; onLogout: () => void }) => {
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent className="flex flex-col h-full bg-slate-900 text-white">
        {/* Logo */}
        <div className="p-4 border-b border-slate-700">
          <Link to="/admin/dashboard" className="flex items-center gap-3">
            <img src={logo} alt="Bureau Vlieland" className="h-8 w-auto" />
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Admin</span>
                <Shield className="h-4 w-4 text-amber-400" />
              </div>
            )}
          </Link>
        </div>

        {/* Admin info */}
        {!isCollapsed && (
          <div className="px-4 py-3 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 bg-amber-500">
                <AvatarFallback className="bg-amber-500 text-white text-xs">
                  {admin.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 truncate">{admin.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <SidebarGroup className="flex-1">
          <SidebarGroupLabel className="text-slate-400 text-xs uppercase tracking-wider px-4">
            {!isCollapsed && "Beheer"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.url}
                        className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                          isActive
                            ? "bg-amber-500/20 text-amber-400"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout button */}
        <div className="p-4 border-t border-slate-700">
          <Button
            variant="ghost"
            onClick={onLogout}
            className={`w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 ${
              isCollapsed ? "px-2" : ""
            }`}
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span className="ml-3">Uitloggen</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate("/partner/login");
          return;
        }

        // Check if user has admin role
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (roleError || !roleData) {
          // Not an admin, redirect to partner dashboard or login
          navigate("/partner/dashboard");
          return;
        }

        setAdmin({
          id: session.user.id,
          email: session.user.email || "Admin",
        });
        setIsAdmin(true);
      } catch (error) {
        console.error("Error checking admin access:", error);
        navigate("/partner/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        navigate("/partner/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/partner/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex">
        <div className="w-64 bg-slate-900">
          <Skeleton className="h-full w-full" />
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-32 w-full mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin || !admin) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-100">
        <AdminSidebar admin={admin} onLogout={handleLogout} />
        
        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header */}
          <header className="lg:hidden h-14 border-b bg-white flex items-center px-4 gap-4">
            <SidebarTrigger>
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <span className="font-semibold text-slate-900">Admin</span>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
