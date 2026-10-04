import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Container, EmptyState, FormField, FunnelHead, LoadingState, Notice, Section, SuccessScreen } from "@/components/system";
import { supabase } from "@/integrations/supabase/client";
import { GENERAL_CONTACT_EMAIL } from "@/lib/bureauContact";

/**
 * De pagina achter de link in de mail aan de partner (docs/plan-bruiloftsdoorverwijzingen.md
 * → Mail aan de partner): "Was dit bruidspaar al bij jullie bekend?". Zonder
 * login; de link met token is het bewijs. Praat alleen met de edge function
 * `wedding-referral-claim`. De link werkt tot en met de vijfde werkdag na de
 * doorverwijsmail; daarna toont de pagina dat hij verlopen is.
 */
type ClaimState = "open" | "reported" | "expired";

interface ClaimView {
  state: ClaimState;
  partnerName: string;
  coupleNames: string;
  referredAt: string;
  deadline: string;
  reportedAt: string | null;
  firstContactAt: string | null;
  note: string;
}

type Uitkomst = { ok: true; view: ClaimView } | { ok: false; status: number; error: string | null; view: ClaimView | null };

/** Eén aanroep van de edge function, met de status en de foutmelding bij een fout. */
async function roepAan(body: Record<string, unknown>): Promise<Uitkomst> {
  const { data, error } = await supabase.functions.invoke<{ view: ClaimView }>("wedding-referral-claim", { body });
  if (!error) return { ok: true, view: (data as { view: ClaimView }).view };
  const context = (error as { context?: unknown }).context;
  if (context instanceof Response) {
    const payload = (await context.clone().json().catch(() => null)) as { error?: string; view?: ClaimView } | null;
    return { ok: false, status: context.status, error: payload?.error ?? null, view: payload?.view ?? null };
  }
  return { ok: false, status: 0, error: null, view: null };
}

const dag = (iso: string) => format(parseISO(iso), "d MMMM yyyy", { locale: nl });

