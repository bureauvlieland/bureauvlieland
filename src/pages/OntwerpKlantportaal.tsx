import { useState } from "react";
import { Helmet } from "react-helmet";
import { useSearchParams } from "react-router-dom";
import { Container } from "@/components/system";
import { ProgramNavigation, type PortalView } from "@/components/customer-portal/ProgramNavigation";
import { ProgramView, type ProgramSection } from "@/components/customer-portal/ProgramView";
import { CustomerPortalSplash } from "@/components/customer-portal/CustomerPortalSplash";
import { ParticipantView } from "@/components/customer-portal/ParticipantView";
import { calculateStatusSummary } from "@/types/programRequest";
import { DEMO_ACCOMMODATION, DEMO_PROGRAM, DEMO_QUOTES, DEMO_SELECTED_DATES } from "@/content/demoKlantportaal";
import logoImage from "@/assets/logo.png";

/**
 * Referentie van het klantportaal met een vast, verzonnen programma
 * (klantportaal fase 4, borging). Bestaat alleen buiten productie, net als
 * /ontwerp, en is de bron voor de visuele regressietest: `?scherm=` kiest
 * overzicht, programma, logies, praktisch, facturatie, akkoord of deelnemers.
 * Alle acties zijn uitgeschakeld; er wordt niets opgeslagen.
 */
type Scherm = PortalView | "deelnemers";

const SCHERMEN: Record<string, Scherm> = {
  overzicht: "splash",
  programma: "program",
  logies: "accommodation",
  praktisch: "practical",
  facturatie: "billing",
  akkoord: "accept",
  deelnemers: "deelnemers",
};

const ok = async () => true;
const noop = () => undefined;

const OntwerpKlantportaal = () => {
  const [params] = useSearchParams();
  const [scherm, setScherm] = useState<Scherm>(SCHERMEN[params.get("scherm") ?? "programma"] ?? "program");
  const statusSummary = calculateStatusSummary(DEMO_PROGRAM.items);

  // Vandaag en Kaart horen bij de evenementmodus; die heeft deze referentie niet.
  const navigate = (view: PortalView) => {
    setScherm(view === "today" || view === "map" ? "program" : view);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Ontwerpsysteem – klantportaal</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <header className="border-b bg-background">
        <Container size="full" className="flex items-center justify-between py-3">
          <img src={logoImage} alt="Bureau Vlieland" className="h-8" />
          <p className="text-xs text-muted-foreground">Referentie, verzonnen programma ({import.meta.env.MODE})</p>
        </Container>
      </header>

      {scherm === "deelnemers" ? (
        <ParticipantView
          program={DEMO_PROGRAM}
          accommodation={{ partner_name: "Hotel Zeezicht", location_address: "Dorpsstraat 10, Vlieland" }}
          selectedDates={DEMO_SELECTED_DATES}
          eventMode={{ currentDayIndex: 0, isUpcoming: true }}
        />
      ) : (
        <>
          <ProgramNavigation isMultiDay activeView={scherm} onNavigate={navigate} />
          <Container as="main" id="main-content" size="full" className="pt-8 pb-floating">
            {scherm === "splash" ? (
              <CustomerPortalSplash
                program={DEMO_PROGRAM as never}
                selectedDates={DEMO_SELECTED_DATES}
                statusSummary={statusSummary}
                accommodation={DEMO_ACCOMMODATION}
                accommodationQuotes={DEMO_QUOTES}
                isMultiDay
                onNavigate={navigate}
                onShareWithParticipants={noop}
              />
            ) : (
              <ProgramView
                initialSection={scherm as ProgramSection}
                program={DEMO_PROGRAM as never}
                history={[]}
                selectedDates={DEMO_SELECTED_DATES}
                statusSummary={statusSummary}
                pendingChanges={[]}
                hasChanges={false}
                onUpdateItem={noop}
                onRemoveItem={noop}
                onAcceptItem={ok}
                onCounterProposal={ok}
                onOpenBilling={noop}
                onOpenEdit={noop}
                onOpenCancel={noop}
                onSubmitChanges={noop}
                onDiscardChanges={noop}
                onAcceptTerms={ok}
                onAddActivity={noop}
                accommodation={DEMO_ACCOMMODATION}
                accommodationQuotes={DEMO_QUOTES}
                onSelectAccommodationQuote={ok}
                onAcceptQuoteProposal={ok}
                onApproveQuoteItem={ok}
                onOpenGuestDetails={noop}
                guestDetails={{ guest_names: null, dietary_notes: null, room_assignment: null, updated_at: null, showDietary: true, showRoomAssignment: true }}
                blockVatRates={{}}
                onNavigate={navigate}
              />
            )}
          </Container>
        </>
      )}
    </div>
  );
};

export default OntwerpKlantportaal;
