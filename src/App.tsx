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
import PartnerResetPassword from "./pages/PartnerResetPassword";

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
            <Route path="/programma/:shareCode" element={<SharedProgram />} />
            <Route path="/mijn-programma/:token" element={<CustomerProgram />} />
            <Route path="/partner/:token" element={<PartnerPortal />} />
            <Route path="/partner/login" element={<PartnerLogin />} />
            <Route path="/partner/dashboard" element={<PartnerDashboard />} />
            <Route path="/partner/reset-password" element={<PartnerResetPassword />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </CartProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