const DoorverwijzingMelding = () => {
  const { token = "" } = useParams<{ token: string }>();
  const [fase, setFase] = useState<"laden" | "ongeldig" | "klaar">("laden");
  const [view, setView] = useState<ClaimView | null>(null);
  const [eersteContact, setEersteContact] = useState("");
  const [opmerking, setOpmerking] = useState("");
  const [touched, setTouched] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    let actief = true;
    (async () => {
      const uitkomst = await roepAan({ action: "status", token });
      if (!actief) return;
      if (uitkomst.ok === false) {
        setFase("ongeldig");
        return;
      }
      setView(uitkomst.view);
      setFase("klaar");
    })();
    return () => {
      actief = false;
    };
  }, [token]);

  const datumFout = touched && !eersteContact ? "Vul de datum van jullie eerste contact in." : null;

  const verstuur = async () => {
    setTouched(true);
    setFout(null);
    if (!eersteContact) return;
    setBezig(true);
    const uitkomst = await roepAan({ action: "report", token, firstContactAt: eersteContact, note: opmerking.trim() });
    setBezig(false);
    if (uitkomst.ok === false) {
      if (uitkomst.view) setView(uitkomst.view); // verlopen terwijl de pagina openstond
      else setFout(uitkomst.error ?? "Versturen is niet gelukt. Probeer het nog eens, of mail ons.");
      return;
    }
    setView(uitkomst.view);
    window.scrollTo({ top: 0 });
  };

  const titel =
    fase === "ongeldig"
      ? "Deze link werkt niet"
      : view?.state === "reported"
        ? "Bedankt voor jullie melding"
        : view?.state === "expired"
          ? "Deze link is verlopen"
          : "Was dit bruidspaar al bij jullie bekend?";

  const intro =
    fase === "klaar" && view?.state === "open"
      ? `${view.coupleNames} is op ${dag(view.referredAt)} door Bureau Vlieland doorverwezen naar ${view.partnerName}. Was het bruidspaar al eerder bij jullie in beeld? Meld het dan hier, uiterlijk ${dag(view.deadline)}.`
      : undefined;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Doorverwijzing bruiloft – Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Navigation />

      <main id="main-content">
        <FunnelHead eyebrow="Doorverwijzing bruiloft" title={titel} intro={intro} />

        <Section>
          <Container size="content">
            {fase === "laden" && <LoadingState label="De doorverwijzing ophalen…" />}

            {fase === "ongeldig" && (
              <EmptyState
                title="Wij kunnen deze doorverwijzing niet vinden"
                description="De link is onvolledig of hoort bij een doorverwijzing die niet meer bestaat. Mail ons gerust."
                action={
                  <Button asChild variant="outline">
                    <a href={`mailto:${GENERAL_CONTACT_EMAIL}?subject=Doorverwijzing bruiloft`}>Mail {GENERAL_CONTACT_EMAIL}</a>
                  </Button>
                }
              />
            )}

            {fase === "klaar" && view?.state === "open" && (
              <form
                className="space-y-8"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  void verstuur();
                }}
              >
                <Notice tone="info">
                  Meld je alleen als het bruidspaar al <strong>vóór onze doorverwijzing</strong> contact met jullie had. Dan valt deze aanvraag buiten de
                  doorverwijsafspraak met Bureau Vlieland. Was het bruidspaar nieuw voor jullie, dan hoef je niets te doen.
                </Notice>

                <div className="space-y-5">
                  <FormField
                    label="Datum van jullie eerste contact"
                    htmlFor="eerste-contact"
                    required
                    error={datumFout}
                    help={`Uiterlijk ${dag(view.referredAt)}, de dag van onze doorverwijzing.`}
                  >
                    <Input
                      id="eerste-contact"
                      type="date"
                      value={eersteContact}
                      max={view.referredAt}
                      onChange={(e) => setEersteContact(e.target.value)}
                      className="sm:w-56"
                    />
                  </FormField>

                  <FormField label="Opmerking" htmlFor="opmerking" help="Optioneel: hoe nam het bruidspaar contact op, of wat is er al besproken?">
                    <Textarea id="opmerking" value={opmerking} onChange={(e) => setOpmerking(e.target.value)} rows={4} maxLength={2000} />
                  </FormField>
                </div>

                {fout && <Notice tone="danger">{fout}</Notice>}

                <div className="space-y-3">
                  <Button type="submit" size="lg" disabled={bezig} className="w-full sm:w-auto">
                    {bezig ? "Versturen…" : "Ja, dit bruidspaar was al bij ons bekend"}
                  </Button>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Je kunt tot en met {dag(view.deadline)} melden. Vragen? Mail {GENERAL_CONTACT_EMAIL}.
                  </p>
                </div>
              </form>
            )}

            {fase === "klaar" && view?.state === "reported" && (
              <SuccessScreen
                as="h2"
                title="Genoteerd"
                intro={`We hebben vastgelegd dat ${view.coupleNames} al bij ${view.partnerName} bekend was${view.firstContactAt ? `, met het eerste contact op ${dag(view.firstContactAt)}` : ""}. Deze aanvraag valt buiten de doorverwijsafspraak.`}
              >
                <div className="space-y-3 text-sm text-muted-foreground">
                  {view.note && (
                    <p className="rounded-lg border border-border bg-card p-4 text-left text-foreground">
                      <span className="block text-xs text-muted-foreground">Jullie opmerking</span>
                      <span className="whitespace-pre-line">{view.note}</span>
                    </p>
                  )}
                  {view.reportedAt && <p>Gemeld op {dag(view.reportedAt)}. Een tweede melding is niet nodig.</p>}
                </div>
              </SuccessScreen>
            )}

            {fase === "klaar" && view?.state === "expired" && (
              <EmptyState
                title={`De termijn voor ${view.coupleNames} liep af op ${dag(view.deadline)}`}
                description={`De link werkt vijf werkdagen na onze doorverwijzing. Hoor je dit nu pas of was het bruidspaar toch al bij ${view.partnerName} bekend? Mail ons, dan kijken we samen wat er kan.`}
                action={
                  <Button asChild variant="outline">
                    <a href={`mailto:${GENERAL_CONTACT_EMAIL}?subject=${encodeURIComponent(`Doorverwijzing bruiloft: ${view.coupleNames}`)}`}>Mail {GENERAL_CONTACT_EMAIL}</a>
                  </Button>
                }
              />
            )}
          </Container>
        </Section>
      </main>

      <Footer />
    </div>
  );
};

export default DoorverwijzingMelding;
