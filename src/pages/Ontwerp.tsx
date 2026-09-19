import { useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarOff, Mail, MapPin, Ship, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { IconSetComparison } from "@/components/ontwerp/IconSetComparison";
import {
  Container,
  Section,
  SectionHeader,
  Pill,
  Notice,
  Stepper,
  WizardFooter,
  FormField,
  OptionCard,
  OptionGroup,
  SuccessScreen,
  SubmitNote,
  EmptyState,
  LoadingState,
  type PillTone,
  type NoticeTone,
} from "@/components/system";

/**
 * Referentiepagina van het ontwerpsysteem: alle tokens en componenten naast
 * elkaar, om een wijziging in één oogopslag te beoordelen op een preview.
 * Alleen buiten productie geregistreerd (App.tsx) en nooit geïndexeerd.
 * Zie docs/design-systeem.md.
 */

const COLORS: { name: string; className: string; note: string }[] = [
  { name: "primary", className: "bg-primary text-primary-foreground", note: "merk, koppen, links, iconen" },
  { name: "ocean-deep", className: "bg-ocean-deep text-primary-foreground", note: "donkere secties" },
  { name: "action", className: "bg-action text-action-foreground", note: "de primaire knop, publiek oranje" },
  { name: "sunset", className: "bg-sunset text-sunset-foreground", note: "alleen de cursieve regel in de hero" },
  { name: "sand", className: "bg-sand text-sand-foreground", note: "warme tussensecties, eyebrow op donker" },
  { name: "accent-soft", className: "bg-accent-soft text-primary", note: "secundaire knop, zachte vlakken" },
  { name: "muted", className: "bg-muted text-foreground", note: "lichte vlakken, hover" },
  { name: "background", className: "bg-background text-foreground border", note: "pagina" },
];

const STATUS: { name: string; soft: string; ink: string; solid: string }[] = [
  { name: "info", soft: "bg-info-soft", ink: "text-info-ink", solid: "bg-info" },
  { name: "success", soft: "bg-success-soft", ink: "text-success-ink", solid: "bg-success" },
  { name: "warning", soft: "bg-warning-soft", ink: "text-warning-ink", solid: "bg-warning" },
  { name: "destructive", soft: "bg-destructive-soft", ink: "text-destructive-ink", solid: "bg-destructive" },
];

const PILL_TONES: PillTone[] = ["neutral", "info", "success", "warning", "danger", "purple", "brand"];
const NOTICE_TONES: NoticeTone[] = ["info", "success", "warning", "danger"];

const Swatch = ({ name, className, note }: { name: string; className: string; note: string }) => (
  <div className="space-y-2">
    <div className={`h-16 rounded-lg flex items-end p-2 text-xs font-medium ${className}`}>{name}</div>
    <p className="text-xs text-muted-foreground">{note}</p>
  </div>
);

const DEMO_STEPS = [
  { key: "basics", label: "Basisgegevens" },
  { key: "template", label: "Voorbeeld" },
  { key: "transport", label: "Vervoer en fietsen" },
  { key: "program", label: "Programma" },
  { key: "contact", label: "Gegevens" },
];

/** De funnelcomponenten van fase 2 naast elkaar, met één keuze die werkt. */
const FunnelDemo = () => {
  const [situation, setSituation] = useState<"wal" | "eiland">("wal");
  return (
    <div className="mt-10 space-y-8">
      <div className="rounded-lg border border-border bg-card p-4">
        <Stepper steps={DEMO_STEPS} current="transport" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-5 p-6">
            <SectionHeader as="h3" size="md" weight="medium" title="Een wizardstap" intro="FormField, OptionCard en WizardFooter zoals in de programma-wizard." />
            <FormField label="Aantal personen" htmlFor="demo-people" required leading={<Users />} help="Een schatting is genoeg.">
              <Input type="number" defaultValue={20} className="w-40" />
            </FormField>
            <FormField label="E-mailadres" htmlFor="demo-email" required leading={<Mail />} error="Vul een geldig e-mailadres in.">
              <Input type="email" defaultValue="erwin@" />
            </FormField>
            <FormField label="Bedrijf of organisatie" htmlFor="demo-company">
              <Input placeholder="Optioneel" />
            </FormField>
            <OptionGroup label="Wat is de situatie?" columns={2}>
              <OptionCard
                selected={situation === "wal"}
                onSelect={() => setSituation("wal")}
                title="Wij komen vanaf de wal"
                description="Wij regelen desgewenst de overtocht en fietsen."
                icon={<Ship />}
              />
              <OptionCard
                selected={situation === "eiland"}
                onSelect={() => setSituation("eiland")}
                title="Wij zijn al op Vlieland"
                description="Een dag of dagdeel programma."
                icon={<MapPin />}
              />
            </OptionGroup>
            <WizardFooter onBack={() => undefined} onNext={() => undefined} nextLabel="Volgende: uw programma" />
            <WizardFooter
              onBack={() => undefined}
              backLabel="Terug naar programma"
              onNext={() => undefined}
              nextLabel="Aanvraag versturen"
              note={<SubmitNote />}
              className="border-t border-border"
            />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <SuccessScreen
                title="Uw aanvraag is verstuurd"
                intro="Controleer uw inbox voor de bevestigingsmail. Binnen 5 werkdagen ontvangt u een voorstel op maat."
                reference="BV-2026-0418"
                primary={{ label: "Bekijk uw programmapagina", to: "/ontwerp" }}
                secondary={{ label: "Terug naar de homepage", to: "/" }}
                className="py-2"
              />
            </CardContent>
          </Card>
          <EmptyState
            icon={<CalendarOff />}
            title="Nog geen onderdelen op deze dag"
            description="Voeg een activiteit toe om te beginnen."
            action={<Button variant="outline" size="sm">Activiteit toevoegen</Button>}
          />
          <LoadingState label="Beschikbaarheid ophalen…" />
        </div>
      </div>
    </div>
  );
};

const Ontwerp = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>Ontwerpsysteem – referentie</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>

    <Section tone="dark" spacing="spacious">
      <Container size="wide">
        <SectionHeader
          as="h1"
          onDark
          eyebrow="Ontwerpsysteem"
          number="00"
          title={
            <>
              Eén taal voor de hele site, <span className="italic text-sunset">naast elkaar.</span>
            </>
          }
          intro={`Tokens en componenten uit fase 1. Deze pagina bestaat alleen buiten productie (modus: ${import.meta.env.MODE}). Regels staan in docs/design-systeem.md.`}
        />
        <div className="mt-10 flex flex-wrap gap-4">
          <Button size="xl">
            Primaire actie
            <ArrowRight />
          </Button>
          <Button size="xl" variant="inverseOutline">
            Op donker: inverseOutline
          </Button>
          <Button size="xl" variant="inverse">
            Op donker: inverse
          </Button>
        </div>
      </Container>
    </Section>

    <Section>
      <Container size="wide">
        <SectionHeader eyebrow="Tokens" number="01" title="Kleur" intro="Alle kleuren zijn HSL-tokens in index.css. Losse paletkleuren (bg-amber-50, text-green-600) horen nergens meer." />
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {COLORS.map((c) => (
            <Swatch key={c.name} {...c} />
          ))}
        </div>
        <h3 className="mt-12 font-display text-display-md font-light">Status</h3>
        <p className="text-muted-foreground mt-2 text-sm">Goed = success, aandacht = warning, geblokkeerd = destructive, uitleg = info. Zacht vlak met inkt-tekst voor pills en meldingen, vol vlak voor iconen en puntjes.</p>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATUS.map((s) => (
            <div key={s.name} className="space-y-2">
              <div className={`h-16 rounded-lg p-2 text-xs font-medium ${s.soft} ${s.ink}`}>{s.name}-soft + {s.name}-ink</div>
              <div className={`h-4 rounded-sm ${s.solid}`} />
            </div>
          ))}
        </div>
      </Container>
    </Section>

    <Section tone="muted">
      <Container size="wide">
        <SectionHeader eyebrow="Tokens" number="02" title="Typografie" intro="Fraunces licht en groot voor koppen op marketingpagina's, middelzwaar in de funnel; Inter voor alles wat gelezen wordt." />
        <div className="mt-10 space-y-8">
          <div>
            <p className="text-eyebrow uppercase text-muted-foreground mb-2">display-xl · Fraunces 300 · hero</p>
            <p className="font-display font-light text-display-xl">Het eiland als bestemming.</p>
          </div>
          <div>
            <p className="text-eyebrow uppercase text-muted-foreground mb-2">display-lg · Fraunces 300 · sectiekop</p>
            <p className="font-display font-light text-display-lg">Honderden mogelijkheden, één eiland.</p>
          </div>
          <div>
            <p className="text-eyebrow uppercase text-muted-foreground mb-2">display-md · Fraunces 500 · kaarttitel en funnel</p>
            <p className="font-display font-medium text-display-md">Zeehondentocht Exclusief</p>
          </div>
          <div>
            <p className="text-eyebrow uppercase text-muted-foreground mb-2">eyebrow · Inter 500 · 0.75rem · tracking 0.2em</p>
            <p className="text-eyebrow uppercase font-medium text-primary">· 04 — Het verhaal achter</p>
          </div>
          <div>
            <p className="text-eyebrow uppercase text-muted-foreground mb-2">body · Inter 400 · 1rem / 1.125rem</p>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">Bureau Vlieland is uw lokale specialist voor groepsbezoek aan Vlieland. Wij ontwikkelen het programma, boeken alle eilandpartners en sturen u één factuur.</p>
          </div>
        </div>
      </Container>
    </Section>

    <Section>
      <Container size="wide">
        <SectionHeader eyebrow="Componenten" number="03" title="Knoppen" intro="Eén primaire actie per scherm, altijd in de actiekleur. Al het andere is secondary, outline, ghost of link. Hoekig (4px), vier hoogtes." />
        <div className="mt-10 space-y-6">
          {(["sm", "default", "lg", "xl"] as const).map((size) => (
            <div key={size} className="flex flex-wrap items-center gap-3">
              <span className="w-16 text-xs text-muted-foreground">{size}</span>
              <Button size={size}>Primair</Button>
              <Button size={size} variant="secondary">Secundair</Button>
              <Button size={size} variant="outline">Outline</Button>
              <Button size={size} variant="ghost">Ghost</Button>
              <Button size={size} variant="link">Link</Button>
              <Button size={size} variant="destructive">Verwijderen</Button>
              <Button size={size} disabled>Uitgeschakeld</Button>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-lg bg-primary p-6 flex flex-wrap gap-3">
          <Button>Op een blauwe band: primair</Button>
          <Button variant="inverseOutline">inverseOutline</Button>
          <Button variant="inverse">inverse</Button>
        </div>
        <div className="mt-8 max-w-md space-y-3">
          <Input placeholder="Invoerveld, zelfde radius als de knop" />
          <div className="flex gap-3">
            <Input placeholder="E-mailadres" />
            <Button>Versturen</Button>
          </div>
        </div>
      </Container>
    </Section>

    <Section tone="muted">
      <Container size="wide">
        <SectionHeader eyebrow="Componenten" number="04" title="Pills en meldingen" intro="Pill voor een status of label, Notice voor een melding in de pagina. De toon is een betekenis, geen kleur." />
        <div className="mt-10 flex flex-wrap gap-2">
          {PILL_TONES.map((tone) => (
            <Pill key={tone} tone={tone}>
              {tone}
            </Pill>
          ))}
          <Pill tone="success" size="md">
            size md
          </Pill>
        </div>
        <div className="mt-8 grid md:grid-cols-2 gap-4">
          {NOTICE_TONES.map((tone) => (
            <Notice key={tone} tone={tone} title={`Notice ${tone}`}>
              <p>Korte uitleg voor de bezoeker. Geen blokkade, wel eerlijk over wat er speelt.</p>
            </Notice>
          ))}
        </div>
      </Container>
    </Section>

    <Section>
      <Container size="wide">
        <SectionHeader eyebrow="Componenten" number="05" title="Sectie, kop en container" intro="Section bepaalt toon en ruimte, SectionHeader de kop, Container de breedte. Vier breedtes: prose, content, wide, full." />
        <div className="mt-10 space-y-3">
          {(["prose", "content", "wide", "full"] as const).map((size) => (
            <Container key={size} size={size} className="!px-0">
              <div className="rounded-lg border border-dashed border-primary/40 bg-accent-soft/40 px-3 py-2 text-xs text-primary">{size}</div>
            </Container>
          ))}
        </div>
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <SectionHeader as="h3" eyebrow="Links, standaard" title="Kaarttitel als h3" intro="Een intro in muted-foreground." />
            </CardContent>
          </Card>
          <div className="rounded-lg bg-ocean-deep p-6">
            <SectionHeader as="h3" onDark eyebrow="Op donker" number="07" title="Eyebrow in zand" intro="Intro in zand, tekst licht." />
          </div>
        </div>
      </Container>
    </Section>

    <Section tone="muted">
      <Container size="wide">
        <SectionHeader eyebrow="Componenten" number="06" title="Funnel" intro="Stepper, FormField, OptionCard, WizardFooter, SuccessScreen, EmptyState en LoadingState: één set voor alle aanvraagformulieren. Terug links, de volgende stap rechts, één primaire knop per scherm." />
        <FunnelDemo />
      </Container>
    </Section>

    <Section>
      <Container size="wide">
        <SectionHeader
          eyebrow="Ter beoordeling"
          number="08"
          title="Iconen"
          intro="Lucide is de huidige set. Hieronder dezelfde negen iconen op 16, 20 en 24px, in een veld en op een keuzekaart, naast Phosphor en Tabler en naast een variant zonder iconen in velden. Een keuze hier geldt daarna voor de hele site."
        />
        <IconSetComparison />
      </Container>
    </Section>

    <Section tone="sand">
      <Container size="wide">
        <SectionHeader eyebrow="Tokens" number="07" title="Vorm, schaduw en beweging" intro="Twee radii (4px en 8px) plus rond voor avatars en puntjes. Drie schaduwen. Beweging: 150ms hover, 300ms staat, 700ms entree, en niets bij prefers-reduced-motion." />
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="h-20 rounded-sm bg-card border flex items-center justify-center text-xs">rounded-sm · 4px</div>
          <div className="h-20 rounded-lg bg-card border flex items-center justify-center text-xs">rounded-lg · 8px</div>
          <div className="h-20 rounded-2xl bg-card border flex items-center justify-center text-xs">rounded-2xl → 8px</div>
          <div className="h-20 rounded-full bg-card border flex items-center justify-center text-xs">rounded-full</div>
          <div className="h-20 rounded-lg bg-card shadow-soft flex items-center justify-center text-xs">shadow-soft</div>
          <div className="h-20 rounded-lg bg-card shadow-medium flex items-center justify-center text-xs">shadow-medium</div>
          <div className="h-20 rounded-lg bg-card shadow-dramatic flex items-center justify-center text-xs">shadow-dramatic</div>
          <div className="h-20 rounded-lg bg-card shadow-lg flex items-center justify-center text-xs">shadow-lg → medium</div>
        </div>
        <p className="mt-10 text-sm text-muted-foreground">
          Terug naar de <Link to="/" className="text-primary underline underline-offset-4">homepage</Link>.
        </p>
      </Container>
    </Section>
  </div>
);

export default Ontwerp;
