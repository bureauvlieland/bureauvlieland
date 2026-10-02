import { BillingDetailsCard } from "./BillingDetailsCard";
import { PriceSummaryCard } from "./PriceSummaryCard";
import type { ProgramRequestItem } from "@/types/programRequest";
import type { AccommodationQuote } from "@/types/accommodation";
import type { FeeStructureSet } from "@/types/pricing";

interface CompactBillingSectionProps {
  program: {
    billing_company_name?: string;
    billing_country?: string | null;
    billing_kvk_number?: string;
    billing_vat_number?: string;
    billing_address_street?: string;
    billing_address_postal?: string;
    billing_address_city?: string;
    billing_contact_name?: string;
    billing_contact_email?: string;
    billing_reference?: string;
  };
  items: ProgramRequestItem[];
  numberOfPeople: number;
  numberOfDays?: number;
  termsAccepted: boolean;
  selectedAccommodationQuote?: AccommodationQuote;
  onEditBilling: () => void;
  invoicingMode?: string;
  billingLinesByItem?: Record<string, any[]>;
  blockVatRates?: Record<string, number>;
  accommodationExtrasByQuoteId?: Record<string, any[]>;
  /** Per-project uitgesloten automatische kostenposten. */
  excludedFees?: string[] | null;
  /** Feestructuur van dit project (snapshot) — zelfde als de admin-factuur. */
  feeStructure?: FeeStructureSet | null;
  requestDate?: string | null;
  arrivalDate?: string | null;
  revisionFeesTotal?: number;
}

export const CompactBillingSection = ({
  program,
  items,
  numberOfPeople,
  numberOfDays,
  termsAccepted,
  selectedAccommodationQuote,
  onEditBilling,
  invoicingMode,
  billingLinesByItem,
  blockVatRates,
  accommodationExtrasByQuoteId,
  excludedFees,
  feeStructure,
  requestDate,
  arrivalDate,
  revisionFeesTotal,
}: CompactBillingSectionProps) => {
  const extrasOverride = selectedAccommodationQuote && accommodationExtrasByQuoteId
    ? accommodationExtrasByQuoteId[selectedAccommodationQuote.id]
    : undefined;

  return (
    <div className="space-y-4">
      <BillingDetailsCard program={program} onEdit={onEditBilling} />

      {/* Price summary / cost specification */}
      <PriceSummaryCard
        items={items}
        numberOfPeople={numberOfPeople}
        numberOfDays={numberOfDays}
        termsAccepted={termsAccepted}
        selectedAccommodationQuote={selectedAccommodationQuote}
        invoicingMode={invoicingMode}
        billingLinesByItem={billingLinesByItem}
        blockVatRates={blockVatRates}
        accommodationExtrasOverride={extrasOverride}
        excludedFees={excludedFees}
        feeStructure={feeStructure}
        requestDate={requestDate}
        arrivalDate={arrivalDate}
        revisionFeesTotal={revisionFeesTotal}
      />
    </div>
  );
};
