import type { ReactNode } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/system";
import logo from "@/assets/logo.png";

/**
 * De schil om de pagina's buiten de zijbalk (partnerportaal fase 4):
 * inloggen, wachtwoord instellen en de oude tokenroute. Eén smalle kaart
 * in het midden, het logo erboven, de voet eronder.
 */
interface PartnerAuthShellProps {
  /** Naam in de tab: "<title> | Partnerportaal | Bureau Vlieland". */
  title: string;
  heading: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
  /** Tekst onder de kaart. */
  footer?: ReactNode;
}

export const PartnerAuthShell = ({ title, heading, intro, children, footer }: PartnerAuthShellProps) => (
  <div className="flex min-h-screen flex-col bg-muted/30">
    <Helmet>
      <title>{title} | Partnerportaal | Bureau Vlieland</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    <header className="border-b bg-background">
      <Container size="wide" className="flex items-center justify-between py-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Naar de website
        </Link>
        <img src={logo} alt="Bureau Vlieland" className="h-10" />
      </Container>
    </header>
    <main id="main-content" className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-lg border bg-card p-6 sm:p-8">
          <h1 className="font-display text-display-md font-medium">{heading}</h1>
          {intro && <p className="mt-1 text-sm text-muted-foreground">{intro}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>}
      </div>
    </main>
    <footer className="border-t bg-background py-4 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} Bureau Vlieland. Alle rechten voorbehouden.</footer>
  </div>
);
