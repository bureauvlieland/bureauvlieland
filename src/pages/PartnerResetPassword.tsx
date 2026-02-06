import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, CheckCircle, AlertTriangle } from "lucide-react";
import { z } from "zod";

const passwordSchema = z.object({
  password: z.string().min(8, "Wachtwoord moet minimaal 8 tekens zijn"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Wachtwoorden komen niet overeen",
  path: ["confirmPassword"],
});

const SESSION_TIMEOUT_MS = 60000; // 60 seconds – give recovery session plenty of time to initialise

const PartnerResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSessionExpired((prev) => {
        // Only expire if session wasn't already established
        if (!sessionReady) return true;
        return prev;
      });
    }, SESSION_TIMEOUT_MS);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
        setSessionExpired(false);
        clearTimeout(timeout);
      }
    });

    // Also check if we already have a session (user may have already been authenticated)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
        setSessionExpired(false);
        clearTimeout(timeout);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = passwordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const fieldErrors: { password?: string; confirmPassword?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "password") fieldErrors.password = err.message;
        if (err.path[0] === "confirmPassword") fieldErrors.confirmPassword = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        // Provide user-friendly error messages
        if (error.message.includes("weak")) {
          setErrors({ password: "Wachtwoord is te zwak. Gebruik letters, cijfers en speciale tekens." });
        } else if (error.message.includes("session")) {
          setSessionExpired(true);
        } else {
          throw error;
        }
        return;
      }

      // Update password_set_at timestamp
      try {
        await supabase.functions.invoke("update-partner-password-set");
      } catch (updateErr) {
        console.error("Error updating password_set_at:", updateErr);
      }

      setIsSuccess(true);
      toast({
        title: "Wachtwoord gewijzigd",
        description: "Je wachtwoord is succesvol bijgewerkt.",
      });

      setTimeout(() => {
        navigate("/partner/dashboard");
      }, 2000);
    } catch (err) {
      console.error("Password update error:", err);
      toast({
        title: "Fout",
        description: "Kon wachtwoord niet wijzigen. Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Wachtwoord Gewijzigd | Bureau Vlieland</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <Navigation />
        <main className="container mx-auto px-4 py-16 max-w-md text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Wachtwoord gewijzigd!</h1>
          <p className="text-muted-foreground">
            Je wordt automatisch doorgestuurd naar je dashboard...
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  // Loading state: waiting for recovery session
  if (!sessionReady && !sessionExpired) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Nieuw Wachtwoord | Bureau Vlieland</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <Navigation />
        <main className="container mx-auto px-4 py-16 max-w-md text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Sessie wordt opgebouwd...</h1>
          <p className="text-muted-foreground">Even geduld, uw activeringslink wordt geverifieerd.</p>
        </main>
        <Footer />
      </div>
    );
  }

  // Error state: session expired / invalid link
  if (sessionExpired && !sessionReady) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Link Verlopen | Bureau Vlieland</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <Navigation />
        <main className="container mx-auto px-4 py-16 max-w-md text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Link verlopen of ongeldig</h1>
          <p className="text-muted-foreground mb-6">
            Deze activeringslink is verlopen of niet meer geldig. Neem contact op met Bureau Vlieland om een nieuwe link te ontvangen.
          </p>
          <Button onClick={() => navigate("/partner/login")} variant="outline">
            Naar inlogpagina
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Nieuw Wachtwoord | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Navigation />

      <main className="container mx-auto px-4 py-16 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Nieuw wachtwoord instellen</CardTitle>
            <CardDescription>
              Kies een sterk wachtwoord voor uw partner account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Nieuw wachtwoord
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimaal 8 tekens"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className={errors.password ? "border-destructive" : ""}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Bevestig wachtwoord
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Herhaal je wachtwoord"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className={errors.confirmPassword ? "border-destructive" : ""}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Wachtwoord opslaan
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default PartnerResetPassword;
