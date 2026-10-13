import { Settings } from "lucide-react";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerPage } from "@/components/partner-portal/PartnerPage";
import { PartnerSettingsForm } from "@/components/partner-portal/PartnerSettingsForm";

const PartnerSettings = () => (
  <PartnerLayout>
    <PartnerPage title="Instellingen" icon={<Settings />} size="prose" description="Uw bedrijfs-, bank- en contactgegevens, uw beschikbaarheid en uw wachtwoord.">
      <PartnerSettingsForm />
    </PartnerPage>
  </PartnerLayout>
);

export default PartnerSettings;
