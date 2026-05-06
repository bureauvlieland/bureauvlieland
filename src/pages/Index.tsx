import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { StructuredData } from "@/components/StructuredData";
import { CookieConsent } from "@/components/CookieConsent";
import { Testimonials } from "@/components/Testimonials";
import { Helmet } from "react-helmet";
import { HeroEditorial } from "@/components/home/HeroEditorial";
import { ActivitiesShowcase } from "@/components/home/ActivitiesShowcase";
import { UpcomingActivitiesFeed } from "@/components/home/UpcomingActivitiesFeed";
import { ProgramTemplatesPreview } from "@/components/home/ProgramTemplatesPreview";
import { ErwinManifesto } from "@/components/home/ErwinManifesto";
import { FinalCTA } from "@/components/home/FinalCTA";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Bureau Vlieland – Lokale specialist voor groepsprogramma's op Vlieland</title>
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
        <HeroEditorial />
        <UpcomingActivitiesFeed />
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
