import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, Notice, SuccessScreen } from "@/components/system";
import { PartnerAuthShell } from "@/components/partner-portal/PartnerAuthShell";
import { Loader2, Lock, LogIn, Mail, Send } from "lucide-react";
import { z } from "zod";
import { loginPasswordSchema } from "@/lib/passwordPolicy";
import { reportError } from "@/lib/errorReporting";

/**
 * Inloggen op het partnerportaal (partnerportaal fase 4): twee velden op
 * `FormField`, fouten inline als `Notice`. "Wachtwoord vergeten?" opent een
 * eigen stap op dezelfde kaart: de partner vult (of bevestigt) het
 * e-mailadres in en verstuurt de resetlink bewust met een eigen knop, zodat
 * een klik op de link niet meteen een mail veroorzaakt.
 */
const loginSchema = z.object({
  email: z.string().email("Vul een geldig e-mailadres in."),
  password: loginPasswordSchema,
});

const PartnerLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [notice, setNotice] = useState<{ tone: "danger" | "success"; title: string; text?: string } | null>(null);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState<string | undefined>();
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setNotice(null);

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
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setNotice(
          error.message.includes("Invalid login credentials")
            ? { tone: "danger", title: "Onbekende combinatie", text: "Controleer uw e-mailadres en wachtwoord." }
            : { tone: "danger", title: "Inloggen mislukt", text: error.message },
        );
        return;
      }
      if (!data.user) return;

      // Een beheerder gaat naar de beheeromgeving.
      const { data: adminRole } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
      if (adminRole) {
        navigate("/admin/dashboard");
        return;
      }

      const { data: partner, error: partnerError } = await supabase.from("partners").select("id, name, password_set_at").eq("auth_user_id", data.user.id).eq("is_active", true).single();
      if (partnerError || !partner) {
        await supabase.auth.signOut();
        setNotice({ tone: "danger", title: "Geen partneraccount", text: "Dit e-mailadres hoort niet bij een partner van Bureau Vlieland." });
        return;
      }

      // Laatste login bijhouden; password_set_at alleen de eerste keer, zodat de
      // uitnodigingsflow kan blijven zien of de activatie ooit is voltooid.
      try {
        const now = new Date().toISOString();
        await supabase
          .from("partners")
          .update({ last_login_at: now, ...(partner.password_set_at ? {} : { password_set_at: now }) })
          .eq("auth_user_id", data.user.id);
      } catch (err) {
        reportError(err, { where: "PartnerLogin: Error updating login status" });
      }
      navigate("/partner/werkbank");
    } catch (err) {
      reportError(err, { where: "PartnerLogin: Login error" });
      setNotice({ tone: "danger", title: "Inloggen mislukt", text: "Er ging iets mis. Probeer het opnieuw." });
    } finally {
      setIsLoading(false);
    }
  };

  const openForgotPassword = () => {
    setNotice(null);
    setErrors({});
    setResetError(undefined);
    setResetSent(false);
    // Het ingevulde loginadres als voorzet; de partner bevestigt het zelf.
    setResetEmail(email.trim());
    setMode("forgot");
  };

  const closeForgotPassword = () => {
    setNotice(null);
    setResetError(undefined);
    setMode("login");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setResetError(undefined);
    const address = resetEmail.trim();
    if (!address) {
      setResetError("Vul uw e-mailadres in.");
      return;
    }
    if (!z.string().email().safeParse(address).success) {
      setResetError("Vul een geldig e-mailadres in.");
      return;
    }
    setIsLoading(true);
    // Harde time-out, zodat de knop niet blijft draaien als de functie hangt.
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      setNotice({ tone: "danger", title: "Het duurt te lang", text: "Probeer het opnieuw of neem contact op met Bureau Vlieland." });
    }, 15000);
    try {
      const { error } = await supabase.functions.invoke("send-partner-reset-email", { body: { email: address } });
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      reportError(err, { where: "PartnerLogin: Password reset error" });
      setNotice({ tone: "danger", title: "Geen e-mail verstuurd", text: "Kon geen e-mail versturen om uw wachtwoord opnieuw in te stellen. Probeer het opnieuw of neem contact op met Bureau Vlieland." });
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  if (mode === "forgot") {
    return (
      <PartnerAuthShell title="Wachtwoord vergeten" heading="Wachtwoord vergeten" intro="Vul uw e-mailadres in. U ontvangt een link om een nieuw wachtwoord in te stellen.">
        {resetSent ? (
          <SuccessScreen
            title="E-mail verstuurd"
            intro={`Controleer de inbox en de spammap van ${resetEmail.trim()}. De link is 24 uur geldig.`}
            primary={{ label: "Naar inloggen", onClick: closeForgotPassword }}
            className="py-2"
          />
        ) : (
          <form onSubmit={(e) => void handleForgotPassword(e)} className="space-y-4" noValidate>
            {notice && (
              <Notice tone={notice.tone} title={notice.title}>
                {notice.text && <p>{notice.text}</p>}
              </Notice>
            )}
            <FormField label="E-mailadres" htmlFor="reset-email" required leading={<Mail />} error={resetError}>
              <Input type="email" autoComplete="email" autoFocus value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} disabled={isLoading} placeholder="naam@bedrijf.nl" />
            </FormField>
            <Button type="submit" className="w-full" disabled={isLoading || !resetEmail.trim()}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="mr-2 h-4 w-4" aria-hidden="true" />}
              Resetlink sturen
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={closeForgotPassword} disabled={isLoading}>
              Terug naar inloggen
            </Button>
          </form>
        )}
      </PartnerAuthShell>
    );
  }

  return (
    <PartnerAuthShell title="Inloggen" heading="Partnerportaal" intro="Log in om uw aanvragen, aanbod en facturen te beheren." footer="Nog geen account? Neem contact op met Bureau Vlieland.">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
        {notice && (
          <Notice tone={notice.tone} title={notice.title}>
            {notice.text && <p>{notice.text}</p>}
          </Notice>
        )}
        <FormField label="E-mailadres" htmlFor="login-email" required leading={<Mail />} error={errors.email}>
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} placeholder="naam@bedrijf.nl" />
        </FormField>
        <FormField label="Wachtwoord" htmlFor="login-wachtwoord" required leading={<Lock />} error={errors.password}>
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
        </FormField>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />}
          Inloggen
        </Button>
        <div className="text-center">
          <Button type="button" variant="link" onClick={openForgotPassword} disabled={isLoading} className="text-sm">
            Wachtwoord vergeten?
          </Button>
        </div>
      </form>
    </PartnerAuthShell>
  );
};

export default PartnerLogin;
