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

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Bureau Vlieland – Professionele evenementen en teamuitjes op Vlieland</title>
        <meta
          name="description"
          content="Bureau Vlieland organiseert professionele bedrijfsuitjes, teamdagen en evenementen op Vlieland. Maatwerkprogramma's met lokale regie en catering."
        />
        <link rel="canonical" href="https://bureauvlieland.nl" />
        <meta property="og:title" content="Bureau Vlieland – Professionele evenementen op Vlieland" />
        <meta property="og:description" content="Organiseer uw teamdag, bedrijfsuitje of evenement op Vlieland met Bureau Vlieland. Professionele regie, lokale expertise." />
        <meta property="og:url" content="https://bureauvlieland.nl" />
        <meta property="og:type" content="website" />
      </Helmet>
      <StructuredData />
      <CookieConsent />
      <Navigation />
      <main id="main-content">
        <HeroEditorial />
        <ActivitiesShowcase />
        <ProgramTemplatesPreview />
        <ErwinManifesto />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
