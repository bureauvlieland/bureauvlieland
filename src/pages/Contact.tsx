import { Helmet } from "react-helmet";
import { Mail, MapPin, Phone } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RelatedLinks } from "@/components/RelatedLinks";
import { FaqSection } from "@/components/FaqSection";
import { VacationNotice } from "@/components/VacationNotice";
import { Container, PageHero, RouteChooser, Section, SectionHeader } from "@/components/system";
import { Paragraphs } from "@/components/landing/sections";
import { sectionCounter } from "@/components/landing/sectionCounter";
import erwinImage from "@/assets/erwin-profile.jpg";

const URL = "https://bureauvlieland.nl/contact";

const CHANNELS = [
  { icon: Phone, label: "Telefonisch", value: "0562 700 208", href: "tel:+31562700208" },
  { icon: Mail, label: "E-mail", value: "hallo@bureauvlieland.nl", href: "mailto:hallo@bureauvlieland.nl" },
  { icon: MapPin, label: "Adres", value: "Sikkelduin 11, 8899 CG Vlieland" },
];

const FAQ = [
  {
    question: "Hoe kan ik contact opnemen met Bureau Vlieland?",
    answer:
      "Bel 0562 700 208, mail naar hallo@bureauvlieland.nl of start vrijblijvend een [aanvraag](/programma-samenstellen). Op een bericht reageren wij doorgaans binnen één werkdag.",
  },
  {
    question: "Wat zijn de openingstijden?",
    answer: "Wij zijn op werkdagen bereikbaar. Aanvragen die in het weekend binnenkomen, pakken wij de eerstvolgende werkdag op.",
  },
  {
    question: "Waar is Bureau Vlieland gevestigd?",
    answer: "Ons adres is Sikkelduin 11, 8899 CG Vlieland.",
  },
  {
    question: "Kan ik ook via WhatsApp een vraag stellen?",
    answer: "Ja. Via de chatknop rechtsonder op de website kunt u direct een vraag stellen of doorschakelen naar WhatsApp.",
  },
];

const Contact = () => {
  const next = sectionCounter();
  const channels = next();
  const erwin = next();
  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Contact – Bureau Vlieland</title>
        <meta
          name="description"
          content="Neem contact op met Erwin Soolsma van Bureau Vlieland voor uw programma op Vlieland. Telefonisch, per e-mail of kom langs op het eiland."
        />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content="Contact – Bureau Vlieland" />
        <meta
          property="og:description"
          content="Neem contact op met Erwin Soolsma van Bureau Vlieland voor uw programma op Vlieland. Telefonisch, per e-mail of kom langs op het eiland."
        />
        <meta property="og:image" content="https://bureauvlieland.nl/og-image.jpg" />
        <meta property="og:url" content={URL} />
        <meta property="og:type" content="website" />
      </Helmet>

      <Navigation />
      <main id="main-content">
        <PageHero
          eyebrow="Contact"
          title="Neem contact op"
          intro="Benieuwd naar de mogelijkheden? Bel of mail ons, of start vrijblijvend een aanvraag: u ontvangt binnen 5 werkdagen een voorstel."
          cta={{ label: "Stuur ons een bericht", to: "mailto:hallo@bureauvlieland.nl" }}
          secondary={{ label: "Start uw aanvraag", to: "/programma-samenstellen" }}
        />

        <Section tone={channels.tone}>
          <Container size="wide">
            <SectionHeader eyebrow="Contact" number={channels.number} title="Zo bereikt u ons" align="center" />
            <VacationNotice
              endDate="2026-07-20"
              className="mx-auto mt-8 max-w-2xl"
              message={
                <p>
                  E-mailen via <a href="mailto:hallo@bureauvlieland.nl" className="underline underline-offset-4">hallo@bureauvlieland.nl</a> werkt gewoon door. U kunt ook vrijblijvend een aanvraag starten.
                </p>
              }
            />
            <ul className="mt-12 grid gap-4 md:grid-cols-3">
              {CHANNELS.map((channel) => {
                const Icon = channel.icon;
                return (
                  <li key={channel.label} className="rounded-lg border border-border bg-card p-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <p className="mt-4 text-eyebrow font-medium uppercase text-primary">{channel.label}</p>
                    {channel.href ? (
                      <a href={channel.href} className="mt-1 block break-words font-medium text-foreground underline-offset-4 hover:underline">
                        {channel.value}
                      </a>
                    ) : (
                      <p className="mt-1 font-medium text-foreground">{channel.value}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Container>
        </Section>

        <Section tone={erwin.tone}>
          <Container size="wide">
            <div className="grid items-start gap-10 lg:grid-cols-3">
              <figure className="mx-auto w-full max-w-xs overflow-hidden rounded-lg bg-muted lg:mx-0">
                <img
                  src={erwinImage}
                  alt="Erwin Soolsma, oprichter van Bureau Vlieland"
                  className="aspect-[3/4] w-full object-cover"
                  loading="lazy"
                />
              </figure>
              <div className="lg:col-span-2">
                <SectionHeader eyebrow="Contact" number={erwin.number} title="U hebt te maken met Erwin" />
                <Paragraphs
                  className="mt-6 max-w-3xl"
                  items={[
                    "Ik ben geboren op Vlieland en werk al jaren op het snijvlak van ondernemen, evenementen, leefbaarheid en samenwerking op het eiland. Bureau Vlieland is mijn manier om groepen en projecten te verbinden met wat Vlieland echt te bieden heeft.",
                    "Door mijn werk voor ondernemers, de lokale krant, vrijwilligersinitiatieven en projecten rond leefbaarheid heb ik een breed netwerk op Vlieland. Dat gebruik ik om programma's te maken die passen bij het dorp, de natuur en de mensen die hier wonen.",
                    "Bij Bureau Vlieland bent u verzekerd van persoonlijk contact en maatwerk. Ik denk graag met u mee over het perfecte programma voor uw groep.",
                  ]}
                />
              </div>
            </div>
          </Container>
        </Section>

        <RouteChooser />
        <FaqSection schemaId="contact" pageUrl={URL} items={FAQ} />
        <RelatedLinks />
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
