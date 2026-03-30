import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerProfileForm } from "@/components/partner-portal/PartnerProfileForm";

const PartnerProfile = () => {
  return (
    <PartnerLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Mijn Profiel</h1>
          <p className="text-muted-foreground mt-1">
            Presenteer uw bedrijf aan klanten. Deze informatie wordt gebruikt in programma's en offertes.
          </p>
        </div>
        <PartnerProfileForm />
      </div>
    </PartnerLayout>
  );
};

export default PartnerProfile;
