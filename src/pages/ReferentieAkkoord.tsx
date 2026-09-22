import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useParams } from "react-router-dom";
import { User } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Container, EmptyState, FormField, LoadingState, Notice, Section, SectionHeader, SuccessScreen } from "@/components/system";
import { ReferenceCaseView } from "@/components/referenties/ReferenceCaseView";
import { supabase } from "@/integrations/supabase/client";
import { normalizeCase, type PublishedReferenceCase } from "@/lib/referenceCases";
import { GENERAL_CONTACT_EMAIL } from "@/lib/bureauContact";

/**
 * De akkoordpagina uit de mail "Mag deze referentiepagina online?"
 * (docs/plan-reviews-oogsten.md, fase 3): de klant ziet de pagina precies
 * zoals hij op de site komt, en geeft onderaan akkoord met zijn naam, of
 * laat weten wat anders moet. Praat alleen met de edge function
 * `reference-case`; de link in de mail is het bewijs.
 */
interface CaseContext extends PublishedReferenceCase {
  status: string;
  approved_at: string | null;
  approved_name: string | null;
  feedback_at: string | null;
  reference_number: string | null;
  customer_name: string | null;
}

type Uitkomst<T> = { ok: true; data: T } | { ok: false; status: number };

async function roepAan<T>(body: Record<string, unknown>): Promise<Uitkomst<T>> {
  const { data, error } = await supabase.functions.invoke<T>("reference-case", { body });
  if (!error) return { ok: true, data: data as T };
  const context = (error as { context?: unknown }).context;
  return { ok: false, status: context instanceof Response ? context.status : 0 };
}

const toContext = (raw: Record<string, unknown>): CaseContext => ({
  ...normalizeCase(raw),
  status: typeof raw.status === "string" ? raw.status : "draft",
  approved_at: typeof raw.approved_at === "string" ? raw.approved_at : null,
  approved_name: typeof raw.approved_name === "string" ? raw.approved_name : null,
  feedback_at: typeof raw.feedback_at === "string" ? raw.feedback_at : null,
  reference_number: typeof raw.reference_number === "string" ? raw.reference_number : null,
  customer_name: typeof raw.customer_name === "string" ? raw.customer_name : null,
});

