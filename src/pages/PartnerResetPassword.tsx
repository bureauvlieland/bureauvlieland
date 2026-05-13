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
import { strongPasswordSchema, PASSWORD_RULES_HINT } from "@/lib/passwordPolicy";

const passwordSchema = z.object({
  password: strongPasswordSchema,
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
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

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
    const handleResend = async () => {
      const parsed = z.string().email().safeParse(resendEmail.trim());
      if (!parsed.success) {
        toast({
          title: "Ongeldig emailadres",
          description: "Vul een geldig emailadres in.",
          variant: "destructive",
        });
        return;
      }
      setIsResending(true);
      const timeoutId = setTimeout(() => {
        setIsResending(false);
        toast({
          title: "Time-out",
          description: "Het verzoek duurt te lang. Probeer het opnieuw.",
          variant: "destructive",
        });
      }, 15000);
      try {
        const { error } = await supabase.functions.invoke("send-partner-reset-email", {
          body: { email: resendEmail.trim() },
        });
        clearTimeout(timeoutId);
        if (error) throw error;
        setResendSent(true);
        toast({
          title: "Nieuwe link verzonden",
          description: "Controleer uw inbox (en spam). De link is 1 uur geldig.",
        });
      } catch (err) {
        clearTimeout(timeoutId);
        console.error("Resend reset error:", err);
        toast({
          title: "Fout",
          description: "Kon geen nieuwe link versturen. Neem contact op met Bureau Vlieland.",
          variant: "destructive",
        });
      } finally {
        clearTimeout(timeoutId);
        setIsResending(false);
      }
    };

    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Link Verlopen | Bureau Vlieland</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <Navigation />
        <main className="container mx-auto px-4 py-16 max-w-md">
          <Card>
            <CardHeader className="text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-2" />
              <CardTitle>Link verlopen of al gebruikt</CardTitle>
              <CardDescription>
                Activerings- en resetlinks zijn 1 uur geldig en kunnen maar één keer gebruikt worden. Vraag hieronder direct een nieuwe link aan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resendSent ? (
                <div className="text-center space-y-4">
                  <CheckCircle className="h-12 w-12 text-success mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    De nieuwe link is verstuurd. Controleer uw inbox (en spam).
                  </p>
                  <Button onClick={() => navigate("/partner/login")} variant="outline" className="w-full">
                    Naar inlogpagina
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resendEmail">Uw emailadres</Label>
                    <Input
                      id="resendEmail"
                      type="email"
                      placeholder="naam@bedrijf.nl"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      disabled={isResending}
                      autoComplete="email"
                    />
                  </div>
                  <Button
                    onClick={handleResend}
                    disabled={isResending || !resendEmail.trim()}
                    className="w-full"
                  >
                    {isResending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Stuur nieuwe link
                  </Button>
                  <Button
                    onClick={() => navigate("/partner/login")}
                    variant="ghost"
                    className="w-full"
                    disabled={isResending}
                  >
                    Terug naar inlogpagina
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
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
                  placeholder={`Minimaal ${12} tekens`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className={errors.password ? "border-destructive" : ""}
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground">{PASSWORD_RULES_HINT}</p>
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
