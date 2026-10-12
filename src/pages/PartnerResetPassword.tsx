import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, LoadingState, Notice, SuccessScreen } from "@/components/system";
import { PartnerAuthShell } from "@/components/partner-portal/PartnerAuthShell";
import { Loader2, Lock, Mail } from "lucide-react";
import { z } from "zod";
import { PASSWORD_RULES_HINT, strongPasswordSchema } from "@/lib/passwordPolicy";
import { reportError } from "@/lib/errorReporting";

/**
 * Nieuw wachtwoord instellen via de link uit de e-mail (partnerportaal
 * fase 4): de velden op `FormField`, de bevestiging als `SuccessScreen`
 * met één knop naar de werkbank, een verlopen link als `Notice` met het
 * formulier voor een nieuwe link eronder.
 */
const passwordSchema = z
  .object({ password: strongPasswordSchema, confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, { message: "De wachtwoorden komen niet overeen.", path: ["confirmPassword"] });

const SESSION_TIMEOUT_MS = 60000;

const PartnerResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string; form?: string }>({});
  const [resendEmail, setResendEmail] = useState("");
  const [resendError, setResendError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setSessionExpired((prev) => (!sessionReady ? true : prev)), SESSION_TIMEOUT_MS);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
        setSessionExpired(false);
        clearTimeout(timeout);
      }
    });
    void supabase.auth.getSession().then(({ data: { session } }) => {
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
        if (error.message.includes("weak")) setErrors({ password: "Dit wachtwoord is te zwak. Gebruik letters, cijfers en leestekens." });
        else if (error.message.includes("session")) setSessionExpired(true);
        else throw error;
        return;
      }
      try {
        await supabase.functions.invoke("update-partner-password-set");
      } catch (updateErr) {
        reportError(updateErr, { where: "PartnerResetPassword: Error updating password_set_at" });
      }
      setIsSuccess(true);
    } catch (err) {
      reportError(err, { where: "PartnerResetPassword: Password update error" });
      setErrors({ form: "Kon het wachtwoord niet wijzigen. Probeer het opnieuw." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setResendError(null);
    if (!z.string().email().safeParse(resendEmail.trim()).success) {
      setResendError("Vul een geldig e-mailadres in.");
      return;
    }
    setIsResending(true);
    const timeoutId = setTimeout(() => {
      setIsResending(false);
      setResendError("Het duurt te lang. Probeer het opnieuw.");
    }, 15000);
    try {
      const { error } = await supabase.functions.invoke("send-partner-reset-email", { body: { email: resendEmail.trim() } });
      if (error) throw error;
      setResendSent(true);
    } catch (err) {
      reportError(err, { where: "PartnerResetPassword: Resend reset error" });
      setResendError("Kon geen nieuwe link versturen. Neem contact op met Bureau Vlieland.");
    } finally {
      clearTimeout(timeoutId);
      setIsResending(false);
    }
  };

  if (isSuccess) {
    return (
      <PartnerAuthShell title="Wachtwoord gewijzigd" heading="Nieuw wachtwoord">
        <SuccessScreen title="Uw wachtwoord is gewijzigd" intro="U kunt er vanaf nu mee inloggen." primary={{ label: "Naar de werkbank", to: "/partner/werkbank" }} className="py-2" />
      </PartnerAuthShell>
    );
  }

  if (!sessionReady && !sessionExpired) {
    return (
      <PartnerAuthShell title="Nieuw wachtwoord" heading="Nieuw wachtwoord" intro="Een ogenblik, uw link wordt gecontroleerd.">
        <LoadingState label="Link controleren" />
      </PartnerAuthShell>
    );
  }

  if (sessionExpired && !sessionReady) {
    return (
      <PartnerAuthShell title="Link verlopen" heading="Link verlopen of al gebruikt" intro="Een link is een uur geldig en werkt één keer. Vraag hieronder een nieuwe aan.">
        {resendSent ? (
          <SuccessScreen title="Nieuwe link verstuurd" intro="Controleer uw inbox en de spammap." primary={{ label: "Naar inloggen", to: "/partner/login" }} className="py-2" />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleResend();
            }}
            className="space-y-4"
            noValidate
          >
            <FormField label="Uw e-mailadres" htmlFor="reset-email" required leading={<Mail />} error={resendError}>
              <Input type="email" autoComplete="email" value={resendEmail} onChange={(e) => setResendEmail(e.target.value)} disabled={isResending} placeholder="naam@bedrijf.nl" />
            </FormField>
            <Button type="submit" className="w-full" disabled={isResending || !resendEmail.trim()}>
              {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Nieuwe link sturen
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/partner/login")} disabled={isResending}>
              Naar inloggen
            </Button>
          </form>
        )}
      </PartnerAuthShell>
    );
  }

  return (
    <PartnerAuthShell title="Nieuw wachtwoord" heading="Nieuw wachtwoord" intro="Kies een sterk wachtwoord voor uw partneraccount.">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
        {errors.form && (
          <Notice tone="danger" title="Niet gelukt">
            <p>{errors.form}</p>
          </Notice>
        )}
        <FormField label="Nieuw wachtwoord" htmlFor="reset-wachtwoord" required leading={<Lock />} error={errors.password} help={PASSWORD_RULES_HINT}>
          <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
        </FormField>
        <FormField label="Herhaal het wachtwoord" htmlFor="reset-wachtwoord-herhaal" required leading={<Lock />} error={errors.confirmPassword}>
          <Input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isLoading} />
        </FormField>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Wachtwoord opslaan
        </Button>
      </form>
    </PartnerAuthShell>
  );
};

export default PartnerResetPassword;
