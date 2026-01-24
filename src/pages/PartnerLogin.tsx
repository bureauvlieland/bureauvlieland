import { useState } from "react";
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
import { Loader2, LogIn, Mail, Lock } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Vul een geldig emailadres in"),
  password: z.string().min(6, "Wachtwoord moet minimaal 6 tekens zijn"),
});

const PartnerLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "email") fieldErrors.email = err.message;
        if (err.path[0] === "password") fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Ongeldige inloggegevens",
            description: "Controleer je emailadres en wachtwoord.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Fout bij inloggen",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (data.user) {
        // Check if this user is linked to a partner
        const { data: partner, error: partnerError } = await supabase
          .from("partners")
          .select("id, name")
          .eq("auth_user_id", data.user.id)
          .eq("is_active", true)
          .single();

        if (partnerError || !partner) {
          // User exists but is not a partner
          await supabase.auth.signOut();
          toast({
            title: "Geen partner account",
            description: "Dit emailadres is niet gekoppeld aan een partner account.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: `Welkom ${partner.name}!`,
          description: "Je bent succesvol ingelogd.",
        });

        navigate("/partner/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      toast({
        title: "Fout bij inloggen",
        description: "Er is een onverwachte fout opgetreden.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrors({ email: "Vul eerst je emailadres in" });
      return;
    }

    const emailResult = z.string().email().safeParse(email);
    if (!emailResult.success) {
      setErrors({ email: "Vul een geldig emailadres in" });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/partner/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Wachtwoord reset email verzonden",
        description: "Controleer je inbox voor de reset link.",
      });
    } catch (err) {
      console.error("Password reset error:", err);
      toast({
        title: "Fout",
        description: "Kon geen reset email verzenden. Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Partner Login | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Navigation />

      <main className="container mx-auto px-4 py-16 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Partner Portal</CardTitle>
            <CardDescription>
              Log in om je aanvragen te beheren
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Emailadres
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="partner@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Wachtwoord
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className={errors.password ? "border-destructive" : ""}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                Inloggen
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                  className="text-sm"
                >
                  Wachtwoord vergeten?
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Heb je nog geen account? Neem contact op met Bureau Vlieland.
        </p>
      </main>

      <Footer />
    </div>
  );
};

export default PartnerLogin;