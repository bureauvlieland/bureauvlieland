import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
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

const queryClient = new QueryClient();

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
