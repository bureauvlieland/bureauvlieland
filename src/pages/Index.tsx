import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { ForWho } from "@/components/ForWho";
import { AboutErwin } from "@/components/AboutErwin";
import { Verbinder } from "@/components/Verbinder";
import { Testimonials } from "@/components/Testimonials";
import { ExtraServices } from "@/components/ExtraServices";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { StructuredData } from "@/components/StructuredData";

const Index = () => {
  return (
    <div className="min-h-screen">
      <StructuredData />
      <Navigation />
      <main>
        <Hero />
        <Services />
        <ForWho />
        <AboutErwin />
        <Verbinder />
        <Testimonials />
        <ExtraServices />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
