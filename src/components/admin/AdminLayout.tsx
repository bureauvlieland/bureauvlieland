import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  LogOut,
  Menu,
  Shield,
  Euro,
  Blocks,
  FolderKanban,
  ImageIcon,
  Settings,
  LayoutTemplate,
  Receipt,
  HandCoins,
  ChevronDown,
  MessageCircle,
  Hotel,
} from "lucide-react";
import logo from "@/assets/logo.png";

interface AdminLayoutProps {
  children: ReactNode;
}

interface AdminInfo {
  id: string;
  email: string;
}

interface MenuSection {
  label: string;
  items: { title: string; url: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[];
  collapsible?: boolean;
}

const useOpenTodoCount = () => {
  return useQuery({
    queryKey: ["admin-todo-count"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { count, error } = await supabase
        .from("admin_todos")
        .select("id", { count: "exact", head: true })
        .in("status", ["todo", "in_progress"])
        .or(`snoozed_until.is.null,snoozed_until.lte.${today}`);
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 60000,
  });
};

const AdminSidebar = ({ admin, onLogout }: { admin: AdminInfo; onLogout: () => void }) => {
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { data: todoCount = 0 } = useOpenTodoCount();

  const menuSections: MenuSection[] = [
    {
      label: "Operationeel",
      items: [
        { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
        { title: "Taken", url: "/admin/todos", icon: ClipboardList, badge: todoCount },
        { title: "Projecten", url: "/admin/projecten", icon: FolderKanban },
        { title: "CRM", url: "/admin/crm", icon: Users },
        { title: "Chat", url: "/admin/chat", icon: MessageCircle },
      ],
    },
    {
      label: "Content",
      items: [
        { title: "Bouwstenen", url: "/admin/bouwstenen", icon: Blocks },
        { title: "Templates", url: "/admin/templates", icon: LayoutTemplate },
        { title: "Media", url: "/admin/media", icon: ImageIcon },
      ],
    },
    {
      label: "Financiën",
      collapsible: true,
      items: [
        { title: "Facturatie", url: "/admin/facturatie", icon: Euro },
        { title: "Inkoopfacturen", url: "/admin/inkoopfacturen", icon: Receipt },
        { title: "Commissies", url: "/admin/commissies", icon: HandCoins },
      ],
    },
    {
      label: "Systeem",
      items: [
        { title: "Instellingen", url: "/admin/instellingen", icon: Settings },
      ],
    },
  ];

  const isItemActive = (url: string) => location.pathname === url;
  const isSectionActive = (section: MenuSection) =>
    section.items.some((item) => isItemActive(item.url));

  const renderMenuItems = (items: MenuSection["items"]) => (
    <SidebarMenu>
      {items.map((item) => {
        const isActive = isItemActive(item.url);
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
                {!isCollapsed && (
                  <span className="flex-1 flex items-center justify-between">
                    <span>{item.title}</span>
                    {item.badge && item.badge > 0 ? (
                      <Badge className="bg-amber-500 text-white text-[10px] h-5 min-w-5 flex items-center justify-center px-1.5">
                        {item.badge > 99 ? "99+" : item.badge}
                      </Badge>
                    ) : null}
                  </span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

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
        <div className="flex-1 overflow-y-auto py-2">
          {menuSections.map((section) => {
            if (section.collapsible && !isCollapsed) {
              return (
                <Collapsible
                  key={section.label}
                  defaultOpen={isSectionActive(section)}
                  className="px-2 py-1"
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-xs uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors">
                    <span>{section.label}</span>
                    <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {renderMenuItems(section.items)}
                  </CollapsibleContent>
                </Collapsible>
              );
            }

            return (
              <SidebarGroup key={section.label} className="py-1">
                {!isCollapsed && (
                  <SidebarGroupLabel className="text-slate-400 text-xs uppercase tracking-wider px-4">
                    {section.label}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  {renderMenuItems(section.items)}
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </div>

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

        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (roleError || !roleData) {
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
        
        <div className="flex-1 flex flex-col min-w-0">
          <header className="lg:hidden h-14 border-b bg-white flex items-center px-4 gap-4">
            <SidebarTrigger>
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <span className="font-semibold text-slate-900">Admin</span>
          </header>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
