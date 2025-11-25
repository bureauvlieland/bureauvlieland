import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { QuoteChatAssistant } from "@/components/QuoteChatAssistant";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <QuoteChatAssistant />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/diensten" element={<Diensten />} />
          <Route path="/voor-wie" element={<VoorWie />} />
          <Route path="/programmas" element={<Programmas />} />
          <Route path="/voorbeeldprogrammas" element={<Voorbeeldprogrammas />} />
          <Route path="/catering" element={<Catering />} />
          <Route path="/over-ons" element={<OverOns />} />
          <Route path="/evenementen" element={<Evenementen />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/offerte" element={<Offerte />} />
          <Route path="/algemene-voorwaarden" element={<Terms />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
