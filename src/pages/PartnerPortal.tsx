import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Info } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

/**
 * This component handles the deprecated token-based partner access.
 * It redirects partners to the new login-based system.
 */
const PartnerPortal = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();

  // Auto-redirect after a few seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/partner/login");
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Helmet>
        <title>Partner Portal | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Minimal header */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center justify-center">
          <img src={logo} alt="Bureau Vlieland" className="h-10" />
        </div>
      </header>

      {/* Redirect message centered */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Info className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Toegang gewijzigd</CardTitle>
              <CardDescription>
                De Partner Portal werkt nu met een beveiligde login
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Voor extra veiligheid hebben we de toegang tot de Partner Portal aangepast. 
                Je kunt nu inloggen met je emailadres en wachtwoord.
              </p>
              
              <p className="text-sm text-muted-foreground text-center">
                Je wordt automatisch doorgestuurd naar de login pagina...
              </p>

              <Button
                className="w-full"
                onClick={() => navigate("/partner/login")}
              >
                Naar login pagina
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Heb je nog geen inloggegevens ontvangen? Neem contact op met Bureau Vlieland.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Minimal footer */}
      <footer className="border-t bg-background py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Bureau Vlieland. Alle rechten voorbehouden.
        </div>
      </footer>
    </div>
  );
};

export default PartnerPortal;
