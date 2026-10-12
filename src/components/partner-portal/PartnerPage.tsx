import type { ReactNode } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Container, LoadingState, Notice, PortalHead } from "@/components/system";
import type { ContainerSize } from "@/components/system/Container";
import type { PillTone } from "@/components/system/pillVariants";

/**
 * Eén opbouw voor elke pagina van het partnerportaal (fase 1): de titel in
 * de tab, één breedte (`wide`, of smaller voor formulieren), één padding, en
 * bovenaan de `PortalHead` met icoon, titel, één zin en hoogstens één status.
 * `back` zet de terugkoppeling erboven; `loading` en `error` tonen de
 * laadtoestand en de foutmelding op dezelfde plek als de inhoud.
 */
export interface PartnerPageProps {
  /** Naam in de tab: "<title> | Partnerportaal | Bureau Vlieland". */
  title: string;
  icon?: ReactNode;
  /** Kop op de pagina; standaard gelijk aan `title`. */
  heading?: ReactNode;
  description?: ReactNode;
  status?: { label: string; tone?: PillTone } | null;
  facts?: { key?: string; icon?: ReactNode; label: ReactNode }[];
  actions?: ReactNode;
  back?: { to: string; label?: string; state?: unknown };
  size?: ContainerSize;
  loading?: boolean;
  error?: string | null;
  children?: ReactNode;
  className?: string;
}

export const PartnerPage = ({
  title,
  icon,
  heading,
  description,
  status,
  facts,
  actions,
  back,
  size = "wide",
  loading,
  error,
  children,
  className,
}: PartnerPageProps) => (
  <Container size={size} className={className ?? "space-y-6 py-4 md:py-6"}>
    <Helmet>
      <title>{title} | Partnerportaal | Bureau Vlieland</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    {back && (
      <Link to={back.to} state={back.state} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {back.label ?? "Terug naar overzicht"}
      </Link>
    )}
    <PortalHead icon={icon} title={heading ?? title} description={description} status={status} facts={facts} actions={actions} />
    {loading ? (
      <LoadingState />
    ) : error ? (
      <Notice tone="danger" title="Dit kon niet worden geladen">
        {error}
      </Notice>
    ) : (
      children
    )}
  </Container>
);
