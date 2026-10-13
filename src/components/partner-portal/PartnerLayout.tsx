import { useState, useEffect, type ReactNode } from "react";
import { useNavigate, Link, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LoadingState, Pill } from "@/components/system";
import { LogOut, Building2, Menu, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@/assets/logo.png";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { usePartnerCompleteness } from "@/hooks/usePartnerCompleteness";
import { partnerMenu, profileStrengthTone } from "@/lib/partnerPortalView";
import { PartnerPortalProvider } from "./PartnerPortalContext";
import { impersonateSuffix, type PartnerInfo } from "@/lib/partnerPortalContext";

export { type PartnerInfo };

const PARTNER_COLUMNS = "id, name, email, contact_email, partner_token, commission_percentage, accommodation_commission_percentage, partner_type, map_tenant_slug, accommodation_description";

const PartnerProfileStrength = ({ score, urlSuffix }: { score: number; urlSuffix: string }) => (
  <Link to={`/partner/profiel${urlSuffix}`} className="block">
    <div className="mb-1 flex items-center justify-between text-xs">
      <span className="text-muted-foreground">Profiel</span>
      <Pill tone={profileStrengthTone(score)} size="sm">
        {score}% compleet
      </Pill>
    </div>
    <Progress value={score} className="h-1.5" />
    {score < 80 && <p className="mt-1 text-xs text-muted-foreground">Vul uw profiel aan voor meer boekingen.</p>}
  </Link>
);

/** Haalt de profielsterkte op; alleen in het echte portaal, niet op de referentiepagina. */
const LiveProfileStrength = ({ partnerId, urlSuffix }: { partnerId: string; urlSuffix: string }) => {
  const { completeness } = usePartnerCompleteness({ partnerId });
  if (!completeness) return null;
  return <PartnerProfileStrength score={completeness.score} urlSuffix={urlSuffix} />;
};

interface PartnerSidebarProps {
  partner: PartnerInfo;
  urlSuffix: string;
  isImpersonating: boolean;
  onLogout: () => void;
  profileStrength?: ReactNode;
}

const PartnerSidebar = ({ partner, urlSuffix, isImpersonating, onLogout, profileStrength }: PartnerSidebarProps) => {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const groups = partnerMenu(partner, urlSuffix);
  const isActive = (url: string) => location.pathname === url.split("?")[0];

  return (
    <Sidebar collapsible="icon" className="border-r">
      <div className="border-b p-4">
        <Link to={`/partner/werkbank${urlSuffix}`} className="flex items-center gap-2">
          {!collapsed && <img src={logoImage} alt="Bureau Vlieland" className="h-8" />}
          {collapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
          )}
        </Link>
      </div>
      <SidebarContent className="flex h-[calc(100vh-65px)] flex-col">
        {isImpersonating && !collapsed && (
          <div className="border-b border-warning/30 bg-warning-soft p-3">
            <div className="flex items-center gap-2 text-warning-foreground">
              <ShieldCheck className="h-4 w-4 text-warning" />
              <span className="text-xs font-medium">Admin weergave</span>
            </div>
          </div>
        )}
        {!collapsed && (
          <div className="space-y-3 border-b p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{partner.name}</p>
                <p className="truncate text-xs text-muted-foreground">{partner.email}</p>
              </div>
            </div>
            {profileStrength}
          </div>
        )}
        <div className="flex-1">
          {groups.map((group) => (
            <SidebarGroup key={group.label}>
              {!collapsed && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
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
          ))}
        </div>
        <div className="mt-auto border-t p-4">
          <Button onClick={onLogout} variant="ghost" className={collapsed ? "w-full p-2" : "w-full justify-start"}>
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">{isImpersonating ? "Terug naar admin" : "Uitloggen"}</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

interface PartnerShellProps {
  partner: PartnerInfo;
  urlSuffix: string;
  isImpersonating: boolean;
  onLogout: () => void;
  profileStrength?: ReactNode;
  children: ReactNode;
}

/**
 * De schil van het partnerportaal zonder authenticatie: zijbalk, de
 * kopbalk op een telefoon en de inhoud. `PartnerLayout` zet er de login
 * omheen; de referentiepagina `/ontwerp/partnerportaal` gebruikt de schil
 * direct met een verzonnen partner.
 */
export const PartnerShell = ({ partner, urlSuffix, isImpersonating, onLogout, profileStrength, children }: PartnerShellProps) => (
  <SidebarProvider>
    <div className="flex min-h-screen w-full">
      <PartnerSidebar partner={partner} urlSuffix={urlSuffix} isImpersonating={isImpersonating} onLogout={onLogout} profileStrength={profileStrength} />
      <div className="flex flex-1 flex-col">
        {/* Kopbalk alleen op een telefoon: vanaf md staat de zijbalk zelf in beeld (use-mobile, 768px). */}
        <header className="flex h-14 items-center border-b px-4 md:hidden">
          {isImpersonating && (
            <Pill tone="warning" size="sm" className="mr-2">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Admin</span>
            </Pill>
          )}
          <SidebarTrigger>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SidebarTrigger>
          <Link to={`/partner/werkbank${urlSuffix}`} className="ml-2">
            <img src={logoImage} alt="Bureau Vlieland" className="h-6" />
          </Link>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  </SidebarProvider>
);

interface PartnerLayoutProps {
  children: ReactNode;
}

export const PartnerLayout = ({ children }: PartnerLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const impersonate = searchParams.get("impersonate");
  const urlSuffix = impersonateSuffix(impersonate);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/partner/login");
        return;
      }
      if (impersonate) {
        const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: session.user.id });
        if (isAdmin) {
          const { data: partnerData, error } = await supabase.from("partners").select(PARTNER_COLUMNS).eq("id", impersonate).single();
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
      const { data: partnerData, error } = await supabase
        .from("partners")
        .select(PARTNER_COLUMNS)
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
      if (event === "SIGNED_OUT") navigate("/partner/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate, impersonate, toast]);

  const handleLogout = async () => {
    if (isImpersonating) {
      navigate("/admin/partners");
      return;
    }
    await supabase.auth.signOut();
    toast({ title: "Uitgelogd", description: "U bent uitgelogd." });
    navigate("/partner/login");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingState label="Partnerportaal laden…" />
      </div>
    );
  }
  if (!partner) return null;

  const accommodationRequestId = location.pathname.match(/^\/partner\/logies\/([^/]+)/)?.[1];

  return (
    <PartnerPortalProvider value={{ partner, isImpersonating, urlSuffix }}>
      <PartnerShell
        partner={partner}
        urlSuffix={urlSuffix}
        isImpersonating={isImpersonating}
        onLogout={handleLogout}
        profileStrength={<LiveProfileStrength partnerId={partner.id} urlSuffix={urlSuffix} />}
      >
        {children}
        <ChatWidget
          source="partner_portal"
          sourcePartnerId={partner.id}
          visitorName={partner.name}
          visitorEmail={partner.email}
          accommodationRequestId={accommodationRequestId}
        />
      </PartnerShell>
    </PartnerPortalProvider>
  );
};
