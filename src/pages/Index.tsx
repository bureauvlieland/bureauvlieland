import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { ForWho } from "@/components/ForWho";
import { AboutErwin } from "@/components/AboutErwin";
import { Verbinder } from "@/components/Verbinder";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        <Hero />
        <Services />
        <ForWho />
        <AboutErwin />
        <Verbinder />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
