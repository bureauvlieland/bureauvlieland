import { Helmet } from "react-helmet";
import { useSearchParams } from "react-router-dom";
import { PartnerShell } from "@/components/partner-portal/PartnerLayout";
import { PartnerPortalProvider } from "@/components/partner-portal/PartnerPortalContext";
import { PartnerProjectenContent, PartnerWerkbankContent } from "@/pages/PartnerDashboard";
import { PartnerProjectContent } from "@/pages/PartnerProject";
import { PartnerFinanceContent } from "@/pages/PartnerFinance";
import { DEMO_COMMISSION_INVOICES, DEMO_DASHBOARD, DEMO_PARTNER } from "@/content/demoPartnerportaal";

/**
 * Referentie van het partnerportaal met een vaste, verzonnen partner
 * (partnerportaal fase 1). Bestaat alleen buiten productie, net als
 * /ontwerp en /ontwerp/klantportaal, en wordt de bron voor de visuele
 * regressietest: `?scherm=` kiest werkbank, projecten, project (een
 * activiteitenproject), logies (een logiesproject) of facturatie. Alle
 * acties zijn uitgeschakeld; er wordt niets opgehaald of opgeslagen. De
 * logiespagina en het aanbod lezen hun eigen tabellen en komen in fase 3
 * en 4 op deze referentie.
 */
const SCHERMEN = ["werkbank", "projecten", "project", "logies", "facturatie"] as const;
type Scherm = (typeof SCHERMEN)[number];

const noop = () => undefined;

const Scherm = ({ scherm }: { scherm: Scherm }) => {
  switch (scherm) {
    case "projecten":
      return <PartnerProjectenContent />;
    case "project":
      return <PartnerProjectContent mode="activities" projectId="demo-project-scherp" />;
    case "logies":
      return <PartnerProjectContent mode="accommodation" projectId="demo-logies-scherp" />;
    case "facturatie":
      return <PartnerFinanceContent />;
    default:
      return <PartnerWerkbankContent />;
  }
};

const OntwerpPartnerportaal = () => {
  const [params] = useSearchParams();
  const gevraagd = params.get("scherm") ?? "werkbank";
  const scherm: Scherm = (SCHERMEN as readonly string[]).includes(gevraagd) ? (gevraagd as Scherm) : "werkbank";

  return (
    <PartnerPortalProvider
      value={{
        partner: DEMO_PARTNER,
        isImpersonating: false,
        urlSuffix: "",
        demo: { dashboard: DEMO_DASHBOARD, commissionInvoices: DEMO_COMMISSION_INVOICES },
      }}
    >
      <Helmet>
        <title>Ontwerpsysteem – partnerportaal</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <PartnerShell partner={DEMO_PARTNER} urlSuffix="" isImpersonating={false} onLogout={noop}>
        <Scherm scherm={scherm} />
      </PartnerShell>
    </PartnerPortalProvider>
  );
};

export default OntwerpPartnerportaal;
