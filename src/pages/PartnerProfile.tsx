import { UserCircle } from "lucide-react";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerPage } from "@/components/partner-portal/PartnerPage";
import { PartnerProfileForm } from "@/components/partner-portal/PartnerProfileForm";

const PartnerProfile = () => (
  <PartnerLayout>
    <PartnerPage
      title="Mijn profiel"
      icon={<UserCircle />}
      size="content"
      description="Zo ziet de klant uw bedrijf in programma's en offertes: tekst, kenmerken, locatie en foto's."
    >
      <PartnerProfileForm />
    </PartnerPage>
  </PartnerLayout>
);

export default PartnerProfile;
