import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { CartProvider } from "@/contexts/CartContext";
import { GlobalCartDrawer } from "@/components/configurator/GlobalCartDrawer";
import { FeatureGate } from "@/components/FeatureGate";
import { recordEntryPage } from "@/lib/entryPageTracker";

// Eagerly loaded public pages (landing & SEO critical)
import Index from "./pages/Index";
import { Terms } from "./pages/Terms";
import { PartnerTerms } from "./pages/PartnerTerms";
import NotFound from "./pages/NotFound";
import ComingSoon from "./pages/ComingSoon";
import Diensten from "./pages/Diensten";
import VoorWie from "./pages/VoorWie";
import OverOns from "./pages/OverOns";
import Contact from "./pages/Contact";

// Lazy-loaded public pages
const Catering = lazy(() => import("./pages/Catering"));
const Voorbeeldprogrammas = lazy(() => import("./pages/Voorbeeldprogrammas"));
const VoorbeeldprogrammaOverzicht = lazy(() => import("./pages/VoorbeeldprogrammaOverzicht"));
const Programmas = lazy(() => import("./pages/Programmas"));
const Evenementen = lazy(() => import("./pages/Evenementen"));
const Offerte = lazy(() => import("./pages/Offerte"));
const BedrijfsuitjeVlieland = lazy(() => import("./pages/BedrijfsuitjeVlieland"));
const TeamuitjeVlieland = lazy(() => import("./pages/TeamuitjeVlieland"));
const MeerdaagsBedrijfsuitjeVlieland = lazy(() => import("./pages/MeerdaagsBedrijfsuitjeVlieland"));
const HeisessieVlieland = lazy(() => import("./pages/HeisessieVlieland"));
const BedrijfsuitjeIdeeenVlieland = lazy(() => import("./pages/BedrijfsuitjeIdeeenVlieland"));
const IncentiveReisVlieland = lazy(() => import("./pages/IncentiveReisVlieland"));
const ZakelijkEvenementVlieland = lazy(() => import("./pages/ZakelijkEvenementVlieland"));
const TrouwenOpVlieland = lazy(() => import("./pages/TrouwenOpVlieland"));
const GroepsweekendVlieland = lazy(() => import("./pages/GroepsweekendVlieland"));
const JubileumVlieland = lazy(() => import("./pages/JubileumVlieland"));
const FamilieweekendVlieland = lazy(() => import("./pages/FamilieweekendVlieland"));
const ProgrammaSamenstellen = lazy(() => import("./pages/ProgrammaSamenstellen"));
const SharedProgram = lazy(() => import("./pages/SharedProgram"));
const CustomerProgram = lazy(() => import("./pages/CustomerProgram"));
const LogiesAanvragen = lazy(() => import("./pages/LogiesAanvragen"));
const LogiesVlieland = lazy(() => import("./pages/LogiesVlieland"));
const AccommodationQuotes = lazy(() => import("./pages/AccommodationQuotes"));
const ActiviteitenBoeken = lazy(() => import("./pages/ActiviteitenBoeken"));

// Lazy-loaded partner pages
const PartnerPortal = lazy(() => import("./pages/PartnerPortal"));
const PartnerLogin = lazy(() => import("./pages/PartnerLogin"));
const PartnerDashboard = lazy(() => import("./pages/PartnerDashboard"));
const PartnerFinance = lazy(() => import("./pages/PartnerFinance"));
const PartnerBlocks = lazy(() => import("./pages/PartnerBlocks"));
const PartnerSettings = lazy(() => import("./pages/PartnerSettings"));
const PartnerAccommodation = lazy(() => import("./pages/PartnerAccommodation"));
const PartnerExtras = lazy(() => import("./pages/PartnerExtras"));
const PartnerRoomTypes = lazy(() => import("./pages/PartnerRoomTypes"));
const PartnerGuides = lazy(() => import("./pages/PartnerGuides"));
const PartnerResetPassword = lazy(() => import("./pages/PartnerResetPassword"));

