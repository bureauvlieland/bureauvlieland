/**
 * Publieke betaalpagina van een klantfactuur: /betalen/<factuur-id>.
 * De link staat in de factuurmail en op de pdf. De klant ziet bedrag, IBAN,
 * omschrijving en een EPC-QR voor de bank-app; niets hoeft overgetikt.
 */
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Container, LoadingState, Notice, Section } from "@/components/system";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

interface InvoicePaymentView {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amountInclVat: number;
  isCredit: boolean;
  paid: boolean;
  reference: string | null;
  customerLabel: string | null;
  iban: string;
  beneficiary: string;
  epcPayload: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const formatEuro = (n: number) => `€ ${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (iso: string) => format(parseISO(iso), "d MMMM yyyy", { locale: nl });
const formatIban = (iban: string) => iban.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();

const CopyRow = ({ label, value, copyValue }: { label: string; value: string; copyValue?: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyValue ?? value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* geen klembord: de waarde staat er al leesbaar */
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0">
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium tabular-nums break-all">{value}</div>
      </div>
      <Button variant="ghost" size="sm" onClick={copy} aria-label={`${label} kopiëren`}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
};

const Betalen = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [view, setView] = useState<InvoicePaymentView | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "notfound" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!invoiceId || !UUID_RE.test(invoiceId)) {
        setState("notfound");
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke<InvoicePaymentView>("get-invoice-payment", { body: { invoiceId } });
        if (cancelled) return;
        if (error || !data || !("invoiceNumber" in data)) {
          setState(error?.message?.includes("404") ? "notfound" : "error");
          return;
        }
        setView(data);
        setState("ok");
      } catch {
        if (!cancelled) setState("error");
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  const title = view ? `Factuur ${view.invoiceNumber} betalen` : "Factuur betalen";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{title} – Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Navigation />
      <main className="flex-1">
        <Section>
          <Container className="max-w-2xl">
            <h1 className="text-2xl font-semibold mb-2">{title}</h1>
            {state === "loading" && <LoadingState label="Factuur ophalen…" />}
            {state === "notfound" && (
              <Notice tone="warning" title="Factuur niet gevonden">
                Deze betaallink klopt niet of de factuur bestaat niet meer. Gebruik de gegevens op de factuur zelf of{" "}
                <Link to="/contact" className="underline">neem contact op</Link>.
              </Notice>
            )}
            {state === "error" && (
              <Notice tone="danger" title="Even geen verbinding">
                De betaalgegevens konden niet worden opgehaald. Probeer het later opnieuw; de gegevens staan ook op de factuur.
              </Notice>
            )}
            {state === "ok" && view && (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  {view.customerLabel ? `Voor ${view.customerLabel}. ` : ""}
                  Factuurdatum {formatDate(view.invoiceDate)}
                  {view.reference ? `, dossier ${view.reference}` : ""}.
                </p>

                {view.paid && (
                  <Notice tone="success" title="Deze factuur is betaald">
                    Dank u wel. Er staat niets meer open.
                  </Notice>
                )}
                {view.isCredit && !view.paid && (
                  <Notice tone="info" title="Dit is een creditnota">
                    Er is niets te betalen; het bedrag van {formatEuro(view.amountInclVat)} wordt verrekend of teruggestort.
                  </Notice>
                )}

                {!view.paid && !view.isCredit && (
                  <Card className="p-5 grid gap-6 sm:grid-cols-[1fr_auto] items-start">
                    <div>
                      <div className="text-sm text-muted-foreground">Te betalen vóór {formatDate(view.dueDate)}</div>
                      <div className="text-3xl font-semibold tabular-nums mb-3">{formatEuro(view.amountInclVat)}</div>
                      <CopyRow label="IBAN" value={formatIban(view.iban)} copyValue={view.iban.replace(/\s+/g, "")} />
                      <CopyRow label="Op naam van" value={view.beneficiary} />
                      <CopyRow label="Omschrijving" value={view.invoiceNumber} />
                      <CopyRow label="Bedrag" value={formatEuro(view.amountInclVat)} copyValue={view.amountInclVat.toFixed(2).replace(".", ",")} />
                    </div>
                    {view.epcPayload && (
                      <div className="flex flex-col items-center gap-2 sm:pt-6">
                        {/* De QR tekent zijn eigen witte vlak met rand: een bank-app scant hem ook in donkere modus. */}
                        <div className="rounded-md border overflow-hidden">
                          <QRCodeSVG
                            value={view.epcPayload}
                            size={192}
                            level="M"
                            marginSize={3}
                            bgColor="#ffffff"
                            fgColor="#000000"
                            aria-label="QR-code voor uw bank-app"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground text-center max-w-[12rem]">
                          Scan met uw bank-app: IBAN, bedrag en omschrijving staan dan al ingevuld.
                        </p>
                      </div>
                    )}
                  </Card>
                )}

                <p className="text-sm text-muted-foreground">
                  Vragen over deze factuur? Beantwoord de factuurmail of{" "}
                  <Link to="/contact" className="underline">neem contact op</Link>.
                </p>
              </div>
            )}
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  );
};

export default Betalen;
