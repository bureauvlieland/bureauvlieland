import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useParams } from "react-router-dom";
import { Briefcase, Building2, Check, Copy, ExternalLink, User } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Container, EmptyState, FormField, FunnelHead, LoadingState, Notice, Section, SuccessScreen } from "@/components/system";
import { RatingInput } from "@/components/reviews/RatingInput";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { GENERAL_CONTACT_EMAIL } from "@/lib/bureauContact";

/**
 * De beoordelingspagina uit de nazorgmail (docs/plan-reviews-oogsten.md,
 * fase 1): score, twee korte teksten, naam en organisatie, en de twee
 * toestemmingen. Daarna de bedankpagina met de eigen tekst om te kopiëren
 * en de knop naar Google, voor iedereen en ongeacht de score (Google
 * verbiedt selectief vragen). Praat alleen met de edge
 * function `customer-review`; de link in de mail is het bewijs.
 */
interface ReviewProgram {
  reference_number: string | null;
  customer_name: string | null;
  company: string | null;
  date_label: string;
}

interface SavedReview {
  id: string;
  rating: number;
  text_positive: string;
  author_name: string;
  author_role: string;
  company: string;
  consent_publish: boolean;
  consent_reference: boolean;
  google_clicked_at: string | null;
  created_at: string;
}

interface ReviewLinks {
  google: string;
}

interface ReviewContext {
  program: ReviewProgram;
  review: SavedReview | null;
  links: ReviewLinks;
}

type Uitkomst<T> = { ok: true; data: T } | { ok: false; status: number; body: Record<string, unknown> | null };

/** Eén aanroep van de edge function, met de status en het antwoord bij een fout. */
async function roepAan<T>(body: Record<string, unknown>): Promise<Uitkomst<T>> {
  const { data, error } = await supabase.functions.invoke<T>("customer-review", { body });
  if (!error) return { ok: true, data: data as T };
  const context = (error as { context?: unknown }).context;
  if (context instanceof Response) {
    const payload = (await context.clone().json().catch(() => null)) as Record<string, unknown> | null;
    return { ok: false, status: context.status, body: payload };
  }
  return { ok: false, status: 0, body: null };
}

const LOW_RATING = 3;

