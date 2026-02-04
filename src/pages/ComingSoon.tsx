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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImage} alt="Bureau Vlieland" className="h-8" />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-primary/10 p-6">
              <Construction className="h-12 w-12 text-primary" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-4">Binnenkort Beschikbaar</h1>
          
          <p className="text-muted-foreground mb-8 leading-relaxed">
            We werken hard aan ons nieuwe platform. Binnenkort kun je hier zelf 
            je programma samenstellen en boeken. Neem gerust contact met ons op 
            voor meer informatie.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Naar home
              </Button>
            </Link>
            <Link to="/contact">
              <Button>
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
