import { Link } from "react-router-dom";
import { ArrowRight, Briefcase, Building2, CheckCircle2, Compass, Handshake, Shield, Sparkles, Target, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Container, FactList, Notice, Section, SectionHeader, type SectionTone } from "@/components/system";
import { Checklist, FeatureGrid } from "@/components/landing/sections";
import { sectionCounter } from "@/components/landing/sectionCounter";

interface AudienceProps {
  id: string;
  number: string;
  tone: SectionTone;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  text: string;
  points: string[];
  primary: { label: string; to: string };
  secondary: { label: string; to: string };
  facts: { label: string; value: string }[];
  flip?: boolean;
}

const Audience = ({ id, number, tone, icon: Icon, eyebrow, title, text, points, primary, secondary, facts, flip }: AudienceProps) => (
  <Section id={id} tone={tone} className="scroll-mt-24">
    <Container size="wide">
      <div className="grid items-start gap-10 lg:grid-cols-5">
        <div className={cn("lg:col-span-3", flip && "lg:order-2")}>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <SectionHeader className="mt-5" eyebrow={eyebrow} number={number} title={title} />
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">{text}</p>
          <div className="mt-8">
            <Checklist items={points} />
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to={primary.to}>
                {primary.label}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to={secondary.to}>{secondary.label}</Link>
            </Button>
          </div>
        </div>
        <FactList items={facts} className={cn("lg:col-span-2", flip && "lg:order-1")} />
      </div>
    </Container>
  </Section>
);