// Lazy-loaded admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminCRM = lazy(() => import("./pages/admin/AdminCRM"));
const AdminRequests = lazy(() => import("./pages/admin/AdminRequests"));
const AdminRequestDetail = lazy(() => import("./pages/admin/AdminRequestDetail"));
const AdminPartners = lazy(() => import("./pages/admin/AdminPartners"));
const AdminPartnerDetail = lazy(() => import("./pages/admin/AdminPartnerDetail"));
const AdminTodos = lazy(() => import("./pages/admin/AdminTodos"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));
const AdminEmailTemplates = lazy(() => import("./pages/admin/AdminEmailTemplates"));
const AdminCommissions = lazy(() => import("./pages/admin/AdminCommissions"));
const AdminBuildingBlocks = lazy(() => import("./pages/admin/AdminBuildingBlocks"));
const AdminInvoicing = lazy(() => import("./pages/admin/AdminInvoicing"));
const AdminAccommodation = lazy(() => import("./pages/admin/AdminAccommodation"));
const AdminAccommodationDetail = lazy(() => import("./pages/admin/AdminAccommodationDetail"));
const AdminProjects = lazy(() => import("./pages/admin/AdminProjects"));
const AdminProgramNew = lazy(() => import("./pages/admin/AdminProgramNew"));
const AdminQuotePreview = lazy(() => import("./pages/admin/AdminQuotePreview"));
const AdminInvoicePreview = lazy(() => import("./pages/admin/AdminInvoicePreview"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminMedia = lazy(() => import("./pages/admin/AdminMedia"));
const AdminTemplates = lazy(() => import("./pages/admin/AdminTemplates"));
const AdminPurchaseInvoices = lazy(() => import("./pages/admin/AdminPurchaseInvoices"));
const AdminChat = lazy(() => import("./pages/admin/AdminChat"));
const AdminFinancialDashboard = lazy(() => import("./pages/admin/AdminFinancialDashboard"));
const AdminPlanning = lazy(() => import("./pages/admin/AdminPlanning"));

const queryClient = new QueryClient();

const App = () => {
  // Record entry page on first load for SEA attribution
  useEffect(() => {
    recordEntryPage();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <CartProvider>
          <ScrollToTop />
          <GlobalCartDrawer />
          <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/diensten" element={<Diensten />} />
            <Route path="/voor-wie" element={<VoorWie />} />
            <Route path="/samenwerken" element={<Programmas />} />
            <Route path="/bouwstenen" element={<Voorbeeldprogrammas />} />
            <Route path="/voorbeeldprogrammas" element={<VoorbeeldprogrammaOverzicht />} />
            <Route path="/catering" element={<Catering />} />
            <Route path="/over-ons" element={<OverOns />} />
            <Route path="/evenementen" element={<Evenementen />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/offerte" element={<Offerte />} />
            <Route path="/algemene-voorwaarden" element={<Terms />} />
            <Route path="/partner-voorwaarden" element={<PartnerTerms />} />
            <Route path="/bedrijfsuitje-vlieland" element={<BedrijfsuitjeVlieland />} />
            <Route path="/teamuitje-vlieland" element={<TeamuitjeVlieland />} />
            <Route path="/meerdaags-bedrijfsuitje-vlieland" element={<MeerdaagsBedrijfsuitjeVlieland />} />
            <Route path="/heisessie-vlieland" element={<HeisessieVlieland />} />
            <Route path="/bedrijfsuitje-ideeen-vlieland" element={<BedrijfsuitjeIdeeenVlieland />} />
            <Route path="/incentive-reis-vlieland" element={<IncentiveReisVlieland />} />
            <Route path="/zakelijk-evenement-vlieland" element={<ZakelijkEvenementVlieland />} />
            <Route path="/trouwen-op-vlieland" element={<TrouwenOpVlieland />} />
            <Route path="/groepsweekend-vlieland" element={<GroepsweekendVlieland />} />
            <Route path="/jubileum-vlieland" element={<JubileumVlieland />} />
            <Route path="/familieweekend-vlieland" element={<FamilieweekendVlieland />} />
            <Route path="/programma-samenstellen" element={
              <FeatureGate featureKey="customer_portal_enabled">
                <ProgrammaSamenstellen />
              </FeatureGate>
            } />
            <Route path="/logies-vlieland" element={<LogiesVlieland />} />
            <Route path="/activiteiten-boeken" element={<ActiviteitenBoeken />} />
            <Route path="/logies-aanvragen" element={
              <FeatureGate featureKey="customer_portal_enabled">
                <LogiesAanvragen />
              </FeatureGate>
            } />
            <Route path="/programma/:shareCode" element={
              <FeatureGate featureKey="customer_portal_enabled">
                <SharedProgram />
              </FeatureGate>
            } />
            <Route path="/mijn-programma/:token" element={
              <FeatureGate featureKey="customer_portal_enabled">
                <CustomerProgram />
              </FeatureGate>
            } />
            <Route path="/mijn-logies/:token" element={
              <FeatureGate featureKey="customer_portal_enabled">
                <AccommodationQuotes />
              </FeatureGate>
            } />
            {/* Coming soon page */}
            <Route path="/binnenkort" element={<ComingSoon />} />
            <Route path="/partner" element={<Navigate to="/partner/login" replace />} />
            <Route path="/partner/login" element={<PartnerLogin />} />
            <Route path="/partner/:token" element={<PartnerPortal />} />
            <Route path="/partner/dashboard" element={<PartnerDashboard />} />
            <Route path="/partner/aanbod" element={<PartnerBlocks />} />
            <Route path="/partner/facturatie" element={<PartnerFinance />} />
            <Route path="/partner/instellingen" element={<PartnerSettings />} />
            <Route path="/partner/logies" element={<PartnerAccommodation />} />
            <Route path="/partner/extras" element={<PartnerExtras />} />
            <Route path="/partner/kamersoorten" element={<PartnerRoomTypes />} />
            <Route path="/partner/handleidingen" element={<PartnerGuides />} />
            <Route path="/partner/reset-password" element={<PartnerResetPassword />} />
            {/* Admin routes */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/projecten" element={<AdminProjects />} />
            <Route path="/admin/programma-nieuw" element={<AdminProgramNew />} />
            <Route path="/admin/crm" element={<AdminCRM />} />
            <Route path="/admin/partners" element={<Navigate to="/admin/crm?tab=partners" replace />} />
            <Route path="/admin/aanvragen" element={<AdminRequests />} />
            <Route path="/admin/aanvragen/:id" element={<AdminRequestDetail />} />
            <Route path="/admin/projecten/:id" element={<AdminRequestDetail />} />
            <Route path="/admin/projecten/:id/offerte-preview" element={<AdminQuotePreview />} />
            <Route path="/admin/aanvragen/:id/factuur" element={<AdminInvoicePreview />} />
            <Route path="/admin/projecten/:id/factuur" element={<AdminInvoicePreview />} />
            <Route path="/admin/partners" element={<AdminPartners />} />
            <Route path="/admin/partners/:id" element={<AdminPartnerDetail />} />
            <Route path="/admin/todos" element={<AdminTodos />} />
            <Route path="/admin/logs" element={<AdminLogs />} />
            <Route path="/admin/berichten" element={<AdminMessages />} />
            <Route path="/admin/berichten/templates" element={<AdminEmailTemplates />} />
            <Route path="/admin/commissies" element={<AdminCommissions />} />
            <Route path="/admin/facturatie" element={<AdminInvoicing />} />
            <Route path="/admin/inkoopfacturen" element={<AdminPurchaseInvoices />} />
            <Route path="/admin/bouwstenen" element={<AdminBuildingBlocks />} />
            <Route path="/admin/templates" element={<AdminTemplates />} />
            <Route path="/admin/media" element={<AdminMedia />} />
            <Route path="/admin/logies" element={<AdminAccommodation />} />
            <Route path="/admin/logies/:id" element={<AdminAccommodationDetail />} />
            <Route path="/admin/instellingen" element={<AdminSettings />} />
            <Route path="/admin/chat" element={<AdminChat />} />
            <Route path="/admin/financieel" element={<AdminFinancialDashboard />} />
            <Route path="/admin/planning" element={<AdminPlanning />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </CartProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
