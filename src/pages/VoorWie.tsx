import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ForWho } from "@/components/ForWho";
import { Contact } from "@/components/Contact";
import teamBeachImage from "@/assets/team-beach.jpg";

const VoorWie = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${teamBeachImage})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
          </div>
          <div className="relative z-10 text-center text-white px-4">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Voor wie
            </h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto">
              Groepen die kwaliteit en professionele regie centraal stellen
            </p>
          </div>
        </section>

        {/* ForWho Content */}
        <ForWho />

        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default VoorWie;