/** Voor wie Bureau Vlieland werkt: de vier doelgroepen. */
export const ForWho = () => {
  const next = sectionCounter();
  const intro = next();
  const bedrijven = next();
  const management = next();
  const organisaties = next();
  const partners = next();
  return (
    <>
      <Section tone={intro.tone}>
        <Container size="wide">
          <SectionHeader
            eyebrow="Voor wie"
            number={intro.number}
            title="Voor wie wij werken"
            intro="Wij werken voor groepen die begrijpen dat een goede dag of een goed weekend op Vlieland ontstaat door goede voorbereiding, ervaring en de juiste lokale partners. Groepen waarbij kwaliteit centraal staat."
            align="center"
          />
          <FeatureGrid
            className="mt-12"
            items={[
              { icon: Target, title: "Zakelijke teams", text: "Teamdagen, heidagen en meerdaagse retreats met een helder doel." },
              { icon: Compass, title: "Duidelijke doelen", text: "Organisaties met een helder thema of doel voor hun programma." },
              { icon: Shield, title: "Volledige ontzorging", text: "Eén partij, één factuur: programma, begeleiding en catering geregeld." },
              { icon: CheckCircle2, title: "Kwaliteitsbewust", text: "Een realistisch budget waarin lokale kwaliteit past." },
            ]}
          />
          <Notice tone="info" title="Goed om te weten" icon={<Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />} className="mx-auto mt-8 max-w-3xl">
            Wij nemen bewust geen losse excursies of standaard dagjes uit aan. Voor eenvoudige arrangementen, of als budget leidend is, adviseren wij rechtstreeks contact op te nemen met ondernemers op Vlieland.
          </Notice>
        </Container>
      </Section>

      <Audience
        id="bedrijven"
        number={bedrijven.number}
        tone={bedrijven.tone}
        icon={Users}
        eyebrow="Doelgroep"
        title="Bedrijven en teams"
        text="Voor bedrijven en teams die meer willen dan een standaard uitje. Of het nu gaat om een eendaags teamuitje, een tweedaagse met overnachting of een complete bedrijfsreis: wij zorgen voor een programma dat past bij uw team en doelstellingen."
        points={[
          "Teambuilding met echte impact op samenwerking",
          "Volledig ontzorgd: van boot tot borrel",
          "Flexibele programma's voor kleine en grote teams",
          "Professionele begeleiding op de dag zelf",
        ]}
        primary={{ label: "Bekijk bedrijfsuitjes", to: "/bedrijfsuitje-vlieland" }}
        secondary={{ label: "Teamuitje organiseren", to: "/teamuitje-vlieland" }}
        facts={[
          { label: "Ideaal voor", value: "Afdelingen, projectteams, volledige organisaties, startups en scale-ups die investeren in hun mensen." },
          { label: "Populaire formats", value: "Eendaagse teamdagen, tweedaagse met overnachting, kick-offs en afsluitingen, seizoensuitjes en jubilea." },
          { label: "Groepsgrootte", value: "Van 10 tot 150 personen. Voor grotere groepen overleggen wij graag over de mogelijkheden." },
        ]}
      />

      <Audience
        id="management"
        number={management.number}
        tone={management.tone}
        icon={Briefcase}
        eyebrow="Doelgroep"
        title="Management en directie"
        text="Voor directieteams, managementgroepen en besturen die in alle rust willen werken aan strategie, visie of onderlinge samenwerking. Vlieland biedt de perfecte afzondering voor heisessies en strategiedagen."
        points={[
          "Strategiesessies zonder onderbrekingen",
          "MT-dagen met ruimte voor reflectie",
          "Visietrajecten in een inspirerende omgeving",
          "Bestuursvergaderingen met toegevoegde waarde",
        ]}
        primary={{ label: "Heisessie organiseren", to: "/heisessie-vlieland" }}
        secondary={{ label: "Meerdaags programma", to: "/meerdaags-bedrijfsuitje-vlieland" }}
        facts={[
          { label: "Focus en verdieping", value: "Weg van de waan van de dag. Op Vlieland is er ruimte om echt na te denken, zonder onderbrekingen of afleidingen." },
          { label: "Discretie en kwaliteit", value: "Exclusieve locaties, hoogwaardige catering en volledige privacy. Alles afgestemd op de verwachtingen van directieniveau." },
          { label: "Flexibele invulling", value: "Van puur werkinhoudelijke sessies tot programma's met ruimte voor ontspanning en verbinding." },
        ]}
        flip
      />

      <Audience
        id="organisaties"
        number={organisaties.number}
        tone={organisaties.tone}
        icon={Building2}
        eyebrow="Doelgroep"
        title="Organisaties en instellingen"
        text="Voor zorginstellingen, onderwijsorganisaties, overheden, stichtingen en verenigingen die een bijzonder programma zoeken. Wij begrijpen de specifieke context en verwachtingen van non-profit en publieke organisaties."
        points={[
          "Programma's passend bij maatschappelijke doelen",
          "Ervaring met grotere en diverse groepen",
          "Transparante prijsopbouw voor aanbestedingen",
          "Aandacht voor inclusiviteit en toegankelijkheid",
        ]}
        primary={{ label: "Evenement organiseren", to: "/zakelijk-evenement-vlieland" }}
        secondary={{ label: "Liever maatwerk?", to: "/programma-op-maat" }}
        facts={[
          { label: "Voorbeelden", value: "Ziekenhuizen, scholen, gemeenten, provincies, zorginstellingen, woningcorporaties, brancheverenigingen en goede doelen." },
          { label: "Type programma's", value: "Teamdagen, personeelsuitjes, vrijwilligersdagen, bestuursweekenden, congressen en netwerkbijeenkomsten." },
          { label: "Onze aanpak", value: "Altijd in overleg, met oog voor budget, de samenstelling van de groep en de specifieke wensen van uw organisatie." },
        ]}
      />

      <Audience
        id="partners"
        number={partners.number}
        tone={partners.tone}
        icon={Handshake}
        eyebrow="Samenwerking"
        title="Evenementenbureaus en trainers"
        text="Wilt u als evenementenbureau, trainer of coach uw klanten of deelnemers naar Vlieland brengen? Bureau Vlieland is uw betrouwbare lokale partner. Wij leveren de kennis, logistiek en uitvoering; u de inhoud en de klant."
        points={[
          "Lokale kennis van locaties, leveranciers en mogelijkheden",
          "Coördinatie en begeleiding op de dag zelf",
          "Geen overhead van een eigen kantoor op het eiland nodig",
          "Flexibele samenwerking: per project of structureel",
        ]}
        primary={{ label: "Ontdek de samenwerking", to: "/samenwerken" }}
        secondary={{ label: "Neem contact op", to: "/contact" }}
        facts={[
          { label: "Lokale logistiek", value: "Accommodatiebeheer, reserveringen, vervoer op het eiland, fietsen en materiaalverhuur: wij regelen het." },
          { label: "Catering en horeca", value: "Van ontbijt tot diner, van strandborrel tot walking dinner. Onze cateringpartners kennen het eiland en leveren kwaliteit." },
          { label: "White-label uitvoering", value: "Uw naam, onze handen. Wij werken op de achtergrond, zodat uw relatie met de klant centraal blijft." },
        ]}
        flip
      />
    </>
  );
};