const Beoordeling = () => {
  const { token = "" } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"laden" | "ongeldig" | "formulier" | "klaar">("laden");
  const [program, setProgram] = useState<ReviewProgram | null>(null);
  const [links, setLinks] = useState<ReviewLinks>({ google: "" });
  const [saved, setSaved] = useState<SavedReview | null>(null);

  const [rating, setRating] = useState(0);
  const [textPositive, setTextPositive] = useState("");
  const [textImprove, setTextImprove] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [company, setCompany] = useState("");
  const [consentPublish, setConsentPublish] = useState(false);
  const [consentReference, setConsentReference] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let actief = true;
    (async () => {
      const uitkomst = await roepAan<ReviewContext>({ action: "context", token });
      if (!actief) return;
      if (uitkomst.ok === false) {
        setStatus("ongeldig");
        return;
      }
      setProgram(uitkomst.data.program);
      setLinks(uitkomst.data.links);
      setAuthorName(uitkomst.data.program.customer_name ?? "");
      setCompany(uitkomst.data.program.company ?? "");
      if (uitkomst.data.review) {
        setSaved(uitkomst.data.review);
        setStatus("klaar");
      } else {
        setStatus("formulier");
      }
      trackEvent("review_page_view", { has_review: Boolean(uitkomst.data.review) });
    })();
    return () => {
      actief = false;
    };
  }, [token]);

  const ratingError = touched && rating === 0 ? "Kies een score van 1 tot 5 sterren." : null;
  const nameError = touched && authorName.trim().length === 0 ? "Vul uw naam in." : null;

  const verstuur = async () => {
    setTouched(true);
    if (rating === 0 || authorName.trim().length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    const uitkomst = await roepAan<{ review: SavedReview; links: ReviewLinks }>({
      action: "submit",
      token,
      rating,
      text_positive: textPositive.trim(),
      text_improve: textImprove.trim(),
      author_name: authorName.trim(),
      author_role: authorRole.trim(),
      company: company.trim(),
      consent_publish: consentPublish,
      consent_reference: consentReference,
    });
    setSubmitting(false);
    if (uitkomst.ok === false) {
      const alBeoordeeld = uitkomst.status === 409 ? (uitkomst.body?.review as SavedReview | undefined) : undefined;
      if (alBeoordeeld) {
        setSaved(alBeoordeeld);
        setStatus("klaar");
        return;
      }
      setSubmitError("Versturen is niet gelukt. Probeer het nog eens, of beantwoord de mail die u van ons kreeg.");
      return;
    }
    setSaved(uitkomst.data.review);
    setLinks(uitkomst.data.links);
    setStatus("klaar");
    trackEvent("review_submitted", { rating, consent_publish: consentPublish, consent_reference: consentReference });
    window.scrollTo({ top: 0 });
  };

  const kopieer = useCallback(async () => {
    if (!saved?.text_positive) return;
    try {
      await navigator.clipboard.writeText(saved.text_positive);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(false);
    }
  }, [saved]);

  const googleKlik = () => {
    trackEvent("review_external_click", { target: "google" });
    void roepAan({ action: "clicked", token });
  };

  const titel =
    status === "klaar" ? "Bedankt voor uw beoordeling" : status === "ongeldig" ? "Deze link werkt niet meer" : "Hoe was het op Vlieland?";
  const intro =
    status === "klaar"
      ? "Uw beoordeling is opgeslagen bij uw programma."
      : status === "ongeldig"
        ? "De beoordelingslink hoort bij een programma dat wij niet meer kunnen vinden."
        : program
          ? `Twee minuten van uw tijd helpen ons beter te worden en helpen andere groepen bij hun keuze. Het gaat om ${program.date_label ? `uw ${program.date_label}` : "uw bezoek"}${program.company ? ` met ${program.company}` : ""}${program.reference_number ? ` (${program.reference_number})` : ""}.`
          : undefined;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Uw beoordeling – Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Navigation />

      <main id="main-content">
        <FunnelHead eyebrow="Uw beoordeling" title={titel} intro={intro} />

        <Section>
          <Container size="content">
            {status === "laden" && <LoadingState label="Uw programma ophalen…" />}

            {status === "ongeldig" && (
              <EmptyState
                title="Wij kunnen dit programma niet vinden"
                description="Mail ons gerust; wij sturen u dan een nieuwe link."
                action={
                  <Button asChild variant="outline">
                    <a href={`mailto:${GENERAL_CONTACT_EMAIL}?subject=Beoordeling`}>Mail {GENERAL_CONTACT_EMAIL}</a>
                  </Button>
                }
              />
            )}

            {status === "formulier" && (
              <form
                className="space-y-8"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  void verstuur();
                }}
              >
                <FormField label="Uw score" htmlFor="score" required error={ratingError}>
                  <RatingInput value={rating} onChange={setRating} />
                </FormField>

                <FormField
                  label="Wat sprak u het meest aan?"
                  htmlFor="tekst-positief"
                  help="Deze tekst kan, alleen met uw toestemming hieronder, op onze website komen. U kunt hem straks ook op Google plaatsen."
                >
                  <Textarea
                    value={textPositive}
                    onChange={(e) => setTextPositive(e.target.value)}
                    rows={5}
                    maxLength={2000}
                    placeholder="Bijvoorbeeld: de organisatie, een activiteit, het eten, de begeleiding…"
                  />
                </FormField>

                <FormField label="Wat kan beter?" htmlFor="tekst-beter" help="Alleen voor ons. Dit komt nooit op de website.">
                  <Textarea value={textImprove} onChange={(e) => setTextImprove(e.target.value)} rows={3} maxLength={2000} />
                </FormField>

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Uw naam" htmlFor="naam" required error={nameError} leading={<User />}>
                    <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} autoComplete="name" maxLength={120} />
                  </FormField>
                  <FormField label="Uw functie" htmlFor="functie" leading={<Briefcase />}>
                    <Input value={authorRole} onChange={(e) => setAuthorRole(e.target.value)} autoComplete="organization-title" maxLength={120} />
                  </FormField>
                  <FormField label="Organisatie" htmlFor="organisatie" leading={<Building2 />} className="sm:col-span-2">
                    <Input value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" maxLength={160} />
                  </FormField>
                </div>

                <fieldset className="space-y-4">
                  <legend className="text-sm font-medium text-foreground">Wat mogen wij met uw beoordeling doen?</legend>
                  <div className="flex items-start gap-3">
                    <Checkbox id="toestemming-site" checked={consentPublish} onCheckedChange={(v) => setConsentPublish(v === true)} className="mt-0.5" />
                    <Label htmlFor="toestemming-site" className="font-normal leading-relaxed">
                      Bureau Vlieland mag deze beoordeling met mijn naam, functie en organisatie op bureauvlieland.nl tonen.
                      <span className="block text-muted-foreground">Zonder vinkje blijft uw beoordeling intern.</span>
                    </Label>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="toestemming-referentie"
                      checked={consentReference}
                      onCheckedChange={(v) => setConsentReference(v === true)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="toestemming-referentie" className="font-normal leading-relaxed">
                      Bureau Vlieland mag een referentiepagina over ons programma maken.
                      <span className="block text-muted-foreground">U krijgt die eerst te zien en keurt hem goed voordat hij online gaat.</span>
                    </Label>
                  </div>
                </fieldset>

                {submitError && <Notice tone="danger">{submitError}</Notice>}

                <div className="space-y-3">
                  <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
                    {submitting ? "Versturen…" : "Beoordeling versturen"}
                  </Button>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Uw beoordeling wordt opgeslagen bij uw programma. Op de website verschijnt alleen wat u hierboven toestaat; intrekken kan
                    altijd met een mail aan {GENERAL_CONTACT_EMAIL}. Zie ook onze{" "}
                    <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
                      privacyverklaring
                    </Link>
                    .
                  </p>
                </div>
              </form>
            )}

            {status === "klaar" && saved && (
              <SuccessScreen
                title={`Bedankt, ${saved.author_name || "en tot ziens"}!`}
                intro={
                  saved.rating <= LOW_RATING
                    ? "Dank voor uw eerlijkheid. Wij nemen persoonlijk contact met u op."
                    : "Fijn dat u de tijd nam. Wij lezen elke beoordeling."
                }
                reference={program?.reference_number ?? null}
              >
                <div className="space-y-5">
                  <div>
                    <h3 className="font-display text-display-sm font-medium text-foreground">Deelt u uw ervaring ook op Google?</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Een review op Google plaatst u zelf; dat mogen wij niet voor u doen. Kopieer uw tekst, open Google en plak hem daar.
                      Geheel vrijblijvend.
                    </p>
                  </div>

                  {saved.text_positive && (
                    <div className="rounded-lg border border-border bg-card p-4">
                      <p className="whitespace-pre-line text-foreground">{saved.text_positive}</p>
                      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void kopieer()}>
                        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                        {copied ? "Gekopieerd" : "Kopieer uw tekst"}
                      </Button>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button asChild size="lg" className="w-full sm:w-auto">
                      <a href={links.google} target="_blank" rel="noopener noreferrer" onClick={googleKlik}>
                        Plaats ook op Google
                        <ExternalLink aria-hidden="true" />
                      </a>
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Terug naar <Link to="/" className="underline underline-offset-2 hover:text-foreground">bureauvlieland.nl</Link>.
                  </p>
                </div>
              </SuccessScreen>
            )}
          </Container>
        </Section>
      </main>

      <Footer />
    </div>
  );
};

export default Beoordeling;
