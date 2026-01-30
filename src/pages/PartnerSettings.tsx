import { Helmet } from "react-helmet";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerSettingsForm } from "@/components/partner-portal/PartnerSettingsForm";

const PartnerSettings = () => {
  return (
    <PartnerLayout>
      <Helmet>
        <title>Instellingen | Partner Portal | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Instellingen</h1>
          <p className="text-muted-foreground">
            Beheer uw account- en bedrijfsgegevens.
          </p>
        </div>

        <PartnerSettingsForm />
      </div>
    </PartnerLayout>
  );
};

export default PartnerSettings;