const ReferentieAkkoord = () => {
  const { token = "" } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"laden" | "ongeldig" | "bekijken">("laden");
  const [item, setItem] = useState<CaseContext | null>(null);
  const [name, setName] = useState("");
  const [wens, setWens] = useState("");
  const [touched, setTouched] = useState(false);
  const [bezig, setBezig] = useState<"akkoord" | "wens" | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [wensVerstuurd, setWensVerstuurd] = useState(false);

  useEffect(() => {
    let actief = true;
    (async () => {
      const uitkomst = await roepAan<{ case: Record<string, unknown> }>({ action: "context", token });
      if (!actief) return;
      if (uitkomst.ok === false) {
        setStatus("ongeldig");
        return;
      }
      const context = toContext(uitkomst.data.case);
      setItem(context);
      setName(context.approved_name ?? context.customer_name ?? "");
      setStatus("bekijken");
    })();
    return () => {
      actief = false;
    };
  }, [token]);

  const nameError = touched && name.trim().length === 0 ? "Vul uw naam in." : null;

  const geefAkkoord = async () => {
    setTouched(true);
    if (name.trim().length === 0) return;
    setBezig("akkoord");
    setFout(null);
    const uitkomst = await roepAan<{ case: Record<string, unknown> }>({ action: "approve", token, name: name.trim() });
    setBezig(null);
    if (uitkomst.ok === false) {
      setFout("Uw akkoord is niet aangekomen. Probeer het nog eens, of beantwoord de mail die u van ons kreeg.");
      return;
    }
    setItem(toContext(uitkomst.data.case));
    window.scrollTo({ top: 0 });
  };

  const stuurWens = async () => {
    if (wens.trim().length < 3) {
      setFout("Schrijf kort wat u anders wilt.");
      return;
    }
    setBezig("wens");
    setFout(null);
    const uitkomst = await roepAan<{ ok: true }>({ action: "feedback", token, text: wens.trim() });
    setBezig(null);
    if (uitkomst.ok === false) {
      setFout("Uw opmerking is niet aangekomen. Probeer het nog eens, of beantwoord de mail die u van ons kreeg.");
      return;
    }
    setWensVerstuurd(true);
  };

  const akkoord = Boolean(item?.approved_at);
  const online = item?.status === "published";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Uw referentiepagina – Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Navigation />

      <main id="main-content">
        {status === "laden" && (
          <Section>
            <Container size="content">
              <LoadingState label="Uw pagina ophalen…" />
            </Container>
          </Section>
        )}

        {status === "ongeldig" && (
          <Section>
            <Container size="content">
              <EmptyState
                title="Wij kunnen deze pagina niet vinden"
                description="De link hoort bij een referentiepagina die er niet meer is. Mail ons gerust; wij sturen u dan een nieuwe link."
                action={
                  <Button asChild variant="outline">
                    <a href={`mailto:${GENERAL_CONTACT_EMAIL}?subject=Referentiepagina`}>Mail {GENERAL_CONTACT_EMAIL}</a>
                  </Button>
                }
              />
            </Container>
          </Section>
        )}

        {status === "bekijken" && item && (
          <>
            <Section spacing="compact" tone="sand">
              <Container size="content">
                {online ? (
                  <Notice tone="success" title="Deze pagina staat online">
                    <p>
                      Bedankt voor uw akkoord. De pagina staat op{" "}
                      <Link to={`/referenties/${item.slug}`} className="underline underline-offset-2">
                        bureauvlieland.nl/referenties/{item.slug}
                      </Link>
                      . Aanpassen of verwijderen kan altijd met een mail aan {GENERAL_CONTACT_EMAIL}.
                    </p>
                  </Notice>
                ) : akkoord ? (
                  <Notice tone="success" title={`Bedankt${item.approved_name ? `, ${item.approved_name}` : ""}`}>
                    <p>Uw akkoord is vastgelegd. Wij zetten de pagina binnenkort online en sturen u de link.</p>
                  </Notice>
                ) : (
                  <Notice tone="info" title="Voorvertoning van uw referentiepagina">
                    <p>
                      Zo komt de pagina op bureauvlieland.nl te staan{item.reference_number ? ` (programma ${item.reference_number})` : ""}. Hij staat
                      nog niet online: dat doen wij pas na uw akkoord, onderaan deze pagina.
                    </p>
                  </Notice>
                )}
              </Container>
            </Section>

            <ReferenceCaseView item={item} />

            <Section id="akkoord">
              <Container size="content">
                {akkoord ? (
                  <SuccessScreen
                    title={`Bedankt${item.approved_name ? `, ${item.approved_name}` : ""}`}
                    intro={online ? "Deze pagina staat online." : "Uw akkoord is vastgelegd. Wij zetten de pagina online en sturen u de link."}
                    reference={item.reference_number}
                  >
                    <p className="text-sm text-muted-foreground">
                      Later iets aanpassen of de pagina laten verwijderen? Eén mail aan {GENERAL_CONTACT_EMAIL} is genoeg. Terug naar{" "}
                      <Link to="/" className="underline underline-offset-2 hover:text-foreground">
                        bureauvlieland.nl
                      </Link>
                      .
                    </p>
                  </SuccessScreen>
                ) : (
                  <div className="space-y-10">
                    <SectionHeader
                      title="Mag deze pagina online?"
                      intro="Wij plaatsen de pagina pas na uw akkoord. Later aanpassen of verwijderen kan altijd: één mail is genoeg."
                      size="md"
                      weight="medium"
                    />

                    <form
                      className="space-y-6"
                      noValidate
                      onSubmit={(e) => {
                        e.preventDefault();
                        void geefAkkoord();
                      }}
                    >
                      <FormField label="Uw naam" htmlFor="akkoord-naam" required error={nameError} leading={<User />} className="max-w-md">
                        <Input id="akkoord-naam" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} />
                      </FormField>
                      <div className="space-y-3">
                        <Button type="submit" size="lg" disabled={bezig !== null} className="w-full sm:w-auto">
                          {bezig === "akkoord" ? "Vastleggen…" : "Ja, deze pagina mag online"}
                        </Button>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          Met uw akkoord mag Bureau Vlieland deze pagina, met de naam van uw organisatie en het citaat, op bureauvlieland.nl tonen. Wij
                          leggen uw naam en het tijdstip vast. Zie ook onze{" "}
                          <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
                            privacyverklaring
                          </Link>
                          .
                        </p>
                      </div>
                    </form>

                    <div className="border-t border-border pt-8">
                      {wensVerstuurd ? (
                        <Notice tone="success" title="Bedankt voor uw opmerking">
                          <p>Wij passen de pagina aan en sturen u een nieuwe versie ter beoordeling.</p>
                        </Notice>
                      ) : (
                        <div className="space-y-4">
                          <FormField
                            label="Liever iets anders?"
                            htmlFor="akkoord-wens"
                            help="Bijvoorbeeld een andere titel, een onderdeel dat weg mag of een citaat dat u liever anders ziet. Wij passen het aan en sturen u een nieuwe versie."
                          >
                            <Textarea id="akkoord-wens" value={wens} onChange={(e) => setWens(e.target.value)} rows={4} maxLength={4000} />
                          </FormField>
                          <Button type="button" variant="outline" disabled={bezig !== null} onClick={() => void stuurWens()}>
                            {bezig === "wens" ? "Versturen…" : "Stuur uw opmerking"}
                          </Button>
                        </div>
                      )}
                    </div>

                    {fout && <Notice tone="danger">{fout}</Notice>}
                  </div>
                )}
              </Container>
            </Section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ReferentieAkkoord;
