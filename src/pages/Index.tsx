import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { StructuredData } from "@/components/StructuredData";
import { CookieConsent } from "@/components/CookieConsent";
import { Testimonials } from "@/components/Testimonials";
import { Helmet } from "react-helmet";
import { HeroEditorial } from "@/components/home/HeroEditorial";
import { ActivitiesShowcase } from "@/components/home/ActivitiesShowcase";
import { ProgramTemplatesPreview } from "@/components/home/ProgramTemplatesPreview";
import { ErwinManifesto } from "@/components/home/ErwinManifesto";
import { FinalCTA } from "@/components/home/FinalCTA";
import { HowItWorks } from "@/components/home/HowItWorks";
import { CateringHighlight } from "@/components/home/CateringHighlight";
import { StickyMobileCTA } from "@/components/home/StickyMobileCTA";
import { useHomepageAnalytics } from "@/hooks/useHomepageAnalytics";

const Index = () => {
  useHomepageAnalytics();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Bureau Vlieland – Groepsprogramma's op Vlieland</title>
        <meta
          name="description"
          content="Bureau Vlieland is uw lokale specialist voor groepsbezoek aan Vlieland: één partij, één factuur. Wij ontwikkelen het programma en boeken alle eilandpartners."
        />
        <link rel="canonical" href="https://bureauvlieland.nl" />
        <meta property="og:title" content="Bureau Vlieland – Lokale specialist voor Vlieland" />
        <meta property="og:description" content="Uw lokale specialist voor groepsprogramma's op Vlieland. Eén partij, één factuur — wij regelen alles met de eilanders." />
        <meta property="og:url" content="https://bureauvlieland.nl" />
        <meta property="og:type" content="website" />
      </Helmet>
      <StructuredData />
      <CookieConsent />
      <Navigation />
      <main id="main-content">
        {/* Genummerde hoofdstukken. Eén voordeur: het formulier (plan klantreis en ondertekening, fase 1). */}
        <div data-analytics-section="hero"><HeroEditorial /></div>
        <div data-analytics-section="how-it-works"><HowItWorks number="01" /></div>
        <div data-analytics-section="testimonials"><Testimonials number="02" /></div>
        <div data-analytics-section="activities"><ActivitiesShowcase number="03" /></div>
        <div data-analytics-section="catering"><CateringHighlight number="04" /></div>
        <div data-analytics-section="templates"><ProgramTemplatesPreview number="05" /></div>
        <div data-analytics-section="manifesto"><ErwinManifesto number="06" /></div>
        <div data-analytics-section="final-cta"><FinalCTA number="07" /></div>
      </main>
      <StickyMobileCTA />
      <Footer />
    </div>
  );
};

export default Index;
