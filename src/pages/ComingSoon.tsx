import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Construction, ArrowLeft } from "lucide-react";
import logoImage from "@/assets/logo.png";

const ComingSoon = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Binnenkort Beschikbaar | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImage} alt="Bureau Vlieland" className="h-8" />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center max-w-lg w-full">
          <div className="mb-8 flex justify-center">
            <div className="rounded-full bg-primary/10 p-8">
              <Construction className="h-16 w-16 text-primary" />
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-6">Binnenkort Beschikbaar</h1>
          
          <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
            Deze functie is momenteel niet beschikbaar. Neem gerust contact met 
            ons op als u vragen heeft — wij helpen u graag verder.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/">
              <Button variant="outline" className="w-full sm:w-auto">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Naar home
              </Button>
            </Link>
            <Link to="/contact">
              <Button className="w-full sm:w-auto">
                Neem contact op
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ComingSoon;
