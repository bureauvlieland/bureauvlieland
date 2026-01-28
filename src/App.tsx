import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { CartProvider } from "@/contexts/CartContext";
import { GlobalCartDrawer } from "@/components/configurator/GlobalCartDrawer";
import Index from "./pages/Index";
import { Terms } from "./pages/Terms";
import NotFound from "./pages/NotFound";
import Catering from "./pages/Catering";
import Voorbeeldprogrammas from "./pages/Voorbeeldprogrammas";
import Programmas from "./pages/Programmas";
import Diensten from "./pages/Diensten";
import VoorWie from "./pages/VoorWie";
import OverOns from "./pages/OverOns";
import Contact from "./pages/Contact";
import Evenementen from "./pages/Evenementen";
import Offerte from "./pages/Offerte";
import BedrijfsuitjeVlieland from "./pages/BedrijfsuitjeVlieland";
import TeamuitjeVlieland from "./pages/TeamuitjeVlieland";
import MeerdaagsBedrijfsuitjeVlieland from "./pages/MeerdaagsBedrijfsuitjeVlieland";
import HeisessieVlieland from "./pages/HeisessieVlieland";
import BedrijfsuitjeIdeeenVlieland from "./pages/BedrijfsuitjeIdeeenVlieland";
import IncentiveReisVlieland from "./pages/IncentiveReisVlieland";
import ZakelijkEvenementVlieland from "./pages/ZakelijkEvenementVlieland";
import TrouwenOpVlieland from "./pages/TrouwenOpVlieland";
import ProgrammaSamenstellen from "./pages/ProgrammaSamenstellen";
import SharedProgram from "./pages/SharedProgram";
import CustomerProgram from "./pages/CustomerProgram";
import PartnerPortal from "./pages/PartnerPortal";
import PartnerLogin from "./pages/PartnerLogin";
import PartnerDashboard from "./pages/PartnerDashboard";
import PartnerFinance from "./pages/PartnerFinance";
import PartnerBlocks from "./pages/PartnerBlocks";
import PartnerSettings from "./pages/PartnerSettings";
import PartnerAccommodation from "./pages/PartnerAccommodation";
import PartnerResetPassword from "./pages/PartnerResetPassword";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCRM from "./pages/admin/AdminCRM";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminRequestDetail from "./pages/admin/AdminRequestDetail";
import AdminPartners from "./pages/admin/AdminPartners";
import AdminPartnerDetail from "./pages/admin/AdminPartnerDetail";
import AdminTodos from "./pages/admin/AdminTodos";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminCommissions from "./pages/admin/AdminCommissions";
import AdminBuildingBlocks from "./pages/admin/AdminBuildingBlocks";
import AdminInvoicing from "./pages/admin/AdminInvoicing";
import AdminAccommodation from "./pages/admin/AdminAccommodation";
import AdminAccommodationDetail from "./pages/admin/AdminAccommodationDetail";
import LogiesAanvragen from "./pages/LogiesAanvragen";
import LogiesVlieland from "./pages/LogiesVlieland";
import AccommodationQuotes from "./pages/AccommodationQuotes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CartProvider>
          <ScrollToTop />
          <GlobalCartDrawer />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/diensten" element={<Diensten />} />
            <Route path="/voor-wie" element={<VoorWie />} />
            <Route path="/samenwerken" element={<Programmas />} />
            <Route path="/bouwstenen" element={<Voorbeeldprogrammas />} />
            <Route path="/catering" element={<Catering />} />
            <Route path="/over-ons" element={<OverOns />} />
            <Route path="/evenementen" element={<Evenementen />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/offerte" element={<Offerte />} />
            <Route path="/algemene-voorwaarden" element={<Terms />} />
            <Route path="/bedrijfsuitje-vlieland" element={<BedrijfsuitjeVlieland />} />
            <Route path="/teamuitje-vlieland" element={<TeamuitjeVlieland />} />
            <Route path="/meerdaags-bedrijfsuitje-vlieland" element={<MeerdaagsBedrijfsuitjeVlieland />} />
            <Route path="/heisessie-vlieland" element={<HeisessieVlieland />} />
            <Route path="/bedrijfsuitje-ideeen-vlieland" element={<BedrijfsuitjeIdeeenVlieland />} />
            <Route path="/incentive-reis-vlieland" element={<IncentiveReisVlieland />} />
            <Route path="/zakelijk-evenement-vlieland" element={<ZakelijkEvenementVlieland />} />
            <Route path="/trouwen-op-vlieland" element={<TrouwenOpVlieland />} />
            <Route path="/programma-samenstellen" element={<ProgrammaSamenstellen />} />
            <Route path="/logies-vlieland" element={<LogiesVlieland />} />
            <Route path="/logies-aanvragen" element={<LogiesAanvragen />} />
            <Route path="/programma/:shareCode" element={<SharedProgram />} />
            <Route path="/mijn-programma/:token" element={<CustomerProgram />} />
            <Route path="/mijn-logies/:token" element={<AccommodationQuotes />} />
            <Route path="/partner/:token" element={<PartnerPortal />} />
            <Route path="/partner/login" element={<PartnerLogin />} />
            <Route path="/partner/dashboard" element={<PartnerDashboard />} />
            <Route path="/partner/aanbod" element={<PartnerBlocks />} />
            <Route path="/partner/facturatie" element={<PartnerFinance />} />
            <Route path="/partner/instellingen" element={<PartnerSettings />} />
            <Route path="/partner/logies" element={<PartnerAccommodation />} />
            <Route path="/partner/reset-password" element={<PartnerResetPassword />} />
            {/* Admin routes */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/crm" element={<AdminCRM />} />
            <Route path="/admin/aanvragen" element={<AdminRequests />} />
            <Route path="/admin/aanvragen/:id" element={<AdminRequestDetail />} />
            <Route path="/admin/partners" element={<AdminPartners />} />
            <Route path="/admin/partners/:id" element={<AdminPartnerDetail />} />
            <Route path="/admin/todos" element={<AdminTodos />} />
            <Route path="/admin/logs" element={<AdminLogs />} />
            <Route path="/admin/commissies" element={<AdminCommissions />} />
            <Route path="/admin/facturatie" element={<AdminInvoicing />} />
            <Route path="/admin/bouwstenen" element={<AdminBuildingBlocks />} />
            <Route path="/admin/logies" element={<AdminAccommodation />} />
            <Route path="/admin/logies/:id" element={<AdminAccommodationDetail />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </CartProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
